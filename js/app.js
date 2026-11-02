let catalogue=null,catalogueError='',catalogueUIReady=false,catalogueToolbar,catalogueDialog;
try{catalogue=new WineCatalogue(window.WINE_DATA,localStorage);if(catalogue.cacheError)catalogueError='Offline cache unavailable. Reconnect to load the authoritative Firebase catalogue.';}
catch(error){catalogueError=String(error.message||error);console.error('Catalogue could not be loaded:',error);}
let C=catalogue?catalogue.getData():window.WINE_DATA;
let headingSphereFrame=0;
const headingSphereMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const phoneGraphics=window.matchMedia('(any-pointer:coarse) and (max-width:600px), (any-pointer:coarse) and (max-height:500px)');
let searchRenderTimer=0;
let updatedAt=null,updateDateUnavailable=false;let current=C[0].id;const nav=document.querySelector('#nav'),main=document.querySelector('#main'),q=document.querySelector('#q'),st=document.querySelector('#st'),meta=document.querySelector('#meta');const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const n=c=>c.sections.reduce((a,s)=>a+s.items.length,0);
const wineRegionWords=new Set('france italy germany australia china england spain portugal argentina chile austria switzerland canada usa japan scotland zealand burgundy bordeaux champagne alsace languedoc loire rhone provence tuscany piedmont veneto sicily sardinia rioja ribera priorat douro napa sonoma california washington oregon victoria central otago ningxia yunnan pauillac pomerol margaux estephe pessac leognan cote chalonnaise beaune gevrey chambertin vosne romanee chablis meursault puligny montrachet chassagne julien emilion medoc barsac sauternes fronsac'.split(' '));
function wineIdentity(item){
  const wineName=String(item.name??'').replace(/\b\d+(?:\.\d+)?\s*(?:ml|l)\b/gi,' ').replace(/\b(half\s+bottle|double\s+magnum|magnum|jeroboam|imperial|methuselah|salmanazar|balthazar|nebuchadnezzar)\b/gi,' ');
  const parts=wineName.split(',');
  let first=normalizeWineText(parts.shift()??'');
  first=first.replace(/^chateau\s+/,'');
  const rest=parts.map(normalizeWineText).join(' ').split(' ').filter(word=>word&&!wineRegionWords.has(word));
  return `${String(item.v??'').trim().toLowerCase()}|${[first,...rest].join(' ')}`;
}
function normalizeWineText(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
}
function bottleFormat(item,category){
  const name=String(item.name??'').toLowerCase();
  const price=String(item.price??'').toLowerCase();
  const categoryTitle=String(category.title??'').toLowerCase();
  const text=`${name} ${price}`;
  const sizeInName=name.match(/\b(\d+(?:\.\d+)?)\s*(ml|l)\b/);
  if(sizeInName){
    const millilitres=Number(sizeInName[1])*(sizeInName[2]==='l'?1000:1);
    if(millilitres>=250)return `${millilitres}ml`;
  }
  if(/\bhalf\s+bottle\b/.test(name)||categoryTitle==='half bottles')return '375ml';
  const priceSizes=/\b(\d+(?:\.\d+)?)\s*(ml|l)\b/g;
  let sizeInPrice;
  while((sizeInPrice=priceSizes.exec(price))!==null){
    const millilitres=Number(sizeInPrice[1])*(sizeInPrice[2]==='l'?1000:1);
    if(millilitres>=1000)return `${millilitres}ml`;
  }
  if(/\b(double\s+magnum|jeroboam)\b/.test(text))return '3000ml';
  if(/\b(magnum)\b/.test(text))return '1500ml';
  if(/\b(imperial|methuselah)\b/.test(text))return '6000ml';
  if(/\bsalmanazar\b/.test(text))return '9000ml';
  if(/\bbalthazar\b/.test(text))return '12000ml';
  if(/\bnebuchadnezzar\b/.test(text))return '15000ml';
  if(categoryTitle==='large formats')return '1500ml';
  return '750ml';
}
function countDistinctBottles(){
  const identities=new Set();
  C.forEach(category=>category.sections.forEach(section=>section.items.forEach(item=>{
    if(item.catalogueHidden)return;
    identities.add(`${wineIdentity(item)}|${bottleFormat(item,category)}`);
  })));
  return identities.size;
}
let totalSelections=countDistinctBottles();
function updatedDateText(){
  if(updateDateUnavailable)return lang==='zh'?'日期未能載入':'unavailable';
  if(!updatedAt)return lang==='zh'?'讀取中…':'loading…';
  return new Intl.DateTimeFormat(lang==='zh'?'zh-HK':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Hong_Kong'}).format(updatedAt);
}
async function loadUpdatedDate(){
  try{
    let timestamp=catalogue?.state.updatedAt||window.WINE_DATA_UPDATED_AT;
    if(timestamp===undefined){
      const response=await fetch('data/wines.js',{method:'HEAD',cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      timestamp=response.headers.get('Last-Modified');
    }
    const parsedDate=typeof timestamp==='string'&&timestamp.trim()?new Date(timestamp):null;
    if(!parsedDate||Number.isNaN(parsedDate.getTime()))throw new Error('No valid wine-list update timestamp is available; run make pdf-update and publish data/wines.js');
    updatedAt=parsedDate;
    updateDateUnavailable=false;
  }catch(error){
    updateDateUnavailable=true;
    console.error('Wine-list update date unavailable:',error);
  }
  render();
}
const brandName=document.querySelector('#brand-name'),wineListTitle=document.querySelector('#wine-list-title');
const navToggle=document.querySelector('#nav-toggle');
const pageStrip=document.querySelector('#page-strip');
const welcomeCover=document.querySelector('#welcome-cover');
const NAVIGATION_HIDDEN_STORAGE_KEY='wineListNavigationHidden';
let navigationHidden=localStorage.getItem(NAVIGATION_HIDDEN_STORAGE_KEY)==='true';
const PAGE_SWIPE_MIN_DISTANCE=42;
const PAGE_SWIPE_INTENT_DISTANCE=8;
let pageSwipeStart=null;
function updateNavigationToggle(){
  const hidden=navigationHidden;
  const label=lang==='zh'?(hidden?'顯示導覽列':'隱藏導覽列'):(hidden?'Show navigation':'Hide navigation');
  navToggle.setAttribute('aria-expanded',String(!hidden));
  navToggle.setAttribute('aria-label',label);
  navToggle.title=label;
  navToggle.querySelector('span').textContent=hidden?'›':'‹';
  document.body.classList.toggle('navigation-hidden',hidden);
  setPageTouchListeners(hidden);
  renderPageStrip();
}
navToggle.addEventListener('click',()=>{navigationHidden=!navigationHidden;localStorage.setItem(NAVIGATION_HIDDEN_STORAGE_KEY,String(navigationHidden));updateNavigationToggle();});
let lang=localStorage.getItem('wineListLanguage')==='zh'?'zh':'en';
const searchCapsule=document.createElement('div');searchCapsule.className='search-capsule';
q.before(searchCapsule);searchCapsule.appendChild(q);
const searchSymbol=document.createElement('span');searchSymbol.className='search-symbol';searchSymbol.setAttribute('aria-hidden','true');
searchSymbol.innerHTML='<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
searchCapsule.appendChild(searchSymbol);
let fontSize=localStorage.getItem('wineListFontSize')||'normal';
if(!['normal','large'].includes(fontSize))fontSize='normal';
const pick=(obj,key)=>lang==='zh'&&obj&&obj[key+'Zh']?obj[key+'Zh']:(obj?.[key]??'');
const ui=()=>lang==='zh'?{brand:'天龍軒',search:'搜尋酒款',selections:'款精選',updated:'更新於',featured:'重點推介',heroTitle:'每月精選佳釀',heroSub:'精選珍稀佳釀，細味酒莊與年份故事',legal:'所有價格均以港幣計算，另收加一服務費。售價超過港幣10,000元的酒款均按現況出售，開瓶後恕不退換。',legalGeneral:'所有價格均以港幣計算，另收加一服務費。所有酒款均經品質檢查。售價超過港幣10,000元的酒款均按現況出售，開瓶後恕不退換。',noFeature:'暫未有精選酒款。'}:{brand:'Tin Lung Heen',search:'Search wines',selections:'selections',updated:'Updated',featured:'Featured selection',heroTitle:'Wine of the Month',heroSub:'A rare bottle selected for a closer look',legal:'All prices are in HK$ and subject to 10% service charge. Wines priced over HK$10,000 are sold "AS-IS"; no return or refund after the wine is opened.',legalGeneral:'All prices are in HK$ and subject to 10% service charge. All wines are inspected for quality. Wines priced over HK$10,000 are sold "AS-IS"; no return or refund after the wine is opened.',noFeature:'No featured wine found.'};
const langToggle=document.createElement('button');langToggle.type='button';langToggle.className='lang-toggle';meta.insertAdjacentElement('afterend',langToggle);
const fontControls=document.createElement('div');fontControls.className='font-controls';fontControls.setAttribute('role','group');fontControls.setAttribute('aria-label','Text size');fontControls.innerHTML='<button type="button" class="font-btn" data-size="normal" aria-label="Normal text">A</button><button type="button" class="font-btn" data-size="large" aria-label="Large text">A+</button>';langToggle.insertAdjacentElement('afterend',fontControls);
function updateLanguageUI(){
  langToggle.innerHTML=
    lang==='zh'
      ? '<span class="active">繁</span><span>/</span><span>EN</span>'
      : '<span>繁</span><span>/</span><span class="active">EN</span>';langToggle.setAttribute('aria-label',lang==='zh'?'切換至英文':'Switch to Traditional Chinese');document.documentElement.lang=lang==='zh'?'zh-Hant-HK':'en-GB';brandName.textContent=lang==='zh'?'天龍軒':'Tin Lung Heen';wineListTitle.textContent=lang==='zh'?'葡萄酒及飲料全單':'Master Wine List';q.placeholder=ui().search;updateNavigationToggle();}
langToggle.onclick=()=>{lang=lang==='zh'?'en':'zh';localStorage.setItem('wineListLanguage',lang);updateLanguageUI();updateStaffUI();navR();render();};updateLanguageUI();
function updateFontUI(){document.documentElement.dataset.fontSize=fontSize;fontControls.querySelectorAll('.font-btn').forEach(btn=>{const active=btn.dataset.size===fontSize;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});}
fontControls.querySelectorAll('.font-btn').forEach(btn=>btn.onclick=()=>{fontSize=btn.dataset.size;localStorage.setItem('wineListFontSize',fontSize);updateFontUI();});updateFontUI();
const STAFF_SESSION_KEY='wineListStaffUnlockedUntil';
const STAFF_SESSION_MS=8*60*60*1000;
const STAFF_PASSWORD='Marco';
const managerLightField=document.createElement('div');
managerLightField.className='manager-light-field';
managerLightField.setAttribute('aria-hidden','true');
managerLightField.innerHTML='<span class="light-ribbon"></span><span class="light-ribbon light-ribbon-pink"></span><span class="light-ribbon light-ribbon-prism"></span><span class="nebula-layer"></span><span class="nebula-layer nebula-layer-ice"></span><span class="celestial-bloom"></span>';
const lightDepthField=document.createElement('div');
lightDepthField.className='light-depth-field';
for(let index=0;index<3;index++){
  const wave=document.createElement('span');
  wave.className='depth-wave'+(index===1?' depth-wave-recede':'');
  wave.style.setProperty('--depth-delay',`${-index*4.3}s`);
  lightDepthField.appendChild(wave);
}
const depthColours=['#6cf5ff','#ff63cf','#ac8cff','#ffb976'];
for(let index=0;index<24;index++){
  const star=document.createElement('span');
  const angle=index*137.508*Math.PI/180,radius=14+(index%5)*6;
  star.className='depth-star'+(index%4===0?' depth-star-recede':'');
  star.style.setProperty('--star-x',`${(Math.cos(angle)*radius).toFixed(2)}vmin`);
  star.style.setProperty('--star-y',`${(Math.sin(angle)*radius).toFixed(2)}vmin`);
  star.style.setProperty('--star-angle',`${index*137.508}deg`);
  star.style.setProperty('--star-colour',depthColours[index%depthColours.length]);
  star.style.setProperty('--depth-duration',`${7.5+(index%5)*.8}s`);
  star.style.setProperty('--depth-delay',`${-index*1.13}s`);
  lightDepthField.appendChild(star);
}
managerLightField.appendChild(lightDepthField);
document.body.prepend(managerLightField);
const managerDataCanvas=document.createElement('canvas');
managerDataCanvas.className='manager-data-flow';
managerDataCanvas.setAttribute('aria-hidden','true');
managerLightField.appendChild(managerDataCanvas);
let managerDataFrame=0,managerDataContext=null;
let managerDataScene=null;
let managerDataScrolling=false,managerDataScrollTimer=0;
function startManagerDataFlow(){
  cancelAnimationFrame(managerDataFrame);managerDataFrame=0;
  if(document.hidden||!document.documentElement.classList.contains('manager-mode')){
    managerDataCanvas.width=managerDataCanvas.height=1;
    managerDataScene=null;
    return;
  }
  if(phoneGraphics.matches&&managerDataScrolling)return;
  if(!managerDataContext){
    managerDataContext=managerDataCanvas.getContext('2d');
    if(!managerDataContext){console.error('Manager data-flow background: 2D canvas is unavailable');return;}
  }
  // Background detail does not need a full-device-DPR backing surface.
  const phone=phoneGraphics.matches;
  const scale=Math.min(1,(phone?600:900)/Math.max(innerWidth,innerHeight));
  const width=Math.max(1,Math.round(innerWidth*scale)),height=Math.max(1,Math.round(innerHeight*scale));
  const compact=window.matchMedia('(any-pointer:coarse)').matches;
  const sceneKey=[width,height,phone,compact,headingSphereMotion.matches].join(':');
  if(managerDataScene?.key===sceneKey){
    managerDataScene.draw(performance.now(),true);
    return;
  }
  managerDataCanvas.width=width;managerDataCanvas.height=height;
  const context=managerDataContext,short=Math.min(width,height);
  const columns=phone?32:compact?44:64,rows=phone?8:compact?12:16;
  const colours=['#a69bff','#e38dff','#b0eaff','#f0efff'];
  const waveRows=Array.from({length:rows},(_,index)=>{
    const v=index/(rows-1)*2-1;
    return {v,sine:Math.sin(v*.65),cosine:Math.cos(v*.65),
      size:1-Math.abs(v)*.28,alpha:1-Math.abs(v)*.5};
  });
  const waveColumns=new Float64Array(columns*5);
  const atmosphere=phone?document.createElement('canvas'):null;
  if(atmosphere){
    atmosphere.width=atmosphere.height=192;
    const paint=atmosphere.getContext('2d');
    if(paint){
      [[55,70,'101,219,255'],[117,91,'198,111,255'],[95,133,'255,127,201']].forEach(([x,y,rgb])=>{
        const glow=paint.createRadialGradient(x,y,0,x,y,58);
        glow.addColorStop(0,`rgba(${rgb},.6)`);glow.addColorStop(.4,`rgba(${rgb},.22)`);
        glow.addColorStop(1,`rgba(${rgb},0)`);
        paint.fillStyle=glow;paint.fillRect(0,0,192,192);
      });
    }else console.error('Manager atmosphere texture: 2D canvas is unavailable');
  }
  const bubbleSprites=['#ff96c9','#93f8ff','#c6abff'].map(colour=>{
    const sprite=document.createElement('canvas');
    sprite.width=sprite.height=128;
    const paint=sprite.getContext('2d');
    if(!paint){console.error('Manager bubble texture: 2D canvas is unavailable');return null;}
    const rim=paint.createRadialGradient(64,64,33,64,64,61);
    rim.addColorStop(0,'transparent');rim.addColorStop(.7,'rgba(151,115,255,.04)');
    rim.addColorStop(.87,colour);rim.addColorStop(.95,'rgba(194,130,255,.18)');rim.addColorStop(1,'transparent');
    paint.fillStyle=rim;paint.fillRect(0,0,128,128);
    paint.save();paint.beginPath();paint.arc(64,64,56,0,Math.PI*2);paint.clip();
    const pearl=paint.createRadialGradient(37,25,1,39,30,51);
    pearl.addColorStop(0,'#f1ffff');pearl.addColorStop(.2,'rgba(153,255,244,.85)');
    pearl.addColorStop(.48,'rgba(179,142,255,.38)');pearl.addColorStop(1,'transparent');
    paint.fillStyle=pearl;paint.fillRect(0,0,128,128);
    const blush=paint.createRadialGradient(92,100,0,92,100,57);
    blush.addColorStop(0,'rgba(255,235,195,.9)');blush.addColorStop(.25,'rgba(255,127,205,.6)');
    blush.addColorStop(.65,'rgba(119,134,255,.15)');blush.addColorStop(1,'transparent');
    paint.fillStyle=blush;paint.fillRect(0,0,128,128);paint.restore();
    paint.strokeStyle='rgba(236,255,255,.75)';paint.lineWidth=1.2;
    paint.beginPath();paint.arc(64,64,55,Math.PI*1.12,Math.PI*1.42);paint.stroke();
    return sprite;
  }).filter(Boolean);
  const routes=[];
  for(let side=0;side<(phone?0:4);side++){
    for(let index=0;index<6;index++){
      const lane=(index-2.5)*.026;
      const points=[[.5+lane,.5],[.5+lane,.37-index*.014],
        [.18+index*.047,.2+index*.018],[.18+index*.047,.025]];
      const angle=side*Math.PI/2;
      const rotated=points.map(([x,y])=>({
        x:(.5+(x-.5)*Math.cos(angle)-(y-.5)*Math.sin(angle))*width,
        y:(.5+(x-.5)*Math.sin(angle)+(y-.5)*Math.cos(angle))*height
      }));
      const lengths=rotated.slice(1).map((point,i)=>Math.hypot(point.x-rotated[i].x,point.y-rotated[i].y));
      routes.push({points:rotated,lengths,total:lengths.reduce((sum,length)=>sum+length,0)});
    }
  }
  let paintedAt=-Infinity,sceneTime=0;
  function draw(time,force=false){
    managerDataFrame=0;
    if(document.hidden||!document.documentElement.classList.contains('manager-mode'))return;
    if(phone&&managerDataScrolling)return;
    if(!force&&phone&&!headingSphereMotion.matches&&time-paintedAt<1000/30){
      managerDataFrame=requestAnimationFrame(draw);return;
    }
    // Resume from the last visual phase instead of jumping by the idle duration.
    sceneTime+=Number.isFinite(paintedAt)?Math.max(0,Math.min(50,time-paintedAt)):0;
    paintedAt=time;
    const t=headingSphereMotion.matches?0:sceneTime*.00024;
    context.clearRect(0,0,width,height);
    if(atmosphere){
      for(let layer=0;layer<2;layer++){
        const size=Math.min(360,short*1.25)*(1+Math.sin(t*.5+layer)*.08);
        context.save();
        context.globalAlpha=.55+Math.sin(t*.4+layer*2)*.12;
        context.translate(width*(layer?.78:.22)+Math.sin(t*.3+layer)*short*.07,
          height*(layer?.7:.25)+Math.cos(t*.25+layer)*short*.06);
        context.rotate(t*(layer?-.08:.1)+layer*2);
        context.drawImage(atmosphere,-size/2,-size/2,size,size);
        context.restore();
      }
    }
    context.lineWidth=.65;context.strokeStyle='rgba(55,235,210,.17)';
    routes.forEach((route,index)=>{
      context.beginPath();
      route.points.forEach((point,i)=>i?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));
      context.stroke();
      let distance=((t*.18+index*.137)%1)*route.total;
      let segment=0;
      while(segment<route.lengths.length-1&&distance>route.lengths[segment]){
        distance-=route.lengths[segment++];
      }
      const a=route.points[segment],b=route.points[segment+1],fraction=distance/route.lengths[segment];
      const x=a.x+(b.x-a.x)*fraction,y=a.y+(b.y-a.y)*fraction;
      context.fillStyle='rgba(65,255,225,.1)';
      context.beginPath();context.arc(x,y,5,0,Math.PI*2);context.fill();
      context.fillStyle='rgba(152,255,240,.7)';
      context.beginPath();context.arc(x,y,1.5,0,Math.PI*2);context.fill();
    });
    if(!phone){
      const chip=short*.065;
      context.strokeStyle='rgba(91,255,225,.32)';
      context.strokeRect(width*.5-chip,height*.5-chip,chip*2,chip*2);
      context.strokeRect(width*.5-chip*.72,height*.5-chip*.72,chip*1.44,chip*1.44);
    }
    for(let sheet=0;sheet<2;sheet++){
      const phase=t*(sheet?-.7:1)+sheet*2.7;
      for(let column=0;column<columns;column++){
        const u=column/(columns-1),twist=u*Math.PI*2.3+phase,offset=column*5;
        waveColumns[offset]=u*width;
        waveColumns[offset+1]=Math.sin(twist);
        waveColumns[offset+2]=Math.cos(twist);
        waveColumns[offset+3]=height*(sheet?.66:.34)+waveColumns[offset+1]*short*.16;
        waveColumns[offset+4]=(.07+.06*(1+Math.cos(u*Math.PI*3-phase)))*short*Math.cos(twist*.65);
      }
      for(let row=0;row<rows;row++){
        const {v,sine,cosine,size,alpha}=waveRows[row];
        const shiftX=Math.sin(phase*.55+v)*short*.035,shiftY=Math.sin(v*2+phase)*short*.025;
        context.fillStyle=colours[(row+sheet)%colours.length];
        for(let column=0;column<columns;column++){
          const offset=column*5;
          const depth=waveColumns[offset+1]*cosine+waveColumns[offset+2]*sine;
          const x=waveColumns[offset]+shiftX,y=waveColumns[offset+3]+v*waveColumns[offset+4]+shiftY;
          const radius=(.55+(depth+1)*.65)*size;
          context.globalAlpha=(.16+(depth+1)*.22)*alpha;
          context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fill();
        }
      }
    }
    context.globalAlpha=1;
    if(bubbleSprites.length){
      for(let index=0;index<(phone?4:compact?8:12);index++){
        const progress=(t*(.1+index%3*.025)+index*.173)%1;
        const radius=Math.min(compact?64:88,short*(.035+(index%4)*.025));
        const x=(.08+(index*.271)% .84)*width+Math.sin(t*.5+index*2)*short*.055;
        const y=height+radius-progress*(height+radius*2);
        const swell=1+Math.sin(t*.7+index)*.08;
        context.globalAlpha=.48*Math.min(1,progress*10,(1-progress)*10);
        context.drawImage(bubbleSprites[index%bubbleSprites.length],
          x-radius*swell,y-radius/swell,radius*2*swell,radius*2/swell);
      }
      context.globalAlpha=1;
    }
    if(!headingSphereMotion.matches)managerDataFrame=requestAnimationFrame(draw);
  }
  managerDataScene={key:sceneKey,draw};
  draw(performance.now());
}
window.addEventListener('resize',startManagerDataFlow);
headingSphereMotion.addEventListener('change',startManagerDataFlow);
phoneGraphics.addEventListener('change',()=>{
  startManagerDataFlow();startHeadingSphere();
});
window.addEventListener('scroll',()=>{
  if(!phoneGraphics.matches||!document.documentElement.classList.contains('manager-mode'))return;
  managerDataScrolling=true;
  cancelAnimationFrame(managerDataFrame);managerDataFrame=0;
  clearTimeout(managerDataScrollTimer);
  managerDataScrollTimer=setTimeout(()=>{
    managerDataScrolling=false;startManagerDataFlow();
  },180);
},{passive:true,capture:true});
let managerWheelActiveUntil=0;
function showManagerImpact(element,event){
  if(phoneGraphics.matches)return;
  if(!element||!document.documentElement.classList.contains('manager-mode')||document.hidden||
    element.querySelector(':scope > .manager-impact'))return;
  const impact=document.createElement('span');
  impact.className='manager-impact';
  impact.setAttribute('aria-hidden','true');
  impact.innerHTML='<span class="impact-ring"></span><span class="impact-streak"></span>';
  if(event){
    const box=element.getBoundingClientRect();
    impact.style.setProperty('--impact-x',`${Math.max(0,Math.min(100,(event.clientX-box.left)/Math.max(1,box.width)*100))}%`);
    impact.style.setProperty('--impact-y',`${Math.max(0,Math.min(100,(event.clientY-box.top)/Math.max(1,box.height)*100))}%`);
  }
  element.classList.add('manager-impact-host');
  element.appendChild(impact);
  const timeout=setTimeout(finish,1400);
  function finish(){
    clearTimeout(timeout);
    impact.remove();
    element.classList.remove('manager-impact-host');
  }
  impact.addEventListener('animationend',event=>{
    if(event.target===impact)finish();
  });
}
function showManagerSectionImpact(){
  [main.querySelector('.hero'),nav.querySelector('.navsub.active,.navcat.active'),
    pageStrip.querySelector('.page-thumb.active .page-thumb-page')].forEach(element=>showManagerImpact(element));
}
main.addEventListener('pointerdown',event=>{
  if(event.button===0)showManagerImpact(event.target.closest('.wine,.wotm-feature'),event);
},{passive:true});
const managerEffectsObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  let headingChanged=false;
  entries.forEach(entry=>{
    entry.target.classList.toggle('manager-effect-visible',entry.isIntersecting);
    if(entry.target.classList.contains('hero'))headingChanged=true;
    if(entry.isIntersecting&&entry.target.matches('.section h3')&&performance.now()<managerWheelActiveUntil){
      showManagerImpact(entry.target);
    }
  });
  if(headingChanged)startHeadingSphere();
},{rootMargin:'96px 0px'}):null;
if(managerEffectsObserver)document.documentElement.classList.add('manager-effects-ready');
function observeManagerEffects(){
  if(!managerEffectsObserver)return;
  managerEffectsObserver.disconnect();
  document.querySelectorAll('.hero,.wotm-feature,.wine,.section h3,.navcat,.navsub,.feature-media img')
    .forEach(element=>managerEffectsObserver.observe(element));
}
const staffButton=document.createElement('button');staffButton.type='button';staffButton.className='staff-mode-btn';fontControls.insertAdjacentElement('afterend',staffButton);
const staffDialog=document.createElement('dialog');staffDialog.className='staff-dialog';staffDialog.innerHTML='<form class="staff-dialog-card"><h3 class="staff-dialog-title"></h3><p class="staff-dialog-copy"></p><input class="staff-password" type="password" autocomplete="current-password" spellcheck="false"><p class="staff-error" hidden></p><div class="staff-dialog-actions"><button type="button" class="staff-cancel"></button><button type="submit" class="staff-unlock"></button></div></form>';document.body.appendChild(staffDialog);
function staffUnlocked(){return Number(localStorage.getItem(STAFF_SESSION_KEY)||0)>Date.now();}
function updateStaffUI(){
  const unlocked=staffUnlocked();
  const changed=document.documentElement.classList.contains('manager-mode')!==unlocked;
  document.documentElement.classList.toggle('manager-mode',unlocked);
  document.documentElement.classList.toggle('manager-effects-paused',document.hidden);
  if(unlocked)hideWelcomeCover();
  const wheel=document.querySelector('.navigation-wheel');
  if(wheel){
    wheel.hidden=!unlocked;
    if(!unlocked||document.hidden){releaseNavigationWheel();stopNavigationWheelScroll();}
  }
  staffButton.classList.toggle('unlocked',unlocked);
  staffButton.textContent=unlocked?'🔓 Marco':'🔒';
  staffButton.setAttribute('aria-label',lang==='zh'?(unlocked?'職員模式已啟用，按此鎖定':'解鎖職員模式'):(unlocked?'Staff mode active. Press to lock':'Unlock staff mode'));
  staffButton.title=staffButton.getAttribute('aria-label');
  startHeadingSphere();
  startManagerDataFlow();
  if(catalogueUIReady){
    updateCatalogueUI();
    if(!unlocked&&catalogueDialog.open)catalogueDialog.close();
    if(changed){navR();render();}
  }
}
function lockStaffMode(){localStorage.removeItem(STAFF_SESSION_KEY);updateStaffUI();}
function showStaffLogin(){const input=staffDialog.querySelector('.staff-password'),error=staffDialog.querySelector('.staff-error');staffDialog.querySelector('.staff-dialog-title').textContent=lang==='zh'?'職員登入':'Staff login';staffDialog.querySelector('.staff-dialog-copy').textContent=lang==='zh'?'輸入密碼以啟用職員模式八小時。':'Enter the password to enable staff mode for eight hours.';staffDialog.querySelector('.staff-cancel').textContent=lang==='zh'?'取消':'Cancel';staffDialog.querySelector('.staff-unlock').textContent=lang==='zh'?'解鎖':'Unlock';error.textContent=lang==='zh'?'密碼不正確。':'Incorrect password.';error.hidden=true;input.value='';staffDialog.showModal();setTimeout(()=>input.focus(),50);}
staffDialog.querySelector('.staff-cancel').onclick=()=>staffDialog.close();staffDialog.querySelector('form').onsubmit=e=>{e.preventDefault();const input=staffDialog.querySelector('.staff-password'),error=staffDialog.querySelector('.staff-error');if(input.value===STAFF_PASSWORD){localStorage.setItem(STAFF_SESSION_KEY,String(Date.now()+STAFF_SESSION_MS));staffDialog.close();updateStaffUI();}else{error.hidden=false;input.select();}};
staffButton.onclick=()=>{if(staffUnlocked()){lockStaffMode();}else{localStorage.setItem(STAFF_SESSION_KEY,String(Date.now()+STAFF_SESSION_MS));updateStaffUI();}};
setInterval(updateStaffUI,60000);updateStaffUI();
window.addEventListener('storage',event=>{if(event.key===STAFF_SESSION_KEY||event.key===null)updateStaffUI();});
window.addEventListener('focus',updateStaffUI);
window.addEventListener('pageshow',updateStaffUI);
document.addEventListener('visibilitychange',updateStaffUI);
headingSphereMotion.addEventListener('change',startHeadingSphere);
const navigationWheel=document.createElement('div');
navigationWheel.className='navigation-wheel';
navigationWheel.tabIndex=0;
navigationWheel.setAttribute('role','group');
navigationWheel.innerHTML='<span class="wheel-projection" aria-hidden="true"></span><span class="wheel-energy" aria-hidden="true"></span><span class="wheel-orbit" aria-hidden="true"></span><span class="wheel-telemetry" aria-hidden="true"></span><span class="wheel-core" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M8 7l4-4 4 4M12 3v18M8 17l4 4 4-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
document.body.appendChild(navigationWheel);
let wheelPointer=null,wheelAngle=null,wheelRotation=0,wheelSensitivity=320,wheelBounds=null;
let wheelScrollFrame=0,wheelScrollTarget=null,wheelScrollPosition=0,wheelFrameAt=0,wheelScrollSpeed=1.2;
function wheelLabel(){return lang==='zh'?'旋轉以捲動本頁：順時針向下，逆時針向上；到達頁首或頁尾即停止。亦可使用上下方向鍵。':'Rotate to scroll this page only: clockwise down, counterclockwise up. Stops at the top and bottom. Or use the Up and Down arrow keys.';}
function pointerWheelAngle(event){
  const box=wheelBounds??navigationWheel.getBoundingClientRect();
  const x=event.clientX-box.left-box.width/2,y=event.clientY-box.top-box.height/2;
  if(Math.hypot(x,y)<Math.max(14,box.width*.24))return null;
  return Math.atan2(y,x);
}
function stopNavigationWheelScroll(){
  cancelAnimationFrame(wheelScrollFrame);
  wheelScrollFrame=0;wheelScrollTarget=null;wheelFrameAt=0;
}
function stepNavigationWheelScroll(time){
  wheelScrollFrame=0;
  if(wheelScrollTarget===null)return;
  if(document.hidden||!document.documentElement.classList.contains('manager-mode')){
    stopNavigationWheelScroll();return;
  }
  const maximum=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  wheelScrollTarget=Math.max(0,Math.min(maximum,wheelScrollTarget));
  wheelScrollPosition=Math.max(0,Math.min(maximum,wheelScrollPosition));
  const difference=wheelScrollTarget-wheelScrollPosition;
  if(Math.abs(difference)<.5||headingSphereMotion.matches){
    window.scrollTo({top:wheelScrollTarget,behavior:'instant'});
    stopNavigationWheelScroll();return;
  }
  const elapsed=wheelFrameAt?Math.min(32,Math.max(1,time-wheelFrameAt)):1000/60;
  wheelFrameAt=time;
  const step=Math.min(Math.abs(difference)*(1-Math.exp(-elapsed/55)),elapsed*wheelScrollSpeed);
  wheelScrollPosition+=Math.sign(difference)*step;
  window.scrollTo({top:wheelScrollPosition,behavior:'instant'});
  wheelScrollFrame=requestAnimationFrame(stepNavigationWheelScroll);
}
function rotateNavigationWheel(delta,pixelsPerRadian=320){
  if(!staffUnlocked()){updateStaffUI();return;}
  const now=performance.now();
  if(now>managerWheelActiveUntil){
    showManagerImpact(navigationWheel);
    showManagerImpact(main.querySelector('.section h3.manager-effect-visible'));
  }
  managerWheelActiveUntil=now+500;
  wheelRotation+=delta*180/Math.PI;
  navigationWheel.style.setProperty('--wheel-angle',`${wheelRotation}deg`);
  const maximum=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const target=Math.max(0,Math.min(maximum,(wheelScrollTarget??window.scrollY)+delta*pixelsPerRadian));
  if(headingSphereMotion.matches){
    stopNavigationWheelScroll();
    window.scrollTo({top:target,behavior:'instant'});return;
  }
  if(wheelScrollTarget===null)wheelScrollPosition=window.scrollY;
  wheelScrollTarget=target;
  wheelScrollSpeed=pixelsPerRadian===120 ? .8 : 1.2;
  if(!wheelScrollFrame){
    wheelFrameAt=0;
    wheelScrollFrame=requestAnimationFrame(stepNavigationWheelScroll);
  }
}
navigationWheel.addEventListener('pointerdown',event=>{
  if(!staffUnlocked()||event.button!==0||wheelPointer!==null)return;
  event.preventDefault();
  stopNavigationWheelScroll();
  wheelSensitivity=event.pointerType==='touch'?120:320;
  wheelBounds=navigationWheel.getBoundingClientRect();
  wheelPointer=event.pointerId;wheelAngle=pointerWheelAngle(event);
  navigationWheel.setPointerCapture(event.pointerId);
  navigationWheel.classList.add('turning');
});
navigationWheel.addEventListener('pointermove',event=>{
  if(event.pointerId!==wheelPointer)return;
  const angle=pointerWheelAngle(event);
  if(angle===null||wheelAngle===null){wheelAngle=angle;return;}
  const delta=Math.atan2(Math.sin(angle-wheelAngle),Math.cos(angle-wheelAngle));
  wheelAngle=angle;
  if(Math.abs(delta)<=Math.PI/2+1e-6)rotateNavigationWheel(delta,wheelSensitivity);
});
function releaseNavigationWheel(event){
  const pointer=wheelPointer;
  wheelPointer=null;wheelAngle=null;wheelBounds=null;navigationWheel.classList.remove('turning');
  if(pointer!==null&&navigationWheel.hasPointerCapture(pointer))navigationWheel.releasePointerCapture(pointer);
  if(event?.type==='pointercancel'||(pointer!==null&&event?.type==='lostpointercapture'))stopNavigationWheelScroll();
}
navigationWheel.addEventListener('lostpointercapture',releaseNavigationWheel);
navigationWheel.addEventListener('pointerup',releaseNavigationWheel);
navigationWheel.addEventListener('pointercancel',releaseNavigationWheel);
navigationWheel.addEventListener('keydown',event=>{
  const direction={ArrowDown:1,ArrowRight:1,PageDown:3,ArrowUp:-1,ArrowLeft:-1,PageUp:-3}[event.key];
  if(direction){event.preventDefault();rotateNavigationWheel(direction*.5);}
});
document.addEventListener('pointerdown',event=>{
  if(!navigationWheel.contains(event.target))stopNavigationWheelScroll();
},{passive:true});
window.addEventListener('wheel',stopNavigationWheelScroll,{passive:true});
const wheelOrientation=window.matchMedia('(orientation:landscape)');
wheelOrientation.addEventListener('change',()=>{
  releaseNavigationWheel();stopNavigationWheelScroll();
});
navigationWheel.addEventListener('focus',()=>navigationWheel.setAttribute('aria-label',wheelLabel()));
navigationWheel.setAttribute('aria-label',wheelLabel());
navigationWheel.title=wheelLabel();
updateStaffUI();
let markedWines=[];
let pendingJumpKey='';
const markerStatus=document.createElement('div');markerStatus.className='marker-status';markerStatus.hidden=true;document.querySelector('.status').appendChild(markerStatus);
function wineKey(x){return [x.v,x.name,x.price].join('|');}
const FIREBASE_CONFIG={apiKey:'AIzaSyDMUG0cwI9VLZ9Ol2IrUclNOLs1w68M2lg',authDomain:'tin-lung-heen-wine-stock.firebaseapp.com',databaseURL:'https://tin-lung-heen-wine-stock-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'tin-lung-heen-wine-stock',storageBucket:'tin-lung-heen-wine-stock.firebasestorage.app',messagingSenderId:'657467145069',appId:'1:657467145069:web:7ec4e0e022c2d110e87864'};
const REMOTE_LOCK_SESSION_KEY='wineListRemoteUnlockUntil';
const REMOTE_LOCK_SESSION_MS=8*60*60*1000;
const REMOTE_LOCK_PASSWORD_SHA256='1f542ab39a9dc8885a5fc9044782838dc79883f8bd7073def13994ac5fa082f5';
let remoteLockEnabled=false;
let siteEnabled=true;

const siteDisabledOverlay=
  document.querySelector('#site-disabled');

function applySiteEnabled(){
  const disabled=!siteEnabled;

  document.body.classList.toggle(
    'site-disabled-active',
    disabled
  );

  if(siteDisabledOverlay){
    siteDisabledOverlay.hidden=!disabled;
  }
}
const remoteLockOverlay=document.querySelector('#remote-lock'),remoteLockForm=document.querySelector('#remote-lock-form'),remoteLockInput=document.querySelector('#remote-lock-password'),remoteLockError=document.querySelector('#remote-lock-error'),remoteLockTitle=document.querySelector('#remote-lock-title'),remoteLockMessage=document.querySelector('#remote-lock-message');
function remoteUnlockValid(){return Number(localStorage.getItem(REMOTE_LOCK_SESSION_KEY)||0)>Date.now();}
function applyRemoteLock(){const locked=remoteLockEnabled&&!remoteUnlockValid();document.body.classList.toggle('remote-lock-active',locked);remoteLockOverlay.hidden=!locked;if(locked){remoteLockError.hidden=true;remoteLockInput.value='';setTimeout(()=>remoteLockInput.focus(),50);}}
async function sha256(value){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');}
remoteLockForm.addEventListener('submit',async event=>{event.preventDefault();const digest=await sha256(remoteLockInput.value);if(digest===REMOTE_LOCK_PASSWORD_SHA256){localStorage.setItem(REMOTE_LOCK_SESSION_KEY,String(Date.now()+REMOTE_LOCK_SESSION_MS));remoteLockError.hidden=true;applyRemoteLock();}else{remoteLockError.hidden=false;remoteLockInput.select();}});
function startSiteEnabledSync(){
  const enabledRef=
    stockDatabase.ref('settings/siteEnabled');

  enabledRef.on(
    'value',
    snapshot=>{
      siteEnabled=
        snapshot.val()===true;

      applySiteEnabled();
    },
    error=>{
      console.error(
        'Site-enabled setting unavailable:',
        error
      );

      siteEnabled=false;
      applySiteEnabled();
    }
  );
}
function startRemoteLockSync(){const settingsRef=stockDatabase.ref('settings/remoteLock');settingsRef.on('value',snapshot=>{const settings=snapshot.val()||{};remoteLockEnabled=settings.enabled===true;remoteLockTitle.textContent=settings.title||'Service Suspended';remoteLockMessage.textContent=settings.message||'Please contact management.';applyRemoteLock();},error=>console.error('Remote lock unavailable:',error));}
setInterval(()=>{if(remoteLockEnabled)applyRemoteLock();},60000);
let stockDatabase=null,catalogueAuth=null,catalogueConnected=false,catalogueManager=false,catalogueBusy=false;
function catalogueCanWrite(){return Boolean(catalogue&&catalogue.ready&&catalogueConnected&&catalogueManager&&staffUnlocked()&&!catalogueBusy);}
function startSettingsAndCatalogueSync(){
  if(!window.firebase){catalogueError='Firebase is unavailable. Reconnect to load the shared catalogue.';updateCatalogueUI();return;}
  try{
    if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
    stockDatabase=firebase.database();
    startSiteEnabledSync();
    startRemoteLockSync();
    stockDatabase.ref('.info/connected').on('value',snapshot=>{
      catalogueConnected=snapshot.val()===true;updateCatalogueUI();
    },error=>{catalogueConnected=false;catalogueError=error.message;console.error('Catalogue connection unavailable:',error);updateCatalogueUI();});
    if(catalogue)catalogue.connect(stockDatabase.ref('wineCatalogue/v1'),{
      canWrite:()=>catalogueConnected&&catalogueManager&&staffUnlocked(),
      onChange:refreshCatalogue,
      onStatus:error=>{catalogueError=error?String(error.message||error):'';if(error)console.error('Shared catalogue unavailable:',error);updateCatalogueUI();}
    });
    if(!firebase.auth)throw new Error('Firebase Authentication SDK unavailable.');
    catalogueAuth=firebase.auth();
    let managerRef=null,authGeneration=0;
    catalogueAuth.onAuthStateChanged(user=>{
      const generation=++authGeneration;
      if(managerRef)managerRef.off();
      managerRef=null;catalogueManager=false;updateCatalogueUI();
      if(!user)return;
      managerRef=stockDatabase.ref('catalogueManagers/'+user.uid);
      managerRef.on('value',snapshot=>{
        if(generation!==authGeneration)return;
        catalogueManager=snapshot.val()===true;
        catalogueError=catalogueManager?'':'This account is not an authorised catalogue manager. Ask the Firebase administrator to grant access.';
        updateCatalogueUI();
      },error=>{
        catalogueManager=false;catalogueError=error.message;console.error('Catalogue manager permission unavailable:',error);updateCatalogueUI();
      });
    },error=>{catalogueManager=false;catalogueError=error.message;console.error('Catalogue sign-in unavailable:',error);updateCatalogueUI();});
  }catch(error){catalogueError=String(error.message||error);console.error('Firebase catalogue startup failed:',error);updateCatalogueUI();}
}
function markerText(x){return (x.v?x.v+' · ':'')+x.name;}
function wineType(sectionName,categoryTitle,x){const text=(sectionName+' '+categoryTitle+' '+(x.style||'')+' '+(x.name||'')).toLowerCase();if(/champagne|sparkling|prosecco|cava|franciacorta|sekt/.test(text))return'sparkling';if(/dessert|sauternes|barsac|tokaji|moscato|sweet|port|madeira|sherry/.test(text))return'dessert';if(/rosé|rose/.test(text))return'rose';if(/red|rouge|rosso|tinto|barolo|barbaresco|burgundy rouge/.test(text))return'red';if(/white|blanc|bianco|chablis|riesling|sauvignon|chardonnay/.test(text))return'white';return'other';}
function typeIcon(type){return{sparkling:'✦',white:'●',red:'●',rose:'●',dessert:'◆',other:'○'}[type]||'○';}
function findWineLocation(key){for(const category of C){for(const section of category.sections){const item=section.items.find(x=>!x.catalogueHidden&&wineKey(x)===key);if(item)return{category,section,item};}}return null;}
function isByTheGlass(price){return /\bglass\b/i.test(String(price||''));}
function servingChoices(x){if(x.categoryId==='c0')return[{id:'bottle',label:'Bottle (1.5L)'},{id:'glass',label:'Glass (100ml)'},{id:'carafe',label:'Carafe (375ml)'}];if(x.byGlass)return[{id:'bottle',label:lang==='zh'?'原瓶':'Bottle'},{id:'glass',label:lang==='zh'?'杯裝':'Glass'}];return[];}
function serviceControlsHtml(x,index){const choices=servingChoices(x);if(!choices.length)return'';const formats=`<div class="format-controls">${choices.map(choice=>`<button type="button" class="format-btn ${x.format===choice.id?'active':''}" data-index="${index}" data-format="${choice.id}">${choice.label}</button>`).join('')}</div>`;if(x.format!=='glass')return `<div class="service-controls">${formats}</div>`;const seats=Array.from({length:6},(_,i)=>`<button type="button" class="seat-btn ${x.seats.includes(i+1)?'active':''}" data-index="${index}" data-seat="${i+1}">S${i+1}</button>`).join('');return `<div class="service-controls">${formats}<div class="glass-controls"><div class="glass-quantity"><button type="button" class="glass-step" data-index="${index}" data-step="-1" aria-label="Decrease glasses">−</button><span>${x.glasses} ${x.glasses===1?(lang==='zh'?'杯':'glass'):(lang==='zh'?'杯':'glasses')}</span><button type="button" class="glass-step" data-index="${index}" data-step="1" aria-label="Increase glasses">+</button></div><div class="seat-controls-wrapper"><span class="seat-label">${lang==='zh'?'內部使用':'For Internal Use'}</span><div class="seat-controls" aria-label="Seat codes">${seats}</div></div></div></div>`;}
function markedEntryHtml(x,index){return `<div class="marker-row" data-key="${esc(x.key)}"><div class="marker-row-main"><button type="button" class="marker-jump" data-index="${index}" title="${lang==='zh'?'前往此酒':'Jump to this wine'}"><span class="wine-type type-${esc(x.type)}" aria-hidden="true">${typeIcon(x.type)}</span><span class="marker-status-label">${esc(markerText(x))}</span></button><button type="button" class="marker-remove" data-index="${index}" aria-label="${lang==='zh'?'移除此酒':'Remove this wine'}">×</button></div>${serviceControlsHtml(x,index)}</div>`;}
function updateMarkerUI(){const has=markedWines.length>0;document.querySelector('.status').classList.toggle('has-marker',has);markerStatus.hidden=!has;if(has){markerStatus.innerHTML=`<div class="marker-toolbar"><b>${lang==='zh'?'已選酒款':'Selected wine'}</b><button type="button" class="marker-clear-all">${lang==='zh'?'清除':'Clear'}</button></div><div class="marker-list">${markedWines.map(markedEntryHtml).join('')}</div>`;markerStatus.querySelector('.marker-clear-all').onclick=()=>{markedWines=[];updateMarkerUI();};markerStatus.querySelectorAll('.marker-remove').forEach(btn=>btn.onclick=e=>{e.stopPropagation();markedWines.splice(Number(btn.dataset.index),1);updateMarkerUI();});markerStatus.querySelectorAll('.marker-jump').forEach(btn=>btn.onclick=()=>jumpToMarked(Number(btn.dataset.index)));markerStatus.querySelectorAll('.format-btn').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const x=markedWines[Number(btn.dataset.index)];if(!x)return;x.format=btn.dataset.format;updateMarkerUI();});markerStatus.querySelectorAll('.glass-step').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const x=markedWines[Number(btn.dataset.index)];if(!x)return;x.glasses=Math.max(1,Math.min(5,x.glasses+Number(btn.dataset.step)));if(x.seats.length>x.glasses){x.seats=x.seats.slice(0,x.glasses);}updateMarkerUI();});markerStatus.querySelectorAll('.seat-btn').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const x=markedWines[Number(btn.dataset.index)],seat=Number(btn.dataset.seat);if(!x)return;x.seats=x.seats.includes(seat)?x.seats.filter(n=>n!==seat):(x.seats.length<x.glasses?[...x.seats,seat].sort((a,b)=>a-b):x.seats);updateMarkerUI();});}const keys=new Set(markedWines.map(x=>x.key));document.querySelectorAll('.wine,.wotm-feature').forEach(el=>el.classList.toggle('marked',keys.has(el.dataset.wineKey)));}
function addMarkedWine(data){if(markedWines[0]?.key===data.key)return;markedWines=[data];updateMarkerUI();}
function jumpToMarked(index){const selected=markedWines[index];if(!selected)return;current=selected.categoryId;openCat='';activeGroup=null;q.value='';pendingJumpKey=selected.key;navR();render();requestAnimationFrame(()=>requestAnimationFrame(()=>{const target=[...document.querySelectorAll('.wine,.wotm-feature')].find(el=>el.dataset.wineKey===pendingJumpKey);if(target){target.classList.add('jump-pulse');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.classList.remove('jump-pulse'),1600);}pendingJumpKey='';}));}
function markedWineData(element){return{key:element.dataset.wineKey,v:element.dataset.v,name:element.dataset.name,price:element.dataset.price,type:element.dataset.type,categoryId:element.dataset.category,byGlass:isByTheGlass(element.dataset.price),format:'bottle',glasses:1,seats:[]};}
function bindWineSelection(){
  main.querySelectorAll('.wine,.wotm-feature').forEach(entry=>{
    const selectWine=()=>{addMarkedWine(markedWineData(entry));showManagerImpact(entry);};
    let lastTapAt=0;
    entry.addEventListener('pointerup',event=>{
      if(event.pointerType!=='touch'||entry.classList.contains('sold-out'))return;
      const now=Date.now();
      if(now-lastTapAt<350){event.preventDefault();selectWine();lastTapAt=0;return;}
      lastTapAt=now;
    });
    entry.addEventListener('dblclick',event=>{
      if(entry.classList.contains('sold-out'))return;
      event.preventDefault();
      selectWine();
    });
    entry.addEventListener('keydown',event=>{
      if((event.key==='Enter'||event.key===' ')&&!entry.classList.contains('sold-out')){
        event.preventDefault();
        selectWine();
      }
    });
  });
  updateMarkerUI();
  bindWineAi();
}
// Navigation intentionally begins hierarchical browsing only after Sommelier Selection.
const PRE_SOMMELIER_IDS=new Set(['c0','c3','c4','c5']);
const GROUPS={

c2:[
  {name:'Champagne & Grower Sparkling',nameZh:'香檳及小農氣泡葡萄酒',sections:['Champagne','Grower Sparkling']},
  {name:'White',nameZh:'白葡萄酒',sections:['White']},
  {name:'Rose',nameZh:'粉紅葡萄酒',sections:['Rose']},
  {name:'Red',nameZh:'紅葡萄酒',sections:['Red']},
  {name:'Dessert',nameZh:'甜葡萄酒',sections:['Dessert']},
  {name:'Chinese Baijiu & Huadiaojiu',nameZh:'中國白酒及花雕酒',sections:['Chinese Baijiu & Huadiaojiu']},
  {name:'Alcohol-removed Wine',nameZh:'無酒精葡萄酒',sections:['Alcohol-removed Wine']}
],

c6:[
  {name:'Vintage Champagne',nameZh:'年份香檳',sections:['Vintage Champagne']},
  {name:'White Burgundy & Bordeaux',nameZh:'勃艮第及波爾多白酒',sections:['White']},
  {name:'Dessert Wines',nameZh:'甜酒',sections:['Dessert']},
  {name:'Red Bordeaux',nameZh:'波爾多紅酒',sections:['Red']},
  {name:'Domaine de la Romanee-Conti',nameZh:'羅曼尼康帝酒莊',sections:['Domaine de la Romanée-Conti']}
],

c7:[
  {name:'Champagne',nameZh:'香檳',sections:['Champagne']},
  {name:'White Burgundy',nameZh:'勃艮第白葡萄酒',sections:['Bourgogne Blanc']},
  {name:'Red Burgundy',nameZh:'勃艮第紅葡萄酒',sections:['Bourgogne Rouge']},
  {name:'Red Bordeaux',nameZh:'波爾多紅葡萄酒',sections:['Red Bordeaux','Bordeaux Rouge']}
],

 c14:[
  {name:'Alsace',nameZh:'阿爾薩斯',sections:['Alsace','Famille Hugel','Trimbach']},
  {name:'Bordeaux',nameZh:'波爾多',sections:['Bordeaux']},
  {name:'Burgundy',nameZh:'勃艮第',sections:['Chablis','Cote de Nuits','Cote de Beaune','Cote de Beaune, Grand Cru','Meursault','Puligny Montrachet','Chassagne Montrachet','Maconnais']},
  {name:'Loire',nameZh:'羅亞爾河谷',sections:['Loire Valley']},
  {name:'Rhône',nameZh:'隆河谷',sections:['Rhone Valley']}
 ],
 c20:[
  {name:'Bordeaux',nameZh:'波爾多',sections:['Graves','Haut Medoc','Margaux','Chateau Margaux','Chateau Palmer','Pauillac','Chateau Lafite Rothschild','Chateau Latour','Chateau Mouton Rothschild','St. Estephe','St. Julien','Pomerol','Petrus','St. Emilion','Chateau Angelus']},
  {name:'Burgundy',nameZh:'勃艮第',sections:['Marsannay','Gevrey Chambertin','Morey St Denis','Chambolle Musigny','Vougeot','Vosne Romanee','Nuits St Georges','Domaine de la Romanee-Conti','Aloxe-Corton','Pommard','Volnay','Santenay']},
  {name:'Beaujolais',nameZh:'薄酒萊',sections:['Beaujolais']},
  {name:'Loire',nameZh:'羅亞爾河谷',sections:['Loire Valley']},
  {name:'Rhône',nameZh:'隆河谷',sections:['Northern Rhone','M. Chapoutier','E. Guigal','Southern Rhone','Chateau de Beaucastel']}
 ],
 c19:[
  {name:'Sicily',nameZh:'西西里',sections:['Sicilia','Etna Rosso']},
  {name:'Piedmont',nameZh:'皮埃蒙特',sections:['Piemonte','Barbaresco','Barolo']},
  {name:'Lombardy',nameZh:'倫巴第',sections:['Lombardia']},
  {name:'Veneto',nameZh:'威尼托',sections:['Veneto','Amarone della Valpolicella']},
  {name:'Friuli-Venezia Giulia',nameZh:'弗留利－威尼斯朱利亞',sections:['Friuli Venezia Giulia']},
  {name:'Tuscany',nameZh:'托斯卡納',sections:['Super Toscana','Antinori','Tenuta San Guido','Brunello di Montalcino','Biondi Santi','Gaja','Mastrojanni','Soldera','Vino Nobile di Montepulciano','Chianti']},
  {name:'Central & Southern Italy',nameZh:'意大利中南部',sections:['Umbria','Marche','Lazio','Abruzzo','Campania','Basilicata','Sardegna']},
  {name:'Northern Italy',nameZh:'意大利北部',sections:['Trentino Alto Adige',"Valle D' Aosta"]}
 ],
 c21:[
  {name:'Spain',nameZh:'西班牙',sections:['Rioja','Priorat','Ribera del Duero','Costers del Segre','Catalunya','Ribeira Sacra','Navarra','Valencia']},
  {name:'Austria',nameZh:'奧地利',sections:['Austria']},
  {name:'Bulgaria',nameZh:'保加利亞',sections:['Bulgaria']}
 ],
 c17:[
  {name:'Champagne',nameZh:'香檳',sections:['Champagne']},
  {name:'White Wines',nameZh:'白葡萄酒',sections:['White Wines']},
  {name:'Red Wines',nameZh:'紅葡萄酒',sections:['Red Wines']}
 ],
 c18:[
  {name:'Champagne & Sparkling',nameZh:'香檳及氣泡酒',sections:['Champagne & Sparkling']},
  {name:'White Wines',nameZh:'白葡萄酒',sections:['White Wines']},
  {name:'Red Wines',nameZh:'紅葡萄酒',sections:['France','Italy','Spain','USA']},
  {name:'France',nameZh:'法國',sections:['France']},
  {name:'Italy',nameZh:'意大利',sections:['Italy']},
  {name:'Spain',nameZh:'西班牙',sections:['Spain']},
  {name:'USA',nameZh:'美國',sections:['USA']}
 ],
 c13:[
  {name:'Germany',nameZh:'德國',sections:['Mosel','Rheingau','Rheinhessen']},
  {name:'Spain',nameZh:'西班牙',sections:['Rias Baixas','Rioja','Rueda','Central Pyrenees']},
  {name:'Austria',nameZh:'奧地利',sections:['Kamptal']}
 ],
 c22:[
  {name:'Cabernet Sauvignon',nameZh:'赤霞珠',sections:['Cabernet Sauvignon']},
  {name:'Merlot',nameZh:'梅洛',sections:['Merlot']},
  {name:'Pinot Noir',nameZh:'黑皮諾',sections:['Pinot Noir']},
  {name:'Shiraz',nameZh:'希哈',sections:['Shiraz']},
  {name:"Penfold's Selection",nameZh:'奔富精選',sections:["Penfold's Selection"]},
  {name:'Indigenous & Curiosities',nameZh:'原生品種與特色酒款',sections:['Indigenous & Curiosities']}
 ],
 c23:[
  {name:'Port',nameZh:'砵酒',sections:['Port']},
  {name:'Madeira',nameZh:'馬德拉酒',sections:['Madeira']},
  {name:'Sherry',nameZh:'雪莉酒',sections:['Sherry']},
  {name:'Canada',nameZh:'加拿大',sections:['Canada']},
  {name:'France',nameZh:'法國',sections:['France']},
  {name:'China',nameZh:'中國',sections:['China']},
  {name:'Germany',nameZh:'德國',sections:['Germany']},
  {name:'Italy',nameZh:'意大利',sections:['Italy']},
  {name:'New Zealand',nameZh:'紐西蘭',sections:['New Zealand']},
  {name:'Hungary',nameZh:'匈牙利',sections:['Hungary']}
 ],
 c24:[
  {name:'Huangjiu',nameZh:'黃酒',sections:['Huangjiu']},
  {name:'Baijiu',nameZh:'白酒',sections:['Baijiu']}
 ],
 c25:[
  {name:'Hyogo',nameZh:'兵庫',sections:['Hyogo']},
  {name:'Niigata',nameZh:'新潟',sections:['Niigata']}
 ]
};
function navChildren(c){
 if(PRE_SOMMELIER_IDS.has(c.id))return [];
 if(GROUPS[c.id])return GROUPS[c.id];
 // After Sommelier Selection, a page unfolds only when it genuinely has multiple sections.
 if(c.sections.length>1)return c.sections.map(s=>({name:s.name,nameZh:s.nameZh,sections:[s.name]}));
 return [];
}
let openCat='',activeGroup=null;
function navigateToCategory(category,swipeDirection=0){
  if(!category)return;
  current=category.id;
  activeGroup=null;
  openCat=navChildren(category).length?category.id:'';
  q.value='';
  navR();
  render();
  showManagerSectionImpact();
  if(swipeDirection){
    window.scrollTo({top:0,behavior:'smooth'});
    main.classList.remove('page-swipe-enter');
    main.style.setProperty('--page-swipe-offset',swipeDirection>0?'20px':'-20px');
    void main.offsetWidth;
    main.classList.add('page-swipe-enter');
  }else{
    window.scrollTo({top:0,behavior:'smooth'});
  }
}
function renderPageStrip(){
  const show=navigationHidden&&!q.value.trim();
  pageStrip.hidden=!show;
  if(!show)return;
  pageStrip.setAttribute('aria-label',lang==='zh'?'葡萄酒酒單頁面':'Wine list pages');
  pageStrip.innerHTML=C.map((category,index)=>{
    const active=category.id===current;
    return `<button class="page-thumb ${active?'active':''}" type="button" data-category="${esc(category.id)}" aria-current="${active?'page':'false'}" aria-label="${esc(lang==='zh'?'前往':'Go to')} ${esc(pick(category,'title'))}">
      <span class="page-thumb-page">
        <span class="page-thumb-title">${esc(pick(category,'title'))}</span>
      </span>
      <span class="page-thumb-number">${index+1}</span>
    </button>`;
  }).join('');
  pageStrip.querySelectorAll('.page-thumb').forEach(button=>{
    button.addEventListener('click',()=>navigateToCategory(C.find(category=>category.id===button.dataset.category)));
    if(button.dataset.category===current)button.scrollIntoView({block:'nearest',inline:'nearest'});
  });
}
function turnCategoryBy(direction){
  const currentIndex=C.findIndex(category=>category.id===current);
  if(currentIndex<0)return;
  const nextIndex=(currentIndex+direction+C.length)%C.length;
  navigateToCategory(C[nextIndex],direction);
}
function updatePageSwipeAxis(x,y){
  if(!pageSwipeStart||pageSwipeStart.axis)return;
  const deltaX=x-pageSwipeStart.x,deltaY=y-pageSwipeStart.y;
  if(Math.hypot(deltaX,deltaY)<PAGE_SWIPE_INTENT_DISTANCE)return;
  pageSwipeStart.axis=Math.abs(deltaX)>=Math.abs(deltaY)*0.85?'horizontal':'vertical';
}
function finishPageSwipe(x,y){
  const start=pageSwipeStart;
  pageSwipeStart=null;
  if(!start||start.axis!=='horizontal')return;
  const deltaX=x-start.x,deltaY=y-start.y;
  if(Math.abs(deltaX)>=PAGE_SWIPE_MIN_DISTANCE&&Math.abs(deltaX)>=Math.abs(deltaY)*0.85){
    turnCategoryBy(deltaX<0?1:-1);
  }
}
function startPageTouch(event){
  if(event.touches.length!==1||event.target.closest('button,input,a,select,textarea')){
    pageSwipeStart=null;
    return;
  }
  const touch=event.touches[0];
  pageSwipeStart={x:touch.clientX,y:touch.clientY,axis:null,source:'touch'};
}
function movePageTouch(event){
  if(!pageSwipeStart||pageSwipeStart.source!=='touch')return;
  if(event.touches.length!==1){
    pageSwipeStart=null;
    return;
  }
  const touch=event.touches[0];
  updatePageSwipeAxis(touch.clientX,touch.clientY);
  if(pageSwipeStart?.axis==='horizontal'&&event.cancelable)event.preventDefault();
}
function endPageTouch(event){
  if(pageSwipeStart?.source!=='touch')return;
  const touch=event.changedTouches[0];
  if(touch)finishPageSwipe(touch.clientX,touch.clientY);
  else pageSwipeStart=null;
}
function cancelPageTouch(){
  if(pageSwipeStart?.source==='touch')pageSwipeStart=null;
}
function setPageTouchListeners(enabled){
  if(enabled){
    main.addEventListener('touchstart',startPageTouch,{passive:true});
    main.addEventListener('touchmove',movePageTouch,{passive:false});
    main.addEventListener('touchend',endPageTouch,{passive:true});
    main.addEventListener('touchcancel',cancelPageTouch,{passive:true});
  }else{
    main.removeEventListener('touchstart',startPageTouch);
    main.removeEventListener('touchmove',movePageTouch);
    main.removeEventListener('touchend',endPageTouch);
    main.removeEventListener('touchcancel',cancelPageTouch);
    cancelPageTouch();
  }
}
main.addEventListener('pointerdown',event=>{
  if(!navigationHidden||event.pointerType==='mouse'||event.pointerType==='touch'||event.target.closest('button,input,a,select,textarea'))return;
  pageSwipeStart={x:event.clientX,y:event.clientY,axis:null,source:'pointer'};
});
main.addEventListener('pointermove',event=>{
  if(pageSwipeStart?.source==='pointer')updatePageSwipeAxis(event.clientX,event.clientY);
});
main.addEventListener('pointerup',event=>{
  if(pageSwipeStart?.source==='pointer')finishPageSwipe(event.clientX,event.clientY);
});
main.addEventListener('pointercancel',()=>{
  if(pageSwipeStart?.source==='pointer')pageSwipeStart=null;
});
let pageWheelDelta=0,pageWheelTimer=null,pageWheelHandled=false;
main.addEventListener('wheel',event=>{
  if(!navigationHidden||event.ctrlKey||Math.abs(event.deltaX)<3||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.05)return;
  event.preventDefault();
  clearTimeout(pageWheelTimer);
  if(!pageWheelHandled){
    pageWheelDelta+=event.deltaX;
    if(Math.abs(pageWheelDelta)>=30){
      pageWheelHandled=true;
      turnCategoryBy(pageWheelDelta>0?1:-1);
    }
  }
  pageWheelTimer=setTimeout(()=>{
    pageWheelDelta=0;
    pageWheelHandled=false;
    pageWheelTimer=null;
  },240);
},{passive:false});
function navR(){

 const navOrder = [
   'c0', // Wine of the Month
   'c1', // National Day Selection
   'c2', // Wine by the Glass
   'c6', // Premium Fine Wine Collection
   'c7', // Sommelier Selection
   'c3', // Cocktails, Aperitifs & Digestives
   'c4', // Whiskies
   'c5'  // Beers & Beverages
 ];

 const orderedC = [
   ...navOrder.map(id => C.find(c => c.id === id)),
   ...C.filter(c => !navOrder.includes(c.id))
 ];

 nav.innerHTML=orderedC.map(c=>{const kids=navChildren(c),has=kids.length>0,open=has&&c.id===openCat,featured=navOrder.slice(0,5).includes(c.id);
  return `<div class="navgroup"><button data-cat="${c.id}" class="navcat ${featured?'nav-featured':''} ${c.id===current&&!activeGroup?'active':''}" aria-current="${c.id===current&&!activeGroup?'page':'false'}" ${has?`aria-expanded="${open}"`:''}><span>${esc(pick(c,'title'))}</span>${has?`<span class="chev">${open?'−':'+'}</span>`:''}${featured?'<span class="nav-capsule-orb" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg></span>':''}</button>${has?`<div class="subnav ${open?'show':''}">${kids.map(g=>`<button class="navsub ${c.id===current&&activeGroup===g.name?'active':''}" aria-current="${c.id===current&&activeGroup===g.name?'page':'false'}" data-cat="${c.id}" data-group="${esc(g.name)}">${esc(pick(g,'name'))}</button>`).join('')}</div>`:''}</div>`
 }).join('');
 nav.querySelectorAll('.navcat').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.cat,c=C.find(x=>x.id===id),has=navChildren(c).length>0;current=id;activeGroup=null;q.value='';openCat=has?(openCat===id?'':id):'';navR();render();showManagerSectionImpact();scrollTo({top:0,behavior:'smooth'})});
 nav.querySelectorAll('.navsub').forEach(btn=>btn.onclick=()=>{
    current = btn.dataset.cat;
    openCat = current;
    activeGroup = btn.dataset.group;
    q.value='';
    navR();
    render();
    showManagerSectionImpact();
    scrollTo({top:0,behavior:'smooth'});
});
 renderPageStrip();
}
function wineResearchPrompt(wine,category){
  return `Give me a quick, action-ready pre-service briefing for this exact wine at Tin Lung Heen.
Wine: ${wine.name}
Vintage: ${wine.v||'Not specified'}
List category: ${category.title}
Restaurant list price: ${wine.price} (HKD; service charge is additional).

Respond in ${lang==='zh'?'Traditional Chinese, retaining original producer and wine names. Keep the briefing under 350 Chinese characters, excluding original wine names and source links':'English. Keep the briefing under 180 words, excluding source links'}.
Use these five short headings, with no introduction or long paragraphs:
1. SAY: A natural two-sentence tableside pitch I can use immediately. Include one memorable, verified selling point.
2. TASTE: Region and main grapes, then three flavour cues and a few words on body, acidity and tannin/sweetness as relevant.
3. SERVE: Suggested temperature, whether to decant and for how long. Flag any mature-bottle fragility or sediment; check condition before deciding.
4. PAIR: Two specific Cantonese dish suggestions, each with a short reason. These are pairing ideas, not claims about our current menu.
5. REMEMBER: Who to recommend it to and one useful vintage or service caution.

Keep it practical and easy to scan before approaching a table. Skip vineyard/winemaking essays, critic-score lists and business analysis.
Match the exact producer, cuvée and vintage. Never invent facts, awards, scores or personal tasting experience. Label typical style and service advice as guidance, not a confirmed tasting of this bottle. If uncertain, say "not verified" rather than guess.
If browsing is available, add at most two reliable source links after the briefing, preferably the producer. If browsing is unavailable, say so briefly.`;
}
function wineAiDestination(){
  const mobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  return mobile?'https://copilot.microsoft.com/':'ms-copilot://';
}
async function showWineAi(wine,category,feedback){
  if(!staffUnlocked()){updateStaffUI();return;}
  feedback.hidden=true;
  feedback.textContent='';
  try{
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');
    const copying=navigator.clipboard.writeText(wineResearchPrompt(wine,category));
    // Keep navigation in the original click gesture, before awaiting copy.
    const link=document.createElement('a');
    const destination=wineAiDestination();
    link.href=destination;
    if(destination.startsWith('https:')){
      link.target='_blank';
      link.rel='noopener noreferrer';
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
    await copying;
    if(destination.startsWith('https:')){
      feedback.textContent=lang==='zh'?'提示詞已複製。請在 Copilot 貼上並傳送。如新分頁未開啟，請允許彈出式視窗後重試，或自行開啟 copilot.microsoft.com。':'Prompt copied. Paste and send it in Copilot. If no tab opened, allow pop-ups and retry, or open copilot.microsoft.com manually.';
      feedback.hidden=false;
    }
  }catch(error){
    console.error('Wine AI prompt handoff failed:',error);
    feedback.textContent=lang==='zh'?'未能複製提示詞。請確認使用 HTTPS 並允許剪貼簿存取，然後再按「詢問 AI」。':'Prompt not copied. Use HTTPS and allow clipboard access, then press Ask AI again.';
    feedback.hidden=false;
  }
}
function bindWineAi(){
  const lookup=new Map(C.map(category=>{
    const wines=new Map();
    category.sections.forEach(section=>section.items.forEach(wine=>{
      const key=wineKey(wine);
      if(!wines.has(key))wines.set(key,wine);
    }));
    return [category.id,{category,wines}];
  }));
  main.querySelectorAll('.wine,.wotm-feature').forEach(entry=>{
    const data=lookup.get(entry.dataset.category);
    const category=data?.category,wine=data?.wines.get(entry.dataset.wineKey);
    if(!wine)return;
    const button=document.createElement('button');button.type='button';button.className='wine-ai-button';
    button.textContent=lang==='zh'?'✧ 詢問 AI':'✧ Ask AI';
    button.setAttribute('aria-label',`${lang==='zh'?'詢問 AI：':'Ask AI about'} ${wine.v||''} ${wine.name}`);
    button.title=wineAiDestination().startsWith('https:')
      ?(lang==='zh'?'複製提示詞並開啟 Copilot 網站；請在該處貼上並傳送。':'Copy prompt and open the Copilot website; paste and send there.')
      :(lang==='zh'?'複製提示詞並開啟 Copilot 應用程式；請在該處貼上並傳送。':'Copy prompt and open the Copilot app; paste and send there.');
    const feedback=document.createElement('p');feedback.className='wine-ai-status';feedback.hidden=true;feedback.setAttribute('role','status');
    ['pointerup','dblclick','keydown'].forEach(type=>button.addEventListener(type,event=>event.stopPropagation()));
    button.onclick=event=>{event.stopPropagation();void showWineAi(wine,category,feedback);};
    const controls=entry.classList.contains('wine')?entry.querySelector('.row'):entry;
    controls.append(button,feedback);
  });
}
function catalogueText(english,chinese){return lang==='zh'?chinese:english;}
function catalogueEntryKey(item,category,section){
  return catalogue?catalogue.key(category,section,item):'';
}
function catalogueActionHtml(item,category,section){
  if(!staffUnlocked()||!catalogue)return '';
  return `<div class="catalogue-entry-controls">${item.catalogueHidden?`<span class="catalogue-hidden-label">${catalogueText('Hidden from customers','已對顧客隱藏')}</span>`:''}<button type="button" class="catalogue-manage" data-catalogue-key="${esc(catalogueEntryKey(item,category,section))}">${catalogueText('Manage item','管理酒款')}</button></div>`;
}
function updateCatalogueUI(){
  catalogueToolbar.hidden=!staffUnlocked();
  catalogueToolbar.querySelector('[data-action="add"]').textContent=catalogueText('+ Add item','＋ 新增酒款');
  catalogueToolbar.querySelector('[data-action="export"]').textContent=catalogueText('Export wines.js','匯出 wines.js');
  catalogueToolbar.querySelector('[data-action="add"]').disabled=!catalogueCanWrite()||catalogue.pending;
  catalogueToolbar.querySelector('[data-action="export"]').disabled=!catalogue?.ready||!catalogueConnected||catalogue.pending;
  const authButton=catalogueToolbar.querySelector('[data-action="auth"]');
  authButton.textContent=catalogueAuth?.currentUser?catalogueText('Sign out','登出'):catalogueText('Sign in to edit','登入以編輯');
  authButton.disabled=!catalogueAuth||catalogueBusy||Boolean(catalogue?.pending);
  const saving=catalogueBusy||catalogue?.pending;
  if(catalogueDialog.open)catalogueDialog.querySelectorAll('button,input,select').forEach(control=>{
    control.disabled=saving||((control.dataset.action==='visibility'||control.dataset.action==='confirm-delete')&&!catalogueCanWrite());
  });
  const status=catalogueToolbar.querySelector('.catalogue-scope');
  const scope=saving?catalogueText('Saving to Firebase. Keep this page open until confirmed.','正在儲存至 Firebase，確認前請保持本頁開啟。')
    :!catalogueConnected?catalogueText('Offline: showing the last available catalogue. Editing and export are disabled.','離線：顯示最近可用的酒單，暫停編輯及匯出。')
    :!catalogue?.ready?catalogueText('Loading the shared catalogue…','正在讀取共用酒單……')
    :catalogueManager?catalogueText('Live Firebase catalogue: saved changes automatically reach connected devices.','Firebase 即時酒單：儲存後會自動更新其他已連線裝置。')
    :catalogueText('Live catalogue. Sign in with an authorised Google account to edit.','即時酒單。請使用已獲授權的 Google 帳戶登入以編輯。');
  status.textContent=catalogueError
    ?catalogueText('Catalogue unavailable: ','酒單管理暫不可用：')+catalogueError
    :scope+' '+catalogueText('Export wines.js and regenerate the PDF when a new PDF is needed.','需要新 PDF 時，請匯出 wines.js 並重新生成。');
  status.classList.toggle('catalogue-error',Boolean(catalogueError));
}
function refreshCatalogue(){
  C=catalogue.getData();
  totalSelections=countDistinctBottles();
  if(catalogue.state.updatedAt){updatedAt=new Date(catalogue.state.updatedAt);updateDateUnavailable=false;}
  markedWines=markedWines.filter(selected=>C.some(category=>category.sections.some(section=>
    section.items.some(item=>!item.catalogueHidden&&wineKey(item)===selected.key))));
  navR();render();renderPageStrip();updateCatalogueUI();
}
function showCatalogueError(error){
  console.error('Catalogue action failed:',error);
  const target=catalogueDialog.querySelector('.catalogue-error');
  target.textContent=catalogueText('Not saved: ','未能儲存：')+String(error.message||error);
  target.hidden=false;
}
function showCatalogueDialog(key=null){
  if(!staffUnlocked()||!catalogue?.ready||!catalogueConnected||catalogue.pending){updateStaffUI();return;}
  const heading=catalogueText(key?'Manage item':'Add item',key?'管理酒款':'新增酒款');
  let content='';
  if(key){
    let location;
    try{location=catalogue.find(key);}catch(error){console.error('Catalogue item unavailable:',error);alert(error.message);return;}
    const item=location.item;
    content=`<p class="catalogue-item-name">${esc(item.v)} ${esc(pick(item,'name'))}</p>
      <p>${catalogueText('Hide keeps the entry for restocking. Delete removes it from the active catalogue and the next export.',
        '隱藏可保留酒款以便補貨後恢復；刪除會從目前酒單及下次匯出的檔案移除酒款。')}</p>
      <div class="catalogue-dialog-actions">
        <button type="button" data-action="visibility">${item.catalogueHidden?catalogueText('Restore to customers','恢復顯示給顧客'):catalogueText('Hide temporarily','暫時隱藏')}</button>
        <button type="button" class="catalogue-danger" data-action="delete">${catalogueText('Delete permanently','永久刪除')}</button>
      </div>
      <div class="catalogue-delete-warning" hidden>
        <p>${catalogueText('Permanently remove this entry? There is no restore button after deletion. Export a backup first if you may need it again.',
          '確定永久移除此酒款？刪除後沒有恢復按鈕。如日後可能需要，請先匯出備份。')}</p>
        <button type="button" class="catalogue-danger" data-action="confirm-delete">${catalogueText('Confirm permanent deletion','確認永久刪除')}</button>
      </div>`;
  }else{
    const categories=C.map(category=>`<option value="${esc(category.id)}" ${category.id===current?'selected':''}>${esc(pick(category,'title'))}</option>`).join('');
    content=`<div class="catalogue-fields">
      <label>${catalogueText('Category','類別')}<select name="category" required>${categories}</select></label>
      <label>${catalogueText('Section','分類')}<select name="section" required></select></label>
      <label>${catalogueText('Vintage / identifier','年份／識別標示')}<input name="v" value="NV" maxlength="50" required></label>
      <label>${catalogueText('English name, producer and region','英文名稱、酒莊及產區')}<input name="name" maxlength="500" required></label>
      <label>${catalogueText('Traditional Chinese name','繁體中文名稱')}<input name="nameZh" maxlength="500" required lang="zh-Hant"></label>
      <label>${catalogueText('Price (HK$)','價格（港幣）')}<input name="amount" type="number" inputmode="numeric" min="1" max="100000000" step="1" required></label>
      <label>${catalogueText('Optional glass price (HK$)','杯裝價格（港幣，可留空）')}<input name="glassAmount" type="number" inputmode="numeric" min="1" max="100000000" step="1"></label>
      <label>${catalogueText('Size, if not a standard bottle (optional)','容量，非標準瓶裝時填寫（可留空）')}<input name="size" placeholder="375 ml / 1.5 L / 50 ml" maxlength="30" pattern="[0-9]+([.][0-9]+)?\\s*(ml|mL|L|l)"></label>
      </div><p>${catalogueText('Use NV for non-vintage wines, or a label such as Solera 1918. Names and prices will be exported in both languages.',
        '無年份酒款請使用 NV，或填寫 Solera 1918 等標示。名稱及價格將以中英文匯出。')}</p>
      <div class="catalogue-dialog-actions"><button type="submit">${catalogueText('Save new item','儲存新酒款')}</button></div>`;
  }
  catalogueDialog.dataset.key=key||'';
  catalogueDialog.innerHTML=`<form class="catalogue-dialog-card"><div class="catalogue-dialog-heading"><h2 id="catalogue-title">${heading}</h2><button type="button" data-action="close" aria-label="${catalogueText('Close','關閉')}">×</button></div>${content}<p class="catalogue-error" role="alert" hidden></p></form>`;
  if(!key){
    const categorySelect=catalogueDialog.querySelector('[name="category"]');
    const fillSections=()=>{
      const category=C.find(value=>value.id===categorySelect.value);
      catalogueDialog.querySelector('[name="section"]').innerHTML=category.sections.map(section=>
        `<option value="${esc(section.name)}">${esc(pick(section,'name'))}</option>`).join('');
    };
    categorySelect.onchange=fillSections;
    fillSections();
  }
  catalogueDialog.showModal();
  updateCatalogueUI();
}
function setupCatalogueUI(){
  catalogueToolbar=document.createElement('section');
  catalogueToolbar.className='catalogue-toolbar';
  catalogueToolbar.hidden=true;
  catalogueToolbar.innerHTML='<div class="catalogue-toolbar-actions"><button type="button" data-action="auth"></button><button type="button" data-action="add"></button><button type="button" data-action="export"></button></div><p class="catalogue-scope" role="status"></p>';
  main.before(catalogueToolbar);
  catalogueDialog=document.createElement('dialog');
  catalogueDialog.className='catalogue-dialog';
  catalogueDialog.setAttribute('aria-labelledby','catalogue-title');
  document.body.appendChild(catalogueDialog);
  catalogueToolbar.querySelector('[data-action="auth"]').onclick=async()=>{
    if(!staffUnlocked()||!catalogueAuth)return;
    try{
      if(catalogueAuth.currentUser)await catalogueAuth.signOut();
      else await catalogueAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    }catch(error){catalogueError=String(error.message||error);console.error('Catalogue sign-in failed:',error);updateCatalogueUI();}
  };
  catalogueToolbar.querySelector('[data-action="add"]').onclick=()=>showCatalogueDialog();
  catalogueToolbar.querySelector('[data-action="export"]').onclick=()=>{
    if(!staffUnlocked()||!catalogue?.ready||!catalogueConnected||catalogue.pending){updateStaffUI();return;}
    let url;
    try{
      url=URL.createObjectURL(new Blob([catalogue.exportSource()],{type:'text/javascript;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='wines.js';
      document.body.appendChild(link);link.click();link.remove();
      catalogueToolbar.querySelector('.catalogue-scope').textContent=catalogueText(
        'Export requested. Save wines.js as data/wines.js, run make pdf-update, and publish the new PDF. Connected apps already receive your saved catalogue changes. This page cannot confirm the download was saved.',
        '已啟動匯出。請將 wines.js 儲存為 data/wines.js，再執行 make pdf-update 並發佈新的 PDF。已連線的網頁會自動收到已儲存的修改。本頁無法確認下載是否已儲存。');
    }catch(error){
      console.error('Catalogue export failed:',error);
      catalogueToolbar.querySelector('.catalogue-scope').textContent=catalogueText('Export failed: ','匯出失敗：')+error.message;
    }finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
  };
  main.addEventListener('click',event=>{
    const button=event.target.closest('.catalogue-manage');
    if(button){event.stopPropagation();showCatalogueDialog(button.dataset.catalogueKey);}
  });
  for(const type of ['pointerup','dblclick','keydown']){
    main.addEventListener(type,event=>{
      if(event.target.closest('.catalogue-entry-controls'))event.stopPropagation();
    },true);
  }
  catalogueDialog.addEventListener('cancel',event=>{if(catalogueBusy)event.preventDefault();});
  catalogueDialog.addEventListener('click',async event=>{
    const action=event.target.closest('button')?.dataset.action;
    if(action==='close'){catalogueDialog.close();return;}
    if(!action)return;
    if(!staffUnlocked()){catalogueDialog.close();updateStaffUI();return;}
    if(action==='delete'){
      catalogueDialog.querySelector('.catalogue-delete-warning').hidden=false;
      catalogueDialog.querySelector('[data-action="confirm-delete"]').focus();
      return;
    }
    if(catalogueBusy)return;
    if(!catalogueCanWrite()){
      showCatalogueError(new Error(catalogueText('Connect and sign in as an authorised manager before saving.','請先連線並以獲授權的管理員帳戶登入。')));
      return;
    }
    try{
      catalogueBusy=true;updateCatalogueUI();
      const key=catalogueDialog.dataset.key;
      if(action==='visibility')await catalogue.setHidden(key,!catalogue.find(key).item.catalogueHidden);
      else if(action==='confirm-delete')await catalogue.remove(key);
      else return;
      refreshCatalogue();catalogueDialog.close();
    }catch(error){showCatalogueError(error);}
    finally{catalogueBusy=false;updateCatalogueUI();}
  });
  catalogueDialog.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!staffUnlocked()){catalogueDialog.close();updateStaffUI();return;}
    const form=event.target;
    if(!form.reportValidity())return;
    if(catalogueBusy)return;
    if(!catalogueCanWrite()){
      showCatalogueError(new Error(catalogueText('Connect and sign in as an authorised manager before saving.','請先連線並以獲授權的管理員帳戶登入。')));
      return;
    }
    try{
      const values=new FormData(form),amount=Number(values.get('amount')),glass=values.get('glassAmount');
      const size=String(values.get('size')||'').trim();
      const money=value=>'$'+Number(value).toLocaleString('en-US');
      const price=glass?`Glass ${money(glass)} · Bottle ${money(amount)}`:money(amount);
      const priceZh=glass?`杯裝 ${money(glass)} · 原瓶 ${money(amount)}`:money(amount);
      const categoryId=String(values.get('category'));
      catalogueBusy=true;updateCatalogueUI();
      await catalogue.add(categoryId,String(values.get('section')),{
        v:String(values.get('v')).trim(),name:String(values.get('name')).trim(),
        nameZh:String(values.get('nameZh')).trim(),
        price:price+(size?` · ${size}`:''),priceZh:priceZh+(size?` · ${size}`:'')
      });
      current=categoryId;activeGroup=null;q.value='';openCat=categoryId;
      refreshCatalogue();catalogueDialog.close();
    }catch(error){showCatalogueError(error);}
    finally{catalogueBusy=false;updateCatalogueUI();}
  });
}
function card(x,category,section){
  const key=wineKey(x),sold=Boolean(x.catalogueHidden),name=pick(x,'name'),price=pick(x,'price');
  const displayName=lang==='zh'&&x.nameZh?`<span class="primary-name">${esc(x.nameZh)}</span><span class="english-name">${esc(x.name)}</span>`:esc(name);
  const vintage=String(x.v??'').trim();
  const ingredients=[x.ingredients,lang==='zh'?x.ingredientsZh:null].filter(Boolean).map((value,index)=>`<span class="ingredients${index?' ingredients-zh':''}">${esc(value)}</span>`).join('');
  return `<article class="wine ${sold?'sold-out':''}" data-wine-key="${esc(key)}" data-category="${esc(category.id)}" data-type="${esc(wineType(section.name,category.title,x))}" data-v="${esc(x.v)}" data-name="${esc(name)}" data-price="${esc(price)}" tabindex="0" role="button" aria-label="${esc(lang==='zh'?'連按兩次以標記此酒':'Double-tap to select this wine')}">
    <div class="row">
      <span class="v">${vintage?`<span class="vintage">${esc(vintage)}</span>`:''}</span>
      <span class="name">${displayName}${ingredients}</span>
      <span class="price">
${esc(price).replace(/ · /g,'<br>')}
</span>
    </div>
    ${catalogueActionHtml(x,category,section)}
  </article>`
}
function featureNote(note){
  return String(note??'').split(/\n\s*\n/).filter(Boolean).map(paragraph=>`<p>${esc(paragraph)}</p>`).join('');
}
function featureCard(x,category,section){
  const key=wineKey(x),sold=Boolean(x.catalogueHidden),name=pick(x,'name'),price=pick(x,'price');
  const displayName=lang==='zh'&&x.nameZh?`<span class="primary-name">${esc(x.nameZh)}</span><span class="english-name">${esc(x.name)}</span>`:esc(name);
  const image=x.image?`<div class="feature-media"><img src="${esc(x.image)}" alt="${esc(lang==='zh'?(x.imageAltZh||x.imageAlt||pick(x,'name')):(x.imageAlt||x.name))}" loading="eager" onerror="this.closest('.feature-media').classList.add('image-error');this.remove()"><div class="feature-image-fallback">1982<br>Château Cos d’Estournel</div></div>`:'';
  return `<section class="wotm-feature ${sold?'sold-out':''}" data-wine-key="${esc(key)}" data-category="${esc(category.id)}" data-type="${esc(wineType(section.name,category.title,x))}" data-v="${esc(x.v)}" data-name="${esc(name)}" data-price="${esc(price)}" tabindex="0" role="button" aria-label="${esc(lang==='zh'?'連按兩次以標記此酒':'Double-tap to select this wine')}">
    <div class="wotm-ribbon">${esc(ui().featured)}</div>
    <div class="wotm-grid">
      ${image}
      <div class="wotm-summary">
        <div class="wotm-vintage"><span>${esc(x.v)}</span></div>
        <h2>${displayName}</h2>
        <div class="wotm-prices">${String(price??'').split(/\s*·\s*/).filter(Boolean).map(price=>`<div class="wotm-price-line">${esc(price)}</div>`).join('')}</div>
      </div>
    </div>
    <div class="wotm-copy">${featureNote(pick(x,'note'))}</div>
    ${catalogueActionHtml(x,category,section)}
  </section>`;
}
function startHeadingSphere(){
  cancelAnimationFrame(headingSphereFrame);headingSphereFrame=0;
  const canvas=document.querySelector('.heading-sphere canvas');
  const hero=canvas?.closest('.hero');
  if(!canvas||!staffUnlocked()||document.hidden||(managerEffectsObserver&&!hero.classList.contains('manager-effect-visible')))return;
  const context=canvas.getContext('2d');
  if(!context){console.error('Holographic heading sphere: 2D canvas is unavailable');return;}
  const size=180,ratio=Math.min(window.devicePixelRatio||1,3);
  canvas.width=size*ratio;canvas.height=size*ratio;context.scale(ratio,ratio);
  const points=Array.from({length:128},(_,index)=>{
    const y=1-2*(index+.5)/128,r=Math.sqrt(1-y*y),angle=index*Math.PI*(3-Math.sqrt(5));
    return {x:Math.cos(angle)*r,y,z:Math.sin(angle)*r};
  });
  const edges=[];
  points.forEach((point,i)=>points.slice(i+1).forEach((other,j)=>{
    if(Math.hypot(point.x-other.x,point.y-other.y,point.z-other.z)<.38)edges.push([i,i+j+1]);
  }));
  const glow=context.createRadialGradient(78,66,8,90,78,79);
  glow.addColorStop(0,'rgba(10,18,57,.7)');
  glow.addColorStop(.65,'rgba(73,83,194,.12)');
  glow.addColorStop(.83,'rgba(34,220,255,.2)');
  glow.addColorStop(.9,'rgba(233,98,255,.15)');
  glow.addColorStop(1,'rgba(0,173,255,0)');
  function draw(time){
    if(!canvas.isConnected||!document.documentElement.classList.contains('manager-mode')||document.hidden||
      (managerEffectsObserver&&!hero.classList.contains('manager-effect-visible'))){headingSphereFrame=0;return;}
    const elapsed=headingSphereMotion.matches?0:time*.00015;
    const sine=Math.sin(elapsed),cosine=Math.cos(elapsed);
    function project(point){
      const x=point.x*cosine+point.z*sine;
      const z=-point.x*sine+point.z*cosine;
      const scale=65/(1-z*.13);
      return {x:90+x*scale,y:78+point.y*scale,z};
    }
    const projected=points.map(project);
    context.clearRect(0,0,size,size);
    context.fillStyle=glow;context.fillRect(0,0,size,size);
    edges.forEach(([i,j],index)=>{
      const a=projected[i],b=projected[j];
      const depth=((a.z+b.z)/2+1)/2;
      const current=.5+.5*Math.sin(elapsed*3+index*.17);
      context.strokeStyle=`rgba(${index%3?'61,222,255':'235,116,255'},${.08+depth*.45+current*.18})`;
      context.lineWidth=.35+depth*.4;
      context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
    });
    // Fine orbiting strands carry light around, rather than flattening the sphere.
    for(let strand=0;strand<4;strand++){
      const tilt=.4+strand*.75,radius=1.04+strand*.035;
      let previous=null;
      for(let step=0;step<=80;step++){
        const theta=step/80*Math.PI*2+elapsed*(strand%2?-.7:.7);
        const point=project({x:Math.cos(theta)*radius,y:Math.sin(theta)*Math.cos(tilt)*radius,z:Math.sin(theta)*Math.sin(tilt)*radius});
        if(previous){
          const light=(.5+.5*Math.sin(step*.12-elapsed*4+strand))**4;
          context.strokeStyle=`rgba(${strand%2?'255,135,234':'136,245,255'},${(.1+light*.65)*(.6+(point.z+1)*.2)})`;
          context.lineWidth=.4+light*.5;
          context.beginPath();context.moveTo(previous.x,previous.y);context.lineTo(point.x,point.y);context.stroke();
        }
        previous=point;
      }
    }
    projected.slice().sort((a,b)=>a.z-b.z).forEach((point,index)=>{
      context.fillStyle=`rgba(${index%4?'164,248,255':'255,178,239'},${.35+(point.z+1)*.3})`;
      context.beginPath();context.arc(point.x,point.y,.45+(point.z+1)*.35,0,Math.PI*2);context.fill();
    });
    for(let spark=0;spark<16;spark++){
      const [i,j]=edges[(spark*23)%edges.length],a=projected[i],b=projected[j];
      const travel=(elapsed*.8+spark*.37)%1;
      const x=a.x+(b.x-a.x)*travel,y=a.y+(b.y-a.y)*travel;
      const alpha=.3+((a.z+b.z)/2+1)*.25;
      context.fillStyle=`rgba(${spark%2?'255,115,223':'49,231,255'},${alpha*.25})`;
      context.beginPath();context.arc(x,y,3,0,Math.PI*2);context.fill();
      context.fillStyle=`rgba(235,255,255,${alpha})`;
      context.beginPath();context.arc(x,y,.9,0,Math.PI*2);context.fill();
    }
    context.lineWidth=.65;
    for(const radius of [26,38,50]){
      context.strokeStyle=radius===38?'rgba(234,134,255,.65)':'rgba(98,239,255,.65)';
      context.beginPath();context.ellipse(90,160,radius,radius*.19,0,0,Math.PI*2);context.stroke();
      const phase=elapsed*2+radius;
      context.fillStyle='rgba(223,255,255,.95)';
      context.beginPath();context.arc(90+Math.cos(phase)*radius,160+Math.sin(phase)*radius*.19,1,0,Math.PI*2);context.fill();
    }
    if(!headingSphereMotion.matches&&!phoneGraphics.matches)headingSphereFrame=requestAnimationFrame(draw);
  }
  draw(performance.now());
}
function bind(){
  clearTimeout(searchRenderTimer);
  stopNavigationWheelScroll();
  bindWineSelection();
  const hero=main.querySelector('.hero');
  if(hero){
    const copy=document.createElement('div');
    copy.className='hero-copy';
    while(hero.firstChild)copy.appendChild(hero.firstChild);
    hero.appendChild(copy);
    const sphere=document.createElement('span');
    sphere.className='heading-sphere';
    sphere.setAttribute('aria-hidden','true');
    sphere.innerHTML='<canvas></canvas>';
    hero.appendChild(sphere);
  }
  observeManagerEffects();
  startHeadingSphere();
}
function render(){const query=q.value.trim().toLowerCase();const visible=item=>staffUnlocked()||!item.catalogueHidden;if(query){let groups=[];C.forEach(c=>c.sections.forEach(s=>{let items=s.items.filter(x=>visible(x)&&(c.title+' '+s.name+' '+x.v+' '+x.name+' '+x.nameZh+' '+x.price+' '+x.note).toLowerCase().includes(query));if(items.length)groups.push({title:c.title+(s.hideHeading?'':' · '+s.name),items,category:c,section:s})}));let count=groups.reduce((a,g)=>a+g.items.length,0);st.textContent='Search results';meta.textContent=totalSelections+' selections · Updated '+updatedDateText();main.innerHTML=`<section class="hero"><div class="kicker">Search</div><h2>${esc(q.value)}</h2><p>${count} matching selections</p></section>`+(groups.length?groups.map(g=>`<section class="section"><h3>${esc(g.title)}</h3>${g.items.map(x=>card(x,g.category,g.section)).join('')}</section>`).join(''):'<div class="empty">No matching selection found.</div>');bind();return}let c=C.find(x=>x.id===current)||C[0];st.textContent='';meta.textContent=totalSelections+' '+ui().selections+' · '+ui().updated+' '+updatedDateText();const sectionKey=value=>String(value??'')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .toLowerCase()
  .replace(/&/g,' and ')
  .replace(/\bsaint\b/g,'st')
  .replace(/[^a-z0-9]+/g,' ')
  .trim();
let group=activeGroup?navChildren(c).find(g=>g.name===activeGroup):null;
let sections=group
  ?c.sections.filter(s=>group.sections.some(name=>sectionKey(name)===sectionKey(s.name)))
  :c.sections;
sections=sections.map(section=>({...section,items:section.items.filter(visible)})).filter(section=>section.items.length);
if(c.id==='c0'&&!group){
  const section=sections[0],item=section?.items?.[0];
  main.innerHTML=`<section class="hero hero-wotm"><div class="kicker">${esc(ui().brand)}</div><h2>${esc(ui().heroTitle)}</h2><p>${esc(ui().heroSub)}</p></section>`+(item?featureCard(item,c,section):`<div class="empty">${esc(ui().noFeature)}</div>`)+`<div class="legal">${esc(ui().legal)}</div>`;
  bind();
  return;
}
main.innerHTML=`<section class="hero"><div class="kicker">${esc(ui().brand)}${group?' · '+esc(pick(c,'title')):''}</div><h2>${esc(group?pick(group,'name'):pick(c,'title'))}</h2></section>`+sections.map(s=>`<section class="section">${s.hideHeading?'':`<h3>${esc(pick(s,'name'))}</h3>`}${s.items.map(x=>card(x,c,s)).join('')}</section>`).join('')+`<div class="legal">${esc(ui().legalGeneral)}</div>`;bind()}
function handleWineSearch(event){
  clearTimeout(searchRenderTimer);
  if(event.isComposing)return;
  const update=()=>{render();renderPageStrip();};
  if(phoneGraphics.matches&&q.value.trim())searchRenderTimer=setTimeout(update,150);
  else update();
}
q.oninput=handleWineSearch;
q.addEventListener('compositionend',handleWineSearch);
setupCatalogueUI();
catalogueUIReady=true;
updateCatalogueUI();
navR();
render();
loadUpdatedDate();
startSettingsAndCatalogueSync();

// Customer openings show the welcome cover; manager sessions and PDF returns bypass it.
function showWelcomeCover(){
  if(staffUnlocked()||document.documentElement.classList.contains('manager-mode')){
    hideWelcomeCover();return;
  }
  if(!welcomeCover.isConnected)document.body.prepend(welcomeCover);
  welcomeCover.hidden=false;
  welcomeCover.classList.remove('is-hidden','returning');
  void welcomeCover.offsetWidth;
  welcomeCover.classList.add('returning');
  welcomeCover.setAttribute('aria-hidden','false');
  document.body.classList.add('welcome-active');
}
function hideWelcomeCover(){
  welcomeCover.classList.add('is-hidden');
  welcomeCover.classList.remove('returning');
  welcomeCover.setAttribute('aria-hidden','true');
  document.body.classList.remove('welcome-active');
  if(staffUnlocked()||document.documentElement.classList.contains('manager-mode'))welcomeCover.remove();
}
welcomeCover.addEventListener('click',hideWelcomeCover);
welcomeCover.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();hideWelcomeCover()}});
const returningFromPdf=new URLSearchParams(window.location.search).get('from')==='pdf';
if(returningFromPdf){
  hideWelcomeCover();
}else{
  showWelcomeCover();
}
