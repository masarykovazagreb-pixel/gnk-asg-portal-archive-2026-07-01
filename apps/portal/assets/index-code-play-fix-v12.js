(()=>{'use strict';
if(window.__GNK_ASG_CODE_PLAY_FIX_V12__)return;
window.__GNK_ASG_CODE_PLAY_FIX_V12__=true;
const labels=()=>{const en=document.documentElement.lang==='en';return{play:en?'Play':'Pokreni',pause:en?'Pause':'Pauziraj',resume:en?'Resume':'Nastavi',replay:en?'Replay':'Ponovno'}};
let app=null,scenes=[],button=null,current=5,timer=null,running=false,paused=false,deadline=0,remaining=0;
const durations=[5500,7500,7000,6500,6500,99999];
function setLabel(text){if(button)button.textContent=text}
function show(index){if(!app)return;scenes.forEach((scene,i)=>{scene.classList.remove('ci-active','ci-out');if(i===index)scene.classList.add('ci-active')});current=index}
function progress(index){if(!app)return;app.querySelectorAll('.ci-progress-fill').forEach(el=>{el.classList.remove('ci-run');el.style.removeProperty('--ci-duration')});const fill=app.querySelector(`[data-progress="${index}"]`);if(!fill)return;void fill.offsetWidth;fill.style.setProperty('--ci-duration',`${durations[index]}ms`);fill.classList.add('ci-run')}
function schedule(ms){remaining=ms;deadline=Date.now()+ms;clearTimeout(timer);timer=setTimeout(next,ms)}
function next(){const l=labels();if(current>=5){running=false;paused=false;setLabel(`↺ ${l.replay}`);return}const active=scenes[current];if(active)active.classList.add('ci-out');setTimeout(()=>{show(current+1);progress(current);if(current<5){schedule(durations[current]);setLabel(`❚❚ ${l.pause}`)}else{running=false;paused=false;setLabel(`↺ ${l.replay}`)}},550)}
function start(){const l=labels();clearTimeout(timer);running=true;paused=false;app?.classList.remove('ci-paused');show(0);progress(0);schedule(durations[0]);setLabel(`❚❚ ${l.pause}`)}
function pause(){if(!running||paused)return;const l=labels();paused=true;remaining=Math.max(1,deadline-Date.now());clearTimeout(timer);app?.classList.add('ci-paused');setLabel(`▶ ${l.resume}`)}
function resume(){if(!running||!paused)return;const l=labels();paused=false;app?.classList.remove('ci-paused');schedule(remaining);setLabel(`❚❚ ${l.pause}`)}
function toggle(){if(!running)start();else if(paused)resume();else pause()}
function live(){const l=labels();clearTimeout(timer);running=false;paused=false;app?.classList.remove('ci-paused');show(5);setLabel(`▶ ${l.play}`)}
function bind(){app=document.getElementById('codeInlineApp');if(!app)return false;scenes=[...app.querySelectorAll('.ci-scene')];button=app.querySelector('[data-action="play"]');if(!button||scenes.length<6)return false;button.dataset.playFix='v12';return true}
function handler(event){const target=event.target?.closest?.('[data-action="play"],[data-action="live"]');if(!target||!target.closest('#codeInlineApp'))return;event.preventDefault();event.stopImmediatePropagation();if(target.dataset.action==='play')toggle();else live()}
document.addEventListener('click',handler,true);
if(!bind()){const observer=new MutationObserver(()=>{if(bind())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),15000)}
if(!document.querySelector('script[data-premium-runtime-v1]')){const runtime=document.createElement('script');runtime.src='/assets/index-premium-runtime-v1.js?v=20260628-v1';runtime.defer=true;runtime.dataset.premiumRuntimeV1='';document.head.appendChild(runtime)}
})();