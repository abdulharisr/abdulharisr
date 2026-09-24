'use strict';
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const button = document.getElementById('motion');
  const canvas = document.getElementById('universe');
  const ctx = canvas.getContext('2d');
  const halo = document.querySelector('.cursor-halo');
  const scene = document.querySelector('.orbit-scene');
  const pointer = {x:-1000,y:-1000};
  let saved = false;
  try { saved = localStorage.getItem('haris-motion') === 'off'; } catch {}
  let paused = saved || reduced.matches;
  let width = innerWidth, height = innerHeight, frameId = 0, lastTime = 0;
  let stars = [], bursts = [];
  const random = (min,max) => min + Math.random()*(max-min);
  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width*ratio); canvas.height = Math.round(height*ratio);
    if(ctx) ctx.setTransform(ratio,0,0,ratio,0,0);
    stars = Array.from({length:width < 720 ? 34 : 76},() => ({
      x:random(0,width),y:random(0,height),z:random(.2,1),phase:random(0,6.28)
    }));
    if (paused || document.hidden) draw(0);
  }
  function draw(dt) {
    if(!ctx) return;
    ctx.clearRect(0,0,width,height);
    for (const star of stars) {
      if(dt) {
        star.y -= dt * (2 + star.z*6);
        star.x += Math.sin(star.phase) * dt * 2;
        if(star.y < -4) { star.y=height+4;star.x=random(0,width); }
        if(star.x<0) star.x=width;
        if(star.x>width) star.x=0;
      }
      const dx=pointer.x-star.x,dy=pointer.y-star.y;
      const distance=Math.hypot(dx,dy);
      const influence=!paused && distance<170 ? (1-distance/170)*10 : 0;
      const px=star.x-(dx/(distance||1))*influence, py=star.y-(dy/(distance||1))*influence;
      ctx.fillStyle='rgba(179,228,220,'+(0.12+star.z*.28)+')';
      ctx.beginPath();ctx.arc(px,py,.6+star.z,0,Math.PI*2);ctx.fill();
      if(!paused && distance<145 && fine.matches) {
        ctx.strokeStyle='rgba(163,247,213,'+((1-distance/145)*.13)+')';
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(pointer.x,pointer.y);ctx.stroke();
      }
    }
    for(const b of bursts) {
      b.age += dt;
      ctx.strokeStyle='rgba(163,247,213,'+Math.max(0,(1-b.age/1.2)*.32)+')';
      ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,12+b.age*95,0,Math.PI*2);ctx.stroke();
    }
    bursts=bursts.filter(b=>b.age<1.2);
  }
  function frame(t) {
    frameId=0;
    if(paused || document.hidden || !ctx) return;
    const dt=lastTime?Math.min((t-lastTime)/1000,.04):0;
    lastTime=t;draw(dt);
    frameId=requestAnimationFrame(frame);
  }
  function restart() {
    if(frameId) cancelAnimationFrame(frameId);
    frameId=0;lastTime=0;
    if(!paused && !document.hidden && ctx) frameId=requestAnimationFrame(frame);
    else draw(0);
  }
  function applyMotion() {
    paused = saved || reduced.matches;
    root.classList.toggle('motion-paused',paused);
    button.textContent=reduced.matches?'Animasi: dikurangi':paused?'Animasi: jeda':'Animasi: aktif';
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',paused?'Aktifkan animasi':'Jeda animasi');
    button.disabled=reduced.matches;
    button.title=reduced.matches?'Mengikuti pengaturan kurangi gerakan perangkat':'Aktifkan atau jeda efek visual';
    if(paused) {
      halo.style.opacity='0';
      scene.style.removeProperty('--rx');scene.style.removeProperty('--ry');
      document.querySelectorAll('.tilt').forEach(el=>el.style.removeProperty('transform'));
      bursts=[];
    }
    restart();
  }
  button.addEventListener('click',()=>{
    saved=!paused;
    try {localStorage.setItem('haris-motion',saved?'off':'on');}catch{}
    applyMotion();
  });
  reduced.addEventListener('change',applyMotion);
  window.addEventListener('resize',()=>{resize();restart();},{passive:true});
  document.addEventListener('visibilitychange',restart);
  document.addEventListener('pointermove',e=>{
    pointer.x=e.clientX;pointer.y=e.clientY;
    if(paused || !fine.matches) return;
    halo.style.left=e.clientX+'px';halo.style.top=e.clientY+'px';halo.style.opacity='1';
    halo.classList.toggle('over',Boolean(e.target.closest('a,button,summary')));
  },{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.x=-1000;pointer.y=-1000;halo.style.opacity='0';});
  document.addEventListener('pointerdown',e=>{
    if(!paused && fine.matches && bursts.length<8) bursts.push({x:e.clientX,y:e.clientY,age:0});
  },{passive:true});
  const visual=document.querySelector('.hero-visual');
  visual.addEventListener('pointermove',e=>{
    if(paused || !fine.matches)return;
    const box=visual.getBoundingClientRect();
    scene.style.setProperty('--rx',((e.clientX-box.left)/box.width-.5)*18+'deg');
    scene.style.setProperty('--ry',-((e.clientY-box.top)/box.height-.5)*14+'deg');
  },{passive:true});
  visual.addEventListener('pointerleave',()=>{
    scene.style.setProperty('--rx','0deg');scene.style.setProperty('--ry','0deg');
  });
  document.querySelectorAll('.glass').forEach(el=>{
    el.addEventListener('pointermove',e=>{
      if(paused || !fine.matches)return;
      const box=el.getBoundingClientRect();
      el.style.setProperty('--mx',e.clientX-box.left+'px');
      el.style.setProperty('--my',e.clientY-box.top+'px');
    },{passive:true});
  });
  document.querySelectorAll('.tilt').forEach(el=>{
    el.addEventListener('pointermove',e=>{
      if(paused || !fine.matches)return;
      const box=el.getBoundingClientRect();
      const x=((e.clientX-box.left)/box.width-.5)*5;
      const y=-((e.clientY-box.top)/box.height-.5)*5;
      el.style.transform='perspective(1000px) rotateX('+y+'deg) rotateY('+x+'deg) translateY(-3px)';
    },{passive:true});
    el.addEventListener('pointerleave',()=>{el.style.removeProperty('transform');});
  });
  resize();applyMotion();
})();
