const C=window.WINE_DATA;
updated='20 October 2026';
const totalSelections=C.reduce((total,category)=>total+category.sections.reduce((sum,section)=>sum+section.items.length,0),0);let current=C[0].id;const nav=document.querySelector('#nav'),main=document.querySelector('#main'),q=document.querySelector('#q'),st=document.querySelector('#st'),meta=document.querySelector('#meta');const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const n=c=>c.sections.reduce((a,s)=>a+s.items.length,0);
const brandName=document.querySelector('#brand-name'),wineListTitle=document.querySelector('#wine-list-title');
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
      : '<span>繁</span><span>/</span><span class="active">EN</span>';langToggle.setAttribute('aria-label',lang==='zh'?'切換至英文':'Switch to Traditional Chinese');document.documentElement.lang=lang==='zh'?'zh-Hant-HK':'en-GB';brandName.textContent=lang==='zh'?'天龍軒':'Tin Lung Heen';wineListTitle.textContent=lang==='zh'?'葡萄酒及飲料全單':'Master Wine List';q.placeholder=ui().search;}
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

    dot.addEventListener('click',e=>{

      e.preventDefault();
      e.stopPropagation();

      confirmStockChange(
        dot.dataset.stockKey
      );

    });

    dot.addEventListener('keydown',e=>{

      if(
        (e.key==='Enter' || e.key===' ')
        && !e.repeat
      ){

        e.preventDefault();

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
function bindMarkButtons(){main.querySelectorAll('.mark-wine').forEach(btn=>{let timer=null,done=false;const stop=()=>{if(timer)clearTimeout(timer);timer=null;btn.classList.remove('holding');};const start=e=>{e.preventDefault();done=false;stop();btn.classList.add('holding');timer=setTimeout(()=>{const key=btn.dataset.key;addMarkedWine({key,v:btn.dataset.v,name:btn.dataset.name,price:btn.dataset.price,type:btn.dataset.type,categoryId:btn.dataset.category,byGlass:isByTheGlass(btn.dataset.price),format:'bottle',glasses:1,seats:[]});done=true;btn.classList.remove('holding');},800);};btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',stop);btn.addEventListener('pointercancel',stop);btn.addEventListener('pointerleave',stop);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!done)btn.classList.remove('holding');});});updateMarkerUI();}
// Navigation intentionally begins hierarchical browsing only after Sommelier Selection.
const PRE_SOMMELIER_IDS=new Set(['c0','c1','c3','c4','c5']);
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
  {name:'Zinfandel',nameZh:'仙粉黛',sections:['Zinfandel']},
  {name:'Malbec',nameZh:'馬爾貝克',sections:['Malbec']},
  {name:'Merlot',nameZh:'梅洛',sections:['Merlot']},
  {name:'Pinot Noir',nameZh:'黑皮諾',sections:['Pinot Noir']},
  {name:'Shiraz',nameZh:'希哈',sections:['Shiraz']},
  {name:"Penfold's Selection",nameZh:'奔富精選',sections:["Penfold's Selection"]},
  {name:"Two Hands's Selection",nameZh:'雙手酒莊精選',sections:["Two Hands's Selection"]},
  {name:'Indigenous & Curiosities',nameZh:'原生品種與特色酒款',sections:['Indigenous & Curiosities']},
  {name:"Xige Estate's Selection",nameZh:'西鴿酒莊精選',sections:["Xige Estate's Selection"]}
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
  {name:'New Zealand',nameZh:'紐西蘭',sections:['New Zealand']}
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
}
function card(x,category,section){
  const key=wineKey(x),sold=isSoldOut(key),name=pick(x,'name'),price=pick(x,'price'),note=pick(x,'note');
  return `<article class="wine ${sold?'sold-out':''}" data-wine-key="${esc(key)}">
    <button class="row" aria-expanded="false">
      <span class="v"><span>${x.v}</span>${stockDotHtml(key)}</span>
      <span class="name">${esc(name)}</span>
      <span class="price">
${esc(price).replace(/ · /g,'<br>')}
</span>
      <span class="plus">+</span>
    </button>
    <div class="inside"><div>${esc(note).replace(/\n/g,'<br>')}</div><button type="button" class="mark-wine" ${sold?'disabled aria-disabled="true"':''} data-key="${esc(key)}" data-category="${esc(category.id)}" data-type="${esc(wineType(section.name,category.title,x))}" data-v="${esc(x.v)}" data-name="${esc(name)}" data-price="${esc(price)}">☆ <span>${lang==='zh'?'按住以標記此酒':'Hold to mark this wine'}</span></button></div>
  </article>`
}
function featureNote(note){
  return String(note??'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
}
function featureCard(x,category,section){
  const key=wineKey(x),sold=isSoldOut(key);
  const image=x.image?`<div class="feature-media"><img src="${esc(x.image)}" alt="${esc(lang==='zh'?(x.imageAltZh||x.imageAlt||pick(x,'name')):(x.imageAlt||x.name))}" loading="eager" onerror="this.closest('.feature-media').classList.add('image-error');this.remove()"><div class="feature-image-fallback">1982<br>Château Cos d’Estournel</div></div>`:'';
  return `<section class="wotm-feature ${sold?'sold-out':''}" data-wine-key="${esc(key)}">
    <div class="wotm-ribbon">${esc(ui().featured)}</div>
    <div class="wotm-grid">
      ${image}
      <div class="wotm-summary">
        <div class="wotm-vintage"><span>${esc(x.v)}</span>${stockDotHtml(key)}</div>
        <h2>${esc(pick(x,'name'))}</h2>
        <div class="wotm-prices">${String(pick(x,'price')??'').split(/\s*·\s*/).filter(Boolean).map(price=>`<div class="wotm-price-line">${esc(price)}</div>`).join('')}</div>
      </div>
    </div>
    <div class="wotm-copy">${featureNote(pick(x,'note'))}</div>
    <button type="button" class="mark-wine feature-mark" ${sold?'disabled aria-disabled="true"':''} data-key="${esc(key)}" data-category="${esc(category.id)}" data-type="${esc(wineType(section.name,category.title,x))}" data-v="${esc(x.v)}" data-name="${esc(x.name)}" data-price="${esc(x.price)}">☆ <span>${lang==='zh'?'按住以標記此酒':'Hold to mark this wine'}</span></button>
  </section>`;
}
function bind(){main.querySelectorAll('.row').forEach(b=>b.onclick=()=>{const a=b.closest('.wine'),o=a.classList.toggle('open');b.setAttribute('aria-expanded',o)});bindStockDots();bindMarkButtons();}function render(){const query=q.value.trim().toLowerCase();if(query){let groups=[];C.forEach(c=>c.sections.forEach(s=>{let items=s.items.filter(x=>(c.title+' '+s.name+' '+x.v+' '+x.name+' '+x.price+' '+x.note).toLowerCase().includes(query));if(items.length)groups.push({title:c.title+' · '+s.name,items,category:c,section:s})}));let count=groups.reduce((a,g)=>a+g.items.length,0);st.textContent='Search results';meta.textContent=totalSelections+' selections · Updated '+updated;main.innerHTML=`<section class="hero"><div class="kicker">Search</div><h2>${esc(q.value)}</h2><p>${count} matching selections</p></section>`+(groups.length?groups.map(g=>`<section class="section"><h3>${esc(g.title)}</h3>${g.items.map(x=>card(x,g.category,g.section)).join('')}</section>`).join(''):'<div class="empty">No matching selection found.</div>');bind();return}let c=C.find(x=>x.id===current)||C[0];st.textContent='';meta.textContent=totalSelections+' '+ui().selections+' · '+ui().updated+' '+updated;const sectionKey=value=>String(value??'')
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
  bindMarkButtons();
  return;
}
main.innerHTML=`<section class="hero"><div class="kicker">${esc(ui().brand)}${group?' · '+esc(pick(c,'title')):''}</div><h2>${esc(group?pick(group,'name'):pick(c,'title'))}</h2></section>`+sections.map(s=>`<section class="section"><h3>${esc(pick(s,'name'))}</h3>${s.items.map(x=>card(x,c,s)).join('')}</section>`).join('')+`<div class="legal">${esc(ui().legalGeneral)}</div>`;bind()}q.oninput=render;
navR();
render();
startStockSync();

// Welcome cover: fade away on entry and return after five minutes of inactivity.
const welcomeCover=document.querySelector('#welcome-cover');
const WELCOME_IDLE_MS=5*60*1000;
let welcomeIdleTimer=null,welcomeVisible=true;
function showWelcomeCover(){welcomeVisible=true;welcomeCover.classList.remove('is-hidden','returning');void welcomeCover.offsetWidth;welcomeCover.classList.add('returning');welcomeCover.setAttribute('aria-hidden','false');document.body.classList.add('welcome-active');clearTimeout(welcomeIdleTimer)}
function hideWelcomeCover(){if(!welcomeVisible)return;welcomeVisible=false;welcomeCover.classList.add('is-hidden');welcomeCover.classList.remove('returning');welcomeCover.setAttribute('aria-hidden','true');document.body.classList.remove('welcome-active');resetWelcomeIdleTimer()}
function resetWelcomeIdleTimer(){if(welcomeVisible)return;clearTimeout(welcomeIdleTimer);welcomeIdleTimer=setTimeout(showWelcomeCover,WELCOME_IDLE_MS)}
welcomeCover.addEventListener('click',hideWelcomeCover);
welcomeCover.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();hideWelcomeCover()}});
['pointerdown','keydown','scroll','touchstart'].forEach(type=>document.addEventListener(type,resetWelcomeIdleTimer,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resetWelcomeIdleTimer()});
showWelcomeCover();
