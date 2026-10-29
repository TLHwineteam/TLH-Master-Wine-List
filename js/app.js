const C=window.WINE_DATA;
let updatedAt=null,updateDateUnavailable=false;let current=C[0].id;const nav=document.querySelector('#nav'),main=document.querySelector('#main'),q=document.querySelector('#q'),st=document.querySelector('#st'),meta=document.querySelector('#meta');const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const n=c=>c.sections.reduce((a,s)=>a+s.items.length,0);
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
    identities.add(`${wineIdentity(item)}|${bottleFormat(item,category)}`);
  })));
  return identities.size;
}
const totalSelections=countDistinctBottles();
function updatedDateText(){
  if(updateDateUnavailable)return lang==='zh'?'日期未能載入':'unavailable';
  if(!updatedAt)return lang==='zh'?'讀取中…':'loading…';
  return new Intl.DateTimeFormat(lang==='zh'?'zh-HK':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(updatedAt);
}
async function loadUpdatedDate(){
  try{
    const response=await fetch('data/wines.js',{method:'HEAD',cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const lastModified=response.headers.get('Last-Modified');
    const parsedDate=lastModified?new Date(lastModified):null;
    if(!parsedDate||Number.isNaN(parsedDate.getTime()))throw new Error('The server did not provide a valid Last-Modified date for data/wines.js');
    updatedAt=parsedDate;
  }catch(error){
    updateDateUnavailable=true;
    console.error('Wine-list update date unavailable:',error);
  }
  render();
}
const brandName=document.querySelector('#brand-name'),wineListTitle=document.querySelector('#wine-list-title');
const navToggle=document.querySelector('#nav-toggle');
const pageStrip=document.querySelector('#page-strip');
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
const staffButton=document.createElement('button');staffButton.type='button';staffButton.className='staff-mode-btn';fontControls.insertAdjacentElement('afterend',staffButton);
const staffDialog=document.createElement('dialog');staffDialog.className='staff-dialog';staffDialog.innerHTML='<form class="staff-dialog-card"><h3 class="staff-dialog-title"></h3><p class="staff-dialog-copy"></p><input class="staff-password" type="password" autocomplete="current-password" spellcheck="false"><p class="staff-error" hidden></p><div class="staff-dialog-actions"><button type="button" class="staff-cancel"></button><button type="submit" class="staff-unlock"></button></div></form>';document.body.appendChild(staffDialog);
function staffUnlocked(){return Number(localStorage.getItem(STAFF_SESSION_KEY)||0)>Date.now();}
function updateStaffUI(){const unlocked=staffUnlocked();staffButton.classList.toggle('unlocked',unlocked);staffButton.textContent=unlocked?'🔓 Marco':'🔒';staffButton.setAttribute('aria-label',lang==='zh'?(unlocked?'職員模式已啟用，按此鎖定':'解鎖職員模式'):(unlocked?'Staff mode active. Press to lock':'Unlock staff mode'));staffButton.title=staffButton.getAttribute('aria-label');}
function lockStaffMode(){localStorage.removeItem(STAFF_SESSION_KEY);updateStaffUI();}
function showStaffLogin(){const input=staffDialog.querySelector('.staff-password'),error=staffDialog.querySelector('.staff-error');staffDialog.querySelector('.staff-dialog-title').textContent=lang==='zh'?'職員登入':'Staff login';staffDialog.querySelector('.staff-dialog-copy').textContent=lang==='zh'?'輸入密碼以啟用職員模式八小時。':'Enter the password to enable staff mode for eight hours.';staffDialog.querySelector('.staff-cancel').textContent=lang==='zh'?'取消':'Cancel';staffDialog.querySelector('.staff-unlock').textContent=lang==='zh'?'解鎖':'Unlock';error.textContent=lang==='zh'?'密碼不正確。':'Incorrect password.';error.hidden=true;input.value='';staffDialog.showModal();setTimeout(()=>input.focus(),50);}
staffDialog.querySelector('.staff-cancel').onclick=()=>staffDialog.close();staffDialog.querySelector('form').onsubmit=e=>{e.preventDefault();const input=staffDialog.querySelector('.staff-password'),error=staffDialog.querySelector('.staff-error');if(input.value===STAFF_PASSWORD){localStorage.setItem(STAFF_SESSION_KEY,String(Date.now()+STAFF_SESSION_MS));staffDialog.close();updateStaffUI();}else{error.hidden=false;input.select();}};
staffButton.onclick=()=>{if(staffUnlocked()){if(confirm(lang==='zh'?'鎖定職員模式？':'Lock staff mode?'))lockStaffMode();}else showStaffLogin();};
setInterval(updateStaffUI,60000);updateStaffUI();
let markedWines=[];
let pendingJumpKey='';
const markerStatus=document.createElement('div');markerStatus.className='marker-status';markerStatus.hidden=true;document.querySelector('.status').appendChild(markerStatus);
function wineKey(x){return [x.v,x.name,x.price].join('|');}
const STOCK_STORAGE_KEY='wineListStockStatus';
const FIREBASE_CONFIG={apiKey:'AIzaSyDMUG0cwI9VLZ9Ol2IrUclNOLs1w68M2lg',authDomain:'tin-lung-heen-wine-stock.firebaseapp.com',databaseURL:'https://tin-lung-heen-wine-stock-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'tin-lung-heen-wine-stock',storageBucket:'tin-lung-heen-wine-stock.firebasestorage.app',messagingSenderId:'657467145069',appId:'1:657467145069:web:7ec4e0e022c2d110e87864'};
let stockStatus={};
try{stockStatus=JSON.parse(localStorage.getItem(STOCK_STORAGE_KEY)||'{}')||{};}catch(e){stockStatus={};}
function isSoldOut(key){return stockStatus[key]==='out';}
function saveLocalStockStatus(){localStorage.setItem(STOCK_STORAGE_KEY,JSON.stringify(stockStatus));}
function stockId(key){let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619);}return 'w'+(h>>>0).toString(36);}
const initialLocalStockStatus={...stockStatus};
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
let stockDatabase=null,stockRef=null,stockSyncReady=false;
function applySharedStock(records){const shared={};Object.values(records||{}).forEach(record=>{if(record&&record.key&&record.status==='out')shared[record.key]='out';});stockStatus=shared;saveLocalStockStatus();if(markedWines[0]&&isSoldOut(markedWines[0].key))markedWines=[];render();updateMarkerUI();}
async function writeSharedStock(key,sold){saveLocalStockStatus();if(!stockRef)return;const itemRef=stockRef.child(stockId(key));if(sold)await itemRef.set({key,status:'out',updatedAt:firebase.database.ServerValue.TIMESTAMP});else await itemRef.remove();}
function startStockSync(){if(!window.firebase){console.warn('Firebase SDK unavailable; using this device only.');return;}try{if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);stockDatabase=firebase.database();
startSiteEnabledSync();
startRemoteLockSync();stockRef=stockDatabase.ref('wineStock');stockRef.once('value').then(snapshot=>{if(!snapshot.exists()&&Object.keys(initialLocalStockStatus).length){const seed={};Object.keys(initialLocalStockStatus).forEach(key=>{if(initialLocalStockStatus[key]==='out')seed[stockId(key)]={key,status:'out',updatedAt:firebase.database.ServerValue.TIMESTAMP};});if(Object.keys(seed).length)return stockRef.update(seed);}}).catch(console.error);stockRef.on('value',snapshot=>{stockSyncReady=true;applySharedStock(snapshot.val());},error=>{stockSyncReady=false;console.error('Stock sync unavailable:',error);});}catch(error){console.error('Firebase startup failed:',error);}}
function stockDotHtml(key){
  const sold=isSoldOut(key);

  const label=lang==='zh'
    ? (sold?'售罄，按一下改為有貨':'有貨，按一下改為售罄')
    : (sold?'Sold out. Tap once to mark in stock':'In stock. Tap once to mark sold out');

  return `<span
    class="stock-dot ${sold?'sold-out':'in-stock'}"
    data-stock-key="${esc(key)}"
    role="button"
    tabindex="0"
    aria-label="${esc(label)}"
    title="${esc(label)}"
  ></span>`;
}
async function confirmStockChange(key){

  if(!staffUnlocked()){
    showStaffLogin();
    return;
  }

  const sold=isSoldOut(key);
  const nextSold=!sold;

  if(nextSold){
    stockStatus[key]='out';
  }else{
    delete stockStatus[key];
  }

  saveLocalStockStatus();

  if(nextSold && markedWines[0]?.key===key){
    markedWines=[];
  }

  render();
  updateMarkerUI();

  try{
    await writeSharedStock(key,nextSold);
  }catch(error){

    console.error(
      'Unable to sync stock change:',
      error
    );

    alert(
      lang==='zh'
        ? '未能同步至其他裝置，請檢查網絡後再試。'
        : 'Could not sync to other devices. Please check the connection and try again.'
    );

  }

}
function bindStockDots(){

  main.querySelectorAll('.stock-dot').forEach(dot=>{

    dot.addEventListener(
      'pointerup',
      e=>e.stopPropagation()
    );

    dot.addEventListener('click',e=>{

      e.preventDefault();
      e.stopPropagation();

      confirmStockChange(
        dot.dataset.stockKey
      );

    });

    dot.addEventListener(
      'dblclick',
      e=>{
        e.preventDefault();
        e.stopPropagation();
      }
    );

    dot.addEventListener('keydown',e=>{

      if(
        (e.key==='Enter' || e.key===' ')
        && !e.repeat
      ){

        e.preventDefault();
        e.stopPropagation();

        confirmStockChange(
          dot.dataset.stockKey
        );

      }

    });

    dot.addEventListener(
      'contextmenu',
      e=>e.preventDefault()
    );

  });

}
function markerText(x){return (x.v?x.v+' · ':'')+x.name;}
function wineType(sectionName,categoryTitle,x){const text=(sectionName+' '+categoryTitle+' '+(x.style||'')+' '+(x.name||'')).toLowerCase();if(/champagne|sparkling|prosecco|cava|franciacorta|sekt/.test(text))return'sparkling';if(/dessert|sauternes|barsac|tokaji|moscato|sweet|port|madeira|sherry/.test(text))return'dessert';if(/rosé|rose/.test(text))return'rose';if(/red|rouge|rosso|tinto|barolo|barbaresco|burgundy rouge/.test(text))return'red';if(/white|blanc|bianco|chablis|riesling|sauvignon|chardonnay/.test(text))return'white';return'other';}
function typeIcon(type){return{sparkling:'✦',white:'●',red:'●',rose:'●',dessert:'◆',other:'○'}[type]||'○';}
function findWineLocation(key){for(const category of C){for(const section of category.sections){const item=section.items.find(x=>wineKey(x)===key);if(item)return{category,section,item};}}return null;}
function isByTheGlass(price){return /\bglass\b/i.test(String(price||''));}
function servingChoices(x){if(x.categoryId==='c0')return[{id:'bottle',label:'Bottle (1.5L)'},{id:'glass',label:'Glass (100ml)'},{id:'carafe',label:'Carafe (375ml)'}];if(x.byGlass)return[{id:'bottle',label:lang==='zh'?'原瓶':'Bottle'},{id:'glass',label:lang==='zh'?'杯裝':'Glass'}];return[];}
function serviceControlsHtml(x,index){const choices=servingChoices(x);if(!choices.length)return'';const formats=`<div class="format-controls">${choices.map(choice=>`<button type="button" class="format-btn ${x.format===choice.id?'active':''}" data-index="${index}" data-format="${choice.id}">${choice.label}</button>`).join('')}</div>`;if(x.format!=='glass')return `<div class="service-controls">${formats}</div>`;const seats=Array.from({length:6},(_,i)=>`<button type="button" class="seat-btn ${x.seats.includes(i+1)?'active':''}" data-index="${index}" data-seat="${i+1}">S${i+1}</button>`).join('');return `<div class="service-controls">${formats}<div class="glass-controls"><div class="glass-quantity"><button type="button" class="glass-step" data-index="${index}" data-step="-1" aria-label="Decrease glasses">−</button><span>${x.glasses} ${x.glasses===1?(lang==='zh'?'杯':'glass'):(lang==='zh'?'杯':'glasses')}</span><button type="button" class="glass-step" data-index="${index}" data-step="1" aria-label="Increase glasses">+</button></div><div class="seat-controls-wrapper"><span class="seat-label">${lang==='zh'?'內部使用':'For Internal Use'}</span><div class="seat-controls" aria-label="Seat codes">${seats}</div></div></div></div>`;}
function markedEntryHtml(x,index){return `<div class="marker-row" data-key="${esc(x.key)}"><div class="marker-row-main"><button type="button" class="marker-jump" data-index="${index}" title="${lang==='zh'?'前往此酒':'Jump to this wine'}"><span class="wine-type type-${esc(x.type)}" aria-hidden="true">${typeIcon(x.type)}</span><span class="marker-status-label">${esc(markerText(x))}</span></button><button type="button" class="marker-remove" data-index="${index}" aria-label="${lang==='zh'?'移除此酒':'Remove this wine'}">×</button></div>${serviceControlsHtml(x,index)}</div>`;}
function updateMarkerUI(){const has=markedWines.length>0;document.querySelector('.status').classList.toggle('has-marker',has);markerStatus.hidden=!has;if(has){markerStatus.innerHTML=`<div class="marker-toolbar"><b>${lang==='zh'?'已選酒款':'Selected wine'}</b><button type="button" class="marker-clear-all">${lang==='zh'?'清除':'Clear'}</button></div><div class="marker-list">${markedWines.map(markedEntryHtml).join('')}</div>`;markerStatus.querySelector('.marker-clear-all').onclick=()=>{markedWines=[];updateMarkerUI();};markerStatus.querySelectorAll('.marker-remove').forEach(btn=>btn.onclick=e=>{e.stopPropagation();markedWines.splice(Number(btn.dataset.index),1);updateMarkerUI();});markerStatus.querySelectorAll('.marker-jump').forEach(btn=>btn.onclick=()=>jumpToMarked(Number(btn.dataset.index)));markerStatus.querySelectorAll('.format-btn').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const x=markedWines[Number(btn.dataset.index)];if(!x)return;x.format=btn.dataset.format;updateMarkerUI();});markerStatus.querySelectorAll('.glass-step').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const x=markedWines[Number(btn.dataset.index)];if(!x)return;x.glasses=Math.max(1,Math.min(5,x.glasses+Number(btn.dataset.step)));if(x.seats.length>x.glasses){x.seats=x.seats.slice(0,x.glasses);}updateMarkerUI();});markerStatus.querySelectorAll('.seat-btn').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const x=markedWines[Number(btn.dataset.index)],seat=Number(btn.dataset.seat);if(!x)return;x.seats=x.seats.includes(seat)?x.seats.filter(n=>n!==seat):(x.seats.length<x.glasses?[...x.seats,seat].sort((a,b)=>a-b):x.seats);updateMarkerUI();});}const keys=new Set(markedWines.map(x=>x.key));document.querySelectorAll('.wine,.wotm-feature').forEach(el=>el.classList.toggle('marked',keys.has(el.dataset.wineKey)));}
function addMarkedWine(data){if(isSoldOut(data.key)||markedWines[0]?.key===data.key)return;markedWines=[data];updateMarkerUI();}
function jumpToMarked(index){const selected=markedWines[index];if(!selected)return;current=selected.categoryId;openCat='';activeGroup=null;q.value='';pendingJumpKey=selected.key;navR();render();requestAnimationFrame(()=>requestAnimationFrame(()=>{const target=[...document.querySelectorAll('.wine,.wotm-feature')].find(el=>el.dataset.wineKey===pendingJumpKey);if(target){target.classList.add('jump-pulse');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.classList.remove('jump-pulse'),1600);}pendingJumpKey='';}));}
function markedWineData(element){return{key:element.dataset.wineKey,v:element.dataset.v,name:element.dataset.name,price:element.dataset.price,type:element.dataset.type,categoryId:element.dataset.category,byGlass:isByTheGlass(element.dataset.price),format:'bottle',glasses:1,seats:[]};}
function bindWineSelection(){
  main.querySelectorAll('.wine,.wotm-feature').forEach(entry=>{
    const selectWine=()=>addMarkedWine(markedWineData(entry));
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

 nav.innerHTML=orderedC.map(c=>{const kids=navChildren(c),has=kids.length>0,open=has&&c.id===openCat;
  return `<div class="navgroup"><button data-cat="${c.id}" class="navcat ${c.id===current&&!activeGroup?'active':''}" ${has?`aria-expanded="${open}"`:''}><span>${
  ['Wine of the Month',
   'National Day Selection',
   'Wine by the Glass',
   'Premium Collection',
   'Sommelier Selection'
  ].includes(c.title)
    ? '<span class="featured-star">★</span>' + esc(pick(c,'title'))
    : esc(pick(c,'title'))
}</span>${has?`<span class="chev">${open?'−':'+'}</span>`:''}</button>${has?`<div class="subnav ${open?'show':''}">${kids.map(g=>`<button class="navsub ${c.id===current&&activeGroup===g.name?'active':''}" data-cat="${c.id}" data-group="${esc(g.name)}">${esc(pick(g,'name'))}</button>`).join('')}</div>`:''}</div>`
 }).join('');
 nav.querySelectorAll('.navcat').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.cat,c=C.find(x=>x.id===id),has=navChildren(c).length>0;current=id;activeGroup=null;q.value='';openCat=has?(openCat===id?'':id):'';navR();render();scrollTo({top:0,behavior:'smooth'})});
 nav.querySelectorAll('.navsub').forEach(btn=>btn.onclick=()=>{
    current = btn.dataset.cat;
    openCat = current;
    activeGroup = btn.dataset.group;
    q.value='';
    navR();
    render();
    scrollTo({top:0,behavior:'smooth'});
});
 renderPageStrip();
}
function card(x,category,section){
  const key=wineKey(x),sold=isSoldOut(key),name=pick(x,'name'),price=pick(x,'price');
  const displayName=lang==='zh'&&x.nameZh?`<span class="primary-name">${esc(x.nameZh)}</span><span class="english-name">${esc(x.name)}</span>`:esc(name);
  const vintage=String(x.v??'').trim();
  const ingredients=[x.ingredients,lang==='zh'?x.ingredientsZh:null].filter(Boolean).map((value,index)=>`<span class="ingredients${index?' ingredients-zh':''}">${esc(value)}</span>`).join('');
  return `<article class="wine ${sold?'sold-out':''}" data-wine-key="${esc(key)}" data-category="${esc(category.id)}" data-type="${esc(wineType(section.name,category.title,x))}" data-v="${esc(x.v)}" data-name="${esc(name)}" data-price="${esc(price)}" tabindex="0" role="button" aria-label="${esc(lang==='zh'?'連按兩次以標記此酒':'Double-tap to select this wine')}">
    <div class="row">
      <span class="v">${vintage?`<span class="vintage">${esc(vintage)}</span>`:''}${stockDotHtml(key)}</span>
      <span class="name">${displayName}${ingredients}</span>
      <span class="price">
${esc(price).replace(/ · /g,'<br>')}
</span>
    </div>
  </article>`
}
function featureNote(note){
  return String(note??'').split(/\n\s*\n/).filter(Boolean).map(paragraph=>`<p>${esc(paragraph)}</p>`).join('');
}
function featureCard(x,category,section){
  const key=wineKey(x),sold=isSoldOut(key),name=pick(x,'name'),price=pick(x,'price');
  const displayName=lang==='zh'&&x.nameZh?`<span class="primary-name">${esc(x.nameZh)}</span><span class="english-name">${esc(x.name)}</span>`:esc(name);
  const image=x.image?`<div class="feature-media"><img src="${esc(x.image)}" alt="${esc(lang==='zh'?(x.imageAltZh||x.imageAlt||pick(x,'name')):(x.imageAlt||x.name))}" loading="eager" onerror="this.closest('.feature-media').classList.add('image-error');this.remove()"><div class="feature-image-fallback">1982<br>Château Cos d’Estournel</div></div>`:'';
  return `<section class="wotm-feature ${sold?'sold-out':''}" data-wine-key="${esc(key)}" data-category="${esc(category.id)}" data-type="${esc(wineType(section.name,category.title,x))}" data-v="${esc(x.v)}" data-name="${esc(name)}" data-price="${esc(price)}" tabindex="0" role="button" aria-label="${esc(lang==='zh'?'連按兩次以標記此酒':'Double-tap to select this wine')}">
    <div class="wotm-ribbon">${esc(ui().featured)}</div>
    <div class="wotm-grid">
      ${image}
      <div class="wotm-summary">
        <div class="wotm-vintage"><span>${esc(x.v)}</span>${stockDotHtml(key)}</div>
        <h2>${displayName}</h2>
        <div class="wotm-prices">${String(price??'').split(/\s*·\s*/).filter(Boolean).map(price=>`<div class="wotm-price-line">${esc(price)}</div>`).join('')}</div>
      </div>
    </div>
    <div class="wotm-copy">${featureNote(pick(x,'note'))}</div>
  </section>`;
}
function bind(){bindStockDots();bindWineSelection();}function render(){const query=q.value.trim().toLowerCase();if(query){let groups=[];C.forEach(c=>c.sections.forEach(s=>{let items=s.items.filter(x=>(c.title+' '+s.name+' '+x.v+' '+x.name+' '+x.price+' '+x.note).toLowerCase().includes(query));if(items.length)groups.push({title:c.title+(s.hideHeading?'':' · '+s.name),items,category:c,section:s})}));let count=groups.reduce((a,g)=>a+g.items.length,0);st.textContent='Search results';meta.textContent=totalSelections+' selections · Updated '+updatedDateText();main.innerHTML=`<section class="hero"><div class="kicker">Search</div><h2>${esc(q.value)}</h2><p>${count} matching selections</p></section>`+(groups.length?groups.map(g=>`<section class="section"><h3>${esc(g.title)}</h3>${g.items.map(x=>card(x,g.category,g.section)).join('')}</section>`).join(''):'<div class="empty">No matching selection found.</div>');bind();return}let c=C.find(x=>x.id===current)||C[0];st.textContent='';meta.textContent=totalSelections+' '+ui().selections+' · '+ui().updated+' '+updatedDateText();const sectionKey=value=>String(value??'')
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
if(c.id==='c0'&&!group){
  const item=c.sections[0]?.items?.[0];
  main.innerHTML=`<section class="hero hero-wotm"><div class="kicker">${esc(ui().brand)}</div><h2>${esc(ui().heroTitle)}</h2><p>${esc(ui().heroSub)}</p></section>`+(item?featureCard(item,c,c.sections[0]):`<div class="empty">${esc(ui().noFeature)}</div>`)+`<div class="legal">${esc(ui().legal)}</div>`;
  bindStockDots();
  bindWineSelection();
  return;
}
main.innerHTML=`<section class="hero"><div class="kicker">${esc(ui().brand)}${group?' · '+esc(pick(c,'title')):''}</div><h2>${esc(group?pick(group,'name'):pick(c,'title'))}</h2></section>`+sections.map(s=>`<section class="section">${s.hideHeading?'':`<h3>${esc(pick(s,'name'))}</h3>`}${s.items.map(x=>card(x,c,s)).join('')}</section>`).join('')+`<div class="legal">${esc(ui().legalGeneral)}</div>`;bind()}q.oninput=()=>{render();renderPageStrip();};
navR();
render();
loadUpdatedDate();
startStockSync();

