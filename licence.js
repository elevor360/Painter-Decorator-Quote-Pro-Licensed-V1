// Customer release: E360 licence activation. Client-side access gate, not tamper-proof DRM.
(()=>{'use strict';
const API='https://elevor360d-access-manager.elevor360.workers.dev';
const APP='painter-decorator-quote-pro';
const STORAGE='elevor360d_painter_licence_v1';
const DEVICE='elevor360d_painter_device_v1';
const chars='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
let id=localStorage.getItem(DEVICE);
if(!id||!/^[-a-zA-Z0-9_]{12,128}$/.test(id)){id='dev_'+Array.from(crypto.getRandomValues(new Uint8Array(20)),v=>chars[v%chars.length]).join('');localStorage.setItem(DEVICE,id)}
let started=false;
function start(){if(started)return;started=true;document.getElementById('licenceGate')?.remove();const script=document.createElement('script');script.src='app.js';document.body.appendChild(script);const ib=installButton();if(ib){ib.onclick=installMainApp;updateInstallButton()}}
// Offer installation only after the licence gate has been passed.
let deferredInstallPrompt=null;
const isInstalled=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
const installButton=()=>document.getElementById('install');
function updateInstallButton(){const button=installButton();if(button)button.hidden=isInstalled()}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updateInstallButton()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallButton()});
async function installMainApp(){
 if(isInstalled()){updateInstallButton();return}
 if(deferredInstallPrompt){
  const p=deferredInstallPrompt;deferredInstallPrompt=null;
  try{await p.prompt();await p.userChoice;updateInstallButton();return}catch(e){}
 }
 alert('To install on a computer, use the Install icon in Chrome’s address bar. On Android, open Chrome’s menu and choose Install app or Add to Home screen.');
}
const gate=document.createElement('div');gate.id='licenceGate';gate.style.cssText='position:fixed;inset:0;z-index:999999;background:#10263d;color:white;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,sans-serif';gate.innerHTML=`<div style="width:min(440px,100%);padding:24px;border-radius:16px;background:#203c58;box-shadow:0 10px 30px #0006"><h2 style="margin-top:0">Elevor360D Painter & Decorator Quote Pro</h2><p>Activate your purchase once using the licence key supplied by the seller. Up to two devices per purchase.</p><label for="licCode">Licence key</label><input id="licCode" autocomplete="off" spellcheck="false" style="box-sizing:border-box;width:100%;padding:12px;margin:8px 0 14px;border-radius:8px;border:1px solid #8ba2b5;color:#111;background:#fff" placeholder="E360-..."><button id="licActivate" style="background:#f5bd46;color:#182636;border:0;border-radius:8px;padding:12px 18px;font-weight:bold;cursor:pointer;width:100%">Activate and open app</button><p id="licMessage" role="status" aria-live="polite" style="min-height:22px"></p><small>Your quotes and customer records stay on this device. Once activated, this version can open offline on this device. Clearing browser storage may require a seller reset.</small></div>`;
document.body.appendChild(gate);
const msg=document.getElementById('licMessage'),inp=document.getElementById('licCode'),btn=document.getElementById('licActivate');
async function post(path,code){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,appId:APP,deviceId:id}),signal:controller.signal});const data=await r.json();return {status:r.status,data}}finally{clearTimeout(timer)}}
const saved=()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'null')}catch{return null}};
async function check(){
 const s=saved();
 if(!s||!/^E360-[A-F0-9]{36}$/.test(s.code||''))return;
 inp.value=s.code;
 if(!navigator.onLine){msg.textContent='Offline: opening your previously activated app.';start();return}
 msg.textContent='Checking saved licence…';
 try{
  const verified=await post('/verify',s.code);
  if(verified.data.ok){start();return}
  // A previously activated customer may have a saved key but no recorded
  // device verification. Retry activation automatically with the same key.
  const activated=await post('/activate',s.code);
  if(activated.data.ok){
   localStorage.setItem(STORAGE,JSON.stringify({code:s.code,activatedAt:s.activatedAt||new Date().toISOString()}));
   start();return;
  }
  msg.textContent=activated.data.error||'Saved licence could not be verified. Please activate again.';
 }catch(e){
  msg.textContent='Could not reach the licence server. If previously activated, you can open offline.';
  const offline=document.createElement('button');offline.textContent='Open previously activated app';
  offline.style.cssText='padding:10px;margin-top:8px';offline.onclick=start;msg.after(offline);
 }
}
btn.onclick=async()=>{const code=inp.value.trim().toUpperCase();if(!/^E360-[A-F0-9]{36}$/.test(code)){msg.textContent='Please enter a valid E360 licence key.';return}btn.disabled=true;msg.textContent='Checking activation…';try{const r=await post('/activate',code);if(r.data.ok){localStorage.setItem(STORAGE,JSON.stringify({code,activatedAt:new Date().toISOString()}));start()}else msg.textContent=r.data.error||'Activation refused.'}catch(e){msg.textContent='Connection failed. Connect to the internet and try again.'}finally{btn.disabled=false}};
check();
})();
