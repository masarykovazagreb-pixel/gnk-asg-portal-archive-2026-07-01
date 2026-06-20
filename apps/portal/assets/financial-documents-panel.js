(function () {
  'use strict';

  var DOCS = {
    audit: '/documents/GNK_ASG_Izvjesce_neovisnog_revizora_i_financijski_izvjestaji_2025.pdf',
    group: '/documents/GNK_DINAMO_Ltd_Colorado_Filing_Consolidated_Financial_Statements_2025.pdf'
  };
  var availability = { audit: false, group: false };

  function english() {
    return document.documentElement.lang === 'en' || /\/en\/?$/.test(window.location.pathname);
  }

  function content(en) {
    return {
      audit: en ? {
        label: 'Independent audit', title: 'Independent Auditor Report and Financial Statements',
        description: 'With notes including consolidated financial data of GNK DINAMO Ltd. Group.', action: 'Download PDF', file: DOCS.audit
      } : {
        label: 'Neovisna revizija', title: 'Izvješće neovisnog revizora i financijski izvještaji',
        description: 'S bilješkama koje uključuju konsolidirane financijske podatke GNK DINAMO Ltd. Group.', action: 'Preuzmi PDF', file: DOCS.audit
      },
      group: en ? {
        label: 'Filed in Colorado', title: 'Consolidated Financial Statements of the Group',
        description: 'Certified Colorado filing; data included in the notes to the audited GNK ASG d.o.o. financial statements.', action: 'Download PDF', file: DOCS.group
      } : {
        label: 'Filed in Colorado', title: 'Konsolidirani financijski izvještaji grupe',
        description: 'Certificirani Colorado podnesak; podatci uključeni u bilješke revidiranih financijskih izvještaja GNK ASG d.o.o.', action: 'Preuzmi PDF', file: DOCS.group
      }
    };
  }

  function strip(data, id) {
    var item = document.createElement('div');
    item.className = 'financial-document-strip';
    item.id = id;
    item.innerHTML = '<div class="financial-document-copy"><span class="financial-document-mark">PDF</span><div class="financial-document-text"><span class="financial-document-label"></span><strong class="financial-document-title"></strong><span class="financial-document-desc"></span></div></div><a class="financial-document-action" target="_blank" rel="noopener"></a>';
    item.querySelector('.financial-document-label').textContent = data.label;
    item.querySelector('.financial-document-title').textContent = data.title;
    item.querySelector('.financial-document-desc').textContent = data.description;
    item.querySelector('.financial-document-action').href = data.file;
    item.querySelector('.financial-document-action').textContent = data.action + ' \u2193';
    return item;
  }

  function cardLink(card, href, label) {
    if (!card || card.querySelector('.document-download-action')) return;
    var link = document.createElement('a');
    link.className = 'document-download-action';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = label + ' \u2192';
    card.appendChild(link);
  }

  function render() {
    var text = content(english());
    var kpis = document.querySelector('#financials .kpi-grid');
    var groupKpis = document.querySelector('#grupa .group-kpis');
    var oldAudit = document.getElementById('audit-document-strip');
    var oldGroup = document.getElementById('group-document-strip');
    if (oldAudit) oldAudit.remove();
    if (oldGroup) oldGroup.remove();

    if (availability.audit && kpis) {
      kpis.parentNode.insertBefore(strip(text.audit, 'audit-document-strip'), kpis.nextSibling);
    }
    if (availability.group && groupKpis) {
      var item = strip(text.group, 'group-document-strip');
      var note = document.querySelector('#grupa .gold-note');
      if (note) note.parentNode.insertBefore(item, note.nextSibling);
      else groupKpis.parentNode.insertBefore(item, groupKpis.nextSibling);
    }
    var docs = document.querySelectorAll('#dokumenti .doc');
    if (docs.length > 1) {
      if (availability.audit) cardLink(docs[0], DOCS.audit, english() ? 'Download PDF' : 'Preuzmi PDF');
      if (availability.group) cardLink(docs[1], DOCS.group, english() ? 'Download PDF' : 'Preuzmi PDF');
    }
  }

  function check(key) {
    return fetch(DOCS[key], { method: 'HEAD', cache: 'no-store' }).then(function (response) {
      availability[key] = response.ok && /pdf/i.test(response.headers.get('content-type') || '');
    }).catch(function () { availability[key] = false; });
  }

  function init() {
    Promise.all([check('audit'), check('group')]).then(render);
    window.addEventListener('gnk-language-change', render);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
}());
