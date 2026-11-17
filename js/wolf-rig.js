/* One coherent character: articulated quadruped, continuous rise, then two claw strikes. */
const CyberWolfRig=(()=>{
  const asset='images/cyber-wolf-rig.webp?v=full-wolf-20261117-2';
  const avatar='images/manager-wolf-avatar.webp?v=full-wolf-20261117-2';
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const cache=new WeakMap();
  const durations=[1000,1900,650,500,500,550,700,1400];
  const phases=['awakening','transforming','first-windup','first-strike','second-windup','second-strike','recovering','reverting'];
  const duration=durations.reduce((sum,value)=>sum+value,0);
  const parts=[
    ['tail',3],['far-thigh',6],['far-shin',7],
    ['far-front',4],['far-paw',5],['far-arm',10],['far-claw',11],
    ['quad-body',1],['quad-hip',2],['thigh',6],['shin',7],['pelvis',9],['body',8],
    ['front',4],['paw',5],['arm',10],['claw',11],['head',0]
  ];
  function frame(elapsed,reduced=false){
    if(reduced)return {phase:'calm',progress:0,werewolf:0,avatar:1,energy:0};
    elapsed=Math.max(0,elapsed);
    let start=0;
    for(let i=0;i<phases.length;i++){
      if(elapsed<start+durations[i]){
        const progress=(elapsed-start)/durations[i],phase=phases[i];
        const werewolf=phase==='awakening'?0:phase==='transforming'?ease(progress):
          phase==='reverting'?1-ease(progress):1;
        return {phase,progress,werewolf,avatar:1-werewolf,energy:elapsed/1000};
      }
      start+=durations[i];
    }
    return {phase:'done'};
  }
  function markup(){
    return `<svg class="wolf-rig" viewBox="0 0 800 600" aria-hidden="true" focusable="false">
      ${parts.map(([name,cell])=>`<g data-wolf-bone="${name}">
        <svg width="384" height="384"
          viewBox="${cell%3*384} ${Math.floor(cell/3)*384} 384 384" preserveAspectRatio="none" overflow="hidden">
          <image href="${asset}" width="1152" height="1536"/>
        </svg></g>`).join('')}</svg>`;
  }
  function pose(sample,time,still=false){
    const phase=sample?.phase||'idle',p=ease(sample?.progress||0);
    const breath=still?0:Math.sin(time/1000*2.15);
    let lean=0,lunge=0;
    if(phase==='first-windup'){
      lean=-.12*p;
    }else if(phase==='first-strike'){
      const snap=ease(clamp((sample.progress-.06)/.62));
      lean=mix(-.12,.15,snap);lunge=Math.sin(p*Math.PI)*15;
    }else if(phase==='second-windup'){
      lean=mix(.15,.08,p);
    }else if(phase==='second-strike'){
      const snap=ease(clamp((sample.progress-.04)/.65));
      lean=mix(.08,-.14,snap);lunge=Math.sin(p*Math.PI)*18;
    }else if(phase==='recovering'){
      lean=mix(-.14,0,p);
    }
    const reveal=sample?.werewolf??0;
    const gathering=phase==='awakening'?Math.sin(p*Math.PI)*9:0;
    const root={x:mix(322,400,reveal)+lean*75,y:mix(386,340,reveal)+breath*1.4+gathering};
    const shoulder={x:mix(503,400,reveal)+lean*40,y:mix(345,220,reveal)+breath*1.5+gathering-lunge*.3};
    const bones={},opacity={};
    const point=(a,b)=>({x:mix(a.x,b.x,reveal),y:mix(a.y,b.y,reveal)});
    const set=(name,x,y,angle,sx,sy,px=192,py=192)=>{
      const c=Math.cos(angle),s=Math.sin(angle),a=c*sx,b=s*sx,cc=-s*sy,d=c*sy;
      bones[name]=[a,b,cc,d,x-a*px-cc*py,y-b*px-d*py];
    };
    const segment=(name,from,to,start,end,thickness=1)=>{
      const dx=end.x-start.x,dy=end.y-start.y,tx=to.x-from.x,ty=to.y-from.y;
      const scale=Math.hypot(tx,ty)/Math.hypot(dx,dy);
      const angle=Math.atan2(ty,tx)-Math.atan2(dy,dx);
      // Landmarks preserve fur/armour proportions while keeping shared joint anchors coincident.
      const c=Math.cos(angle),s=Math.sin(angle);
      const ux=dx/Math.hypot(dx,dy),uy=dy/Math.hypot(dx,dy);
      const xx=uy*uy*thickness+ux*ux,yy=ux*ux*thickness+uy*uy,xy=ux*uy*(1-thickness);
      const a=scale*(c*xx-s*xy),b=scale*(s*xx+c*xy);
      const cc=scale*(c*xy-s*yy),d=scale*(s*xy+c*yy);
      bones[name]=[a,b,cc,d,from.x-a*start.x-cc*start.y,from.y-b*start.x-d*start.y];
    };
    set('tail',root.x-40,root.y-18,.65+reveal*.2+breath*.045,-.58,.58,110,60);
    const bodyCenter=point({x:417,y:346},{x:root.x,y:300});
    set('quad-body',bodyCenter.x,bodyCenter.y,-reveal*1.2,-mix(.96,.58,reveal),mix(.76,.87,reveal));
    set('quad-hip',root.x-8,root.y-3,0,-.58,.58);
    set('pelvis',root.x,root.y,lean*.35,.56,.45,192,145);
    set('body',shoulder.x,shoulder.y-10,lean,.69,.66,192,80);
    set('head',shoulder.x+mix(28,6,reveal),shoulder.y-mix(2,27,reveal),
      -.06+lean*.55+breath*.006,mix(.55,.53,reveal),mix(.55,.53,reveal),178,320);
    const material=ease(clamp((reveal-.25)/.55));
    const canineSkin=clamp((1-material)*2),uprightSkin=clamp(material*2);
    opacity['quad-body']=opacity['quad-hip']=canineSkin;
    opacity.body=opacity.pelvis=uprightSkin;
    const tips={};
    for(const [prefix,sign] of [['far-',-1],['',1]]){
      const origin=point({x:503+sign*16,y:354},{x:shoulder.x+sign*62,y:shoulder.y+5});
      const idleAngle=sign===1?-.3:.24,idleElbow=sign===1?.28:-.22;
      const idle={x:-Math.sin(idleAngle)*90-Math.sin(idleAngle+idleElbow)*125,
        y:Math.cos(idleAngle)*90+Math.cos(idleAngle+idleElbow)*125};
      const raised={x:sign*95,y:-174},finish={x:-sign*165,y:160};
      let offset=idle;
      const blend=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
      if(phase==='first-windup')offset=sign===1?blend(idle,raised,p):idle;
      if((phase==='first-strike'&&sign===1)||(phase==='second-strike'&&sign===-1)){
        const t=ease(clamp(((sample.progress||0)-.04)/.66)),control={x:sign*115,y:90};
        offset=blend(blend(raised,control,t),blend(control,finish,t),t);
      }else if(phase==='first-strike'||phase==='second-strike')offset=idle;
      if(phase==='second-windup')offset=sign===1?blend(finish,idle,p):blend(idle,raised,p);
      if(phase==='recovering')offset=sign===-1?blend(finish,idle,p):idle;
      const length=Math.hypot(offset.x,offset.y),distance=Math.min(214,length);
      const direction=Math.atan2(offset.y,offset.x);
      const bend=Math.acos(Math.max(-1,Math.min(1,(90*90+distance*distance-125*125)/(180*distance))));
      const uprightTip={x:origin.x+offset.x*distance/length,y:origin.y+offset.y*distance/length};
      const uprightElbow={x:origin.x+Math.cos(direction+sign*bend)*90,y:origin.y+Math.sin(direction+sign*bend)*90};
      const knee=point({x:492+sign*17,y:435},{x:uprightElbow.x,y:uprightElbow.y});
      const tip=point({x:513+sign*20,y:545},{x:uprightTip.x,y:uprightTip.y});
      segment(prefix+'front',origin,knee,{x:190,y:62},{x:202,y:325},1.06);
      segment(prefix+'paw',knee,tip,{x:174,y:48},{x:230,y:329});
      segment(prefix+'arm',origin,knee,{x:173,y:68},{x:205,y:318},1.16);
      segment(prefix+'claw',knee,tip,{x:162,y:72},{x:218,y:324},1.08);
      opacity[prefix+'front']=opacity[prefix+'paw']=canineSkin;
      opacity[prefix+'arm']=opacity[prefix+'claw']=uprightSkin;
      tips[prefix+'claw']=tip;
    }
    for(const [prefix,sign] of [['far-',-1],['',1]]){
      const hip={x:root.x+sign*mix(13,36,reveal),y:root.y+mix(0,20,reveal)};
      const step=ease(clamp(sign===1?(reveal-.3)/.7:reveal/.65));
      const ankle={x:mix(300+sign*24,400+sign*76,step),y:545-Math.sin(step*Math.PI)*30};
      const knee=point({x:275+sign*20,y:464},{x:root.x+sign*73,y:451});
      segment(prefix+'thigh',hip,knee,{x:191,y:65},{x:220,y:332},mix(1,1.25,reveal));
      segment(prefix+'shin',knee,ankle,{x:175,y:55},{x:229,y:332},mix(1,1.12,reveal));
    }
    for(const [name] of parts)opacity[name]=(opacity[name]??1)*(name.startsWith('far-')?.7:1);
    return {bones,opacity,root,lunge,reveal,tips};
  }
  function render(target,sample,time,still=false){
    let refs=cache.get(target);
    if(!refs){
      refs={bones:[...target.querySelectorAll('[data-wolf-bone]')],rig:target.querySelector('.wolf-rig')};
      cache.set(target,refs);
    }
    const movement=pose(sample,time,still),reveal=sample?.werewolf??0;
    for(const bone of refs.bones){
      const name=bone.dataset.wolfBone;
      bone.setAttribute('transform',`matrix(${movement.bones[name].join(' ')})`);
      bone.setAttribute('opacity',String(movement.opacity[name]));
    }
    if(refs.rig){
      refs.rig.style.opacity='1';
      refs.rig.dataset.form=reveal===0?'wolf':reveal===1?'werewolf':'transforming';
    }
    return movement;
  }
  function draw(context,sample,geometry,time,phone=false,reduced=false){
    const toX=x=>geometry.x+x/800*geometry.width,toY=y=>geometry.y+y/600*geometry.height;
    const unit=geometry.width/800,cx=toX(400),cy=toY(310);
    const phase=sample?.phase||'idle',p=sample?.progress||0;
    context.save();
    const glow=context.createRadialGradient(cx,cy,0,cx,cy,190*unit);
    glow.addColorStop(0,`rgba(99,28,150,${sample?.werewolf ? .13 : .07})`);
    glow.addColorStop(.6,'rgba(23,171,210,.05)');glow.addColorStop(1,'rgba(20,50,100,0)');
    context.fillStyle=glow;context.fillRect(cx-200*unit,cy-200*unit,400*unit,400*unit);
    context.fillStyle='rgba(0,3,14,.55)';
    context.beginPath();context.ellipse(cx,toY(552),mix(172,105,sample?.werewolf??0)*unit,10*unit,0,0,Math.PI*2);context.fill();
    if(reduced){context.restore();return;}
    context.globalCompositeOperation='lighter';
    const transforming=phase==='transforming'||phase==='reverting';
    if(phase==='awakening'||transforming){
      const strength=phase==='awakening'?ease(p):Math.sin(p*Math.PI);
      const radius=(phase==='awakening'?100+28*p:128+80*p)*unit;
      for(let ring=0;ring<3;ring++){
        context.strokeStyle=`rgba(${ring%2?'242,95,255':'93,231,255'},${strength*(.5-ring*.1)})`;
        context.lineWidth=(ring===0?1.8:.7)*unit;
        context.beginPath();context.ellipse(cx,cy,radius+ring*13*unit,(radius+ring*13*unit)*.8,time*.00015*(ring%2?-1:1),.2+ring,5.6+ring);context.stroke();
      }
      const count=phone?25:50;
      for(let i=0;i<count;i++){
        const angle=i*2.39996+time*.00015;
        const distance=(60+(i%11)*12+strength*35)*unit;
        const x=cx+Math.cos(angle)*distance,y=cy+Math.sin(angle)*distance*.82;
        context.fillStyle=`rgba(${i%3?'107,227,255':'251,111,255'},${strength*.7})`;
        context.beginPath();context.moveTo(x,y-3*unit);context.lineTo(x+2*unit,y+3*unit);context.lineTo(x-2*unit,y+unit);context.closePath();context.fill();
      }
      if(transforming){
        const lineY=toY(85+440*(phase==='reverting'?1-p:p));
        const beam=context.createLinearGradient(toX(200),0,toX(600),0);
        beam.addColorStop(0,'rgba(74,204,255,0)');beam.addColorStop(.5,`rgba(176,243,255,${strength*.6})`);beam.addColorStop(1,'rgba(236,109,255,0)');
        context.fillStyle=beam;context.fillRect(toX(200),lineY,400*unit,1.3*unit);
      }
    }
    if(phase==='first-strike'||phase==='second-strike'){
      const second=phase==='second-strike',steps=phone?16:26;
      const alpha=clamp((1-p)/.3)*clamp(p/.12);
      const start=Math.min(p,.04);
      const samples=Array.from({length:steps+1},(_,index)=>
        pose({phase,progress:mix(start,p,index/steps),werewolf:1},time,true).tips[second?'far-claw':'claw']);
      for(let claw=0;claw<3;claw++){
        const offset=(claw-1)*15;
        const points=samples.map((point,index)=>{
          const before=samples[Math.max(0,index-1)],after=samples[Math.min(steps,index+1)];
          const dx=after.x-before.x,dy=after.y-before.y,length=Math.max(1,Math.hypot(dx,dy));
          return {x:point.x-dy/length*offset,y:point.y+dx/length*offset,nx:-dy/length,ny:dx/length};
        });
        const path=width=>{
          const sides=[[],[]];
          for(let index=0;index<=steps;index++){
            const fraction=index/steps,{x,y,nx,ny}=points[index];
            const taper=Math.sin(fraction*Math.PI)**.65*width/2;
            sides[0].push([toX(x+nx*taper),toY(y+ny*taper)]);
            sides[1].push([toX(x-nx*taper),toY(y-ny*taper)]);
          }
          context.beginPath();
          [...sides[0],...sides[1].reverse()].forEach(([x,y],index)=>index?context.lineTo(x,y):context.moveTo(x,y));
          context.closePath();
        };
        for(const [width,color] of [[28,'124,34,255'],[15,'181,44,255'],[7,'243,90,255'],[2.2,'232,255,255']]){
          context.fillStyle=`rgba(${color},${alpha*(width>15?.13:width>7?.3:.9)})`;
          path(width);context.fill();
        }
        const count=phone?6:11;
        for(let i=0;i<count;i++){
          const tip=points[Math.max(0,steps-i)];
          const x=toX(tip.x)+(Math.sin(i*7+claw)*16*unit)*p;
          const y=toY(tip.y)+(Math.cos(i*13+claw)*16*unit)*p;
          context.fillStyle=`rgba(166,220,255,${alpha*(1-i/count)})`;
          context.fillRect(x,y,1.5*unit,1.5*unit);
        }
      }
    }
    context.restore();
  }
  return {asset,avatar,markup,frame,duration,pose,render,draw};
})();
