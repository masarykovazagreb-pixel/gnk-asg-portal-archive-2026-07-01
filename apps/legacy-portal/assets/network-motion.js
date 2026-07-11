(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }
  function defs(svg) {
    if (svg.querySelector('#networkGlow')) return;
    const container = svgEl('defs');
    [['networkGlow','#76c7ff',5],['networkGlowSoft','#bde6ff',3],['networkGlowGreen','#71ed91',5]].forEach(([id, color, blur]) => {
      const filter = svgEl('filter', {id, x:'-60%', y:'-60%', width:'220%', height:'220%'});
      const gaussian = svgEl('feGaussianBlur', {stdDeviation:String(blur), result:'blur'});
      const flood = svgEl('feFlood', {'flood-color':color, 'flood-opacity':'0.9', result:'colour'});
      const composite = svgEl('feComposite', {in:'colour', in2:'blur', operator:'in', result:'glow'});
      const merge = svgEl('feMerge');
      merge.appendChild(svgEl('feMergeNode', {in:'glow'}));
      merge.appendChild(svgEl('feMergeNode', {in:'SourceGraphic'}));
      filter.append(gaussian, flood, composite, merge);
      container.appendChild(filter);
    });
    svg.prepend(container);
  }
  function flowingPath(source, className, delay) {
    const path = source.cloneNode(false);
    path.removeAttribute('id');
    path.removeAttribute('class');
    path.setAttribute('class', className);
    path.style.animationDelay = delay + 's';
    return path;
  }
  function dot(path, type, duration, begin) {
    const circle = svgEl('circle', {r: type === 'direct' ? '2.6' : '2.2', class:`network-travel-dot ${type}`});
    const motion = svgEl('animateMotion', {dur:`${duration}s`, repeatCount:'indefinite', begin:`${begin}s`, rotate:'auto'});
    const mpath = svgEl('mpath', {href:`#${path.id}`});
    motion.appendChild(mpath);
    circle.appendChild(motion);
    return circle;
  }
  function enhance(svg) {
    if (!svg || (svg.dataset.motionReady === '1' && svg.querySelector('.network-motion-layer'))) return;
    svg.querySelector('.network-motion-layer')?.remove();
    svg.querySelector('.network-electric-label')?.remove();
    const basePaths = Array.from(svg.querySelectorAll('.network-link-direct, .network-link-peer, .network-link-plan'));
    if (!basePaths.length) return;
    svg.dataset.motionReady = '1';
    defs(svg);
    const layer = svgEl('g', {class:'network-motion-layer', 'aria-hidden':'true'});
    let directIndex = 0;
    let peerIndex = 0;
    basePaths.forEach((path, index) => {
      if (!path.id) path.id = `network-route-${index}`;
      if (path.classList.contains('network-link-hidden')) return;
      if (path.classList.contains('network-link-direct')) {
        layer.appendChild(flowingPath(path, 'network-flow-direct', -((directIndex % 9) * .21)));
        if (!reduced() && directIndex % 3 === 0) layer.appendChild(dot(path, 'direct', 3.2 + ((directIndex % 4) * .35), -(directIndex * .17)));
        directIndex += 1;
      } else if (path.classList.contains('network-link-plan')) {
        layer.appendChild(flowingPath(path, 'network-flow-plan', -((index % 7) * .3)));
        if (!reduced() && index % 3 === 0) layer.appendChild(dot(path, 'plan', 3.8 + ((index % 3) * .4), -(index * .11)));
      } else {
        layer.appendChild(flowingPath(path, 'network-flow-peer', -((peerIndex % 7) * .35)));
        peerIndex += 1;
      }
    });
    const nodeGroup = svg.querySelector('.network-node');
    svg.insertBefore(layer, nodeGroup || null);
    const label = svgEl('text', {class:'network-electric-label', x:'55', y:'510'});
    label.textContent = 'LIVE NETWORK FLOW';
    svg.appendChild(label);
  }
  function watch() {
    const host = document.body;
    const run = () => enhance(document.getElementById('networkSvg'));
    run();
    const observer = new MutationObserver(() => run());
    observer.observe(host, {childList:true, subtree:true});
    window.addEventListener('gnk-language-change', () => window.setTimeout(run, 60));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', watch) : watch();
})();
