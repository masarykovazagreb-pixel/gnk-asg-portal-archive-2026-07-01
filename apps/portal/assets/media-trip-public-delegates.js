(()=>{
const state=window.GNKMediaTripState=window.GNKMediaTripState||{delegateCount:1,documents:[]};
const q=id=>document.getElementById(id),v=id=>String(q(id)?.value||'').trim(),c=id=>Boolean(q(id)?.checked);
function status(t,k=''){const e=q('formStatus');if(e){e.textContent=t;e.className='trip-status'+(k?' '+k:'')}}
function add(){if(state.delegateCount>=3){status('Najviše tri osobe po redakciji.','bad');return}q('delegates').insertAdjacentHTML('beforeend',window.GNKTripEditorial.delegate(state.delegateCount));state.delegateCount++;q('delegateCount').textContent=state.delegateCount+' / 3';q('addDelegate').disabled=state.delegateCount>=3;}
function remove(index){[...document.querySelectorAll('[data-delegate]')].find(x=>Number(x.dataset.delegate)===index)?.remove();const left=[...document.querySelectorAll('[data-delegate]')];left.forEach((el,i)=>{el.dataset.delegate=i;el.querySelector('h3').textContent='Osoba '+(i+1);const b=el.querySelector('[data-remove-delegate]');if(b){b.dataset.removeDelegate=i;b.hidden=i===0}el.querySelectorAll('[id]').forEach(x=>x.id=x.id.replace(/\d+$/,String(i)));});state.delegateCount=left.length;q('delegateCount').textContent=state.delegateCount+' / 3';q('addDelegate').disabled=false;}
function data(){return[...document.querySelectorAll('[data-delegate]')].map((_,i)=>({legalName:v('dName'+i),accreditationName:v('dBadge'+i),role:v('dRole'+i),customRole:v('dCustomRole'+i),email:v('dEmail'+i),phone:v('dPhone'+i),nationality:v('dNationality'+i),dateOfBirth:v('dBirth'+i),departureAirport:v('dAirport'+i),pressCardNumber:v('dPressCard'+i),dietary:v('dDiet'+i),accessibility:v('dAccess'+i),emergencyContact:v('dEmergency'+i),passportNameConfirmed:c('dPassportName'+i)}));}
function bind(){q('addDelegate').addEventListener('click',add);q('delegates').addEventListener('click',e=>{const b=e.target.closest('[data-remove-delegate]');if(b)remove(Number(b.dataset.removeDelegate));});}
window.GNKMediaTripDelegates={bind,data,status,q,v,c};
})();
