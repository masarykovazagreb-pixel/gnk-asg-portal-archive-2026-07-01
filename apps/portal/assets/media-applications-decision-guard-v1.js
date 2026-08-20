(()=>{
  'use strict';
  if(window.__GNK_MEDIA_APPLICATIONS_DECISION_GUARD_V1__)return;
  window.__GNK_MEDIA_APPLICATIONS_DECISION_GUARD_V1__=true;

  const REASON_REQUIRED='Za ovaj status obavezno je kratko obrazloženje';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function currentRevision(node){
    return String(node?.dataset?.revision||node?.closest?.('[data-revision]')?.dataset?.revision||'').trim();
  }

  function ensureReason(form,status){
    if(!/^(APPROVED|REJECTED|NEEDS_CHANGES)$/i.test(String(status||'')))return true;
    const reason=form?.querySelector?.('[name="reason"],[data-decision-reason]');
    const value=String(reason?.value||'').trim();
    if(value.length>=3)return true;
    if(reason){
      reason.setAttribute('aria-invalid','true');
      reason.focus();
    }
    const host=form?.querySelector?.('[data-decision-error]');
    if(host)host.innerHTML=esc(REASON_REQUIRED);
    return false;
  }

  document.addEventListener('submit',event=>{
    const form=event.target?.closest?.('[data-media-decision-form]');
    if(!form)return;
    const revision=currentRevision(form);
    const status=form.querySelector('[name="status"],[data-decision-status]')?.value||'';
    if(!revision||!ensureReason(form,status)){
      event.preventDefault();
      return;
    }
    let expected=form.querySelector('input[name="expectedRevision"]');
    if(!expected){
      expected=document.createElement('input');
      expected.type='hidden';
      expected.name='expectedRevision';
      form.appendChild(expected);
    }
    const expectedRevision=currentRevision=form.dataset.revision||revision;
    expected.value=expectedRevision;
  },true);
})();
