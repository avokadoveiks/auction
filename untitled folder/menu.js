(function(){
  const DEFAULT_WALLPAPER = 'assets/menu-bg.png';
  const SECONDARY_WALLPAPER = 'https://file+.vscode-resource.vscode-cdn.net/Users/olehkruchko/Downloads/auction-game/ba896bca-48bc-4c09-88fc-d5609189859f.png?version%3D1760910916105';

  const ACCOUNTS = [
    {
      id: "alpha",
      name: "Александр",
      avatar: "🦊",
      avatarImage: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=160&h=160&q=80",
      background: "linear-gradient(135deg,#f97316,#fb923c)",
      balance: 540
    },
    {
      id: "bravo",
      name: "Марина",
      avatar: "🐱",
      avatarImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&h=160&q=80",
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      balance: 620
    },
    {
      id: "charlie",
      name: "Илья",
      avatar: "🐻",
      avatarImage: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=160&h=160&q=80",
      background: "linear-gradient(135deg,#facc15,#f97316)",
      balance: 480
    },
    {
      id: "delta",
      name: "Олег",
      avatar: "🐼",
      avatarImage: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=160&h=160&q=80",
      background: "linear-gradient(135deg,#10b981,#34d399)",
      balance: 560
    }
  ];

  let playButton = null;
  let leaguesButton = null;

  const popupState = {
    root: null,
    backdrop: null,
    open: false,
    lastFocus: null
  };

  function loadCurrentAccountIndex(){
    try {
      const raw = localStorage.getItem('currentAccountIndex');
      const idx = raw == null ? NaN : Number(raw);
      if (!Number.isNaN(idx) && idx >= 0 && idx < ACCOUNTS.length) return idx;
    } catch(e) {}
    return 0;
  }

  function loadBalanceFor(account){
    if (!account) return account;
    try {
      const key = `balance_${account.id}`;
      const raw = localStorage.getItem(key);
      const num = raw == null ? NaN : Number(raw);
      if (!Number.isNaN(num)) account.balance = num;
    } catch(e) {}
    return account;
  }

  function setAvatar(el, account){
    if (!el) return;
    el.classList.remove('has-image');
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';
    el.style.backgroundPosition = '';
    el.style.backgroundRepeat = '';
    el.style.background = 'rgba(255, 255, 255, 0.1)';
    el.style.color = '#0b1020';
    el.textContent = '';
    if (!account) return;

    if (account.avatarImage){
      el.classList.add('has-image');
      el.style.background = 'rgba(17, 23, 41, 0.65)';
      el.style.backgroundImage = `url(${account.avatarImage})`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
    } else {
      el.textContent = account.avatar || '🙂';
      if (account.background){
        el.style.background = account.background;
      }
    }
  }

  function formatNumber(v){
    try { return Number(v).toLocaleString('ru-RU'); }
    catch(e) { return String(v); }
  }

  function renderMenuAccount(){
    const idx = loadCurrentAccountIndex();
    const account = loadBalanceFor(ACCOUNTS[idx]);
    const nameEl = document.getElementById('menuName');
    const balEl = document.getElementById('menuBalance');
    const avaEl = document.getElementById('menuAvatar');

    const guestText = window.LocalizationManager?.get('menu_guest') || 'Гость';
    const balanceLabel = window.LocalizationManager?.get('menu_balance_label') || 'Баланс';
    
    if (nameEl) nameEl.textContent = account?.name ?? guestText;
    // Показываем баланс точно как в игре: "Баланс: X монет"
    if (balEl) balEl.textContent = balanceLabel + ': ' + (account ? formatNumber(account.balance) : '—') + ' монет';
    if (avaEl) setAvatar(avaEl, account);
    // Coin-line is removed from UI; textual balance is the single source of truth

    try {
      window.dispatchEvent(new CustomEvent('player-changed', {
        detail: { account, index: idx }
      }));
    } catch (e) {}
  }

  // Подгоняем ширину строки баланса под ширину имени
  function syncHeaderChipsWidth(){
    try {
      const nameEl = document.getElementById('menuName');
      const resEl = document.getElementById('userBalanceLine');
      if (!nameEl || !resEl) return;
      // вычисляем видимую ширину имени (с учётом усечения)
      const w = Math.ceil(nameEl.getBoundingClientRect().width);
      if (w > 0) {
        resEl.style.width = w + 'px';
      }
    } catch (_) {}
  }

  function getParam(name){
    try { return new URLSearchParams(location.search).get(name); }
    catch(e) { return null; }
  }

  function tryLoad(url, onOk, onFail){
    const img = new Image();
    img.onload = () => onOk(url);
    img.onerror = () => onFail && onFail(url);
    img.src = url;
  }

  function setBg(url){
    const bg = document.getElementById('bg');
    if (!bg) return;
    if (!url){
      bg.style.backgroundImage = '';
      return;
    }
    bg.style.opacity = '0.85';
    tryLoad(url, (okUrl) => {
      bg.style.backgroundImage = `url(${okUrl})`;
      bg.style.opacity = '1';
    }, () => {
      console.warn('Background failed, trying default menu-bg.png:', url);
      tryLoad('assets/menu-bg.png', (okUrl2) => {
        bg.style.backgroundImage = `url(${okUrl2})`;
        bg.style.opacity = '1';
      }, () => {
        bg.style.opacity = '1';
      });
    });
  }

  function resolveWallpaper(){
    const qp = getParam('wallpaper');
    if (qp) return qp;
    return DEFAULT_WALLPAPER;
  }

  function goPlay(){
    const params = new URLSearchParams();
    params.set('v', new Date().toISOString().slice(0, 10));
    const leaguesApi = window.menuLeagues;
    if (leaguesApi && typeof leaguesApi.getSelectedLeague === 'function'){
      const league = leaguesApi.getSelectedLeague();
      if (league) params.set('league', league);
    }
    const query = params.toString();
    location.href = query ? `v1.html?${query}` : 'v1.html';
  }

  function showBank(){
    if (typeof window.openBank === 'function') return window.openBank();
    alert('Банк недоступен: не загружены модули');
  }

  function showRealEstate(){
    if (typeof window.openRealEstate === 'function') return window.openRealEstate();
    alert('Недвижимость недоступна: не загружены модули');
  }

  function openStore(){
    alert('Магазин скоро откроется!');
  }

  function openEvents(){
    if (typeof window.openEvents === 'function') return window.openEvents();
    alert('События недоступны: не загружены модули');
  }

  function openMail(){
    alert('Почта пуста. Возвращайтесь позже!');
  }

  function openAchievements(){
    // Открыть попап истории побед в меню
    openWinnersPopup();
  }

  function openBag(){
    alert('В сумке пока пусто. Соберите награды!');
  }

  function openMode(){
    alert('Выбор режима появится позже.');
  }

  function openFeedback() {
    const popup = document.getElementById('feedbackPopup');
    const backdrop = document.getElementById('feedbackBackdrop');
    const closeBtn = document.getElementById('feedbackCloseBtn');
    const backBtn = document.getElementById('feedbackBackBtn');
    const submitBtn = document.getElementById('feedbackSubmitBtn');
    const textarea = document.getElementById('feedbackTextarea');
    const charCount = document.getElementById('feedbackCharCount');
  const successMsg = document.getElementById('feedbackSuccess');
  const feedbackBody = document.querySelector('.feedback-body');

    if (!popup || !backdrop) return;

    // Reset form
    textarea.value = '';
    charCount.textContent = '0';
    submitBtn.disabled = true;
  successMsg.hidden = true;
  feedbackBody.hidden = false;

    // Show popup
    popup.removeAttribute('hidden');
    setTimeout(() => textarea.focus(), 100);

    // Character counter
    const updateCounter = () => {
      const count = textarea.value.length;
      charCount.textContent = count;
      submitBtn.disabled = count === 0;
    };
    textarea.addEventListener('input', updateCounter);

    // Close handlers
    const closeFeedback = () => {
      popup.setAttribute('hidden', '');
      textarea.removeEventListener('input', updateCounter);
    };

    closeBtn.onclick = closeFeedback;
    backBtn.onclick = closeFeedback;
    backdrop.onclick = closeFeedback;

    // Submit handler
    submitBtn.onclick = () => {
      const text = textarea.value.trim();
      if (!text) return;

      // Save to localStorage (PlayerData simulation)
      try {
        const feedback = {
          text,
          timestamp: Date.now(),
          accountId: ACCOUNTS[loadCurrentAccountIndex()]?.id || 'unknown'
        };
        const existingFeedback = JSON.parse(localStorage.getItem('playerFeedback') || '[]');
        existingFeedback.push(feedback);
        localStorage.setItem('playerFeedback', JSON.stringify(existingFeedback));
      } catch (e) {
        console.warn('[Feedback] Failed to save:', e);
      }

      // Show success message
  feedbackBody.hidden = true;
  successMsg.hidden = false;

      // Auto close after 3 seconds
      setTimeout(closeFeedback, 3000);
    };
  }

  function openBugReport() {
    const popup = document.getElementById('bugReportPopup');
    const backdrop = document.getElementById('bugReportBackdrop');
    const closeBtn = document.getElementById('bugReportCloseBtn');
    const backBtn = document.getElementById('bugReportBackBtn');
    const submitBtn = document.getElementById('bugReportSubmitBtn');
    const textarea = document.getElementById('bugReportTextarea');
    const charCount = document.getElementById('bugReportCharCount');
    const successMsg = document.getElementById('bugReportSuccess');
    const bugReportBody = popup.querySelector('.feedback-body');

    if (!popup || !backdrop) return;

    // Reset form
    textarea.value = '';
    charCount.textContent = '0';
    submitBtn.disabled = true;
    successMsg.hidden = true;
    bugReportBody.hidden = false;

    // Show popup
    popup.removeAttribute('hidden');
    setTimeout(() => textarea.focus(), 100);

    // Character counter
    const updateCounter = () => {
      const count = textarea.value.length;
      charCount.textContent = count;
      submitBtn.disabled = count === 0;
    };
    textarea.addEventListener('input', updateCounter);

    // Close handlers
    const closeBugReport = () => {
      popup.setAttribute('hidden', '');
      textarea.removeEventListener('input', updateCounter);
    };

    closeBtn.onclick = closeBugReport;
    backBtn.onclick = closeBugReport;
    backdrop.onclick = closeBugReport;

    // Submit handler
    submitBtn.onclick = () => {
      const text = textarea.value.trim();
      if (!text) return;

      // Save to localStorage (separate from feedback)
      try {
        const bugReport = {
          text,
          timestamp: Date.now(),
          accountId: ACCOUNTS[loadCurrentAccountIndex()]?.id || 'unknown'
        };
        const existingReports = JSON.parse(localStorage.getItem('playerBugReports') || '[]');
        existingReports.push(bugReport);
        localStorage.setItem('playerBugReports', JSON.stringify(existingReports));
      } catch (e) {
        console.warn('[BugReport] Failed to save:', e);
      }

      // Show success message
      bugReportBody.hidden = true;
      successMsg.hidden = false;

      // Auto close after 3 seconds
      setTimeout(closeBugReport, 3000);
    };
  }

  function toggleFriendsList(){
    const toggle = document.getElementById('friendsToggle');
    const list = document.getElementById('friendsList');
    if (!toggle || !list) return;
    const willOpen = list.hasAttribute('hidden');
    if (willOpen) {
      list.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      // render on open to ensure fresh state
      renderFriends();
    } else {
      list.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  // ===== Friends: data, render, actions =====
  const FRIENDS_STORAGE_KEY = 'friends_list_v1';
  const FRIEND_EMOJI = ['🦊','🐱','🐻','🐯','🐼','🦁','🐨','🐵','🐸','🐶','🐹','🦄','🐰','🐮','🐔'];

  function escapeHtml(str){
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function loadFriends(){
    try {
      const raw = localStorage.getItem(FRIENDS_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch(e){ return []; }
  }

  function saveFriends(arr){
    try { localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(arr || [])); } catch(e){}
  }

  function pickEmoji(){
    return FRIEND_EMOJI[Math.floor(Math.random()*FRIEND_EMOJI.length)] || '👤';
  }

  function renderFriends(){
    const ul = document.getElementById('friendsItems');
    if (!ul) return;
    const friends = loadFriends();
    let html = '';
    if (friends.length === 0){
      // show 3 empty slots
      for (let i=0;i<3;i++) {
        html += `<li class="friends-list__item friends-list__item--empty"><span class="friend-ava">&nbsp;</span><span class="friend-name" style="opacity:.5">&nbsp;</span></li>`;
      }
    } else {
      for (let idx = 0; idx < friends.length; idx++){
        const f = friends[idx];
        const ava = f.emoji || '👤';
        const name = f.name || '—';
        const isOnline = f.online || Math.random() > 0.5; // simulate online status
        const onlineClass = isOnline ? 'friend-online' : '';
        const inviteBtn = isOnline ? `<button class="friend-invite-btn" data-friend-idx="${idx}" title="Пригласить в пати">+</button>` : '';
        html += `<li class="friends-list__item ${onlineClass}">
          <span class="friend-ava">${ava}</span>
          <span class="friend-name">${escapeHtml(name)}</span>
          ${inviteBtn}
        </li>`;
      }
      // ensure at least 3 rows height
      for (let i=friends.length;i<3;i++) {
        html += `<li class="friends-list__item friends-list__item--empty"><span class="friend-ava">&nbsp;</span><span class="friend-name" style="opacity:.5">&nbsp;</span></li>`;
      }
    }
    ul.innerHTML = html;
    
    // Attach invite handlers
    ul.querySelectorAll('.friend-invite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.friendIdx);
        const friend = friends[idx];
        if (friend) inviteFriendToParty(friend);
      });
    });
  }

  function addFriend(){
    const name = prompt('Имя друга:');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const friends = loadFriends();
    friends.push({ name: trimmed, emoji: pickEmoji(), addedAt: Date.now(), online: Math.random() > 0.3 });
    saveFriends(friends);
    renderFriends();
  }

  function inviteFriendToParty(friend){
    alert(`Приглашение отправлено ${friend.name}! 🎉`);
    // Here you can add real party invite logic
  }

  // Removed leaders/statistics rendering per new minimalist layout

  // Settings popup state and helpers
  const settingsState = { root: null, backdrop: null, open: false, lastFocus: null };
  function ensureSettingsRefs(){
    if (!settingsState.root){
      settingsState.root = document.getElementById('settingsPopup');
      settingsState.backdrop = settingsState.root ? settingsState.root.querySelector('.leagues-popup__backdrop') : null;
    }
    return settingsState.root;
  }
  function handleSettingsKeydown(event){
    if (event.key === 'Escape'){
      event.preventDefault();
      closeSettingsPopup();
    }
  }
  function openSettingsPopup(){
    const root = ensureSettingsRefs();
    if (!root || settingsState.open) return;
    settingsState.lastFocus = document.activeElement;
    root.hidden = false;
    settingsState.open = true;
    document.addEventListener('keydown', handleSettingsKeydown);
    try {
      const btn = root.querySelector('#signOutBtn');
      if (btn && typeof btn.focus === 'function') setTimeout(()=>btn.focus(), 0);
    } catch(_){ }
  }
  function closeSettingsPopup(){
    const root = ensureSettingsRefs();
    if (!root || !settingsState.open) return;
    root.hidden = true;
    settingsState.open = false;
    document.removeEventListener('keydown', handleSettingsKeydown);
    if (settingsState.lastFocus && typeof settingsState.lastFocus.focus === 'function'){
      settingsState.lastFocus.focus();
    }
    settingsState.lastFocus = null;
  }
  function toggleSettingsPopup(){
    if (settingsState.open) closeSettingsPopup(); else openSettingsPopup();
  }

  // Language Popup
  const languageState = { root: null, backdrop: null, open: false, lastFocus: null };
  
  function ensureLanguageRefs(){
    if (!languageState.root){
      languageState.root = document.getElementById('languagePopup');
      languageState.backdrop = languageState.root ? languageState.root.querySelector('.leagues-popup__backdrop') : null;
    }
    return languageState.root;
  }
  
  function handleLanguageKeydown(event){
    if (event.key === 'Escape'){
      event.preventDefault();
      closeLanguagePopup();
    }
  }
  
  function openLanguagePopup(){
    const root = ensureLanguageRefs();
    if (!root || languageState.open) return;
    languageState.lastFocus = document.activeElement;
    root.hidden = false;
    languageState.open = true;
    document.addEventListener('keydown', handleLanguageKeydown);
    renderLanguageList();
  }
  
  function closeLanguagePopup(){
    const root = ensureLanguageRefs();
    if (!root || !languageState.open) return;
    root.hidden = true;
    languageState.open = false;
    document.removeEventListener('keydown', handleLanguageKeydown);
    if (languageState.lastFocus && typeof languageState.lastFocus.focus === 'function'){
      languageState.lastFocus.focus();
    }
    languageState.lastFocus = null;
  }

  // Language Selector UI
  function renderLanguageList() {
    const list = document.getElementById('languageList');
    
    if (!list || !window.LocalizationManager) return;

    const languages = window.LocalizationManager.getSupportedLanguages();
    const currentLang = window.LocalizationManager.getCurrentLanguage();

    // Populate language list
    list.innerHTML = '';
    languages.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'btn language-choice';
      btn.dataset.selected = lang.code === currentLang ? 'true' : 'false';
      
      btn.innerHTML = `
        <span class="language-flag">${lang.flag}</span>
        <span class="language-name">${lang.name}</span>
        ${lang.code === currentLang ? '<span class="language-check">✓</span>' : ''}
      `;
      
      btn.addEventListener('click', () => {
        window.LocalizationManager.setLanguage(lang.code);
        renderLanguageList(); // Refresh selector
        // Close popup after selection
        setTimeout(() => closeLanguagePopup(), 300);
      });
      
      list.appendChild(btn);
    });
  }

  function initLanguageSelector() {
    renderLanguageList();
  }

  // ==================
  // Winners Popup
  // ==================
  const winnersState = {
    root: null,
    backdrop: null,
    open: false,
    lastFocus: null,
    currentPeriod: 'recent'
  };

  function ensureWinnersRefs() {
    if (!winnersState.root) {
      winnersState.root = document.getElementById('winnersPopup');
      winnersState.backdrop = winnersState.root ? winnersState.root.querySelector('#winnersBackdrop') : null;
    }
    return winnersState.root;
  }

  function openWinnersPopup() {
    const root = ensureWinnersRefs();
    if (!root || winnersState.open) return;
    
    winnersState.lastFocus = document.activeElement;
    root.hidden = false;
    winnersState.open = true;
    
    document.addEventListener('keydown', handleWinnersKeydown);
    renderWinnersList();
  }

  function closeWinnersPopup() {
    const root = ensureWinnersRefs();
    if (!root || !winnersState.open) return;
    
    root.hidden = true;
    winnersState.open = false;
    
    document.removeEventListener('keydown', handleWinnersKeydown);
    
    if (winnersState.lastFocus && typeof winnersState.lastFocus.focus === 'function') {
      winnersState.lastFocus.focus();
    }
    winnersState.lastFocus = null;
  }

  function handleWinnersKeydown(e) {
    if (e.key === 'Escape' && winnersState.open) {
      e.preventDefault();
      closeWinnersPopup();
    }
  }

  function switchWinnersPeriod(period) {
    winnersState.currentPeriod = period;
    
    // Update tab buttons
    const tabs = document.querySelectorAll('.winners-tabs .tab-button');
    tabs.forEach(tab => {
      if (tab.dataset.period === period) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    renderWinnersList();
  }

  function renderWinnersList() {
    const list = document.getElementById('winnersListMenu');
    if (!list) return;
    
    // Получаем данные из localStorage (синхронизировано с игрой)
    let winners = [];
    try {
      const stored = localStorage.getItem('winners_history');
      if (stored) {
        winners = JSON.parse(stored);
      }
    } catch (e) {
      console.error('[Winners] Error loading history:', e);
    }
    
    // Фильтруем по периоду
    const now = Date.now();
    const filtered = winners.filter(entry => {
      if (!entry.timestamp) return false;
      const age = now - entry.timestamp;
      
      switch (winnersState.currentPeriod) {
        case '24h': return age <= 24 * 60 * 60 * 1000;
        case '7d': return age <= 7 * 24 * 60 * 60 * 1000;
        case '1m': return age <= 30 * 24 * 60 * 60 * 1000;
        case 'recent':
        default:
          return true; // Показываем все
      }
    });
    
    if (!filtered.length) {
      list.innerHTML = '<div class="winner-empty">Побед пока нет</div>';
      return;
    }
    
    // Рендерим список
    list.innerHTML = filtered
      .slice(0, 50) // Максимум 50 записей
      .map(entry => {
        const account = ACCOUNTS.find(acc => acc.id === entry.accountId) || {};
        const name = account.name || 'Игрок';
        const avatar = account.avatar || '👤';
        const background = account.background || 'rgba(255,255,255,0.08)';
        const columnName = entry.columnName || `Колонка ${entry.columnId}`;
        
        return `
          <div class="winner-row">
            <div class="winner-avatar" style="background: ${background};">${avatar}</div>
            <div class="winner-summary">
              <div class="name">${escapeHtml(name)}</div>
              <div class="details">Колонка: ${escapeHtml(columnName)}</div>
              <div class="amount">+${formatNumber(entry.amount || 0)} монет</div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function ensurePopupRefs(){
    if (!popupState.root){
      popupState.root = document.getElementById('leaguesPopup');
      popupState.backdrop = popupState.root ? popupState.root.querySelector('.leagues-popup__backdrop') : null;
    }
    return popupState.root;
  }

  function focusFirstLeagueChoice(){
    const root = ensurePopupRefs();
    if (!root) return;
    const list = root.querySelector('#leagueChoices');
    if (!list) return;
    const target = list.querySelector('.league-choice:not(.is-locked)') || list.querySelector('.league-choice');
    if (target && typeof target.focus === 'function'){
      requestAnimationFrame(() => target.focus());
    }
  }

  function handlePopupKeydown(event){
    if (event.key === 'Escape'){
      event.preventDefault();
      closeLeaguesPopup();
    }
  }

  function openLeaguesPopup(){
    const root = ensurePopupRefs();
    if (!root || popupState.open) return;
    popupState.lastFocus = document.activeElement;
    root.hidden = false;
    popupState.open = true;
    document.addEventListener('keydown', handlePopupKeydown);
    focusFirstLeagueChoice();
  }

  function closeLeaguesPopup(){
    const root = ensurePopupRefs();
    if (!root || !popupState.open) return;
    root.hidden = true;
    popupState.open = false;
    document.removeEventListener('keydown', handlePopupKeydown);
    if (popupState.lastFocus && typeof popupState.lastFocus.focus === 'function'){
      popupState.lastFocus.focus();
    }
    popupState.lastFocus = null;
  }

  function toggleLeaguesPopup(){
    if (popupState.open) {
      closeLeaguesPopup();
    } else {
      openLeaguesPopup();
    }
  }

  function wirePopupInteractions(){
    ensurePopupRefs();
    const btn = document.getElementById('leaguesBtn');
    const closeBtn = document.getElementById('leaguesCloseBtn');
    const backdrop = popupState.backdrop;

    if (btn) btn.addEventListener('click', toggleLeaguesPopup);
    if (closeBtn) closeBtn.addEventListener('click', closeLeaguesPopup);
    if (backdrop) backdrop.addEventListener('click', closeLeaguesPopup);

    return btn || null;
  }

  function handleLeagueState(event){
    const detail = event?.detail || {};
    const { league, label, accessible, reason } = detail;

    if (playButton && playButton.dataset.busy !== 'true'){
      playButton.disabled = !accessible;
    }
    if (playButton){
      playButton.setAttribute('aria-disabled', accessible ? 'false' : 'true');
      if (reason){
        playButton.dataset.reason = reason;
        playButton.title = reason;
      } else {
        delete playButton.dataset.reason;
        playButton.removeAttribute('title');
      }
    }
    if (leaguesButton){
      leaguesButton.textContent = 'Лига';
    }
    if (popupState.open){
      focusFirstLeagueChoice();
    }
  }

  // ==================
  // Rules Popup Logic
  // ==================
  
  function openRules() {
    const popup = document.getElementById('rulesPopup');
    const backdrop = document.getElementById('rulesBackdrop');
    const closeBtn = document.getElementById('rulesCloseBtn');
    
    if (!popup || !backdrop) return;
    
    // Populate dynamic stats from COLUMNS config
    updateRulesStats();
    
    popup.hidden = false;
    
    const closeRules = () => {
      popup.hidden = true;
      closeBtn.removeEventListener('click', closeRules);
      backdrop.removeEventListener('click', closeRules);
    };
    
    closeBtn.addEventListener('click', closeRules);
    backdrop.addEventListener('click', closeRules);
  }
  
  function updateRulesStats() {
    // Access COLUMNS from v1.js if available
    if (typeof window.COLUMNS === 'undefined') return;
    
    window.COLUMNS.forEach((col, index) => {
      const statsEl = document.getElementById(`rulesStatsCol${col.id}`);
      if (!statsEl) return;
      
      let baseTimer = 30; // default
      if (typeof window.getBaseTimerForColumn === 'function') {
        baseTimer = window.getBaseTimerForColumn(col.id);
      }
      
      statsEl.innerHTML = `
        <div>💰 Ставка: ${col.bet} монет</div>
        <div>⏱️ Базовый таймер: ${baseTimer}с</div>
        <div>🏦 Стартовый банк: ${col.baseBank} монет</div>
      `;
    });
  }

  async function handlePlayClick(event){
    const button = event.currentTarget;
    if (!button || button.dataset.busy === 'true' || button.disabled) return;

    const previousText = button.textContent;
    const previousDisabled = button.disabled;

    button.dataset.busy = 'true';
    button.disabled = true;
    button.textContent = 'Поиск матча...';

    try {
      const leaguesApi = window.menuLeagues;
      if (leaguesApi && typeof leaguesApi.preparePlay === 'function'){
        await leaguesApi.preparePlay();
      }
      closeLeaguesPopup();
      goPlay();
    } catch (error) {
      console.error('[Menu] Не удалось подготовить игру', error);
      alert(error?.message || 'Не удалось подготовить игру. Попробуйте снова.');
      button.textContent = previousText;
      button.disabled = previousDisabled;
    } finally {
      button.dataset.busy = 'false';
      if (!button.disabled){
        button.textContent = previousText;
      }
    }
  }

  function addDiagnosticBanner(){
    try {
      const diag = document.createElement('div');
      diag.textContent = 'Menu JS v9 loaded';
      Object.assign(diag.style, {
        position: 'fixed',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(220,20,60,.9)',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: '8px',
        zIndex: 9999,
        font: '12px/1.2 ui-sans-serif'
      });
      document.body.appendChild(diag);
      setTimeout(() => diag.remove(), 1800);
    } catch (error) {}
  }

  function ensureNeonEdges(){
    try {
      if (!document.getElementById('neon-inline-style')){
        const style = document.createElement('style');
        style.id = 'neon-inline-style';
        style.textContent = `
          .neon-edges { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
          .neon-edges::before { content: ""; position: absolute; inset: 0; border-radius: 16px;
            background:
              linear-gradient(90deg, rgba(0,255,255,0.28), rgba(0,255,255,0) 45%) top/100% 6px no-repeat,
              linear-gradient(270deg, rgba(255,0,153,0.28), rgba(255,0,153,0) 45%) bottom/100% 6px no-repeat,
              linear-gradient(0deg, rgba(255,255,0,0.24), rgba(255,255,0,0) 45%) left/6px 100% no-repeat,
              linear-gradient(180deg, rgba(0,255,255,0.24), rgba(0,255,255,0) 45%) right/6px 100% no-repeat;
            filter: blur(3px) saturate(1.08);
            animation: neon-breathe 6s ease-in-out infinite;
          }
          @keyframes neon-breathe { 0%,100% { opacity: .45 } 50% { opacity: .9 } }
        `;
        document.head.appendChild(style);
      }
      if (!document.querySelector('.neon-edges')){
        const div = document.createElement('div');
        div.className = 'neon-edges';
        div.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(div, document.body.firstChild);
      }
    } catch (error) {}
  }

  document.addEventListener('DOMContentLoaded', async () => {
    addDiagnosticBanner();
    ensureNeonEdges();

    // Initialize localization
    if (window.LocalizationManager) {
      await window.LocalizationManager.initialize();
      initLanguageSelector();
      
      // Subscribe to language changes
      window.LocalizationManager.addListener(() => {
        window.LocalizationManager.refreshUI();
      });
      
      // Initial UI update
      window.LocalizationManager.refreshUI();
      
      // Extra refresh after DOM is fully loaded to catch all elements
      setTimeout(() => {
        window.LocalizationManager.refreshUI();
      }, 100);
    }

    window.ACCOUNTS = ACCOUNTS;
    window.currentAccountIndex = loadCurrentAccountIndex();
    window.renderCurrentAccount = renderMenuAccount;

    setBg(resolveWallpaper());
    renderMenuAccount();
    syncHeaderChipsWidth();

    leaguesButton = wirePopupInteractions();
    playButton = document.getElementById('playBtn');
    if (playButton) playButton.addEventListener('click', handlePlayClick);

    const bankBtn = document.getElementById('bankBtn');
    if (bankBtn) bankBtn.addEventListener('click', showBank);

    const realestateBtn = document.getElementById('realestateBtn');
    if (realestateBtn) realestateBtn.addEventListener('click', showRealEstate);

    const storeBtn = document.getElementById('storeBtn');
    if (storeBtn) storeBtn.addEventListener('click', openStore);

    const eventsBtn = document.getElementById('eventsBtn');
    if (eventsBtn) eventsBtn.addEventListener('click', openEvents);

    const mailBtn = document.getElementById('mailBtn');
    if (mailBtn) mailBtn.addEventListener('click', openMail);

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', toggleSettingsPopup);

    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettingsPopup);
    const settingsBackdrop = document.getElementById('settingsBackdrop');
    if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettingsPopup);

    // Language popup
    const languageOpenBtn = document.getElementById('languageOpenBtn');
    if (languageOpenBtn) languageOpenBtn.addEventListener('click', openLanguagePopup);
    const languageCloseBtn = document.getElementById('languageCloseBtn');
    if (languageCloseBtn) languageCloseBtn.addEventListener('click', closeLanguagePopup);
    const languageBackdrop = document.getElementById('languageBackdrop');
    if (languageBackdrop) languageBackdrop.addEventListener('click', closeLanguagePopup);

    // Winners popup
    const winnersCloseBtn = document.getElementById('winnersCloseBtn');
    if (winnersCloseBtn) winnersCloseBtn.addEventListener('click', closeWinnersPopup);
    const winnersBackdrop = document.getElementById('winnersBackdrop');
    if (winnersBackdrop) winnersBackdrop.addEventListener('click', closeWinnersPopup);
    
    // Winners tabs
    const winnersTabs = document.querySelectorAll('.winners-tabs .tab-button');
    winnersTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const period = tab.dataset.period;
        if (period) switchWinnersPeriod(period);
      });
    });

    const eventsCloseBtn = document.getElementById('eventsCloseBtn');
    if (eventsCloseBtn) eventsCloseBtn.addEventListener('click', () => {
      if (window.EventsUI) window.EventsUI.close();
    });
    const eventsBackdrop = document.getElementById('eventsBackdrop');
    if (eventsBackdrop) eventsBackdrop.addEventListener('click', () => {
      if (window.EventsUI) window.EventsUI.close();
    });

    // Friends UI
    const friendsToggle = document.getElementById('friendsToggle');
    if (friendsToggle) friendsToggle.addEventListener('click', toggleFriendsList);
    const addFriendBtn = document.getElementById('addFriendBtn');
    if (addFriendBtn) addFriendBtn.addEventListener('click', addFriend);
    // Initial render (kept hidden until user opens)
    renderFriends();

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', async () => {
      try {
        const fb = window.firebase;
        if (fb && fb.apps && fb.apps.length) {
          await fb.auth().signOut();
        } else {
          console.warn('[Menu] Firebase не настроен, выполняю мягкий выход');
        }
      } catch (e) {
        console.error('[Menu] Ошибка выхода из аккаунта', e);
      }
      // Установим флаг форс-показа экрана входа на странице игры
      try { localStorage.setItem('forceSwitch', '1'); } catch(_){ }
      // После выхода открываем игру, где появится экран входа (добавим флаг в URL для наглядности)
      location.href = 'v1.html?switch=1';
    });

    const achievementsBtn = document.getElementById('achievementsBtn');
    if (achievementsBtn) achievementsBtn.addEventListener('click', openAchievements);

    const bagBtn = document.getElementById('bagBtn');
    if (bagBtn) bagBtn.addEventListener('click', openBag);

    const modeBtn = document.getElementById('modeBtn');
    if (modeBtn) modeBtn.addEventListener('click', openMode);

    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) feedbackBtn.addEventListener('click', openFeedback);

    const bugReportBtn = document.getElementById('bugReportBtn');
    if (bugReportBtn) bugReportBtn.addEventListener('click', openBugReport);

    const reloadBtn = document.getElementById('reloadBtn');
    if (reloadBtn) reloadBtn.addEventListener('click', () => {
      console.log('🔄 Перезагрузка страницы...');
      location.reload();
    });

    // friendsToggle уже подключен выше (строка 721)

    const inviteBtn = document.getElementById('inviteBtn');
    if (inviteBtn) inviteBtn.addEventListener('click', () => alert('Приглашения отправляются...'));

    // Проверяем доступность ежедневной награды
    if (window.EventsUI && typeof window.EventsUI.checkRewardAvailable === 'function') {
      setTimeout(() => {
        window.EventsUI.checkRewardAvailable();
      }, 500);
    }

    window.addEventListener('league-state', handleLeagueState);
    window.addEventListener('resize', () => { syncHeaderChipsWidth(); });
    window.addEventListener('player-changed', () => { syncHeaderChipsWidth(); });
  });
})();
