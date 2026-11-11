class AnimationLibrary{
  static category=Object.freeze({id:'animation-library',title:'The Animation Library',titleZh:'動畫收藏館',sections:[]});
  static holdMs=450;
  static chargeMs=3600;
  static breathMs=700;
  static fireTailMs=216;
  static settleMs=800;
  static burstMs=1800;
  static reformMs=3800;
  static names={dragon:'The Ice Dragon',wheel:'The Cosmic Wheel'};
  constructor({isAvailable,language,drawFire,drawWheel,drawCore,releaseTextures,prepareTextures}){
    Object.assign(this,{isAvailable,language,drawFire,drawWheel,drawCore,releaseTextures,prepareTextures});
    this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.dialog=document.createElement('dialog');
    this.dialog.id='animation-player';
    this.dialog.className='animation-dialog';
    this.dialog.setAttribute('aria-labelledby','animation-title');
    this.dialog.setAttribute('aria-describedby','animation-instructions');
    document.body.appendChild(this.dialog);
    this.effect=null;this.gesture=null;this.raf=0;this.holdTimer=0;this.calmTimer=0;this.loadVersion=0;
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});
    this.dialog.addEventListener('close',()=>{if(!this.dialog.open)this.cleanup();});
    document.addEventListener('pointerdown',event=>{
      if(this.gesture&&event.pointerId!==this.gesture.id)this.reset();
    },true);
    this.dialog.addEventListener('pointerdown',event=>{
      if(event.target!==this.dialog)return;
      const box=this.dialog.getBoundingClientRect();
      if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)this.close();
    });
    window.addEventListener('blur',()=>{this.reset();});
    document.addEventListener('visibilitychange',()=>this.sync());
    window.addEventListener('resize',()=>{if(this.dialog.open){this.reset(false);this.layout();this.start();}});
    window.visualViewport?.addEventListener('resize',()=>{if(this.dialog.open){this.reset(false);this.layout();this.start();}});
    this.motion.addEventListener('change',()=>{this.reset(false);this.start();});
  }
  text(english,chinese){return this.language()==='zh'?chinese:english;}
  markup(){
    const dragon=CosmicDragonRig.markup();
    const entries=['dragon','wheel'].map((kind,index)=>`
      <figure class="library-slot">
        <button type="button" class="animation-card animation-card-${kind}" data-animation="${kind}"
          aria-labelledby="library-card-name-${kind}" aria-haspopup="dialog" aria-controls="animation-player">
          <span class="animation-card-top"><span>${kind==='dragon'?'ICE / 01':'COSMOS / 02'}</span><span aria-hidden="true">✧</span></span>
          <span class="animation-card-scene" aria-hidden="true">${kind==='dragon'?
            `<span class="library-dragon-preview"><img src="${CosmicDragonRig.asset}" alt="" hidden>${dragon}</span>`:
            '<span class="library-wheel-preview"><img src="images/manager-wheel-hud.svg" alt=""><img src="images/manager-energy-ring.svg" alt=""><span class="library-wheel-preview-core"></span></span>'}</span>
          <span class="animation-card-bottom"><span class="animation-card-number">0${index+1}</span>
            <span>${this.text(kind==='dragon'?'FIRE BREATH':'BIG BANG',kind==='dragon'?'冰焰吐息':'宇宙爆發')}</span>
            <span class="animation-card-open" aria-hidden="true">↗</span></span>
        </button>
        <figcaption id="library-card-name-${kind}">${AnimationLibrary.names[kind]}</figcaption>
      </figure>`).join('');
    const empty=Array.from({length:4},(_,index)=>`<div class="library-slot library-slot-empty" aria-hidden="true">
      <div class="library-empty-card"><span>✧</span><small>SLOT 0${index+3}</small></div>
    </div>`).join('');
    return `<section class="animation-library" aria-labelledby="library-title">
      <header class="library-heading">
        <div><p class="library-eyebrow">${this.text('PRIVATE COLLECTION / 01','私人收藏 / 01')}</p>
          <h2 id="library-title">${this.text(AnimationLibrary.category.title,AnimationLibrary.category.titleZh)}</h2>
          <p>${this.text('Choose a card to enter its animation studio.','選擇一張收藏卡，進入專屬動畫展示空間。')}</p></div>
        <span class="library-manager-badge">${this.text('MANAGER ONLY','僅限管理員')}</span>
      </header>
      <div class="library-cabinet">
        <div class="library-rail" aria-hidden="true"><span>01</span><span>COLLECTION</span></div>
        <div class="library-collection"><div class="library-collection-heading">
          <span>${this.text('ANIMATION CARDS','動畫收藏卡')}</span><span>${this.text('2 / 6 SLOTS','2 / 6 個收藏位置')}</span>
        </div><div class="library-slots">${entries}${empty}</div></div>
      </div>
      <p class="library-note">${this.text('A private collection, separate from the wine list and customer PDF.','私人動畫收藏，不屬於酒單，亦不會列入顧客 PDF。')}</p>
    </section>`;
  }
  bind(root){
    root.querySelectorAll('[data-animation]').forEach(card=>{
      if(card.dataset.animation==='dragon')CosmicDragonRig.render(card,CosmicDragonRig.pose(0,0,0,true));
      card.addEventListener('click',()=>this.open(card.dataset.animation,card));
      card.querySelectorAll('img').forEach(image=>{
        const failed=()=>{
          if(card.disabled)return;
          console.error(`Animation card artwork unavailable: ${image.getAttribute('src')}`);
          card.disabled=true;
          const error=document.createElement('span');error.className='library-card-error';
          error.textContent=this.text('Artwork unavailable. Reload to retry.','圖像未能載入，請重新載入頁面。');
          error.setAttribute('role','alert');card.appendChild(error);
        };
        image.addEventListener('error',failed);
        if(image.complete&&!image.naturalWidth)failed();
      });
    });
  }
  async open(kind,origin){
    if(!this.isAvailable()||!AnimationLibrary.names[kind]||this.dialog.open)return;
    this.kind=kind;this.origin=origin;this.ready=false;
    this.wheelIdleAngle=0;this.wheelIdleSince=performance.now();
    this.dialog.dataset.animation=kind;
    this.dialog.innerHTML=`<header class="animation-dialog-header">
      <div><p class="library-eyebrow">${this.text('ANIMATION STUDIO','動畫展示空間')}</p><h2 id="animation-title">${AnimationLibrary.names[kind]}</h2></div>
      <button type="button" class="animation-close" aria-label="${this.text('Close animation','關閉動畫')}">×</button>
    </header>
    <div class="animation-stage" data-state="loading">
      <canvas class="animation-stage-canvas" width="1" height="1" aria-hidden="true"></canvas>
      <button type="button" class="animation-target library-${kind}" disabled
        aria-label="${this.text(kind==='dragon'?'Hold The Ice Dragon to breathe fire':'Hold The Cosmic Wheel to accelerate, contract and trigger the big bang',
          kind==='dragon'?'長按冰龍以噴出冰焰':'長按宇宙輪以加速旋轉、收縮並啟動宇宙爆發')}">
        ${kind==='dragon'?`<span class="cosmic-dragon-art" aria-hidden="true"><img src="${CosmicDragonRig.asset}" alt="" hidden>${CosmicDragonRig.markup()}</span>`:
          `<span class="library-wheel-art" aria-hidden="true"><span class="navigation-wheel">
            <canvas class="wheel-aura" width="1" height="1"></canvas><span class="wheel-energy"></span>
            <span class="wheel-orbit"></span><span class="wheel-telemetry"></span><span class="wheel-core"><canvas width="1" height="1"></canvas></span>
            <img src="images/manager-energy-ring.svg" alt="" hidden><img src="images/manager-wheel-hud.svg" alt="" hidden>
          </span></span>`}
      </button>
      <span class="animation-stage-label" aria-hidden="true">${kind==='dragon'?'ELEMENTAL / ICE':'CELESTIAL / COSMOS'}</span>
    </div>
    <footer class="animation-dialog-footer">
      <p id="animation-instructions">${this.text('Hold the artwork to play. Enter, Space or Play also works.','長按圖像即可播放，亦可按 Enter、空白鍵或「播放」。')}</p>
      <div class="animation-actions"><button type="button" class="animation-play" disabled>${this.text('Play animation','播放動畫')}</button>
        <button type="button" class="animation-reset">${this.text('Reset','重設')}</button></div>
      <p class="animation-status" role="status" aria-live="polite">${this.text('Loading artwork…','正在載入圖像……')}</p>
      <p class="animation-error" role="alert" hidden></p>
    </footer>`;
    this.stage=this.dialog.querySelector('.animation-stage');
    this.canvas=this.stage.querySelector('canvas');
    this.target=this.stage.querySelector('.animation-target');
    this.playButton=this.dialog.querySelector('.animation-play');
    this.dialog.querySelector('.animation-close').addEventListener('click',()=>this.close());
    this.dialog.querySelector('.animation-reset').addEventListener('click',()=>{this.reset();this.target.focus();});
    this.playButton.addEventListener('click',()=>this.play());
    this.playButton.addEventListener('keydown',event=>{
      if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();
    });
    this.bindActivation();
    this.dialog.showModal();document.body.classList.add('animation-player-open');
    this.layout();this.dialog.querySelector('.animation-close').focus();
    const version=++this.loadVersion;
    try{
      await Promise.all([...this.target.querySelectorAll('img')].map(async image=>{
        try{await image.decode();}
        catch(error){throw new Error(`${image.getAttribute('src')}: ${error.message}`);}
      }));
      if(version!==this.loadVersion||!this.dialog.open)return;
      this.context=this.canvas.getContext('2d');
      if(!this.context)throw new Error('2D canvas is unavailable');
      this.ready=true;this.target.disabled=false;this.playButton.disabled=false;
      this.stage.dataset.state='idle';this.setStatus(this.idleText());this.start();
    }catch(error){
      if(version!==this.loadVersion||!this.dialog.open)return;
      this.fail(error,'Animation studio could not start:');
    }
  }
  idleText(){
    return this.motion.matches?this.text('Reduced Motion: activation shows a gentle, still glow.','已減少動態效果：啟動時只顯示柔和靜態光暈。'):
      this.text('Ready. Hold to play.','準備就緒，長按即可播放。');
  }
  setStatus(message){const status=this.dialog.querySelector('.animation-status');if(status&&status.textContent!==message)status.textContent=message;}
  fail(error,message){
    console.error(message,error);
    cancelAnimationFrame(this.raf);this.raf=0;
    this.reset(false);this.ready=false;this.target.disabled=true;this.playButton.disabled=true;
    this.stage.dataset.state='error';this.releaseBacking();
    const feedback=this.dialog.querySelector('.animation-error');
    feedback.textContent=this.text('Animation unavailable. Reload to retry. ','動畫未能播放，請重新載入頁面。 ')+error.message;
    feedback.hidden=false;this.setStatus(this.text('Playback stopped.','播放已停止。'));
  }
  bindActivation(){
    const target=this.target;
    target.addEventListener('pointerdown',event=>{
      if(!this.ready||event.button!==0||event.isPrimary===false||this.gesture||this.effect)return;
      event.preventDefault();
      this.gesture={id:event.pointerId,x:event.clientX,y:event.clientY,held:false};
      target.setPointerCapture(event.pointerId);
      this.holdTimer=setTimeout(()=>{
        this.holdTimer=0;
        if(!this.gesture)return;
        this.gesture.held=true;this.play();
      },AnimationLibrary.holdMs);
    });
    target.addEventListener('pointermove',event=>{
      const gesture=this.gesture;
      if(event.pointerId!==gesture?.id||gesture.held)return;
      if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>12)this.clearHold();
    });
    target.addEventListener('pointerup',event=>{
      if(event.pointerId!==this.gesture?.id)return;
      this.clearHold();
      if(this.motion.matches)this.reset();
    });
    for(const name of ['pointercancel','lostpointercapture'])target.addEventListener(name,event=>{
      if(event.pointerId===this.gesture?.id)this.reset();
    });
    target.addEventListener('contextmenu',event=>event.preventDefault());
    target.addEventListener('click',event=>{event.preventDefault();if(event.detail===0)this.play();});
    target.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      event.preventDefault();if(!event.repeat)this.play();
    });
  }
  clearHold(){
    clearTimeout(this.holdTimer);this.holdTimer=0;
    const gesture=this.gesture;this.gesture=null;
    if(gesture&&this.target?.hasPointerCapture(gesture.id))this.target.releasePointerCapture(gesture.id);
  }
  play(){
    if(!this.dialog.open||!this.ready||!this.isAvailable()||document.hidden||this.effect)return;
    if(!this.motion.matches){
      try{this.prepareTextures();}
      catch(error){
        this.fail(error,'Animation textures could not be prepared:');return;
      }
    }
    const startedAt=performance.now();
    this.effect={kind:this.kind,startedAt,startAngle:this.wheelAngle(startedAt)};
    this.target.setAttribute('aria-busy','true');this.playButton.disabled=true;
    this.lastPhase='';this.start();
    if(this.motion.matches)this.calmTimer=setTimeout(()=>this.reset(),1200);
  }
  static frame(kind,elapsed,reduced=false){
    const clamp=value=>Math.max(0,Math.min(1,value)),ease=value=>value*value*(3-2*value);
    elapsed=Math.max(0,elapsed);
    if(reduced)return {phase:'calm',progress:0,charge:0,energy:0,spin:0,meshScale:1,meshOpacity:1,wheelOpacity:1};
    let phase,progress;
    if(elapsed<AnimationLibrary.chargeMs){phase='charging';progress=elapsed/AnimationLibrary.chargeMs;}
    else if(kind==='dragon'){
      const after=elapsed-AnimationLibrary.chargeMs;
      if(after<AnimationLibrary.breathMs){phase='breathing';progress=after/AnimationLibrary.breathMs;}
      else if(after<AnimationLibrary.breathMs+AnimationLibrary.fireTailMs+AnimationLibrary.settleMs){
        phase='settling';progress=(after-AnimationLibrary.breathMs)/(AnimationLibrary.fireTailMs+AnimationLibrary.settleMs);
      }else return {phase:'done'};
    }else{
      const after=elapsed-AnimationLibrary.chargeMs;
      if(after<AnimationLibrary.burstMs){phase='burst';progress=after/AnimationLibrary.burstMs;}
      else if(after<AnimationLibrary.burstMs+AnimationLibrary.reformMs){
        phase='reforming';progress=(after-AnimationLibrary.burstMs)/AnimationLibrary.reformMs;
      }else return {phase:'done'};
    }
    const charging=phase==='charging',reform=ease(clamp(progress));
    return {phase,progress,charge:charging?progress:1,energy:elapsed/1000,
      spin:kind==='wheel'&&charging?Math.PI*16*progress**3:0,
      meshScale:kind==='wheel'&&charging?1-.92*ease(clamp((progress-.35)/.65)):
        phase==='reforming'?.08+.92*reform:1,
      meshOpacity:phase==='burst'?0:phase==='reforming'?reform:1,
      wheelOpacity:phase==='burst'?0:phase==='reforming'?ease(clamp((progress-.15)/.85)):1};
  }
  wheelAngle(time){
    if(this.motion.matches)return 0;
    return this.effect?this.effect.startAngle:this.wheelIdleAngle+(time-this.wheelIdleSince)*.00014;
  }
  dragonPose(frame,time){
    const ease=value=>value*value*(3-2*value),clamp=value=>Math.max(0,Math.min(1,value));
    const progress=frame?.progress||0,returning=frame?.phase==='settling';
    const after=progress*(AnimationLibrary.fireTailMs+AnimationLibrary.settleMs);
    const stage=frame?.phase==='charging'?(progress<.42?progress/.42:1+Math.min(1,(progress-.42)/.24)):
      frame?.phase==='breathing'?2:returning?2*(1-ease(clamp((after-AnimationLibrary.fireTailMs)/AnimationLibrary.settleMs))):0;
    const fire=frame?.phase==='charging'?ease(clamp((progress-.68)/.14)):
      frame?.phase==='breathing'?1:returning?clamp(1-after/AnimationLibrary.fireTailMs):0;
    const rig=CosmicDragonRig.pose(stage,time/1000,fire,this.motion.matches,returning),box=this.geometry;
    return {rig,stage,fire,mouthAngle:rig.mouthAngle,
      mouthX:box.x+box.width*rig.mouth.x/800,mouthY:box.y+box.height*rig.mouth.y/600,
      plumeLength:Math.max(40,800-(box.x+box.width*rig.mouth.x/800)-70)};
  }
  layout(){
    if(!this.dialog.open)return;
    const bounds=this.stage.getBoundingClientRect();
    const width=Math.min(bounds.width*(this.kind==='dragon'?.62:.28),bounds.height*(this.kind==='dragon'?1.05:.48));
    this.target.style.width=`${Math.max(44,width)}px`;
    const target=this.target.getBoundingClientRect(),unit=800/Math.max(1,bounds.width);
    this.geometry={x:(target.left-bounds.left)*unit,y:(target.top-bounds.top)*unit,
      width:target.width*unit,height:target.height*unit,stageHeight:bounds.height*unit};
    const phone=matchMedia('(any-pointer:coarse) and (max-width:600px), (any-pointer:coarse) and (max-height:500px)').matches;
    this.phone=phone;
    const scale=Math.min(devicePixelRatio||1,2,(phone?1024:2048)/Math.max(1,bounds.width,bounds.height));
    this.canvas.width=Math.max(1,Math.round(bounds.width*scale));this.canvas.height=Math.max(1,Math.round(bounds.height*scale));
  }
  start(){
    cancelAnimationFrame(this.raf);this.raf=0;
    if(!this.dialog.open||!this.ready||!this.isAvailable()||document.hidden)return;
    let paintedAt=-Infinity;
    const draw=time=>{
      this.raf=0;
      if(!this.dialog.open||document.hidden)return;
      if(!this.isAvailable()){this.close(false);return;}
      let frame=this.effect?AnimationLibrary.frame(this.kind,time-this.effect.startedAt,this.motion.matches):null;
      if(frame?.phase==='done'){this.reset(false);frame=null;}
      const phase=frame?.phase||'idle';
      if(this.lastPhase!==phase){
        this.stage.dataset.state=phase;
        this.lastPhase=phase;
        const messages={charging:this.kind==='dragon'?this.text('The Ice Dragon is rising.','冰龍正在站起。'):this.text('Accelerating and contracting…','正在加速旋轉及收縮……'),
          breathing:this.text('Breathing ice fire into open space.','向空中噴出冰焰。'),
          settling:this.text('Returning directly to sitting.','直接恢復坐姿。'),
          burst:this.text('Big bang.','宇宙爆發。'),reforming:this.text('The Cosmic Wheel is reforming.','宇宙輪正在重組。')};
        this.setStatus(messages[phase]||this.idleText());
      }
      const pose=this.kind==='dragon'?this.dragonPose(frame,time):null;
      const wheelAngle=this.wheelAngle(time)+(frame?.spin||0);
      if(pose)CosmicDragonRig.render(this.target,pose.rig);
      else{
        const art=this.target.querySelector('.library-wheel-art');
        art.style.transform=`scale(${frame?.meshScale??1}) rotate(${wheelAngle}rad)`;
        art.style.opacity=String(frame?.wheelOpacity??1);
      }
      const interval=1000/(frame?30:this.phone?12:30),delta=time-paintedAt;
      if(this.motion.matches||delta>=interval-.5){
        paintedAt=Number.isFinite(paintedAt)?time-delta%interval:time;
        const context=this.context,height=this.geometry.stageHeight;
        context.setTransform(this.canvas.width/800,0,0,this.canvas.height/height,0,0);
        context.clearRect(0,0,800,height);
        if(pose)this.drawFire(context,frame,this.phone,pose);
        else{
          const center={x:this.geometry.x+this.geometry.width/2,y:this.geometry.y+this.geometry.height/2};
          this.drawSphere(context,frame,wheelAngle,center);
          this.drawCore(time,this.motion.matches?0:time,Boolean(frame));
          if(frame){
            const scale=Math.min(800/920,height/780);
            context.save();context.translate(center.x,center.y);context.scale(scale,scale);context.translate(-90,-78);
            this.drawWheel(context,frame,this.phone);context.restore();
          }
        }
      }
      if(!this.motion.matches)this.raf=requestAnimationFrame(animate);
    };
    const animate=time=>{
      try{draw(time);}
      catch(error){
        this.fail(error,'Animation drawing failed:');
      }
    };
    animate(performance.now());
  }
  drawSphere(context,frame,angle,center){
    if(frame?.meshOpacity===0)return;
    const count=this.phone?64:128;
    const radius=this.geometry.width*.53*(frame?.meshScale??1),sine=Math.sin(angle),cosine=Math.cos(angle);
    if(this.sphereMesh?.count!==count){
      const vertices=Array.from({length:count},(_,index)=>{
        const y=1-2*(index+.5)/count,r=Math.sqrt(1-y*y),theta=index*Math.PI*(3-Math.sqrt(5));
        return {x:Math.cos(theta)*r,y,z:Math.sin(theta)*r};
      }),edges=[];
      vertices.forEach((a,i)=>vertices.slice(i+1).forEach((b,j)=>{
        if(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<(this.phone?.54:.38))edges.push([i,i+j+1]);
      }));
      this.sphereMesh={count,vertices,edges};
    }
    const points=this.sphereMesh.vertices.map(({x:px,y,z:pz})=>{
      const x=px*cosine+pz*sine,z=-px*sine+pz*cosine,scale=radius/(1-z*.13);
      return {x:center.x+x*scale,y:center.y+y*scale,z};
    });
    context.save();context.globalAlpha=frame?.meshOpacity??1;
    const glow=context.createRadialGradient(center.x,center.y,0,center.x,center.y,radius*1.2);
    glow.addColorStop(0,'rgba(10,18,57,.45)');glow.addColorStop(.7,'rgba(73,83,194,.08)');
    glow.addColorStop(.85,'rgba(34,220,255,.16)');glow.addColorStop(1,'rgba(0,173,255,0)');
    context.fillStyle=glow;context.fillRect(center.x-radius*1.2,center.y-radius*1.2,radius*2.4,radius*2.4);
    for(const [i,j] of this.sphereMesh.edges){
      const a=points[i],b=points[j];
      const depth=((a.z+b.z)/2+1)/2;
      context.strokeStyle=`rgba(${i%3?'61,222,255':'235,116,255'},${.1+depth*.4})`;
      context.lineWidth=.35+depth*.4;context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
    }
    for(const point of points){
      context.fillStyle=`rgba(164,248,255,${.35+(point.z+1)*.3})`;
      context.beginPath();context.arc(point.x,point.y,.45+(point.z+1)*.35,0,Math.PI*2);context.fill();
    }
    context.restore();
  }
  reset(restart=true){
    if(this.effect){this.wheelIdleAngle=this.effect.startAngle;this.wheelIdleSince=performance.now();}
    this.clearHold();clearTimeout(this.calmTimer);this.calmTimer=0;this.effect=null;
    this.target?.removeAttribute('aria-busy');
    if(this.playButton)this.playButton.disabled=!this.ready;
    this.releaseTextures();this.lastPhase='';
    if(restart)this.start();
  }
  sync(){
    if(!this.isAvailable()){this.close(false);return;}
    if(document.hidden){this.reset(false);cancelAnimationFrame(this.raf);this.raf=0;this.releaseBacking();}
    else if(this.dialog.open){this.layout();this.start();}
  }
  releaseBacking(){
    if(this.canvas)this.canvas.width=this.canvas.height=1;
    this.releaseTextures();
  }
  cleanup(){
    this.loadVersion++;cancelAnimationFrame(this.raf);this.raf=0;
    this.reset(false);this.releaseBacking();this.ready=false;
    this.sphereMesh=null;
    document.body.classList.remove('animation-player-open');
  }
  close(restoreFocus=true){
    const origin=this.origin;this.origin=null;
    this.cleanup();if(this.dialog.open)this.dialog.close();
    if(restoreFocus&&origin?.isConnected)origin.focus({preventScroll:true});
  }
}
