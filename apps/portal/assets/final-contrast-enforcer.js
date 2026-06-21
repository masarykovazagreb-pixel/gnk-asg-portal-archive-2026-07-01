(() => {
  if (window.__GNK_FINAL_CONTRAST_ENFORCER__) return;
  window.__GNK_FINAL_CONTRAST_ENFORCER__ = true;

  const set = (el, property, value) => el?.style.setProperty(property, value, 'important');

  function apply() {
    const light = document.documentElement.dataset.gnkTheme === 'light';
    const palette = light ? {
      panel:'#ffffff', alt:'#f7f9fc', text:'#071426', muted:'#3f5067', label:'#334155', gold:'#765100', link:'#0b4f91', border:'rgba(7,20,38,.18)'
    } : {
      panel:'#102036', alt:'#142840', text:'#ffffff', muted:'#d1dbea', label:'#b9c7da', gold:'#f3d477', link:'#8fc7ff', border:'rgba(212,175,55,.44)'
    };

    const selector = [
      '#financials .kpi','#o-nama .card','#grupa .group-card','#grupa .group-kpis > div','#dokumenti .doc',
      '.tech-card','.news-card','.profile-board','.quick-data > div','.gnk-asg-hub-card','.gnk-asg-live-block'
    ].join(',');

    document.querySelectorAll(selector).forEach(box => {
      const alternate = box.matches('#grupa .group-card:first-child,#financials .kpi:nth-child(even),#grupa .group-kpis > div,#dokumenti .doc,.quick-data > div');
      set(box,'background',alternate ? palette.alt : palette.panel);
      set(box,'color',palette.text);
      set(box,'border-color',palette.border);
      box.querySelectorAll('h1,h2,h3,h4,strong,b,dd,.value,.asg-value').forEach(el => { set(el,'color',palette.text); set(el,'opacity','1'); set(el,'text-shadow','none'); });
      box.querySelectorAll('p,.meaning,.note,.muted').forEach(el => { set(el,'color',palette.muted); set(el,'opacity','1'); });
      box.querySelectorAll('dt,.label,small').forEach(el => { set(el,'color',palette.label); set(el,'opacity','1'); });
      box.querySelectorAll('.eyebrow,.tag,.meta').forEach(el => { set(el,'color',palette.gold); set(el,'opacity','1'); });
      box.querySelectorAll('a').forEach(el => {
        const isGoldDownload = /download\s+pdf/i.test(String(el.textContent || '')) || /\.pdf(?:$|[?#])/i.test(String(el.getAttribute('href') || ''));
        set(el,'color',isGoldDownload ? '#071426' : palette.link);
        set(el,'opacity','1');
        if (isGoldDownload) set(el,'text-shadow','none');
      });
    });

    document.querySelectorAll('#financials .section-head h1,#financials .section-head h2,#grupa .section-head h1,#grupa .section-head h2,#dokumenti .section-head h1,#dokumenti .section-head h2').forEach(el => set(el,'color',palette.text));
    document.querySelectorAll('#financials .section-head p,#grupa .section-head p,#dokumenti .section-head p').forEach(el => set(el,'color',palette.muted));

    const aiSelector = [
      '#gnk-asg-float-ai','#gnk-asg-ai-help-float','#gnk-asg-single-ai-button-anchor',
      '.gnk-global-float-ai','.gnk-asg-ai-badge','[data-ai-badge]','button[aria-label*="AI" i]','a[aria-label*="AI" i]'
    ].join(',');
    document.querySelectorAll(aiSelector).forEach(ai => {
      if (!String(ai.textContent || '').match(/AI|Pomoć|Help/i)) return;
      set(ai,'background','rgba(5,15,31,.98)');
      set(ai,'color','#ffffff');
      ai.querySelectorAll('*').forEach(el => { set(el,'color','#ffffff'); set(el,'opacity','1'); });
      set(ai.querySelector('small'),'color','rgba(255,255,255,.82)');
    });
  }

  function schedule() {
    apply();
    [80,300,900,1800,3200].forEach(delay => setTimeout(apply,delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
  new MutationObserver(items => {
    if (items.some(item => item.attributeName === 'data-gnk-theme')) schedule();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['data-gnk-theme']});
  document.addEventListener('click',event => {
    if (event.target?.id === 'gnk-asg-theme-toggle' || event.target?.closest?.('#gnk-asg-theme-toggle')) setTimeout(schedule,60);
  },true);
})();
