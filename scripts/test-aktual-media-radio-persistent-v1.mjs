#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const files={
  hr:'apps/portal/gnk-aktual/index.html',
  en:'apps/portal/en/gnk-aktual/index.html',
  radioHr:'apps/portal/radio/index.html',
  radioEn:'apps/portal/en/radio/index.html',
  player:'apps/portal/radio/player/index.html',
  engine:'apps/portal/assets/aktual-radio-player-v1.js',
  floatJs:'apps/portal/assets/aktual-media-radio-float-v1.js',
  floatCss:'apps/portal/assets/aktual-media-radio-float-v1.css',
  install:'apps/portal/assets/aktual-media-radio-install-v1.js',
  playerCss:'apps/portal/assets/aktual-media-radio-player-v2.css',
  menu:'apps/portal/assets/public-unified-menu-v6.js',
  manifest:'apps/portal/aktual-media-radio.webmanifest',
  sw:'apps/portal/radio/radio-sw.js'
};
const failures=[];
for(const [name,p] of Object.entries(files)) if(!fs.existsSync(p)) failures.push(name+': missing '+p);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}

const hr=read(files.hr),en=read(files.en);
for(const [name,html] of [['hr',hr],['en',en]]){
  if(!html.includes('<h1 id="amMasthead">AKTUAL <span>MEDIA</span></h1>')) failures.push(name+': full AKTUAL MEDIA masthead missing');
  if(html.includes('<h1 id="amMasthead">AKTUAL<span>.</span></h1>')) failures.push(name+': legacy short masthead remains');
}

const radioHr=read(files.radioHr),radioEn=read(files.radioEn);
for(const [name,html] of [['radioHr',radioHr],['radioEn',radioEn]]){
  if(!html.includes('AKTUAL MEDIA RADIO')) failures.push(name+': full radio brand missing');
  if(!html.includes('rel="manifest" href="/aktual-media-radio.webmanifest"')) failures.push(name+': radio PWA manifest missing');
  if(!html.includes('/radio/player/')) failures.push(name+': persistent-player link missing');
}

const player=read(files.player),engine=read(files.engine),floatJs=read(files.floatJs),menu=read(files.menu),install=read(files.install),sw=read(files.sw);
for(const id of ['radioStatusLabel','radioStationTitle','radioStationTag','radioTrackName','radioTrackArtist','radioStationSelect','radioPlayBtn','radioNextBtn','radioVolSlider','radioInstallBtn']){
  if(!player.includes('id="'+id+'"')) failures.push('player: missing #'+id);
}
if(!player.includes('/aktual-media-radio.webmanifest')) failures.push('player: manifest link missing');
if(!engine.includes("new BroadcastChannel('aktual-media-radio-v1')")) failures.push('engine: persistent BroadcastChannel missing');
if(!engine.includes("'mediaSession' in navigator")) failures.push('engine: Media Session support missing');
if(!engine.includes("setActionHandler('play'")) failures.push('engine: OS play handler missing');
if(!engine.includes("setActionHandler('pause'")) failures.push('engine: OS pause handler missing');
if(!engine.includes("type: 'STATE'")) failures.push('engine: state broadcast missing');
if(!floatJs.includes("new BroadcastChannel('aktual-media-radio-v1')")) failures.push('float: BroadcastChannel missing');
if(!floatJs.includes("window.open(url,'aktual-media-radio-player'")) failures.push('float: named persistent popup missing');
if(!floatJs.includes("pendingAutoPlay")) failures.push('float: ready/play handshake missing');
if(!menu.includes("['AKTUAL MEDIA RADIO','AKTUAL MEDIA RADIO','/radio/','/en/radio/']")) failures.push('menu: radio nav item missing');
if(!menu.includes('/assets/aktual-media-radio-float-v1.js')) failures.push('menu: floating controller injection missing');
if(!menu.includes('/assets/aktual-media-radio-float-v1.css')) failures.push('menu: floating style injection missing');
if(!install.includes("beforeinstallprompt")) failures.push('install: Chromium install prompt support missing');
if(!install.includes("serviceWorker.register('/radio/radio-sw.js'")) failures.push('install: scoped radio service worker registration missing');
if(!sw.includes("url.origin!==self.location.origin")) failures.push('service worker: same-origin guard missing');

const manifest=JSON.parse(read(files.manifest));
if(manifest.name!=='AKTUAL MEDIA RADIO') failures.push('manifest: name mismatch');
if(manifest.id!=='/radio/player/') failures.push('manifest: id mismatch');
if(manifest.start_url!=='/radio/player/?source=pwa') failures.push('manifest: start_url mismatch');
if(manifest.scope!=='/radio/') failures.push('manifest: scope must stay radio-only');
if(!['standalone','minimal-ui'].includes(manifest.display)) failures.push('manifest: install display mode invalid');
const sizes=new Set((manifest.icons||[]).map(x=>x.sizes));
if(!sizes.has('192x192')||!sizes.has('512x512')) failures.push('manifest: install icons incomplete');

for(const src of [floatJs,install]){
  if(/localStorage|sessionStorage|document\.cookie/.test(src)) failures.push('radio controller/install: persistent user tracking storage is not allowed');
}
if(!read(files.floatCss).includes('#aktualMediaRadioFloat')) failures.push('float CSS: root selector missing');
if(!read(files.playerCss).includes('.rp-shell')) failures.push('player CSS: shell missing');

console.log(JSON.stringify({version:'AKTUAL_MEDIA_RADIO_PERSISTENT_V1',files:Object.keys(files).length,failures},null,2));
if(failures.length) process.exit(1);
