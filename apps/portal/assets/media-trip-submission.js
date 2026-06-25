(()=>{
'use strict';
const q=id=>document.getElementById(id);
function prepare(){
  const form=q('mediaTripForm');
  form.method='post';
  form.action='/api/media-trip/public/form-submit';
  form.enctype='multipart/form-data';
  form.addEventListener('submit',event=>{
    if(!form.reportValidity()){event.preventDefault();return;}
    form.querySelectorAll('input,select,textarea').forEach(field=>{
      if(field.id&&!field.name)field.name=field.id;
    });
    let hidden=q('documentsJson');
    if(!hidden){hidden=document.createElement('input');hidden.type='hidden';hidden.id='documentsJson';hidden.name='documentsJson';form.appendChild(hidden);}
    hidden.value=JSON.stringify(window.GNKMediaTripState?.documents||[]);
    const button=q('submitApplication');
    if(button){button.disabled=true;button.textContent='Slanje prijave…';}
  });
}
window.GNKMediaTripSubmission={bind:prepare};
})();
