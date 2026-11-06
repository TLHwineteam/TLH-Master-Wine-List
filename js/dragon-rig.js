/* Original joint-overlap artwork; one shared atlas, no pose crossfades or extra animation loop. */
const CosmicDragonRig=(()=>{
  const asset='images/cosmic-dragon-rig.webp?v=premium-anatomy-20261107-2';
  const rad=Math.PI/180,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const matrix=(x,y,angle=0,sx=1,sy=sx)=>{
    const c=Math.cos(angle),s=Math.sin(angle);return [c*sx,s*sx,-s*sy,c*sy,x,y];
  };
  const point=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});
  const compose=(a,b)=>[
    a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]
  ];
  const parts=[
    ['tail',0,350,185,.82],
    ['far-wing',6,320,290,.88,.72],
    ['far-thigh',7,150,70,95/Math.hypot(120,180),.76],
    ['far-shin',8,100,55,110/Math.hypot(160,230),.76],
    ['far-arm',9,90,95,100/244,.72],
    ['far-hand',10,80,85,118/269,.72],
    ['thigh',7,150,70,95/Math.hypot(120,180)],
    ['shin',8,100,55,110/Math.hypot(160,230)],
    ['wing',5,350,300,.88],
    ['body',1,95,210,.78],
    ['neck',2,150,300,.63],
    ['arm',9,90,95,100/244],
    ['hand',10,80,85,118/269],
    ['head',3,190,245,.65],
    ['jaw',4,76,150,.3575]
  ];
  const grids={
    wing:[[0,175,350,384],[0,150,300,344]],
    'far-wing':[[0,160,320,384],[0,145,290,344]],
    tail:[[0,120,240,350,384],[0,185,344]],
    neck:[[0,150,225,384],[0,110,300,344]]
  };
  const surfaces={};
  for(const [name,,px,py,scale] of parts){
    const grid=grids[name];
    if(!grid)continue;
    const [xs,ys]=grid,vertices=ys.flatMap(y=>xs.map(x=>({x:(x-px)*scale,y:(y-py)*scale})));
    const triangles=[];
    for(let y=0;y<ys.length-1;y++)for(let x=0;x<xs.length-1;x++){
      const a=y*xs.length+x,b=a+1,c=a+xs.length,d=c+1;
      triangles.push([a,b,d],[a,d,c]);
    }
    surfaces[name]={vertices,triangles};
  }
  const cache=new WeakMap();
  let instance=0;
  function markup(){
    const prefix=`dragon-surface-${++instance}`;
    const image=(cell,x,y,scale)=>`<svg x="${-x*scale}" y="${-y*scale}"
      width="${384*scale}" height="${344*scale}"
      viewBox="${cell%4*384} ${Math.floor(cell/4)*344} 384 344" overflow="hidden">
      <image href="${asset}" width="1536" height="1032"/></svg>`;
    return `<svg class="dragon-rig" viewBox="0 0 800 600" aria-hidden="true" focusable="false">
      ${parts.map(([name,cell,x,y,scale,opacity=1])=>`<g data-bone="${name}" opacity="${opacity}">
        ${name==='head'?'<path data-mouth-interior fill="#09182b" stroke="#233f60" stroke-width=".5"/>':''}
        ${surfaces[name]?surfaces[name].triangles.map((triangle,index)=>{
          const id=`${prefix}-${name}-${index}`;
          return `<defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse">
            <polygon points="${triangle.map(i=>`${surfaces[name].vertices[i].x},${surfaces[name].vertices[i].y}`).join(' ')}"/>
            </clipPath></defs><g data-surface="${name}" data-triangle="${index}">
            <g clip-path="url(#${id})">${image(cell,x,y,scale)}</g></g>`;
        }).join(''):image(cell,x,y,scale)}</g>`).join('')}</svg>`;
  }
  function deform(name,p,sample){
    const {seconds,still,stage,fire}=sample.motion;
    const moving=still?0:1;
    if(name==='wing'||name==='far-wing'){
      const far=name==='far-wing',reach=clamp(-p.x/300);
      const phase=seconds*2.2-reach*2.7+(far?-.85:0);
      const stretch=(5+ease(stage)*3)*moving;
      const membrane=1+clamp((p.y+240)/240)*.35;
      const folded=reach*(1-reach)*(1-ease(stage))*18*moving;
      return {x:p.x+reach*reach*Math.sin(phase)*2.3*moving,
        y:p.y+folded+reach*reach*(Math.sin(phase)*stretch*membrane
          +fire*Math.sin(seconds*7.4-reach*4)*1.5*moving)};
    }
    if(name==='tail'){
      const reach=clamp(-p.x/287),wave=Math.sin(seconds*1.4-reach*3.8);
      return {x:p.x+reach*reach*wave*2*moving,
        y:p.y+reach*reach*(wave*8+Math.sin(seconds*.7-reach*2)*3)*moving};
    }
    if(name==='neck'){
      const reach=clamp(-p.y/189);
      const curve=reach*reach*(Math.sin(seconds*1.65-reach)*2
        +fire*Math.sin(seconds*12-reach*.8)*1.3)*moving;
      return {x:p.x+curve,y:p.y+reach*Math.sin(seconds*1.65-.5)*.8*moving};
    }
    return p;
  }
  function surfaceMatrices(name,sample){
    const {vertices,triangles}=surfaces[name];
    const warped=vertices.map(p=>deform(name,p,sample));
    return triangles.map(([i,j,k])=>{
      const a=vertices[i],b=vertices[j],c=vertices[k],u=warped[i],v=warped[j],w=warped[k];
      const dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y,det=dx*ey-dy*ex;
      const m=[((v.x-u.x)*ey-(w.x-u.x)*dy)/det,
        ((v.y-u.y)*ey-(w.y-u.y)*dy)/det,
        ((w.x-u.x)*dx-(v.x-u.x)*ex)/det,
        ((w.y-u.y)*dx-(v.y-u.y)*ex)/det,0,0];
      m[4]=u.x-m[0]*a.x-m[2]*a.y;m[5]=u.y-m[1]*a.x-m[3]*a.y;
      return m;
    });
  }
  function limb(root,end,upper,lower,bend){
    const dx=end.x-root.x,dy=end.y-root.y;
    const distance=Math.max(.001,Math.min(upper+lower-.001,Math.hypot(dx,dy)));
    const angle=Math.atan2(dy,dx)+bend*Math.acos(Math.max(-1,Math.min(1,
      (upper*upper+distance*distance-lower*lower)/(2*upper*distance))));
    const knee={x:root.x+Math.cos(angle)*upper,y:root.y+Math.sin(angle)*upper};
    return {knee,upper:angle,lower:Math.atan2(end.y-knee.y,end.x-knee.x)};
  }
  function pose(stage=0,seconds=0,fire=0,still=false,returning=false){
    stage=Math.max(0,Math.min(2,stage));fire=clamp(fire);
    const rise=ease(stage),brace=ease(stage-1);
    const interpolate=(sitting,standing,attacking)=>returning?
      mix(sitting,attacking,ease(stage/2)):mix(mix(sitting,standing,rise),attacking,brace);
    const follow=(sitting,standing,attacking,delay)=>
      returning?interpolate(sitting,standing,attacking):
      mix(mix(sitting,standing,ease((stage-delay)/(1-delay))),attacking,
        ease((stage-1-delay)/(1-delay)));
    const anticipation=returning?0:Math.sin(Math.PI*clamp(stage/.3))**2*(stage<.3?1:0);
    const breath=still?0:Math.sin(seconds*1.65)*1.6;
    const recoil=fire*(still?0:Math.sin(seconds*12)*.6);
    const hip={x:interpolate(330,350,350)-anticipation*4,
      y:interpolate(470,410,438)+anticipation*6+breath*.35};
    const body=matrix(hip.x,hip.y,(interpolate(-24,-40,-8)-anticipation*2+breath*.22)*rad,
      1+breath*.0014,1+breath*.003);
    const shoulder=point(body,226*.78,-38*.78);
    const motion={seconds:still?0:seconds,stage,fire,still};
    const neck=compose(matrix(shoulder.x,shoulder.y),
      matrix(0,0,(follow(-4,-14,10,.08)+recoil+breath*.3)*rad));
    const skullJoint=deform('neck',{x:75*.63,y:-190*.63},{motion});
    const skull=point(neck,skullJoint.x,skullJoint.y);
    const headAngle=(follow(-3,-12,-2,.14)+recoil+breath*.24)*rad;
    const head=matrix(skull.x,skull.y,headAngle);
    const jawOpen=follow(2,10,25,.18);
    const jawFlutter=still?0:fire*Math.sin(seconds*10-.5)*.8;
    const jaw=compose(head,matrix(26*.65,12*.65,(jawOpen+jawFlutter)*rad));
    const mouth=point(head,169*.65,9+fire*8);
    const wingMotion=still?0:Math.sin(seconds*2.2)*interpolate(1.2,3.8,2)
      +fire*Math.sin(seconds*7.4+.8)*.7;
    const farWingMotion=still?0:Math.sin(seconds*2.2-.8)*interpolate(1,3,1.7)
      +fire*Math.sin(seconds*7.4)*.5;
    const wing=matrix(shoulder.x-8,shoulder.y+22,
      (follow(-23,-12,-18,.1)+wingMotion)*rad,
      follow(1.1,1.35,1.4,.1),follow(1.02,1.22,1.28,.1));
    const farWing=matrix(shoulder.x+6,shoulder.y+22,
      (follow(-9,-10,-8,.16)+farWingMotion)*rad,
      -follow(.82,1.02,.92,.16),follow(.94,.94,1.04,.16));
    const foot={x:368,y:575},back=limb(hip,foot,95,110,1);
    const farHip={x:hip.x+16,y:hip.y+4},farFoot={x:408,y:568};
    const farBack=limb(farHip,farFoot,95,110,1);
    const armRoot={x:shoulder.x+2,y:shoulder.y+32};
    const claw={x:follow(560,591,621,.07),y:follow(568,355,563,.07)};
    const arm=limb(armRoot,claw,100,118,-1);
    const farRoot={x:armRoot.x-16,y:armRoot.y+4};
    const farClaw={x:claw.x-37,y:claw.y-7},farArm=limb(farRoot,farClaw,100,118,-1);
    const bones={
      tail:matrix(hip.x-12,hip.y+6,(interpolate(-9,-1,-5)+(still?0:Math.sin(seconds*1.4)*2.5))*rad),
      'far-wing':farWing,
      'far-thigh':matrix(farHip.x,farHip.y,farBack.upper-Math.atan2(180,120)),
      'far-shin':matrix(farBack.knee.x,farBack.knee.y,farBack.lower-Math.atan2(230,160)),
      'far-arm':matrix(farRoot.x,farRoot.y,farArm.upper-Math.atan2(165,180)),
      'far-hand':matrix(farArm.knee.x,farArm.knee.y,farArm.lower-Math.atan2(200,180)),
      thigh:matrix(hip.x,hip.y,back.upper-Math.atan2(180,120)),
      shin:matrix(back.knee.x,back.knee.y,back.lower-Math.atan2(230,160)),
      body,neck,wing,
      arm:matrix(armRoot.x,armRoot.y,arm.upper-Math.atan2(165,180)),
      hand:matrix(arm.knee.x,arm.knee.y,arm.lower-Math.atan2(200,180)),
      head,jaw
    };
    const lowerLip=point(matrix(26*.65,12*.65,(jawOpen+jawFlutter)*rad),264*.3575,10*.3575);
    return {bones,mouth,mouthAngle:headAngle,foot,hip,shoulder,claw,jawOpen,lowerLip,motion};
  }
  function render(root,sample){
    let nodes=cache.get(root);
    if(!nodes){
      nodes={bones:[...root.querySelectorAll('[data-bone]')],
        surfaces:[...root.querySelectorAll('[data-surface]')],
        mouth:root.querySelector('[data-mouth-interior]')};
      cache.set(root,nodes);
    }
    for(const node of nodes.bones)node.setAttribute('transform',`matrix(${sample.bones[node.dataset.bone].join(' ')})`);
    nodes.mouth.setAttribute('d',`M 14 4 Q 66 2 112 8 L ${sample.lowerLip.x} ${sample.lowerLip.y} Q 48 28 14 18 Z`);
    const matrices={};
    for(const name of Object.keys(surfaces))matrices[name]=surfaceMatrices(name,sample);
    for(const node of nodes.surfaces)
      node.setAttribute('transform',`matrix(${matrices[node.dataset.surface][Number(node.dataset.triangle)].join(' ')})`);
  }
  return {asset,markup,pose,render,point,deform,surfaceMatrices,surfaces};
})();
