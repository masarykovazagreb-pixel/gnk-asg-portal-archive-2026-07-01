(() => {
  function answer(question) {
    const q = question.toLowerCase();
    if (q.includes('prihod') && q.includes('asg')) return 'Prema objavljenim podatcima na portalu, GNK ASG d.o.o. u 2025. prikazuje ukupne prihode od 504.001.681,97 EUR.';
    if (q.includes('dinamo') || q.includes('grup')) return 'GNK DINAMO Ltd. prikazan je kao međunarodni grupni okvir društva, sa sjedištem u Boulderu, Colorado, SAD. Detalji i napomene o osnovi grupnog prikaza navedeni su u odjeljku Grupa.';
    if (q.includes('bitcoin') || q.includes('coin') || q.includes('digital')) return 'Digital Assets Monitor prikazuje indikativne tržišne cijene i konverziju prema odabranim valutama. Ne predstavlja uslugu trgovanja niti investicijski savjet.';
    if (q.includes('ai') || q.includes('umjetn')) return 'GNK ASG tehnološki profil obuhvaća umjetnu inteligenciju, softverske platforme, fintech, digitalnu imovinu i sportsku analitiku.';
    return 'Pitajte me o GNK ASG-u, GNK DINAMO Ltd. grupnom okviru, financijskim pokazateljima, tehnologiji ili digitalnoj imovini.';
  }
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('messages');
    if (!form || !input || !messages) return;
    function send(value) {
      if (!value.trim()) return;
      const mine = document.createElement('div'); mine.className = 'bubble user'; mine.textContent = value;
      const bot = document.createElement('div'); bot.className = 'bubble bot'; bot.textContent = answer(value);
      messages.append(mine, bot); messages.scrollTop = messages.scrollHeight; input.value = '';
    }
    form.addEventListener('submit', (event) => { event.preventDefault(); send(input.value); });
    document.querySelectorAll('.prompt').forEach((button) => button.addEventListener('click', () => send(button.textContent)));
  });
})();
