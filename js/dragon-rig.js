/* Original joint-overlap artwork; one shared atlas, no pose crossfades or extra animation loop. */
const CosmicDragonRig=(()=>{
  const asset='images/cosmic-dragon-rig.webp?v=jointed-20261106-1';
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
    ['far-wing',6,320,290,.88,.8],
    ['far-thigh',7,150,70,95/Math.hypot(120,180),.55],
    ['far-shin',8,100,55,110/Math.hypot(160,230),.55],
    ['far-arm',9,90,95,100/244,.6],
    ['far-hand',10,80,85,118/269,.6],
    ['thigh',7,150,70,95/Math.hypot(120,180)],
    ['shin',8,100,55,110/Math.hypot(160,230)],
    ['body',1,95,210,.78],
    ['neck',2,150,300,.63],
    ['wing',5,350,300,.88],
    ['arm',9,90,95,100/244],
    ['hand',10,80,85,118/269],
    ['head',3,190,245,.65],
    ['jaw',4,76,150,.3575]
  ];
  const cache=new WeakMap();
  function markup(){
    return `<svg class="dragon-rig" viewBox="0 0 800 600" aria-hidden="true" focusable="false">
      ${parts.map(([name,cell,x,y,scale,opacity=1])=>`<g data-bone="${name}" opacity="${opacity}">
        <svg x="${-x*scale}" y="${-y*scale}" width="${384*scale}" height="${344*scale}"
          viewBox="${cell%4*384} ${Math.floor(cell/4)*344} 384 344" overflow="hidden">
          <image href="${asset}" width="1536" height="1032"/>
        </svg></g>`).join('')}</svg>`;
  }
  function limb(root,end,upper,lower,bend){
    const dx=end.x-root.x,dy=end.y-root.y;
    const distance=Math.max(.001,Math.min(upper+lower-.001,Math.hypot(dx,dy)));
    const angle=Math.atan2(dy,dx)+bend*Math.acos(Math.max(-1,Math.min(1,
      (upper*upper+distance*distance-lower*lower)/(2*upper*distance))));
    const knee={x:root.x+Math.cos(angle)*upper,y:root.y+Math.sin(angle)*upper};
    return {knee,upper:angle,lower:Math.atan2(end.y-knee.y,end.x-knee.x)};
  }
  function pose(stage=0,seconds=0,fire=0,still=false){
    const rise=ease(stage),brace=ease(stage-1);
    const interpolate=(sitting,standing,attacking)=>mix(mix(sitting,standing,rise),attacking,brace);
    const breath=still?0:Math.sin(seconds*1.65)*1.6;
    const recoil=fire*(still?0:Math.sin(seconds*12)*.6);
    const hip={x:interpolate(330,350,350),y:interpolate(470,410,438)};
    const body=matrix(hip.x,hip.y,interpolate(-24,-40,-8)*rad);
    const shoulder=point(body,226*.78,-38*.78);
    const neck=compose(matrix(shoulder.x,shoulder.y+breath),
      matrix(0,0,(interpolate(-4,-14,10)+recoil)*rad));
    const skull=point(neck,75*.63,-190*.63);
    const headAngle=(interpolate(-3,-12,-2)+recoil)*rad;
    const head=matrix(skull.x,skull.y,headAngle);
    const jawOpen=interpolate(3,13,29);
    const jaw=compose(head,matrix(26*.65,12*.65,jawOpen*rad));
    const mouth=point(head,169*.65,9+fire*8);
    const wingMotion=still?0:Math.sin(seconds*2.2)*interpolate(1.2,3.8,2)
      +fire*Math.sin(seconds*7.4+.8)*.7;
    const farWingMotion=still?0:Math.sin(seconds*2.2-.8)*interpolate(1,3,1.7)
      +fire*Math.sin(seconds*7.4)*.5;
    const wing=matrix(shoulder.x-8,shoulder.y+22,
      (interpolate(-23,-12,-18)+wingMotion)*rad,
      interpolate(1.1,1.35,1.4),interpolate(1.02,1.22,1.28));
    const farWing=matrix(shoulder.x+6,shoulder.y+22,
      (interpolate(-9,-10,-8)+farWingMotion)*rad,
      -interpolate(.82,1.02,.92),interpolate(.94,.94,1.04));
    const foot={x:368,y:575},back=limb(hip,foot,95,110,1);
    const farHip={x:hip.x+16,y:hip.y+4},farFoot={x:408,y:568};
    const farBack=limb(farHip,farFoot,95,110,1);
    const armRoot={x:shoulder.x+2,y:shoulder.y+32};
    const claw={x:interpolate(560,591,621),y:interpolate(568,355,563)};
    const arm=limb(armRoot,claw,100,118,-1);
    const farRoot={x:armRoot.x-16,y:armRoot.y+4};
    const farClaw={x:claw.x-37,y:claw.y-7},farArm=limb(farRoot,farClaw,100,118,-1);
    const bones={
      tail:matrix(hip.x-12,hip.y+22,(interpolate(-9,-1,-5)+(still?0:Math.sin(seconds*1.4)*4))*rad),
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
    return {bones,mouth,mouthAngle:headAngle,foot,hip,shoulder,claw,jawOpen};
  }
  function render(root,sample){
    let nodes=cache.get(root);
    if(!nodes){nodes=[...root.querySelectorAll('[data-bone]')];cache.set(root,nodes);}
    for(const node of nodes)node.setAttribute('transform',`matrix(${sample.bones[node.dataset.bone].join(' ')})`);
  }
  return {asset,markup,pose,render,point};
})();