// Welcome cover: fade away on entry and return after five minutes of inactivity.
const welcomeCover=document.querySelector('#welcome-cover');
const WELCOME_IDLE_MS=5*60*1000;
const WELCOME_DISMISSED_STORAGE_KEY='wineListWelcomeDismissed';
let welcomeIdleTimer=null,welcomeVisible=true;
function showWelcomeCover(){welcomeVisible=true;welcomeCover.classList.remove('is-hidden','returning');void welcomeCover.offsetWidth;welcomeCover.classList.add('returning');welcomeCover.setAttribute('aria-hidden','false');document.body.classList.add('welcome-active');clearTimeout(welcomeIdleTimer)}
function hideWelcomeCover(){if(!welcomeVisible)return;welcomeVisible=false;sessionStorage.setItem(WELCOME_DISMISSED_STORAGE_KEY,'true');welcomeCover.classList.add('is-hidden');welcomeCover.classList.remove('returning');welcomeCover.setAttribute('aria-hidden','true');document.body.classList.remove('welcome-active');resetWelcomeIdleTimer()}
function resetWelcomeIdleTimer(){if(welcomeVisible)return;clearTimeout(welcomeIdleTimer);welcomeIdleTimer=setTimeout(showWelcomeCover,WELCOME_IDLE_MS)}
welcomeCover.addEventListener('click',hideWelcomeCover);
welcomeCover.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();hideWelcomeCover()}});
['pointerdown','keydown','scroll','touchstart'].forEach(type=>document.addEventListener(type,resetWelcomeIdleTimer,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resetWelcomeIdleTimer()});
if(sessionStorage.getItem(WELCOME_DISMISSED_STORAGE_KEY)==='true'){
  hideWelcomeCover();
}else{
  showWelcomeCover();
}
