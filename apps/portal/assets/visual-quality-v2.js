(() => {
  'use strict';
  if (window.__GNK_ASG_VISUAL_QUALITY_V2__) return;
  window.__GNK_ASG_VISUAL_QUALITY_V2__ = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const globe = document.querySelector('.globe');
  if (!globe || globe.querySelector('.iq-globe-canvas')) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'iq-globe-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  globe.appendChild(canvas);

  const label = document.createElement('span');
  label.className = 'iq-globe-label';
  label.textContent = document.documentElement.lang === 'en' ? 'Global network online' : 'Globalna mreža aktivna';
  globe.parentElement?.appendChild(label);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const locations = [
    {lat:45.815,lon:15.982,name:'Zagreb'},
    {lat:40.015,lon:-105.270,name:'Boulder'},
    {lat:51.507,lon:-0.128,name:'London'},
    {lat:25.205,lon:55.271,name:'Dubai'},
    {lat:1.352,lon:103.820,name:'Singapore'},
    {lat:35.677,lon:139.650,name:'Tokyo'},
    {lat:-33.869,lon:151.209,name:'Sydney'},
    {lat:43.653,lon:-79.383,name:'Toronto'}
  ];
  const routes = [[0,1],[0,2],[0,3],[0,4],[1,7],[3,5],[4,6]];
  let width=1,height=1,dpr=1,rotation=-0.45,raf=0,visible=true;

  function project(point, radius, cx, cy) {
    const lat = point.lat * Math.PI / 180;
    const lon = point.lon * Math.PI / 180 + rotation;
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    return {x:cx+x*radius,y:cy-y*radius,z};
  }

  function resize() {
    const rect = globe.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    width = Math.max(180, rect.width);
    height = Math.max(180, rect.height);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function drawGrid(cx,cy,radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx,cy,radius,0,Math.PI*2);
    ctx.clip();

    const sphere = ctx.createRadialGradient(cx-radius*.34,cy-radius*.36,radius*.05,cx,cy,radius);
    sphere.addColorStop(0,'rgba(255,238,174,.34)');
    sphere.addColorStop(.16,'rgba(42,142,223,.30)');
    sphere.addColorStop(.62,'rgba(5,29,54,.88)');
    sphere.addColorStop(1,'rgba(1,8,18,.98)');
    ctx.fillStyle=sphere;
    ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);

    ctx.globalCompositeOperation='screen';
    ctx.lineWidth=.7;
    for(let lat=-60;lat<=60;lat+=20){
      const latRad=lat*Math.PI/180;
      const ry=Math.cos(latRad)*radius;
      const yy=cy-Math.sin(latRad)*radius;
      ctx.strokeStyle=lat%40===0?'rgba(255,224,138,.30)':'rgba(85,221,255,.18)';
      ctx.beginPath();
      ctx.ellipse(cx,yy,ry,ry*.23,0,0,Math.PI*2);
      ctx.stroke();
    }
    for(let lon=0;lon<180;lon+=20){
      const phase=lon*Math.PI/180+rotation;
      const rx=Math.abs(Math.cos(phase))*radius;
      ctx.strokeStyle=lon%40===0?'rgba(255,224,138,.29)':'rgba(85,221,255,.17)';
      ctx.beginPath();
      ctx.ellipse(cx,cy,Math.max(2,rx),radius,0,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle='rgba(255,233,163,.68)';
    ctx.lineWidth=1.15;
    ctx.beginPath();
    ctx.arc(cx,cy,radius,0,Math.PI*2);
    ctx.stroke();
  }

  function drawRoutes(cx,cy,radius,time) {
    const projected=locations.map(p=>project(p,radius,cx,cy));
    routes.forEach(([a,b],index)=>{
      const p=projected[a],q=projected[b];
      if(p.z<-.15||q.z<-.15) return;
      const mx=(p.x+q.x)/2, my=(p.y+q.y)/2-radius*(.12+.035*(index%3));
      const alpha=.18+.34*Math.max(.15,(p.z+q.z)/2);
      const gradient=ctx.createLinearGradient(p.x,p.y,q.x,q.y);
      gradient.addColorStop(0,`rgba(255,224,138,${alpha})`);
      gradient.addColorStop(1,`rgba(85,221,255,${alpha})`);
      ctx.strokeStyle=gradient;
      ctx.lineWidth=1.1;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.quadraticCurveTo(mx,my,q.x,q.y);
      ctx.stroke();

      const t=((time*.00008)+(index/routes.length))%1;
      const omt=1-t;
      const x=omt*omt*p.x+2*omt*t*mx+t*t*q.x;
      const y=omt*omt*p.y+2*omt*t*my+t*t*q.y;
      ctx.fillStyle=index%2?'rgba(85,221,255,.95)':'rgba(255,224,138,.98)';
      ctx.shadowBlur=16;
      ctx.shadowColor=index%2?'#55ddff':'#e7bc50';
      ctx.beginPath();ctx.arc(x,y,2.1,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    });

    projected.forEach((p,index)=>{
      if(p.z<0) return;
      const pulse=1+(reduceMotion?0:Math.sin(time*.002+index)*.24);
      ctx.fillStyle=index<2?'rgba(255,233,163,.98)':'rgba(85,221,255,.94)';
      ctx.shadowBlur=18;ctx.shadowColor=index<2?'#e7bc50':'#55ddff';
      ctx.beginPath();ctx.arc(p.x,p.y,(index<2?3.2:2.3)*pulse,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    });
  }

  function frame(time=0){
    if(!visible){raf=requestAnimationFrame(frame);return;}
    ctx.clearRect(0,0,width,height);
    const radius=Math.min(width,height)*.43;
    const cx=width/2,cy=height/2;
    drawGrid(cx,cy,radius);
    drawRoutes(cx,cy,radius,time);
    if(!reduceMotion) rotation+=0.00042;
    raf=requestAnimationFrame(frame);
  }

  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);},{threshold:.02});
  observer.observe(globe);
  const resizeObserver=new ResizeObserver(resize);
  resizeObserver.observe(globe);
  window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
  resize();
  frame();
  import('/assets/document-center-v2.js?v=20260623-v2').catch(()=>{});
})();
