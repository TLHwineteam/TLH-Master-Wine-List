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

    connect(ref,{canWrite,onChange,onStatus}){
      this.ref=ref;
      this.canWrite=canWrite;
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

    async write(paths){
      if(!this.ref||!this.ready||!this.canWrite())throw new Error('Connect and sign in as an authorised catalogue manager before saving.');
      if(this.pending)throw new Error('Another catalogue change is still saving.');
      this.pending=true;this.onStatus(this.syncError||null);
      try{await this.ref.update({...paths,updatedAt:{'.sv':'timestamp'}});}
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
      await this.write({['additions/'+item.catalogueId]:{categoryId,sectionName,item}});
      return item.catalogueId;
    }

    async setHidden(key,hidden){
      this.find(key);
      if(typeof hidden!=='boolean')throw new Error('Invalid visibility setting.');
      await this.change(key,hidden,false);
    }

    async remove(key){
      this.find(key);
      await this.change(key,false,true);
    }

    async change(key,hidden,deleted){
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
      const id=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
      await this.write({['changes/'+id]:{key,hidden,deleted}});
    }

    exportSource(){
      if(this.pending)throw new Error('Wait for the current change to finish saving before exporting.');
      const timestamp=this.state.updatedAt||new Date().toISOString();
      return `window.WINE_DATA_UPDATED_AT = ${JSON.stringify(timestamp)};\nwindow.WINE_DATA = ${JSON.stringify(this.getData(),null,2)};\n`;
    }
  }
  window.WineCatalogue=WineCatalogue;
})();
