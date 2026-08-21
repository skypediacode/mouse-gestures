// GESTURE_ACTIONS, DEFAULT_GESTURES, isUsableGesture and toGestureMap come from
// actions.js, loaded ahead of this file by options.html.
const list=document.querySelector("#list"),tpl=document.querySelector("#row"),showTrail=document.querySelector("#showTrail"),showGestureName=document.querySelector("#showGestureName"),saved=document.querySelector("#saved");let settings=[];
// Read from the manifest so the header cannot drift from the shipped version.
document.querySelector(".version").textContent=`v${chrome.runtime.getManifest().version}`;
const footer=document.createElement("footer");footer.innerHTML='<span>Open source</span><a href="https://github.com/skypediacode/mouse-gestures" target="_blank" rel="noopener noreferrer">View source on GitHub ↗</a>';document.querySelector(".shell").append(footer);
let savedTimer;
// The badge confirms a change was written, so it only appears after a write.
function flashSaved(){saved.classList.add("show");clearTimeout(savedTimer);savedTimer=setTimeout(()=>saved.classList.remove("show"),1600);}
function persist(){settings=settings.filter(isUsableGesture);chrome.storage.sync.set({gestures:settings});}
function save(){persist();flashSaved();}
function saveDisplaySettings(){chrome.storage.sync.set({showTrail:showTrail.checked,showGestureName:showGestureName.checked});flashSaved();}
function render(){list.innerHTML="";settings.forEach((item,i)=>{const row=tpl.content.firstElementChild.cloneNode(true),select=row.querySelector("select");row.querySelector(".code").textContent=item.gesture||"—";row.querySelectorAll("[data-dir]").forEach(b=>{b.classList.toggle("active",item.gesture.includes(b.dataset.dir));b.onclick=()=>{let g=settings[i].gesture;g=g.includes(b.dataset.dir)?g.replace(b.dataset.dir,""):g.length<3?g+b.dataset.dir:g;settings[i].gesture=g;render();save();};});GESTURE_ACTIONS.forEach(([v,t])=>select.add(new Option(t,v)));select.value=item.action;select.onchange=()=>{settings[i].action=select.value;save();};row.querySelector(".remove").onclick=()=>{settings.splice(i,1);render();save();};list.append(row);});}
function preset(name){const profiles={navigation:DEFAULT_GESTURES.slice(0,4),tabs:[{gesture:"R",action:"new-tab"},{gesture:"DR",action:"close-tab"},{gesture:"LU",action:"reopen-tab"},{gesture:"L",action:"close-tabs-left"}]};settings=(profiles[name]||DEFAULT_GESTURES).map(x=>({...x}));render();save();}
document.querySelector("#add").onclick=()=>{const choices=["RU","RD","UL","UR","DL","UD","DU","RUL"],gesture=choices.find(g=>!settings.some(x=>x.gesture===g))||"U",actions=["reload","new-tab","duplicate-tab","close-tabs-left","close-tabs-right"];settings.push({gesture,action:actions[settings.length%actions.length]});render();save();};document.querySelectorAll(".preset").forEach(b=>b.onclick=()=>preset(b.dataset.preset));showTrail.onchange=saveDisplaySettings;showGestureName.onchange=saveDisplaySettings;
chrome.storage.sync.get({gestures:DEFAULT_GESTURES,showTrail:true,showGestureName:true},r=>{showTrail.checked=r.showTrail;showGestureName.checked=r.showGestureName;const stored=r.gestures||DEFAULT_GESTURES;settings=stored.filter(isUsableGesture).map(x=>({...x}));render();
// Opening the page is not itself an edit, so only write when normalising
// actually dropped an entry the stored profile should no longer carry.
if(settings.length!==stored.length)persist();});
