(function(){
  const qs = (s, r=document)=>r.querySelector(s);
  const qsa = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const fmt = (n)=>{ try { return Number(n).toLocaleString('ru-RU') } catch(e){ return String(n) } };

  let realEstate;

  function ensureRealEstate(){
    if (!realEstate) realEstate = new window.RealEstateSystem();
    return realEstate;
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

  function formatTime(ms){
    if (ms <= 0) return 'Готово';
    const h = Math.floor(ms / (60*60*1000));
    const m = Math.floor((ms % (60*60*1000)) / (60*1000));
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  }

  function openModal(){
    let overlay = qs('.realestate-overlay');
    if (!overlay){
      overlay = el('div',{class:'realestate-overlay'});
      overlay.innerHTML = `
        <div class="realestate-modal" role="dialog" aria-label="Недвижимость">
          <div class="realestate-header">
            <div class="realestate-title">🏠 Недвижимость</div>
            <div class="realestate-spacer"></div>
            <button class="realestate-close" id="realestateCloseBtn">Назад ⬅️</button>
          </div>
          <div class="realestate-body" id="realestateBody"></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e)=>{ if (e.target===overlay) closeModal(); });
      overlay.querySelector('#realestateCloseBtn').addEventListener('click', closeModal);
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
    renderContent();
  }

  function closeModal(){
    const overlay = qs('.realestate-overlay');
    if (overlay) overlay.classList.remove('open');
    try {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    } catch(e) {}
  }

  async function renderContent(){
    const body = qs('#realestateBody');
    if (!body) return;
    
    const player = activePlayer();
    if (!player) {
      body.innerHTML = '<div class="realestate-banner">Игрок не найден</div>';
      return;
    }

    const rs = ensureRealEstate();
    const summary = await rs.getSummary(player, player.balance);

    // Check if unlocked
    if (!summary.unlocked) {
      body.innerHTML = `
        <div class="realestate-locked">
          <div class="locked-icon">🔒</div>
          <div class="locked-title">Недвижимость недоступна</div>
          <div class="locked-text">Необходимо: ${summary.dealsNeeded} успешных сделок</div>
          <div class="locked-progress">Прогресс: ${summary.dealsCount} / ${summary.dealsNeeded}</div>
        </div>
      `;
      return;
    }

    // Render properties
    let html = '';
    
    // Collect all button at top if any income available
    if (summary.totalAvailable > 0) {
      html += `
        <div class="realestate-collect-all">
          <button class="realestate-btn realestate-btn-collect" onclick="window.collectAllRealEstateIncome()">
            Собрать прибыль 💰 ${fmt(summary.totalAvailable)}
          </button>
        </div>
      `;
    }

    html += '<div class="realestate-list">';
    
    summary.properties.forEach(prop => {
      const hasIncome = prop.income > 0;
      const timer = hasIncome ? 'Готово ✅' : (prop.owned > 0 ? formatTime(prop.nextIn) : '—');
      
      html += `
        <div class="realestate-card">
          <div class="property-icon">${prop.icon}</div>
          <div class="property-info">
            <div class="property-name">${prop.name}</div>
            <div class="property-cost">Стоимость: ${fmt(prop.cost)} 💰</div>
            <div class="property-income">Доход: +${fmt(prop.income)} каждые ${prop.intervalHours}ч</div>
            ${prop.owned > 0 ? `<div class="property-owned">Владеете: ${prop.owned} шт.</div>` : ''}
          </div>
          <div class="property-actions">
            <div class="property-timer">${timer}</div>
            ${hasIncome ? `
              <button class="realestate-btn realestate-btn-small" onclick="window.collectRealEstateIncome('${prop.id}')">
                Собрать ${fmt(prop.income)} 💰
              </button>
            ` : ''}
            <button class="realestate-btn ${!prop.canBuy ? 'realestate-btn-disabled' : ''}" 
                    onclick="window.buyRealEstateProperty('${prop.id}')"
                    ${!prop.canBuy ? 'disabled' : ''}>
              Купить за ${fmt(prop.cost)} 💰
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    body.innerHTML = html;
  }

  // Global functions for button handlers
  window.openRealEstate = function(){
    openModal();
  };

  window.buyRealEstateProperty = async function(propertyId){
    const player = activePlayer();
    if (!player) return alert('Игрок не найден');

    const rs = ensureRealEstate();
    try {
      const result = await rs.buyProperty(player, player.balance, propertyId);
      if (result.success) {
        player.balance = result.newBalance;
        updatePlayerUI();
        renderContent();
        // Show success message
        const prop = rs.config.properties[propertyId];
        showNotification(`✅ ${prop.name} куплена! (${result.count} шт.)`, 'success');
      }
    } catch(e) {
      alert(e.message);
    }
  };

  window.collectRealEstateIncome = async function(propertyId){
    const player = activePlayer();
    if (!player) return alert('Игрок не найден');

    const rs = ensureRealEstate();
    try {
      const result = await rs.collectIncome(player, player.balance, propertyId);
      if (result.success) {
        player.balance = result.newBalance;
        updatePlayerUI();
        renderContent();
        showNotification(`💰 Собрано: ${fmt(result.amount)}`, 'success');
      } else {
        alert(result.message || 'Нет доступного дохода');
      }
    } catch(e) {
      alert(e.message);
    }
  };

  window.collectAllRealEstateIncome = async function(){
    const player = activePlayer();
    if (!player) return alert('Игрок не найден');

    const rs = ensureRealEstate();
    try {
      const result = await rs.collectAllIncome(player, player.balance);
      if (result.success) {
        player.balance = result.newBalance;
        updatePlayerUI();
        renderContent();
        showNotification(`💰 Собрано всего: ${fmt(result.amount)}`, 'success');
      } else {
        alert('Нет доступного дохода');
      }
    } catch(e) {
      alert(e.message);
    }
  };

  function updatePlayerUI(){
    try {
      // Update balance display (v1.js function)
      if (typeof window.updatePlayerDisplay === 'function') {
        window.updatePlayerDisplay();
      }
      // Fallback: update directly
      const balanceEl = document.getElementById('currentBalance');
      if (balanceEl) {
        const player = activePlayer();
        if (player) balanceEl.textContent = `${fmt(player.balance)} 💰`;
      }
    } catch(e) {
      console.warn('Failed to update player UI', e);
    }
  }

  function showNotification(message, type='info'){
    const notif = el('div', {class: `realestate-notification ${type}`});
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  // Auto-refresh timer display every second when modal is open
  setInterval(() => {
    const overlay = qs('.realestate-overlay');
    if (overlay && overlay.classList.contains('open')) {
      renderContent();
    }
  }, 1000);

})();
