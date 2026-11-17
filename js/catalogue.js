/* Shared catalogue changes; the browser copy is an offline read cache only. */
(() => {
  const clone=value=>JSON.parse(JSON.stringify(value));
  const text=value=>typeof value==='string'&&value.trim().length>0;
  const STORAGE_KEY='wineListSharedCatalogueV1';

  class WineCatalogue{
    static storageKey=STORAGE_KEY;

    constructor(source,storage){
      this.source=clone(source);
      this.storage=storage;
      this.ready=false;
      this.pending=false;
      try{this.reload();}
      catch(error){
        this.cacheError=error;
        this.state={version:1,updatedAt:null,changes:[],additions:[]};
        console.error('Catalogue offline cache could not be loaded; waiting for Firebase:',error);
      }
    }

    key(category,section,item){
      return item.catalogueId||JSON.stringify([category.id,section.name,item.v||'',item.name]);
    }

    reload(){
      const raw=this.storage.getItem(STORAGE_KEY);
      const state=raw===null?{version:1,updatedAt:null,changes:[],additions:[]}:JSON.parse(raw);
      this.validateState(state);
      this.raw=raw;
      this.state=state;
    }

    validateState(state){
      if(!state||state.version!==1||!Array.isArray(state.changes)||!Array.isArray(state.additions)||
        (state.updatedAt!==null&&(!text(state.updatedAt)||Number.isNaN(Date.parse(state.updatedAt))))){
        throw new Error('Invalid saved catalogue. Keep a backup of this browser before clearing its data.');
      }
      const keys=new Set();
      for(const change of state.changes){
        if(!change||!text(change.key)||keys.has(change.key)||
          typeof change.hidden!=='boolean'||typeof change.deleted!=='boolean'){
          throw new Error('Invalid saved catalogue changes.');
        }
        keys.add(change.key);
      }
      const ids=new Set();
      for(const addition of state.additions){
        const category=this.source.find(value=>value.id===addition?.categoryId);
        if(!category?.sections.some(section=>section.name===addition.sectionName)){
          throw new Error('A saved item refers to a removed category or section. Restore the source before exporting.');
        }
        this.validateItem(addition.item);
        if(!text(addition.item.catalogueId)||ids.has(addition.item.catalogueId)){
          throw new Error('Invalid saved catalogue item identifier.');
        }
        ids.add(addition.item.catalogueId);
      }
    }

    validateItem(item){
      for(const field of ['v','name','nameZh','price','priceZh']){
        if(!text(item?.[field])||item[field].length>500){
          throw new Error(`Missing or invalid ${field}.`);
        }
      }
    }

    getData(includeHidden=true,state=this.state){
      const changes=new Map(state.changes.map(change=>[change.key,change]));
      return this.source.map(category=>({
        ...clone(category),
        sections:category.sections.map(section=>{
          const publishedIds=new Set(section.items.map(item=>item.catalogueId).filter(Boolean));
          const added=state.additions.filter(value=>value.categoryId===category.id&&value.sectionName===section.name&&
            !publishedIds.has(value.item.catalogueId));
          const items=[...section.items,...added.map(value=>value.item)].flatMap(original=>{
            const item=clone(original),change=changes.get(this.key(category,section,item));
            if(change?.deleted)return [];
            if(change)item.catalogueHidden=change.hidden;
            if(!item.catalogueHidden)delete item.catalogueHidden;
            return includeHidden||!item.catalogueHidden?[item]:[];
          });
          return {...clone(section),items};
        })
      }));
    }

    find(key){
      for(const category of this.getData()){
        for(const section of category.sections){
          const item=section.items.find(value=>this.key(category,section,value)===key);
          if(item)return {category,section,item};
        }
      }
      throw new Error('This item no longer exists. Close this window and select it again.');
    }

    connect(ref,{canWrite,getActor,onChange,onStatus}){
      this.ref=ref;
      this.canWrite=canWrite;
      this.getActor=getActor;
      this.onStatus=onStatus;
      ref.on('value',snapshot=>{
        let state,raw;
        try{
          const remote=snapshot.val()||{};
          state={
            version:1,updatedAt:remote.updatedAt?new Date(remote.updatedAt).toISOString():null,
            changes:Object.values(remote.changes||{}),additions:Object.values(remote.additions||{})
          };
          this.validateState(state);
          raw=JSON.stringify(state);
        }
        catch(error){this.ready=false;this.syncError=error;onStatus(error);return;}
        this.state=state;this.raw=raw;this.ready=true;
        this.syncError=null;
        try{this.storage.setItem(STORAGE_KEY,raw);onStatus(null);}
        catch(error){console.error('Shared catalogue cache unavailable:',error);this.syncError=new Error('Live catalogue received, but the offline cache could not be saved.');onStatus(this.syncError);}
        onChange();
      },error=>{this.ready=false;this.syncError=error;onStatus(error);});
    }

    watchHistory(ref,{canRead,onChange,onError}){
      this.stopHistory();
      const generation=this.historyGeneration;
      const query=ref.orderByChild('at').limitToLast(100);
      const active=()=>generation===this.historyGeneration&&canRead();
      const callback=snapshot=>{
        if(!active())return;
        const entries=Object.entries(snapshot.val()||{}).map(([id,value])=>({...value,id}));
        entries.sort((a,b)=>(b.at-a.at)||b.id.localeCompare(a.id));
        onChange(entries);
      };
      this.historyQuery=query;this.historyCallback=callback;
      query.on('value',callback,error=>{if(active())onError(error);});
    }

    stopHistory(){
      this.historyGeneration=(this.historyGeneration||0)+1;
      if(this.historyQuery)this.historyQuery.off('value',this.historyCallback);
      this.historyQuery=null;this.historyCallback=null;
    }

    snapshot({category,section,item}){
      const copyFields=(value,fields)=>Object.fromEntries(fields.map(field=>[field,String(value[field]||'')]));
      return {
        category:copyFields(category,['id','title','titleZh']),
        section:copyFields(section,['name','nameZh']),
        item:{...copyFields(item,['v','name','nameZh','price','priceZh']),
          ...(item.catalogueId?{catalogueId:item.catalogueId}:{}),section:section.name}
      };
    }

    async write(paths,event){
      if(!this.ref||!this.ready||!this.canWrite())throw new Error('Connect and sign in as an authorised catalogue manager before saving.');
      if(this.pending)throw new Error('Another catalogue change is still saving.');
      this.pending=true;this.onStatus(this.syncError||null);
      try{
        const actor=await this.getActor?.();
        if(!text(actor?.uid)||typeof actor.displayName!=='string'||typeof actor.email!=='string'){
          throw new Error('A verified signed-in manager identity is required to save an audited change.');
        }
        if(!this.canWrite())throw new Error('Manager access changed. Sign in again before saving.');
        const root=this.ref.parent,id=root.child('auditV1').push().key;
        if(!text(id))throw new Error('Could not allocate an audit identifier. Nothing was saved.');
        const updates={};
        for(const [path,value] of Object.entries(paths))updates['v1/'+path]={...value,auditId:id};
        updates['v1/updatedAt']={'.sv':'timestamp'};
        updates['v1/lastAuditId']=id;
        updates['auditV1/'+id]={...event,actor,at:{'.sv':'timestamp'}};
        await root.update(updates);
      }
      finally{this.pending=false;this.onStatus(this.syncError||null);}
    }

    async add(categoryId,sectionName,input){
      this.validateItem(input);
      const category=this.getData().find(value=>value.id===categoryId);
      const section=category?.sections.find(value=>value.name===sectionName);
      if(!section)throw new Error('Choose an existing category and section.');
      if(categoryId==='c0'&&category.sections.some(value=>value.items.length)){
        throw new Error('Wine of the Month has one featured slot. Delete the old feature before adding its replacement.');
      }
      if(section.items.some(item=>item.name.trim().toLowerCase()===input.name.trim().toLowerCase()&&
        String(item.v||'').trim().toLowerCase()===input.v.trim().toLowerCase())){
        throw new Error('This name and vintage already exist in the selected section. Restore the existing entry instead.');
      }
      const item=clone(input);
      item.catalogueId='added-'+(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
      item.section=sectionName;
      delete item.catalogueHidden;
      await this.write({['additions/'+item.catalogueId]:{categoryId,sectionName,item}},{
        action:'add',key:item.catalogueId,targetId:item.catalogueId,targetType:'additions',
        ...this.snapshot({category,section,item})
      });
      return item.catalogueId;
    }

    async setHidden(key,hidden){
      const location=this.find(key);
      if(typeof hidden!=='boolean')throw new Error('Invalid visibility setting.');
      if(Boolean(location.item.catalogueHidden)===hidden)throw new Error('This item already has the requested visibility.');
      await this.change(key,hidden,false,location);
    }

    async remove(key){
      await this.change(key,false,true,this.find(key));
    }

    async change(key,hidden,deleted,location){
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
      const id=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
      await this.write({['changes/'+id]:{key,hidden,deleted}},{
        action:deleted?'delete':hidden?'hide':'restore',key,targetId:id,targetType:'changes',
        ...this.snapshot(location)
      });
    }

    exportSource(){
      if(this.pending)throw new Error('Wait for the current change to finish saving before exporting.');
      const timestamp=this.state.updatedAt||new Date().toISOString();
      return `window.WINE_DATA_UPDATED_AT = ${JSON.stringify(timestamp)};\nwindow.WINE_DATA = ${JSON.stringify(this.getData(),null,2)};\n`;
    }
  }
  window.WineCatalogue=WineCatalogue;

  class WineManagerAvatars{
    static kinds=Object.freeze(['dragon','wheel','wolf']);
    constructor(ref,{canUse,getActor,onChange,onError}){
      Object.assign(this,{ref,canUse,getActor,onChange,onError});
      this.avatars={};this.pending=false;this.active=true;this.ready=false;
      this.listener=snapshot=>{
        if(!this.active)return;
        this.avatars=snapshot.val()||{};this.ready=true;this.onChange();
      };
      ref.on('value',this.listener,error=>{
        if(!this.active)return;
        this.avatars={};this.ready=false;this.onError(error);
      });
    }
    async use(kind){
      if(!WineManagerAvatars.kinds.includes(kind))throw new Error('Unknown avatar.');
      if(!this.active||!this.ready||!this.canUse())throw new Error('Connect and sign in as an authorised manager to choose an avatar.');
      if(this.pending)throw new Error('Another avatar switch is still saving.');
      this.pending=true;this.onChange();
      try{
        const actor=await this.getActor();
        if(!text(actor?.uid)||typeof actor.displayName!=='string'||typeof actor.email!=='string'){
          throw new Error('A verified manager identity is required.');
        }
        let reason='';
        const result=await this.ref.transaction(current=>{
          if(!this.active||!this.canUse()){reason='Manager access changed. Please sign in again.';return;}
          const avatars=current?clone(current):{};
          if(avatars[kind]?.uid&&avatars[kind].uid!==actor.uid){
            reason='This avatar is already in use. Choose another avatar.';return;
          }
          if(avatars[kind]?.uid===actor.uid){reason='';return;}
          for(const key of WineManagerAvatars.kinds)if(avatars[key]?.uid===actor.uid)delete avatars[key];
          avatars[kind]={...actor,at:{'.sv':'timestamp'}};
          return avatars;
        },undefined,false);
        if(!result.committed&&reason)throw new Error(reason);
        return result.committed;
      }finally{this.pending=false;if(this.active)this.onChange();}
    }
    disconnect(){
      this.active=false;this.ready=false;this.avatars={};
      this.ref.off('value',this.listener);
    }
  }
  window.WineManagerAvatars=WineManagerAvatars;
})();
