(function(){
  // Wait for DOM and Firebase scripts
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function qs(id){ return document.getElementById(id); }
  function show(el){ el && el.classList && el.classList.remove('hidden'); el && el.setAttribute && el.setAttribute('aria-hidden','false'); }
  function hide(el){ el && el.classList && el.classList.add('hidden'); el && el.setAttribute && el.setAttribute('aria-hidden','true'); }

  function getFirebase(){ try { return window.firebase; } catch(e){ return null; } }
  function createEl(tag, props={}, children=[]) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k,v]) => {
      if (k === 'class') el.className = v; else if (k === 'style') Object.assign(el.style, v); else el.setAttribute(k, v);
    });
    (Array.isArray(children)?children:[children]).forEach(c => {
      if (c == null) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c)); else el.appendChild(c);
    });
    return el;
  }

  async function ensureUserDoc(db, user){
    if (!db || !user) return;
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get().catch(()=>null);
    const now = new Date().toISOString();
    const base = {
      uid: user.uid,
      displayName: user.displayName || 'Игрок',
      photoURL: user.photoURL || '',
      providerId: (user.providerData && user.providerData[0]?.providerId) || 'unknown',
      updatedAt: now
    };
    if (!snap || !snap.exists){
      await ref.set({ ...base, createdAt: now }, { merge: true });
    } else {
      await ref.set(base, { merge: true });
    }
  }

  function applyUserToTopBar(user){
    try {
      const nameEl = qs('currentName');
      const avEl = qs('currentAvatar');
      if (nameEl && user?.displayName) nameEl.textContent = user.displayName;
      if (avEl){
        if (user?.photoURL){
          avEl.style.backgroundImage = `url("${user.photoURL}")`;
          avEl.classList.add('avatar-has-image');
        }
      }
    } catch(_){}
  }

  ready(async function(){
    const overlay = qs('loginOverlay');
    const btnGoogle = qs('loginGoogle');
    const btnApple = qs('loginApple');
    const btnTest = qs('loginTest');
    const err = qs('loginError');

    // Determine if we must force showing the account switch/login overlay
    let mustSwitch = false;
    try {
      const params = new URLSearchParams(location.search);
      mustSwitch = params.has('switch') || localStorage.getItem('forceSwitch') === '1';
      if (mustSwitch) {
        try { localStorage.removeItem('forceSwitch'); } catch(_){}
        // Also clear demo auth flags so demo mode re-prompts
        try { localStorage.removeItem('demoAuth'); localStorage.removeItem('demoUser'); } catch(_){}
        // Clean URL query to avoid loops
        try {
          params.delete('switch');
          const newQ = params.toString();
          const newUrl = location.pathname + (newQ ? ('?' + newQ) : '') + location.hash;
          history.replaceState(null, '', newUrl);
        } catch(_){}
      }
    } catch(_){ }

    const fb = getFirebase();
    if (!fb || !fb.apps || fb.apps.length === 0){
      // Firebase не подключён: демо-режим авторизации
      console.warn('[Auth] Firebase not configured. Demo-mode auth.');

      // If user previously chose a test account and we are not forced to switch, skip showing overlay
      if (!mustSwitch) {
        try {
          const raw = localStorage.getItem('demoUser');
          if (raw) {
            const demo = JSON.parse(raw);
            if (demo && (demo.displayName || demo.photoURL !== undefined)) {
              applyUserToTopBar({ displayName: demo.displayName || 'Игрок', photoURL: demo.photoURL || '' });
              hide(overlay);
              return; // nothing else to do in demo mode
            }
          }
        } catch(_){ }
      }

      // Otherwise, show overlay and set up demo handlers
      show(overlay);

      function showInfo(message){ if (!err) return; err.textContent = message; show(err); }
      btnApple && btnApple.addEventListener('click', () => showInfo('Чтобы войти через Apple, подключите Firebase (демо режим).'));
      btnGoogle && btnGoogle.addEventListener('click', () => showInfo('Чтобы войти через Google, подключите Firebase (демо режим).'));

      // Тестовые аккаунты (локально, только для вас). Источник: window.TEST_ACCOUNTS или дефолт
      const TESTS = (window.TEST_ACCOUNTS && Array.isArray(window.TEST_ACCOUNTS) && window.TEST_ACCOUNTS.length)
        ? window.TEST_ACCOUNTS
        : [
            { uid: 't1', displayName: 'Тестер 1', photoURL: '' },
            { uid: 't2', displayName: 'Тестер 2', photoURL: '' },
            { uid: 't3', displayName: 'Тестер 3', photoURL: '' },
          ];

      let testListVisible = false;
      let testListEl = null;
      function toggleTestList(){
        if (!overlay) return;
        if (testListVisible){
          if (testListEl) testListEl.remove();
          testListEl = null;
          testListVisible = false;
          return;
        }
        // Создаём компактный список прямо в карточке входа
        const card = overlay.querySelector('.login-card');
        if (!card) return;
        testListEl = createEl('div', { class: 'test-login-list' }, []);
        Object.assign(testListEl.style, {
          marginTop: '10px', display: 'grid', gap: '8px', gridTemplateColumns: '1fr',
          background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '10px'
        });
        const title = createEl('div', { class: 'test-login-title' }, 'Выберите тестовый аккаунт');
        Object.assign(title.style, { fontSize: '12px', opacity: '0.8' });
        testListEl.appendChild(title);
        TESTS.forEach((t, idx) => {
          const btn = createEl('button', { class: 'ghost-button', type: 'button' }, t.displayName || ('Тестер ' + (idx+1)));
          btn.style.width = '100%';
          btn.addEventListener('click', () => {
            // Имитация входа: применяем имя/аватар и скрываем оверлей
            const profile = { displayName: t.displayName || 'Игрок', photoURL: t.photoURL || '' };
            try { localStorage.setItem('demoAuth', '1'); localStorage.setItem('demoUser', JSON.stringify(profile)); } catch(_){ }
            applyUserToTopBar(profile);
            hide(overlay);
          });
          testListEl.appendChild(btn);
        });
        card.appendChild(testListEl);
        testListVisible = true;
      }
      btnTest && btnTest.addEventListener('click', toggleTestList);

      return; // завершаем: Firebase-логика не запускается
    }

    const app = fb.apps[0] || fb.app();
    const auth = fb.auth();
    const db = (fb.firestore && fb.firestore()) || null;

    // Local persistence and automatic re-login
    auth.setPersistence(fb.auth.Auth.Persistence.LOCAL).catch(()=>{});

    // Handle forced account switch from menu (real Firebase path)
    if (mustSwitch) {
      try { await auth.signOut(); } catch(_){ }
      show(overlay);
    }

    function setLoading(isLoading){
      btnGoogle && (btnGoogle.disabled = isLoading);
      btnApple && (btnApple.disabled = isLoading);
      btnTest && (btnTest.disabled = isLoading);
    }

    async function signInWithGoogle(){
      setLoading(true); err && (err.textContent = ''); hide(err);
      try {
        const provider = new fb.auth.GoogleAuthProvider();
        const res = await auth.signInWithPopup(provider);
        await ensureUserDoc(db, res.user);
      } catch (e){
        console.error('[Auth] Google sign-in error:', e);
        if (err){ err.textContent = 'Не удалось войти через Google. Попробуйте ещё раз.'; show(err);} 
      } finally { setLoading(false); }
    }


    async function signInTest(){
      setLoading(true); err && (err.textContent = ''); hide(err);
      try {
        const cfg = window.TEST_LOGIN || null;
        let userCred;
        if (cfg && cfg.email && cfg.password){
          userCred = await auth.signInWithEmailAndPassword(cfg.email, cfg.password);
        } else {
          userCred = await auth.signInAnonymously();
          // Give anonymous tester a friendly name once
          try {
            if (userCred.user && !userCred.user.displayName){
              await userCred.user.updateProfile({ displayName: 'Тестовый аккаунт' });
            }
          } catch(_){}
        }
        await ensureUserDoc(db, userCred.user);
      } catch (e){
        console.error('[Auth] Test sign-in error:', e);
        if (err){ err.textContent = 'Не удалось выполнить тестовый вход.'; show(err);} 
      } finally { setLoading(false); }
    }
    async function signInWithApple(){
      setLoading(true); err && (err.textContent = ''); hide(err);
      try {
        const provider = new fb.auth.OAuthProvider('apple.com');
        try { provider.addScope && provider.addScope('email'); provider.addScope && provider.addScope('name'); } catch(_){}
        const res = await auth.signInWithPopup(provider);
        await ensureUserDoc(db, res.user);
      } catch (e){
        console.error('[Auth] Apple sign-in error:', e);
        if (err){ err.textContent = 'Apple-вход недоступен. Проверьте настройки в Firebase Console.'; show(err);} 
      } finally { setLoading(false); }
    }

  btnGoogle && btnGoogle.addEventListener('click', signInWithGoogle);
  btnApple && btnApple.addEventListener('click', signInWithApple);
  btnTest && btnTest.addEventListener('click', signInTest);

    // React to auth state
    auth.onAuthStateChanged(async function(user){
      window.firebaseUser = user || null;
      if (user){
        // Save to Firestore on each login
        try { await ensureUserDoc(db, user); } catch(_){}
        applyUserToTopBar(user);
        hide(overlay);
      } else {
        show(overlay);
      }
    });
  });
})();
