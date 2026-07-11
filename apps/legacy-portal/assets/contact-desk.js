(() => {
  const root = document.querySelector('[data-contact-desk]');
  if (!root) return;
  const lang = document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'en' : 'hr';
  const text = {
    hr: {
      category: 'Vrsta upita', name: 'Ime i prezime / naziv', email: 'Vaš e-mail', subject: 'Predmet', message: 'Kratak opis upita', emailAction: 'Pripremi e-mail', whatsappAction: 'Pošalji WhatsApp upit', note: 'Kontakt forma priprema poruku u vašem e-mail programu ili WhatsAppu. Portal ne pohranjuje zaporke niti osjetljive podatke.'
    },
    en: {
      category: 'Inquiry type', name: 'Name / company', email: 'Your email', subject: 'Subject', message: 'Short inquiry description', emailAction: 'Prepare e-mail', whatsappAction: 'Send WhatsApp inquiry', note: 'The contact desk prepares the message in your email client or WhatsApp. The portal does not store passwords or sensitive data.'
    }
  }[lang];

  function esc(v) { return String(v || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function enc(v) { return encodeURIComponent(String(v || '').trim()); }

  fetch('/data/contact_channels.json?v=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      if (!cfg) return;
      const cats = cfg.inquiry_categories || [];
      root.innerHTML = '<div class="contact-desk-panel">' +
        '<div class="contact-field"><label>' + text.category + '</label><select id="cdCategory">' + cats.map(c => '<option value="' + esc(c.id) + '">' + esc(lang === 'en' ? c.label_en : c.label_hr) + '</option>').join('') + '</select></div>' +
        '<div class="contact-grid"><div class="contact-field"><label>' + text.name + '</label><input id="cdName" type="text" autocomplete="name"></div><div class="contact-field"><label>' + text.email + '</label><input id="cdEmail" type="email" autocomplete="email"></div></div>' +
        '<div class="contact-field"><label>' + text.subject + '</label><input id="cdSubject" type="text"></div>' +
        '<div class="contact-field"><label>' + text.message + '</label><textarea id="cdMessage" rows="6"></textarea></div>' +
        '<div class="contact-actions"><a class="btn gold" id="cdMail" href="#">' + text.emailAction + '</a><a class="btn ghost" id="cdWhatsApp" href="#" target="_blank" rel="noopener">' + text.whatsappAction + '</a></div>' +
        '<p class="contact-note">' + esc(text.note) + '</p>' +
      '</div>';
      const category = document.getElementById('cdCategory');
      const name = document.getElementById('cdName');
      const email = document.getElementById('cdEmail');
      const subject = document.getElementById('cdSubject');
      const message = document.getElementById('cdMessage');
      const mail = document.getElementById('cdMail');
      const wa = document.getElementById('cdWhatsApp');
      function selectedCat() { return cats.find(c => c.id === category.value) || cats[0] || { target_email: cfg.primary_form_email || cfg.general_email }; }
      function build() {
        const c = selectedCat();
        const label = lang === 'en' ? c.label_en : c.label_hr;
        const subj = subject.value || (lang === 'en' ? 'GNK ASG inquiry: ' : 'GNK ASG upit: ') + label;
        const body = (lang === 'en'
          ? 'Inquiry type: ' + label + '\nName/company: ' + name.value + '\nReply email: ' + email.value + '\n\nMessage:\n' + message.value
          : 'Vrsta upita: ' + label + '\nIme/naziv: ' + name.value + '\nE-mail za odgovor: ' + email.value + '\n\nPoruka:\n' + message.value);
        mail.href = 'mailto:' + (c.target_email || cfg.primary_form_email || cfg.general_email) + '?subject=' + enc(subj) + '&body=' + enc(body);
        const waText = (lang === 'en' ? cfg.whatsapp.default_message_en : cfg.whatsapp.default_message_hr) + label + '\n' + message.value;
        wa.href = 'https://wa.me/' + cfg.whatsapp.number_e164 + '?text=' + enc(waText);
      }
      [category, name, email, subject, message].forEach(el => el.addEventListener('input', build));
      build();
    }).catch(() => {});
})();
