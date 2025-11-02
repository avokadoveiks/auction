const LAYER_ID = "avk-fx-layer";
const clamp = (v,min,max)=>Math.max(min, Math.min(max,v));
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInQuad   = t => t*t;

// Плавная докрутка числа (только для своего баланса)
export function avkAnimateNumber(el, from, to, dur=650){
  const start = performance.now();
  const step = (now)=>{
    const t = clamp((now-start)/dur, 0, 1);
    const v = Math.round(from + (to-from)*easeOutCubic(t));
    el.textContent = v.toLocaleString();
    if (t<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function getLayer(){
  let layer = document.getElementById(LAYER_ID);
  if (!layer){
    layer = document.createElement("div");
    layer.id = LAYER_ID;
    document.body.appendChild(layer);
  }
  return layer;
}

// Главный эффект: спавн → разлёт → сбор
export function avkPlayWinCoins({ originEl, targetEl, amount=50, count=14, burstMs=600, collectMs=700 }){
  if (!originEl || !targetEl) return;
  const layer = getLayer();

  const o = originEl.getBoundingClientRect();
  const t = targetEl.getBoundingClientRect();
  const ox = o.left + o.width/2;
  const oy = o.top  + o.height/2;
  const tx = t.left + t.width/2;
  const ty = t.top  + t.height/2;

  // Создаём монетки
  const coins = [];
  for (let i=0;i<count;i++){
    const c = document.createElement("div");
    c.className = "avk-coin";
    const s = document.createElement("div");
    s.className = "avk-shadow";
    layer.appendChild(c);
    layer.appendChild(s);
    coins.push({
      c, s,
      vx:(Math.random()*2-1)*(180 + Math.random()*90),
      vy:-(220 + Math.random()*160),
      x:ox, y:oy, life:0
    });
  }

  // Разлёт/подпрыгивание
  const g = 1200;
  let start = performance.now();
  let last  = start;

  function burst(now){
    const dt = (now - last)/1000; last = now;
    const floor = oy + 60;
    let allDone = (now - start) > burstMs;

    for (const k of coins){
      if (!allDone){
        k.vy += g*dt;
        k.x  += k.vx*dt;
        k.y  += k.vy*dt;
        if (k.y > floor){ k.y = floor; k.vy *= -0.45; k.vx *= 0.8; }
      }
      k.c.style.transform = `translate(${k.x}px, ${k.y}px)`;
      k.s.style.transform = `translate(${k.x}px, ${floor+8}px) scale(${clamp(1 - (floor-k.y)/120, .5, 1)},1)`;
    }

    if (!allDone) requestAnimationFrame(burst);
    else collect();
  }
  requestAnimationFrame(burst);

  // Сбор в цель
  function collect(){
    const t0 = performance.now();
    coins.forEach((k, i)=>{
      const x0=k.x, y0=k.y;
      const dx=tx-x0, dy=ty-y0;
      const delay = i*18;
      const arc   = Math.random()*0.15 + 0.05; // дуга

      const go = (now)=>{
        const t = now - t0 - delay;
        if (t<0){ requestAnimationFrame(go); return; }
        const p = clamp(t/collectMs, 0, 1);
        const e = easeInQuad(p);
        const cx = x0 + dx*e;
        const cy = y0 + dy*e - Math.sin(p*Math.PI)*arc*120;
        k.c.style.transform = `translate(${cx}px, ${cy}px) scale(${1 - p*0.2})`;
        k.c.style.opacity   = String(1 - p*0.1);
        k.s.style.opacity   = String(1 - p);
        if (p<1) requestAnimationFrame(go);
        else { k.c.remove(); k.s.remove(); }
      };
      requestAnimationFrame(go);
    });

    // мягкая подсветка цели
    targetEl.classList.add("avk-balance-glow");
    setTimeout(()=> targetEl.classList.remove("avk-balance-glow"), 360);
  }
}

// Авто-хук на onRoundEnd (бот/человек)
export function avkAutoHookWins({
  onRoundEnd,
  currentUserIdGetter,
  getColumnElById,
  coinCount = 18
} = {}){
  onRoundEnd?.(({ columnId, winnerId, isBot, prize })=>{
    const colEl =
      getColumnElById?.(columnId) ||
      document.querySelector(`[data-col="${columnId}"]`);
    if (!colEl) return;

    const originEl =
      colEl.querySelector('[data-origin]') ||
      colEl.querySelector('.pot') ||
      colEl;

    const target = document.querySelector("#topbar-balance") || document.body;

    avkPlayWinCoins({
      originEl,
      targetEl: target,
      amount: prize,
      count: coinCount ?? 18,
      burstMs: 650,
      collectMs: 750
    });

    const numberEl = document.querySelector("#topbar-balance-count");
    const me = currentUserIdGetter?.();
    if (numberEl && me != null && String(winnerId) === String(me)){
      const cur = Number(String(numberEl.textContent || "").replace(/[^\d]/g, "")) || 0;
      avkAnimateNumber(numberEl, cur, cur + (Number(prize) || 0), 700);
    }
  });
}
