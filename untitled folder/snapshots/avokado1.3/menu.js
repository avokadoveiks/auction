(function(){
  const DEFAULT_WALLPAPER = 'assets/wallpaper.png';
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

  if (nameEl) nameEl.textContent = account?.name ?? 'Гость';
  // Баланс строкой больше не показываем — используется золотая мини-панель монет.
  if (balEl) balEl.remove();
    if (avaEl) setAvatar(avaEl, account);
    try {
      const coinEl = document.getElementById('coinValue');
      if (coinEl && account) coinEl.textContent = formatNumber(account.balance);
    } catch(_) {}

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
      console.warn('Wallpaper failed, trying assets/wallpaper.jpg:', url);
      tryLoad('assets/wallpaper.jpg', (okUrl2) => {
        bg.style.backgroundImage = `url(${okUrl2})`;
        bg.style.opacity = '1';
      }, () => {
        console.warn('assets/wallpaper.jpg missing, trying assets/wallpaper.png');
        tryLoad('assets/wallpaper.png', (okUrl3) => {
          bg.style.backgroundImage = `url(${okUrl3})`;
          bg.style.opacity = '1';
        }, () => {
          tryLoad(SECONDARY_WALLPAPER, (okUrl4) => {
            bg.style.backgroundImage = `url(${okUrl4})`;
            bg.style.opacity = '1';
          }, () => {
            bg.style.opacity = '1';
          });
        });
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

  function openStore(){
    alert('Магазин скоро откроется!');
  }

  function openEvents(){
    alert('События станут доступны в ближайшем обновлении.');
  }

  function openMail(){
    alert('Почта пуста. Возвращайтесь позже!');
  }

  function openAchievements(){
    alert('Топ игроков откроется в следующем обновлении.');
  }

  function openBag(){
    alert('В сумке пока пусто. Соберите награды!');
  }

  function openMode(){
    alert('Выбор режима появится позже.');
  }

  function toggleFriendsList(){
    const toggle = document.getElementById('friendsToggle');
    const list = document.getElementById('friendsList');
    if (!toggle || !list) return;
    const willOpen = list.hasAttribute('hidden');
    if (willOpen) {
      list.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      list.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  // Removed leaders/statistics rendering per new minimalist layout

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

  document.addEventListener('DOMContentLoaded', () => {
    addDiagnosticBanner();
    ensureNeonEdges();

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

    const storeBtn = document.getElementById('storeBtn');
    if (storeBtn) storeBtn.addEventListener('click', openStore);

    const eventsBtn = document.getElementById('eventsBtn');
    if (eventsBtn) eventsBtn.addEventListener('click', openEvents);

    const mailBtn = document.getElementById('mailBtn');
    if (mailBtn) mailBtn.addEventListener('click', openMail);

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', () => alert('Настройки откроются в следующем обновлении'));

    const achievementsBtn = document.getElementById('achievementsBtn');
    if (achievementsBtn) achievementsBtn.addEventListener('click', openAchievements);

    const bagBtn = document.getElementById('bagBtn');
    if (bagBtn) bagBtn.addEventListener('click', openBag);

    const modeBtn = document.getElementById('modeBtn');
    if (modeBtn) modeBtn.addEventListener('click', openMode);

    const friendsToggle = document.getElementById('friendsToggle');
    if (friendsToggle) friendsToggle.addEventListener('click', toggleFriendsList);

    const inviteBtn = document.getElementById('inviteBtn');
    if (inviteBtn) inviteBtn.addEventListener('click', () => alert('Приглашения отправляются...'));

    window.addEventListener('league-state', handleLeagueState);
    window.addEventListener('resize', () => { syncHeaderChipsWidth(); });
    window.addEventListener('player-changed', () => { syncHeaderChipsWidth(); });
  });
})();
