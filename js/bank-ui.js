(function(){
  const qs = (s, r=document)=>r.querySelector(s);
  const qsa = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const fmt = (n)=>{ try { return Number(n).toLocaleString('ru-RU') } catch(e){ return String(n) } };

  let bank;

  function ensureBank(){
    if (!bank) bank = new window.BankSystem();
    return bank;
  }

  function activePlayer(){
    try{
      // from v1.js globals
      return window.ACCOUNTS?.[window.currentAccountIndex] || null;
    }catch(e){ return null }
  }

  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k==='class') n.className = v; else if (k==='text') n.textContent = v; else n.setAttribute(k, v);
    });
    children.forEach(c=> n.appendChild(typeof c==='string'? document.createTextNode(c): c));
    return n;
  }

  function openModal(){
    let overlay = qs('.bank-overlay');
    if (!overlay){
      overlay = el('div',{class:'bank-overlay'});
      overlay.innerHTML = `
        <div class="bank-modal" role="dialog" aria-label="Банк">
          <div class="bank-header">
            <div class="bank-title">🏦 Банк</div>
            <div class="bank-spacer"></div>
            <button class="bank-close" id="bankCloseBtn">Закрыть</button>
          </div>
          <div class="bank-tabs">
            <button class="bank-tab active" data-tab="deposits">Вклады</button>
            <button class="bank-tab" data-tab="credits">Кредиты</button>
            <button class="bank-tab" data-tab="rewards">Награды</button>
          </div>
          <div class="bank-body" id="bankBody"></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e)=>{ if (e.target===overlay) closeModal(); });
      overlay.querySelector('#bankCloseBtn').addEventListener('click', closeModal);
      overlay.querySelectorAll('.bank-tab').forEach(btn=> btn.addEventListener('click', ()=> switchTab(btn.dataset.tab)));
      window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });
    }
    overlay.classList.add('open');
    try {
      const scrollBarW = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarW > 0) {
        document.body.style.paddingRight = scrollBarW + 'px';
      }
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } catch(e) {}
    switchTab('deposits');
  }

  function closeModal(){
    const overlay = qs('.bank-overlay');
    if (overlay) overlay.classList.remove('open');
    try {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    } catch(e) {}
  }

  async function switchTab(tab){
    qsa('.bank-tab').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
    const body = qs('#bankBody');
    if (!body) return;
    const player = activePlayer();
    const bs = ensureBank();
    if (tab==='deposits'){
      body.innerHTML = '';
      body.appendChild(renderDeposits(bs, player));
    } else if (tab==='credits'){
      body.innerHTML = '';
      body.appendChild(await renderCredits(bs, player));
    } else if (tab==='rewards'){
      body.innerHTML = '';
      body.appendChild(await renderRewards(bs, player));
    }
  }

  function renderDeposits(bs, player){
    const wrap = el('div');
    const row = el('div', {class:'bank-row'});
    const types = [
      { key:'short', title:'Краткосрочный — 1 день, +5%' },
      { key:'medium', title:'Средний — 7 дней, +15%' },
      { key:'long', title:'Долгосрочный — 30 дней, +40%' },
      { key:'perpetual', title:'Бессрочный — +2%/24ч' }
    ];
    types.forEach(t=> row.appendChild(renderDepositCard(bs, player, t)));
    wrap.appendChild(row);
    // Active list
    const listHead = el('div', {class:'bank-banner', text:'Активные вклады'});
    const list = el('div', {class:'bank-list', id:'depositList'});
    wrap.appendChild(listHead);
    wrap.appendChild(list);
    refreshDepositsList(bs, player);
    return wrap;
  }

  function renderDepositCard(bs, player, t){
    const card = el('div', {class:'bank-card'});
    const title = el('h4', {text: t.title});
    const input = el('input', { type:'number', min:'1', step:'1', placeholder:'Сумма' });
    const range = el('input', { type:'range', min:'0', max:'1000', value:'0' });
    const calc = el('div', {class:'bank-note', id:`calc_${t.key}`, text:'Прибыль: 0'});
    const actions = el('div', {class:'bank-actions'});
    const btn = el('button', {class:'bank-btn'}, [document.createTextNode('Открыть вклад')]);
    actions.appendChild(btn);
    card.append(title, el('div',{class:'bank-input'},[input, range]), calc, actions);

    function update(){
      const amount = Number(input.value||range.value||0);
      const profit = bs.calcDepositProfit({ type: t.key, amount, startAt: Date.now() });
      calc.textContent = `Прибыль: ${fmt(profit)} монет`;
    }
    input.addEventListener('input', ()=>{ range.value = String(input.value||0); update(); });
    range.addEventListener('input', ()=>{ input.value = String(range.value||0); update(); });
    update();

    btn.addEventListener('click', async ()=>{
      const amount = Number(input.value||range.value||0);
      if (!player) return alert('Нет игрока');
      if (!window.ACCOUNTS) return alert('Нет данных об аккаунтах');
      const acc = window.ACCOUNTS[window.currentAccountIndex];
      if (acc.balance < amount) return alert('Недостаточно средств');
      acc.balance -= amount;
      try { localStorage.setItem(`balance_${acc.id}`, String(acc.balance)); } catch(e){}
      if (window.renderCurrentAccount) window.renderCurrentAccount();
      await bs.openDeposit(player, { type: t.key, amount });
      refreshDepositsList(bs, player);
      alert('Вклад открыт');
    });
    return card;
  }

  async function refreshDepositsList(bs, player){
    const list = qs('#depositList'); if (!list) return;
    const state = await bs.loadState(player);
    const rows = state.deposits.filter(d=>!d.closed).map(d=>{
      const profit = bs.calcDepositProfit(d);
      const daysLeft = d.endAt ? Math.max(0, Math.ceil((d.endAt - Date.now())/(24*60*60*1000))) : '∞';
      const row = el('div',{class:'bank-list-item'});
      row.append(
        el('div',{text:`${d.type} • ${fmt(d.amount)} → +${fmt(profit)} монет`}),
        el('div',{class:'status-chip '+(d.endAt? (daysLeft? 'status-ok':'status-warn'):'status-warn') , text: d.endAt? `осталось: ${daysLeft}д` : 'бессрочный'})
      );
      if (d.endAt && Date.now() >= d.endAt){
        const btn = el('button', {class:'bank-btn secondary', text:'Закрыть'});
        btn.addEventListener('click', async ()=>{
          const { profit } = await bs.closeDeposit(player, d.id);
          const acc = window.ACCOUNTS[window.currentAccountIndex];
          acc.balance += d.amount + profit;
          try{ localStorage.setItem(`balance_${acc.id}`, String(acc.balance)); }catch(e){}
          if (window.renderCurrentAccount) window.renderCurrentAccount();
          refreshDepositsList(bs, player);
        });
        row.appendChild(btn);
      }
      return row;
    });
    list.innerHTML = '';
    rows.forEach(r=> list.appendChild(r));
  }

  async function renderCredits(bs, player){
    const wrap = el('div');
    const row = el('div',{class:'bank-row'});
    const plans = [
      { key:'d1', title:'1 день, 10%' },
      { key:'d7', title:'7 дней, 30%' },
      { key:'d30', title:'30 дней, 70%' }
    ];
    plans.forEach(p=> row.appendChild(renderCreditCard(bs, player, p)));
    wrap.appendChild(row);
    // Active credits list
    const listHead = el('div', {class:'bank-banner', text:'Активные кредиты'});
    const list = el('div', {class:'bank-list', id:'creditList'});
    wrap.appendChild(listHead);
    wrap.appendChild(list);
    refreshCreditsList(bs, player);
    return wrap;
  }

  function renderCreditCard(bs, player, p){
    const card = el('div',{class:'bank-card'});
    const title = el('h4', {text: `Кредит — ${p.title}`});
    const input = el('input',{type:'number', min:'1', step:'1', placeholder:'Сумма'});
    const calc = el('div', {class:'bank-note', id:`calc_credit_${p.key}`, text:'К погашению: 0'});
    const btn = el('button',{class:'bank-btn'},[document.createTextNode('Взять кредит')]);
    card.append(title, el('div',{class:'bank-input'},[input]), calc, el('div',{class:'bank-actions'}, [btn]));

    function update(){
      const principal = Number(input.value||0);
      const { total, interest } = bs.calcCreditDue({ plan: p.key, principal, startAt: Date.now() });
      calc.textContent = `К погашению: ${fmt(total)} (проценты ${fmt(interest)})`;
    }
    input.addEventListener('input', update); update();

    btn.addEventListener('click', async ()=>{
      const amount = Number(input.value||0);
      if (!player) return alert('Нет игрока');
      const acc = window.ACCOUNTS[window.currentAccountIndex];
      acc.balance += amount;
      try{ localStorage.setItem(`balance_${acc.id}`, String(acc.balance)); }catch(e){}
      if (window.renderCurrentAccount) window.renderCurrentAccount();
      await bs.takeCredit(player, { plan: p.key, amount });
      refreshCreditsList(bs, player);
      alert('Кредит оформлен');
    });
    return card;
  }

  async function refreshCreditsList(bs, player){
    const list = qs('#creditList'); if (!list) return;
    const state = await bs.loadState(player);
    const rows = state.credits.filter(c=>!c.repaid).map(c=>{
      const { total, dueAt, overdue } = bs.calcCreditDue(c);
      const row = el('div', {class:'bank-list-item'});
      row.append(
        el('div',{text:`${c.plan} • ${fmt(c.principal)} → всего ${fmt(total)}`}),
        el('div',{class:'status-chip '+(overdue?'status-bad':'status-ok'), text: overdue? 'просрочен' : `до: ${new Date(dueAt).toLocaleDateString('ru-RU')}`})
      );
      const repay = el('button', {class:'bank-btn secondary', text:'Погасить'});
      repay.addEventListener('click', async ()=>{
        const acc = window.ACCOUNTS[window.currentAccountIndex];
        try{
          // need current due
          const cur = bs.calcCreditDue(c);
          if (acc.balance < cur.total) return alert('Не хватает средств');
          acc.balance -= cur.total;
          try{ localStorage.setItem(`balance_${acc.id}`, String(acc.balance)); }catch(e){}
          if (window.renderCurrentAccount) window.renderCurrentAccount();
          await bs.repayCredit(player, c.id, cur.total);
          refreshCreditsList(bs, player);
        }catch(e){ alert(e.message||String(e)); }
      });
      row.appendChild(repay);
      return row;
    });
    list.innerHTML=''; rows.forEach(r=> list.appendChild(r));
  }

  async function renderRewards(bs, player){
    const wrap = el('div');
    const banner = el('div',{class:'bank-banner'});
    const can = await bs.canClaimDaily(player);
    banner.textContent = can? 'Доступна ежедневная награда: +50 монет' : 'Награда уже получена сегодня';
    const actions = el('div',{class:'bank-actions'});
    const btn = el('button',{class:'bank-btn', text: can? 'Забрать' : 'Недоступно', disabled: can? null : 'true' });
    actions.appendChild(btn);
    wrap.append(banner, actions);
    btn.addEventListener('click', async ()=>{
      try{
        const amount = await bs.claimDaily(player);
        const acc = window.ACCOUNTS[window.currentAccountIndex];
        acc.balance += amount;
        try{ localStorage.setItem(`balance_${acc.id}`, String(acc.balance)); }catch(e){}
        if (window.renderCurrentAccount) window.renderCurrentAccount();
        switchTab('rewards');
      }catch(e){ alert(e.message||String(e)); }
    });
    return wrap;
  }

  // Public API
  window.openBank = openModal;
  window.closeBank = closeModal;
})();
