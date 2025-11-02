const GAME_CONFIG = {
	baseTimer: 20
};

function getBaseTimerForColumn(columnId) {
	if (columnId === 1) return 30;  // Шанс: 30s
	if (columnId === 2) return 45;  // Любитель: 45s
	if (columnId === 3) return 25;  // Профессионал: 25s
	if (columnId === 4) return 25;  // Дуэль: 25s
	if (columnId === 5) return 60;  // Мастер: 60s
	return GAME_CONFIG.baseTimer;
}

// Default image fallback — realistic landscape photo
const DEFAULT_AVATAR_IMAGE = 'https://picsum.photos/seed/default1/256';

const COLUMNS = [
	{ id: 1, label: "Шанс", bet: 2, baseBank: 3, autoAllowed: false, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 18 },
	{ id: 2, label: "Любитель", bet: 4, baseBank: 6, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 24 },
	{ id: 3, label: "Профессионал", bet: 6, baseBank: 9, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 36 },
	{ id: 4, label: "Дуэль", bet: 8, baseBank: 12, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 40 },
	{ id: 5, label: "Мастер", bet: 10, baseBank: 16, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 48 }
];

const ACCOUNTS = [
	{
		id: "alpha",
		name: "Александр",
		avatar: "🦊",
		avatarImage: "https://picsum.photos/seed/player1/256",
		background: "linear-gradient(135deg,#f97316,#fb923c)",
		balance: 300
	},
	{
		id: "bravo",
		name: "Марина",
		avatar: "🐱",
		avatarImage: "https://picsum.photos/seed/player2/256",
		background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
		balance: 300
	},
	{
		id: "charlie",
		name: "Илья",
		avatar: "🐻",
		avatarImage: "https://picsum.photos/seed/player3/256",
		background: "linear-gradient(135deg,#facc15,#f97316)",
		balance: 300
	},
	{
		id: "delta",
		name: "Олег",
		avatar: "🐼",
		avatarImage: "https://picsum.photos/seed/player4/256",
		background: "linear-gradient(135deg,#10b981,#34d399)",
		balance: 300000,
		isHumanPlayer: true  // Только ручные ставки, боты не управляют этим аккаунтом
	}
];

// ==================
// Bot configuration
// ==================
let _botsAdded = false;
let _botTimer = null;

function addBotsIfNeeded(){
	if (_botsAdded) return;
	const names = [
		'Lynx_Hunter','Arkady','PandaBear','WolfPack',
		'TigerStripe','BrownBear','CatNinja','KoalaKing',
		'LionHeart','HawkEye','PhoenixFire','NightOwl'
	];
	const backgrounds = [
		'linear-gradient(135deg,#22d3ee,#60a5fa)',
		'linear-gradient(135deg,#f97316,#f59e0b)',
		'linear-gradient(135deg,#34d399,#10b981)',
		'linear-gradient(135deg,#6366f1,#8b5cf6)',
		'linear-gradient(135deg,#f43f5e,#fb7185)',
		'linear-gradient(135deg,#facc15,#f97316)',
		'linear-gradient(135deg,#93c5fd,#3b82f6)',
		'linear-gradient(135deg,#5eead4,#22d3ee)',
		'linear-gradient(135deg,#fb923c,#f59e0b)',
		'linear-gradient(135deg,#f472b6,#c084fc)',
		'linear-gradient(135deg,#10b981,#34d399)',
		'linear-gradient(135deg,#22c55e,#84cc16)'
	];
	
	// Mix of realistic avatars: 70% people, 20% animals, 10% nature
	// Using Lorem Picsum (stable free photo API)
	// Distribution: 9 people, 2 animals, 1 nature (out of 12 bots)
	const avatarMapping = [
		// People (70% - 9 bots: 0,1,2,3,4,7,8,9,10)
		{ type: 'people', url: 'https://picsum.photos/seed/person1/256', emoji: '👤' },
		{ type: 'people', url: 'https://picsum.photos/seed/person2/256', emoji: '👤' },
		{ type: 'people', url: 'https://picsum.photos/seed/person3/256', emoji: '👤' },
		{ type: 'people', url: 'https://picsum.photos/seed/person4/256', emoji: '👤' },
		{ type: 'people', url: 'https://picsum.photos/seed/person5/256', emoji: '👤' },
		// Animals (20% - 2 bots: 5,6)
		{ type: 'animals', url: 'https://picsum.photos/seed/cat1/256', emoji: '🐾' },
		{ type: 'animals', url: 'https://picsum.photos/seed/dog1/256', emoji: '🐾' },
		// People (continue)
		{ type: 'people', url: 'https://picsum.photos/seed/person6/256', emoji: '👤' },
		{ type: 'people', url: 'https://picsum.photos/seed/person7/256', emoji: '👤' },
		{ type: 'people', url: 'https://picsum.photos/seed/person8/256', emoji: '👤' },
		{ type: 'people', url: 'https://picsum.photos/seed/person9/256', emoji: '👤' },
		// Nature (10% - 1 bot: 11)
		{ type: 'nature', url: 'https://picsum.photos/seed/nature1/256', emoji: '🏞️' }
	];
	
	for (let idx = 0; idx < 12; idx++){
		const id = `bot${idx+1}`;
		const name = names[idx] || `Бот ${idx+1}`;
		const avatarData = avatarMapping[idx];
		
		const b = {
			id,
			name,
			avatar: avatarData.emoji,
			avatarImage: avatarData.url,
			background: backgrounds[idx % backgrounds.length],
			balance: 1000 + (idx % 6) * 50 + 100
		};
		b.isBot = true;
		ACCOUNTS.push(b);
	}
	_botsAdded = true;
}

function getBotIndices(){
	const arr = [];
	for (let i=0;i<ACCOUNTS.length;i++) if (ACCOUNTS[i]?.isBot) arr.push(i);
	return arr;
}

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function startBotEngine(){
	try { if (_botTimer) clearInterval(_botTimer); } catch(e){}
	const botIndices = getBotIndices();
	if (!botIndices.length) return;
	_botTimer = setInterval(()=>{
		try {
			// choose 1-2 actions per tick
			const actions = 1 + Math.floor(Math.random()*2);
			for (let k=0;k<actions;k++){
				// choose columns nearing end or in zero-grace
				const candidates = COLUMNS.map(c=>c.id).filter(id=>{
					const st = columnState[id];
					if (!st) return false;
					if (st.winnerTimer && st.winnerTimer>0) return false;
					// prefer near end
					if (typeof st.timer === 'number' && st.timer > 0 && st.timer <= 7) return true;
					// also allow during zero-grace
					if (st.timer <= 0 && st.zeroGrace && st.zeroGrace > 0) return true;
					return Math.random() < 0.12; // small chance early
				});
				if (!candidates.length) continue;
				const colId = pickRandom(candidates);
				const cfg = getColumnConfig(colId);
				// choose a bot with enough balance and not current bettor
				const st = columnState[colId];
				const eligible = botIndices.filter(bi=>{
					const acc = ACCOUNTS[bi];
					if (!acc) return false;
					if (acc.balance < cfg.bet) return false;
					if (st && st.bettor === bi) return false;
					// duel: avoid violating unique participants rule (but allow to join if <2)
					if (colId === 4 && st?.participants){
						const part = st.participants;
						if (part.size >= 2 && !part.has(bi)) return false;
					}
					return true;
				});
				if (!eligible.length) continue;
				const botIndex = pickRandom(eligible);
				// small randomness gate to avoid spam
				if (Math.random() < 0.65) makeBet(colId, botIndex, false);
			}
		} catch(e) { /* silent */ }
	}, 900 + Math.floor(Math.random()*400));
}

const columnState = {};
const hintTimers = {};
let winners = [];
let currentAccountIndex = 0;
window.currentAccountIndex = currentAccountIndex;
let winnerTimeout = null;
let compactLayout = false;
const AUTO_REACTION_COOLDOWN = 300;
// Chat read tracking
let messageCounter = 0; // increments for each chat message
const lastReadIndex = {}; // per-account last read message index

function initGame() {
    // Add test bots (12) with realistic mixed avatars and start their engine
    addBotsIfNeeded();
	// Try to restore current account index and balances from localStorage
	try {
		const rawIdx = localStorage.getItem('currentAccountIndex');
		const idx = rawIdx == null ? NaN : Number(rawIdx);
		if (!Number.isNaN(idx) && idx >= 0 && idx < ACCOUNTS.length) {
			currentAccountIndex = idx;
		}
		// restore balances per account if present
		for (const acc of ACCOUNTS) {
			const key = `balance_${acc.id}`;
			const raw = localStorage.getItem(key);
			const num = raw == null ? NaN : Number(raw);
			if (!Number.isNaN(num)) acc.balance = num;
		}
		
		// Force update Oleg's balance to 300000 if it's less (one-time update)
		const olegAccount = ACCOUNTS.find(acc => acc.id === 'delta');
		if (olegAccount && olegAccount.balance < 300000) {
			olegAccount.balance = 300000;
			localStorage.setItem(`balance_${olegAccount.id}`, String(300000));
		}
	} catch (e) { /* ignore */ }
	populateAccountSelector();
	renderCurrentAccount();

	COLUMNS.forEach(config => {
		columnState[config.id] = {
			bank: config.baseBank,
			// allow per-column timer customization
			timer: getBaseTimerForColumn(config.id),
			// when timer reaches 0, keep showing 0:00 for this many seconds while still accepting last-moment bets
			zeroGrace: 0,
			// winner display timer/interval
			winnerTimer: 0,
			winnerInterval: null,
			interval: null,
			bettor: null,
			lastBetAmount: 0,
			betCount: 0,
			auto: {},
			// track unique participants for special columns (e.g. Дуэль)
			participants: new Set(),
			// Lucky Win mechanic for column 1 only
			betHistory: [], // {timestamp, accountIndex}
			lastBetTime: 0
		};


		updateBankDisplay(config.id);
		updateTimerDisplay(config.id);
		// бонусная полоса отключена — ничего не делаем
		hideBetInfo(config.id);
		hideBetPulse(config.id);
		updateAutoButton(config.id);
		startColumnTimer(config.id);

		const pulse = document.getElementById(`pulse-${config.id}`);
		if (pulse) {
			pulse.addEventListener("animationend", () => {
				pulse.classList.add("hidden");
				pulse.classList.remove("animate");
				pulse.textContent = "";
			});
		}
	});

	// Start bots after columns are initialized
	startBotEngine();

	evaluateLayoutMode();

	renderWinners();
	// чат используется только для общения игроков — без системных сообщений
	updateChatButton();

	// Auto-open winners panel if URL has openWinners=1
	try {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('openWinners') === '1') {
			setTimeout(() => {
				toggleWinners();
			}, 300);
		}
	} catch (e) { /* ignore */ }

	const chatInput = document.getElementById("chatInput");
	if (chatInput) {
		chatInput.addEventListener("keydown", evt => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				sendMessage();
			}
		});
	}

	window.addEventListener("resize", evaluateLayoutMode);

	// Global error capture for debugging crashes
	window.addEventListener('error', function (evt) {
		const msg = `Error: ${evt.message} at ${evt.filename}:${evt.lineno}:${evt.colno}`;
		console.error(msg, evt.error);
		showFatalOverlay(msg, evt.error);
		// не отправляем системные сообщения в чат
	});

	window.addEventListener('unhandledrejection', function (evt) {
		const reason = evt.reason ? (evt.reason.message || String(evt.reason)) : 'unknown';
		const msg = `UnhandledRejection: ${reason}`;
		console.error(msg, evt.reason);
		showFatalOverlay(msg, evt.reason);
		// не отправляем системные сообщения в чат
	});
}

function showFatalOverlay(message, error) {
	let overlay = document.getElementById('fatalOverlay');
	if (!overlay) {
		overlay = document.createElement('div');
		overlay.id = 'fatalOverlay';
		overlay.style.position = 'fixed';
		overlay.style.inset = '0';
		overlay.style.background = 'rgba(8,10,18,0.85)';
		overlay.style.color = 'white';
		overlay.style.zIndex = '9999';
		overlay.style.padding = '20px';
		overlay.style.overflow = 'auto';
		overlay.style.fontFamily = 'monospace';
		overlay.style.fontSize = '13px';
		document.body.appendChild(overlay);
	}
	overlay.innerHTML = `<h2 style="margin-top:0;color:#ff6b6b">Сбой приложения</h2><div>${escapeHtml(String(message))}</div><pre style="white-space:pre-wrap;margin-top:12px">${escapeHtml(String(error?.stack || 'no stack'))}</pre>`;
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function populateAccountSelector() {
	const selector = document.getElementById("accountSelector");
	if (!selector) return;

	selector.innerHTML = ACCOUNTS.map((account, index) => `<option value="${index}">${account.name}</option>`).join("");
	selector.value = String(currentAccountIndex);
	selector.addEventListener("change", event => {
		const value = Number(event.target.value);
		switchAccount(Number.isNaN(value) ? 0 : value);
	});
}

function isCompactLandscape() {
	return window.innerHeight <= 540 && window.innerWidth > window.innerHeight;
}

function evaluateLayoutMode() {
	const nextMode = isCompactLandscape();
	const changed = nextMode !== compactLayout;
	compactLayout = nextMode;

	updateLayoutLabels();
	COLUMNS.forEach(config => updateAutoButton(config.id));

	if (changed) {
		// hide chat panel if it would overlap in compact view
		if (compactLayout) {
			const chatPanel = document.getElementById("chatPanel");
			if (chatPanel) chatPanel.classList.remove("open");
		}
	}
}

function updateLayoutLabels() {
	setLabelForLayout(document.querySelector(".top-actions button[data-role='next-account']"), "След.", "Следующий игрок");
	setLabelForLayout(document.querySelector(".top-actions button[data-role='winners-toggle']"), "Топ", "Топ");
	setLabelForLayout(document.querySelector(".bottom-bar button[data-role='winners-toggle']"), "Топ", "Топ");
	setLabelForLayout(document.querySelector("#chatPanel .chat-header button"), "×", "Закрыть");
	setLabelForLayout(document.querySelector(".winners-header button"), "×", "Закрыть");
	setLabelForLayout(document.querySelector(".winner-card .ghost-button"), "×", "Закрыть");
}

function setLabelForLayout(element, compactText, fallbackText) {
	if (!element) return;
	if (!element.dataset.labelFull) {
		element.dataset.labelFull = fallbackText ?? element.textContent;
	}
	element.textContent = compactLayout ? compactText : element.dataset.labelFull;
}

function setAvatar(element, account) {
	if (!element) return;

	// reset previous inline styles so we always start from a clean state
	element.classList.remove("avatar-has-image");
	element.style.backgroundImage = "";
	element.style.background = "";
	element.style.backgroundSize = "";
	element.style.backgroundPosition = "";
	element.style.backgroundRepeat = "";
	element.style.color = "";
	element.textContent = "";

	if (!account) {
		return;
	}

	// Always prefer an image (fallback to default local image)
	const img = account.avatarImage || DEFAULT_AVATAR_IMAGE;
	element.classList.add("avatar-has-image");
	element.style.background = "rgba(17, 23, 41, 0.65)";
	element.style.backgroundImage = `url(${img})`;
	element.style.backgroundSize = "cover";
	element.style.backgroundPosition = "center";
	element.style.backgroundRepeat = "no-repeat";
	element.style.color = "transparent";
}

function renderCurrentAccount() {
	const account = ACCOUNTS[currentAccountIndex];
	const nameEl = document.getElementById("currentName");
	const balanceEl = document.getElementById("currentBalance");
	const avatarEl = document.getElementById("currentAvatar");
	const selector = document.getElementById("accountSelector");

	// Экспортируем индекс текущего аккаунта во внешнюю область для системных модулей
	window.currentAccountIndex = currentAccountIndex;

	if (nameEl) nameEl.textContent = account.name;
	if (balanceEl) balanceEl.textContent = `Баланс: ${formatNumber(account.balance)} монет`;
	if (avatarEl) setAvatar(avatarEl, account);
	if (selector) selector.value = String(currentAccountIndex);

	COLUMNS.forEach(config => updateAutoButton(config.id));
	updateChatButton();

	try {
		window.dispatchEvent(new CustomEvent('player-changed', {
			detail: { account, index: currentAccountIndex }
		}));
	} catch (e) {
		// ignore dispatch failures in legacy embeds
	}

	// persist current account index and all balances for menu page
	try {
		localStorage.setItem('currentAccountIndex', String(currentAccountIndex));
		for (const acc of ACCOUNTS) {
			localStorage.setItem(`balance_${acc.id}`, String(acc.balance));
		}
	} catch (e) { /* ignore quota/availability */ }
}

// If bot avatars get upgraded with local photos after async check, re-render bot backdrops on next tick
setTimeout(()=>{
	try{
		COLUMNS.forEach(cfg=>{
			const st = columnState[cfg.id]; if (!st || st.bettor==null) return;
			const acc = ACCOUNTS[st.bettor]; if (!acc) return;
			const colEl = document.querySelector(`.column[data-column="${cfg.id}"]`);
			if (!colEl) return;
			const backdrop = colEl.querySelector('.column-backdrop');
			if (!backdrop) return;
			if (acc.avatarImage){
				backdrop.textContent = "";
				backdrop.style.backgroundImage = `url(${acc.avatarImage})`;
				backdrop.classList.add('has-image');
			}
		});
	}catch(e){}
}, 1200);

function switchAccount(index) {
	if (index < 0 || index >= ACCOUNTS.length) return;
	currentAccountIndex = index;
	renderCurrentAccount();
	try { localStorage.setItem('currentAccountIndex', String(currentAccountIndex)); } catch(e){}
}

function nextAccount() {
	const nextIndex = (currentAccountIndex + 1) % ACCOUNTS.length;
	switchAccount(nextIndex);
}

function startColumnTimer(columnId) {
	const state = columnState[columnId];
	if (!state) return;

	if (state.interval) clearInterval(state.interval);
	state.interval = setInterval(() => tickColumn(columnId), 1000);
}

function tickColumn(columnId) {
	const state = columnState[columnId];
	if (!state) return;

	// if a winner overlay is active, suspend the regular tick for this column
	if (state.winnerTimer && state.winnerTimer > 0) {
		return;
	}

	// If we're in grace period, count it down
	if (state.timer <= 0) {
		if (!state.zeroGrace || state.zeroGrace <= 0) {
			// start grace window
			state.zeroGrace = 4;
		} else {
			state.zeroGrace -= 1;
			if (state.zeroGrace <= 0) {
				// grace ended, resolve
				resolveColumn(columnId);
				return;
			}
		}
		// still show 0:00 during grace and allow last-moment bets
		updateTimerDisplay(columnId);
		maybeTriggerAuto(columnId);
		return;
	}

	state.timer -= 1;
	updateTimerDisplay(columnId);
	maybeTriggerAuto(columnId);
}

function maybeTriggerAuto(columnId, force = false) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	if (!state || !config) return;

	const autoEntries = state.auto;
	if (!autoEntries) return;

	const now = Date.now();

	for (const [key, entry] of Object.entries(autoEntries)) {
		if (!entry || !entry.active) continue;
		const accountIndex = Number(key);
		if (Number.isNaN(accountIndex)) continue;

		const account = ACCOUNTS[accountIndex];
		if (!account || account.balance < config.bet) {
			if (disableAuto(columnId, accountIndex)) {
				const name = account?.name ?? "Игрок";
				// чат без системных сообщений
			}
			continue;
		}

		if (state.bettor === accountIndex) continue;
		if (!force && state.timer > config.autoThreshold) continue;
		const lastTrigger = entry.lastTrigger ?? 0;
		if (!force && now - lastTrigger < AUTO_REACTION_COOLDOWN) continue;

		entry.lastTrigger = now;
		const placed = makeBet(columnId, accountIndex, true);
		if (placed) {
			if (!force) {
				break;
			}
			continue;
		}
	}
}

function makeBet(columnId, accountIndex = currentAccountIndex, isAuto = false) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	const account = ACCOUNTS[accountIndex];
	if (!state || !config || !account) return false;

	// Prevent bots from betting on human-only accounts
	if (account.isHumanPlayer && isAuto) {
		return false; // Bots cannot bet for this player
	}

	// Block betting if the player has overdue credit in BankSystem
	try {
		if (window.BankSystem && typeof window.BankSystem === 'function'){
			// Synchronously check a cached flag first if exists
			const key = `bank_${account.id}`;
			const cached = localStorage.getItem(key);
			if (cached){
				try {
					const st = JSON.parse(cached);
					const hasOverdue = Array.isArray(st?.credits) && st.credits.some(c=>!c.repaid && Date.now() > (c.startAt + (c.plan==='d1'?1:c.plan==='d7'?7:30)*24*60*60*1000));
					if (hasOverdue){
						if (accountIndex === currentAccountIndex) {
							showHint('hint-c4-duel'); // reuse a hint element; ideally show dedicated hint
						}
						return false;
					}
				} catch(e) { /* ignore parse errors */ }
			}
		}
	} catch(e) { /* ignore */ }

	// Special rule: column 4 (Дуэль) can have only 2 unique participants per round
	if (columnId === 4) {
		const participants = state.participants || new Set();
		if (!participants.has(accountIndex)) {
			if (participants.size >= 2) {
				// silently ignore third unique bettor - only 2 players allowed in duel
				return false;
			}
			participants.add(accountIndex);
			state.participants = participants;
		}
	}

	const isCurrentLeader = state.bettor === accountIndex;
	if (isCurrentLeader) {
		// чат без системных сообщений
		return false;
	}

	if (account.balance < config.bet) {
		if (isAuto) {
			if (disableAuto(columnId, accountIndex)) {
				const name = account?.name ?? "Игрок";
				appendChatMessage(
					"Система",
					`${name} автоставка отключена в колонке "${config.label}": нехватка средств`,
					"system"
				);
			}
		} else if (accountIndex === currentAccountIndex) {
			flashBalance();
			// чат без системных сообщений
		}
		return false;
	}

	const betsBefore = state.betCount ?? 0;
	const isFirstBetOfRound = betsBefore === 0;
	state.betCount = betsBefore + 1;

	account.balance -= config.bet;

	// If a bet is placed during the zero-grace window, cancel the remaining grace
	if (state.zeroGrace && state.zeroGrace > 0) {
		state.zeroGrace = 0;
	}
	state.bettor = accountIndex;
	state.lastBetAmount = config.bet;
	
	// Track bet for Lucky Win mechanic (column 1 only)
	const now = Date.now();
	if (columnId === 1) {
		if (!state.betHistory) state.betHistory = [];
		state.betHistory.push({ timestamp: now, accountIndex });
		state.lastBetTime = now;
	}
	
	// Dynamic timer extension logic based on column
	let timeToAdd = 5; // Default fallback
	const currentTimer = typeof state.timer === 'number' && state.timer > 0 ? state.timer : 0;
	
	if (columnId === 1) {
		// Column 1 "Шанс": Dynamic time based on timer
		if (currentTimer > 150) {
			timeToAdd = 1 + Math.random() * 2; // 1-3 seconds
		} else if (currentTimer < 60) {
			timeToAdd = 3 + Math.random() * 2; // 3-5 seconds
		} else {
			timeToAdd = 2 + Math.random() * 3; // 2-5 seconds
		}
	} else if (columnId === 2) {
		// Column 2 "Любитель": 2-4 seconds
		timeToAdd = 2 + Math.random() * 2;
	} else if (columnId === 3) {
		// Column 3 "Профессионал": 1-3 seconds
		timeToAdd = 1 + Math.random() * 2;
	} else if (columnId === 4) {
		// Column 4 "Дуэль": 2-4 seconds
		timeToAdd = 2 + Math.random() * 2;
	} else if (columnId === 5) {
		// Column 5 "Мастер": 3-6 seconds
		timeToAdd = 3 + Math.random() * 3;
	}
	
	timeToAdd = Math.round(timeToAdd); // Round to whole seconds

	// Show pulse with calculated time (not for first bet of round)
	if (!isFirstBetOfRound) {
		state.bank += config.bet;
		showBetPulse(columnId, timeToAdd);
	}
	
	// Extend timer by calculated amount
	// If we are in zero-grace, cancel the grace and set timer to the calculated time
	if (state.zeroGrace && state.zeroGrace > 0) {
		state.zeroGrace = 0;
		state.timer = timeToAdd;
	} else {
		// Add calculated time to current timer (or set to timeToAdd if timer was not positive)
		const cur = typeof state.timer === 'number' && state.timer > 0 ? state.timer : 0;
		state.timer = cur + timeToAdd;
	}

	updateBankDisplay(columnId);
	updateTimerDisplay(columnId);
	// бонусная полоса отключена — ничего не делаем
	showBetInfo(columnId, account, config.bet);

	if (accountIndex === currentAccountIndex) {
		renderCurrentAccount();
		try{ if (window.BankSystem){ const bs = new window.BankSystem(); bs.syncProfile(account, account.balance); } }catch(e){}
	}

	if (!isAuto) {
		maybeTriggerAuto(columnId, true);
	}
	
	// Check for Lucky Win (column 1 only)
	if (columnId === 1 && !isFirstBetOfRound) {
		checkLuckyWin(columnId);
	}

	return true;
}

// ==================
// Lucky Win mechanic for column 1
// ==================
function checkLuckyWin(columnId) {
	if (columnId !== 1) return; // Only for column 1
	
	const state = columnState[columnId];
	if (!state || !state.betHistory) return;
	
	// Lucky Win only active when timer is between 20s and 150s (2m30s)
	if (state.timer < 20 || state.timer > 150) return;
	
	const now = Date.now();
	const last15Seconds = now - 15000;
	
	// Get bets from last 15 seconds
	const recentBets = state.betHistory.filter(bet => bet.timestamp >= last15Seconds);
	
	// Need at least 3 bets for Lucky Win
	if (recentBets.length < 3) return;
	
	// Check if there's active fighting (bets no more than 5s apart)
	let isActiveFight = true;
	for (let i = 1; i < recentBets.length; i++) {
		const timeDiff = recentBets[i].timestamp - recentBets[i - 1].timestamp;
		if (timeDiff > 5000) { // more than 5 seconds gap
			isActiveFight = false;
			break;
		}
	}
	
	if (!isActiveFight) return;
	
	// Calculate Lucky Win probability based on number of overbids
	let probability = 0;
	const overtakeCount = recentBets.length;
	
	if (overtakeCount >= 7) {
		probability = 0.20; // 20%
	} else if (overtakeCount >= 5) {
		probability = 0.10; // 10%
	} else if (overtakeCount >= 3) {
		probability = 0.05; // 5%
	}
	
	// Roll the dice
	if (Math.random() < probability) {
		triggerLuckyWin(columnId);
	}
}

function triggerLuckyWin(columnId) {
	const state = columnState[columnId];
	if (!state || state.bettor == null) return;
	
	const winnerIndex = state.bettor;
	const account = ACCOUNTS[winnerIndex];
	if (!account) return;
	
	// Show Lucky Win effect
	showLuckyWinEffect(columnId, account);
	
	// Resolve immediately
	setTimeout(() => {
		resolveColumn(columnId);
	}, 2000); // Wait 2s for effect to show
}

function showLuckyWinEffect(columnId, account) {
	const colEl = document.querySelector(`.column[data-column="${columnId}"]`);
	if (!colEl) return;
	
	// Create lucky win overlay
	const luckyOverlay = document.createElement('div');
	luckyOverlay.className = 'lucky-win-overlay';
	luckyOverlay.innerHTML = `
		<div class="lucky-win-flash"></div>
		<div class="lucky-win-message">
			<div class="lucky-win-title">✨ УДАЧА! ✨</div>
			<div class="lucky-win-subtitle">Удача на стороне ${account.name}!</div>
		</div>
	`;
	colEl.appendChild(luckyOverlay);
	
	// Remove after animation
	setTimeout(() => {
		luckyOverlay.remove();
	}, 2000);
}

function resolveColumn(columnId) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	if (!state || !config) return;

	if (state.bettor == null) {
		resetColumn(columnId);
		return;
	}

	const winnerIndex = state.bettor;
	const winnings = state.bank;
	const account = ACCOUNTS[winnerIndex];

	account.balance += winnings;
	// Persist updated balance immediately so menu reflects it
	try { localStorage.setItem(`balance_${account.id}`, String(account.balance)); } catch(e){}
	try{ if (window.BankSystem){ const bs = new window.BankSystem(); bs.syncProfile(account, account.balance); } }catch(e){}
	
	// Record successful deal for real estate system
	try {
		if (window.RealEstateSystem) {
			const rs = new window.RealEstateSystem();
			rs.recordDeal(account).catch(err => console.warn('[RealEstate] Failed to record deal:', err));
		}
	} catch(e) { console.warn('[RealEstate] Error recording deal:', e); }
	
	winners.unshift({
		accountIndex: winnerIndex,
		accountId: account.id,
		columnId,
		columnName: config.label,
		amount: winnings,
		timestamp: Date.now()
	});
	if (winners.length > 25) winners.pop();

	// Сохраняем историю побед в localStorage для меню
	try {
		const historyData = winners.map(w => ({
			accountId: w.accountId || ACCOUNTS[w.accountIndex]?.id,
			columnId: w.columnId,
			columnName: w.columnName || getColumnConfig(w.columnId)?.label,
			amount: w.amount,
			timestamp: w.timestamp
		}));
		localStorage.setItem('winners_history', JSON.stringify(historyData));
	} catch(e) {
		console.warn('[Winners] Failed to save history:', e);
	}

	renderWinners();
	// show winner overlay on the column for 15 seconds
	showWinnerOverlay(columnId, account, winnings);
	// Do not append winner announcement to chat — chat is for players only

	if (winnerIndex === currentAccountIndex) {
		renderCurrentAccount();
	}

	// После победы отключаем автоставку для победителя в этой колонке
	if (state.auto && state.auto[winnerIndex]?.active) {
		state.auto[winnerIndex].active = false;
		state.auto[winnerIndex].lastTrigger = 0;
		if (winnerIndex === currentAccountIndex) {
			updateAutoButton(columnId);
		}
	}

	// resetColumn will be called after the winner overlay timer elapses
}

function showWinnerOverlay(columnId, account, amount) {
	const state = columnState[columnId];
	const colEl = document.querySelector(`.column[data-column="${columnId}"]`);
	if (!state || !colEl) return;

	// NOTE: Визуальные эффекты победы временно отключены

	// ensure any existing overlay is removed
	const existing = colEl.querySelector('.winner-overlay');
	if (existing) existing.remove();

    // render a compact winner badge placed at the top-center of the column
	const overlay = document.createElement('div');
	overlay.className = 'winner-overlay';
		overlay.innerHTML = `
			<div class="winner-badge" role="status" aria-live="polite">
				<div class="winner-title">Победитель!</div>
				<div class="winner-amount">+${formatNumber(amount)} монет</div>
			</div>
		`;
	colEl.appendChild(overlay);
	colEl.classList.add('is-winner');

	// NOTE: Эффект монет выполняется через AVK систему (src/fx/avk-coins.js),
	// которая подписывается на emitRoundEnd и сама рисует анимацию поверх страницы.

	// store and clear bank display (we won't render badge inside bank anymore)
	const bankEl = document.getElementById(`bank-${columnId}`);
	if (bankEl) {
		bankEl.dataset._prevBankHtml = bankEl.innerHTML;
		bankEl.textContent = '';
		bankEl.classList.remove('bank-winner');
	}

	// keep the regular timer display visible and crisp (we no longer blur overlay)
	const timerEl = document.getElementById(`timer-${columnId}`);
	if (timerEl) {
		timerEl.dataset._prevText = timerEl.textContent;
		timerEl.style.visibility = 'visible';
	}

	// start 15s countdown shown in the usual timer position
	state.winnerTimer = 15;
	if (state.winnerInterval) clearInterval(state.winnerInterval);
	state.winnerInterval = setInterval(() => {
		state.winnerTimer -= 1;
		// update only the main column timer (red one)
		const te = document.getElementById(`timer-${columnId}`);
		const minutes = Math.floor(state.winnerTimer / 60);
		const seconds = state.winnerTimer % 60;
		if (te) {
			te.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
			// keep neutral look for winner timer (no urgent pulse)
			te.classList.remove('urgent', 'urgent-small');
			te.classList.add('winner-timer');
			te.style.animation = '';
		}
		if (state.winnerTimer <= 0) {
			clearInterval(state.winnerInterval);
			state.winnerInterval = null;
			// remove overlay and reset column
			const over = colEl.querySelector('.winner-overlay');
			if (over) over.remove();
			colEl.classList.remove('is-winner');
			// restore timer element text (resetColumn will update it too)
			if (timerEl && typeof timerEl.dataset._prevText !== 'undefined') {
				timerEl.textContent = timerEl.dataset._prevText;
				delete timerEl.dataset._prevText;
				te.classList.remove('urgent');
			}

			// restore bank display
			if (bankEl) {
				bankEl.classList.remove('bank-winner');
				if (typeof bankEl.dataset._prevBankHtml !== 'undefined') {
					bankEl.innerHTML = bankEl.dataset._prevBankHtml;
					delete bankEl.dataset._prevBankHtml;
				} else {
					// fallback: update with current state
					updateBankDisplay(columnId);
				}
			}
			resetColumn(columnId);
		}
	}, 1000);
}

function triggerCoinBurstFromOverlayToBalance(overlayEl, amount) {
	const balanceEl = document.getElementById('currentBalance');
	if (!overlayEl || !balanceEl) return;
	const srcRect = overlayEl.getBoundingClientRect();
	const dstRect = balanceEl.getBoundingClientRect();
	const startX = srcRect.left + srcRect.width / 2;
	const startY = srcRect.top + srcRect.height / 2;
	const endX = dstRect.left + dstRect.width * 0.15; // left portion of balance
	const endY = dstRect.top + dstRect.height / 2;
	const dx = endX - startX;
	const dy = endY - startY;

	// number of coins proportional, with caps
	const n = Math.min(18, Math.max(8, Math.round(Math.log10(Math.max(1, amount)) * 5)));
	for (let i = 0; i < n; i++) {
		const coin = document.createElement('div');
		coin.className = 'coin-burst-coin';
		const jitterA = (Math.random() - 0.5) * 0.5; // angle jitter
		const jitterR = Math.random() * 40; // radial jitter px
		const offsetX = Math.cos(jitterA * Math.PI * 2) * jitterR;
		const offsetY = Math.sin(jitterA * Math.PI * 2) * jitterR;
		const tx = dx + offsetX;
		const ty = dy + offsetY;
		const dur = 700 + Math.random() * 450;
		Object.assign(coin.style, {
			left: `${startX}px`,
			top: `${startY}px`,
			'--tx': `${tx}px`,
			'--ty': `${ty}px`,
			'--dur': `${dur}ms`,
			// Fallback inline styles if CSS didn't refresh yet
			position: 'fixed',
			width: '12px',
			height: '12px',
			borderRadius: '50%',
			background: 'radial-gradient(circle at 30% 30%, #fff5bf 0%, #ffe066 35%, #f5c542 60%, #d4a017 100%)',
			boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
			zIndex: '5000',
			pointerEvents: 'none',
			willChange: 'transform, opacity',
			transform: 'translate(0,0) scale(0.8) rotate(0deg)',
			opacity: '1',
			animation: `coin-flight ${dur}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`
		});
		document.body.appendChild(coin);
		setTimeout(() => coin.remove(), dur + 50);
	}
}

// Экспортируем для использования в модульной системе эффектов
window.triggerCoinBurstFromOverlayToBalance = triggerCoinBurstFromOverlayToBalance;

function resetColumn(columnId) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	if (!state || !config) return;

	state.bank = config.baseBank;
	state.timer = getBaseTimerForColumn(columnId);
	state.bettor = null;
	state.lastBetAmount = 0;
	state.betCount = 0;

	// Clear column background avatar state
	const colEl = document.querySelector(`.column[data-column="${columnId}"]`);
	if (colEl) {
		colEl.classList.remove("has-bet");
		delete colEl.dataset.bgEmoji;
		delete colEl.dataset.bgImage;
		const backdrop = colEl.querySelector(".column-backdrop");
		if (backdrop) {
			backdrop.textContent = "";
			delete backdrop.dataset.emoji;
			delete backdrop.dataset.image;
			backdrop.style.backgroundImage = "none";
			backdrop.classList.remove("active");
			backdrop.classList.remove("has-image");
		}
	}

	updateBankDisplay(columnId);
	updateTimerDisplay(columnId);
	// бонусную полосу отключаем, бонус показывается рядом с банком
	hideBetInfo(columnId);
	hideBetPulse(columnId);
	// Clear duel participants for next round
	if (state.participants) {
		state.participants.clear();
	}
	// Clear Lucky Win history for column 1
	if (columnId === 1) {
		state.betHistory = [];
		state.lastBetTime = 0;
	}
	// reset zero-grace
	if (typeof state.zeroGrace !== 'undefined') state.zeroGrace = 0;
	
	// Notify bot system about round end
	if (typeof window.onBotRoundEnd === 'function') {
		window.onBotRoundEnd(columnId);
	}
}

function updateBankDisplay(columnId) {
	const state = columnState[columnId];
	const element = document.getElementById(`bank-${columnId}`);
	if (state && element) {
		const bankText = `Банк: ${formatNumber(state.bank)}`;
		const bonus = getInlineBonus(state.bank);
		element.innerHTML = bonus > 0
			? `${bankText} <span class="bank-bonus">+${bonus}% бонус</span>`
			: bankText;
	}
}

function getInlineBonus(bank) {
		if (bank >= 1000) return 3;
		if (bank >= 500) return 2;
		if (bank >= 100) return 1;
		return 0;
}

function updateTimerDisplay(columnId) {
	const state = columnState[columnId];
	const element = document.getElementById(`timer-${columnId}`);
	if (state && element) {
		// If a winner countdown is active, show it here and skip normal timer rendering
		if (state.winnerTimer && state.winnerTimer > 0) {
			const minutes = Math.floor(state.winnerTimer / 60);
			const seconds = state.winnerTimer % 60;
			element.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
			// For winner timer: keep it neutral (no red pulse), even when <= 5s
			element.classList.remove('urgent', 'urgent-small');
			element.classList.add('winner-timer');
			element.style.animation = '';
			return;
		}

		let displayTimer = state.timer;
		// during grace, show 0:00
		if (state.timer <= 0) {
			displayTimer = 0;
		}
		const minutes = Math.floor(displayTimer / 60);
		const seconds = displayTimer % 60;
		element.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
		// urgent visuals:
		// - when timer is 0 or during zeroGrace -> smaller subtle pulse (urgent-small)
		// - when timer <= 5 and > 0 -> more pronounced pulse (urgent)
		const isZeroGrace = (state.zeroGrace && state.zeroGrace > 0) || (typeof state.timer === 'number' && state.timer === 0);
		const isNearEnd = (typeof state.timer === 'number' && state.timer > 0 && state.timer <= 5);

	element.classList.remove('winner-timer');
	element.classList.toggle('urgent-small', isZeroGrace);
	element.classList.toggle('urgent', isNearEnd);

		if (isNearEnd) {
			element.style.animation = 'timerPulse 1s ease-in-out infinite';
		} else if (isZeroGrace) {
			element.style.animation = 'timerPulseSmall 1s ease-in-out infinite';
		} else {
			element.style.animation = '';
		}
	}
}

function updateBonus(columnId) {
	// бонусная строка отключена — отображение бонуса вынесено в updateBankDisplay()
	return;
}

function showBetInfo(columnId, account, amount) {
	const info = document.getElementById(`bet-info-${columnId}`);
	const name = document.getElementById(`bet-name-${columnId}`);

	if (!info || !name) return;

	// Reflect bettor avatar as a faint background on entire column except buttons
	const colEl = document.querySelector(`.column[data-column="${columnId}"]`);
	if (colEl && account) {
		const backdrop = colEl.querySelector(".column-backdrop");
		const emoji = account.avatar || "🎯"; // legacy; not used visually anymore
		if (backdrop) {
			const image = account.avatarImage || DEFAULT_AVATAR_IMAGE;
			backdrop.textContent = "";
			backdrop.style.backgroundImage = `url(${image})`;
			backdrop.classList.add("has-image");
			backdrop.dataset.image = image;
			delete backdrop.dataset.emoji;
			backdrop.classList.add("active");
		}
		const imgForDataset = account.avatarImage || DEFAULT_AVATAR_IMAGE;
		colEl.dataset.bgImage = imgForDataset;
		delete colEl.dataset.bgEmoji;
		colEl.classList.add("has-bet");
	}

	name.textContent = account?.name ?? "";
	info.classList.remove("hidden");
	info.style.setProperty("display", "flex", "important");
	info.style.setProperty("opacity", "1", "important");
	info.style.setProperty("pointer-events", "none", "important");
}

function hideBetInfo(columnId) {
	const info = document.getElementById(`bet-info-${columnId}`);
	if (!info) return;
	info.classList.add("hidden");
	info.style.removeProperty("display");
	info.style.removeProperty("opacity");
	info.style.removeProperty("pointer-events");
}

function showBetPulse(columnId, seconds) {
	const pulse = document.getElementById(`pulse-${columnId}`);
	if (!pulse) return;
	pulse.textContent = `+${seconds}с`;
	pulse.classList.remove("hidden");
	pulse.classList.remove("animate");
	void pulse.offsetWidth;
	pulse.classList.add("animate");
}

function hideBetPulse(columnId) {
	const pulse = document.getElementById(`pulse-${columnId}`);
	if (!pulse) return;
	pulse.classList.add("hidden");
	pulse.classList.remove("animate");
	pulse.textContent = "";
}

function toggleAuto(columnId) {
	const config = getColumnConfig(columnId);
	const state = columnState[columnId];
	if (!config || !state) return;

	if (!config.autoAllowed) {
		showHint("hint-auto-disabled");
		return;
	}

	const accountIndex = currentAccountIndex;
	const account = ACCOUNTS[accountIndex];
	if (!account || account.balance < config.bet) {
		flashBalance();
	// чат без системных сообщений
		return;
	}

	const entry = state.auto[accountIndex] ?? { active: false, lastTrigger: 0 };

	if (entry.active) {
		entry.active = false;
		entry.lastTrigger = 0;
		state.auto[accountIndex] = entry;
		updateAutoButton(columnId);
	// чат без системных сообщений
		return;
	}

	entry.active = true;
	entry.lastTrigger = 0;
	state.auto[accountIndex] = entry;
	updateAutoButton(columnId);
	// чат без системных сообщений
}

function disableAuto(columnId, accountIndex) {
	const state = columnState[columnId];
	if (!state || !state.auto) return false;

	const entry = state.auto[accountIndex];
	if (!entry || !entry.active) return false;

	entry.active = false;
	entry.lastTrigger = 0;

	if (accountIndex === currentAccountIndex) {
		updateAutoButton(columnId);
	}

	return true;
}

function updateAutoButton(columnId) {
	const button = document.getElementById(`auto-${columnId}`);
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	if (!button || !state || !config) return;

	if (!config.autoAllowed) {
		button.textContent = compactLayout ? "Авто 🚫" : "Авто недоступна";
		button.disabled = true;
		button.classList.remove("active");
		return;
	}

	button.disabled = false;
	const entry = state.auto?.[currentAccountIndex];
	const isActive = Boolean(entry?.active);
	button.textContent = compactLayout ? (isActive ? "Авто (on)" : "Авто (off)") : isActive ? "Авто (on)" : "Авто (off)";
	button.classList.toggle("active", isActive);
}

function toggleChat() {
	const panel = document.getElementById("chatPanel");
	if (!panel) return;

	const isOpen = panel.classList.contains("open");
	const btn = document.querySelector('.bottom-bar button.primary-icon');
	if (isOpen) {
		// Closing chat
		panel.classList.remove("open");
		// Recalculate badge after closing
		updateChatButton();
	} else {
		// Opening chat: remove any visual badge immediately (mark as read)
		panel.classList.add("open");
		if (btn) {
			const badge = btn.querySelector('.unread-badge');
			if (badge) badge.remove();
		}
		// Mark all messages as read for this account
		const accountId = ACCOUNTS[currentAccountIndex]?.id;
		if (accountId) lastReadIndex[accountId] = messageCounter;
		// Also ensure chat button state is consistent
		updateChatButton();
	}
}

function updateChatButton() {
	const btn = document.querySelector('.bottom-bar button.primary-icon');
	if (!btn) return;
	const panel = document.getElementById("chatPanel");
	const existingBadge = btn.querySelector('.unread-badge');
	if (existingBadge) existingBadge.remove();
	if (!panel || panel.classList.contains("open")) {
		return;
	}
	// Use messageCounter and per-account lastReadIndex to determine unread
	const accountId = ACCOUNTS[currentAccountIndex].id;
	const lastRead = lastReadIndex[accountId] || 0;
	const unread = Math.max(0, messageCounter - lastRead);
	if (unread > 0) {
		const span = document.createElement('span');
		span.className = 'unread-badge';
		span.textContent = unread > 99 ? '99+' : unread;
		btn.appendChild(span);
	}
}

function sendMessage() {
	const input = document.getElementById("chatInput");
	if (!input) return;

	const text = input.value.trim();
	if (!text) return;

	const author = ACCOUNTS[currentAccountIndex]?.name ?? "Игрок";
	appendChatMessage(author, text, "player");
	input.value = "";
}

function appendChatMessage(author, text, type = "player") {
	// показываем только сообщения игроков
	if (type !== 'player') return;
	const container = document.getElementById("chatMessages");
	if (!container) return;

	const wrapper = document.createElement("div");
	wrapper.classList.add("chat-message");
	if (type === "system") wrapper.classList.add("system");

	const heading = document.createElement("div");
	heading.classList.add("chat-author");
	heading.textContent = author;

	const body = document.createElement("div");
	body.classList.add("chat-text");
	body.textContent = text;

	wrapper.append(heading, body);
	container.append(wrapper);
	container.scrollTop = container.scrollHeight;
	// Increment message counter for unread tracking and update badge
	messageCounter++;
	updateChatButton();
}

function toggleWinners() {
	const panel = document.getElementById("winnersPanel");
	if (panel) panel.classList.toggle("open");
}

let currentStatsPeriod = 'recent'; // 'recent', '24h', '7d', '1m'

function switchStatsPeriod(period) {
	currentStatsPeriod = period;
	
	// Update tab buttons
	const tabs = document.querySelectorAll('.winners-tabs .tab-button');
	tabs.forEach(tab => {
		const text = tab.textContent.trim();
		if (
			(period === 'recent' && text === 'Недавние') ||
			(period === '24h' && text === '24ч') ||
			(period === '7d' && text === '7дн') ||
			(period === '1m' && text === '1мес')
		) {
			tab.classList.add('active');
		} else {
			tab.classList.remove('active');
		}
	});
	
	renderWinners();
}

function renderWinners() {
	const list = document.getElementById("winnersList");
	if (!list) return;

	if (!winners.length) {
		list.innerHTML = '<div class="winner-empty">Побед пока нет</div>';
		return;
	}

	// Фильтруем по периоду
	const now = Date.now();
	const filtered = winners.filter(entry => {
		if (!entry.timestamp) return true; // Старые записи без timestamp
		const age = now - entry.timestamp;
		
		switch (currentStatsPeriod) {
			case '24h': return age <= 24 * 60 * 60 * 1000;
			case '7d': return age <= 7 * 24 * 60 * 60 * 1000;
			case '1m': return age <= 30 * 24 * 60 * 60 * 1000;
			case 'recent':
			default:
				return true; // Показываем все
		}
	});

	if (!filtered.length) {
		list.innerHTML = '<div class="winner-empty">Побед за этот период нет</div>';
		return;
	}

	list.innerHTML = filtered
		.map(entry => {
			const account = ACCOUNTS[entry.accountIndex];
			const column = getColumnConfig(entry.columnId);
			const name = account ? account.name : "Игрок";
			const columnName = column ? column.label : `#${entry.columnId}`;
			const hasImage = true; // we always use an image (fallback if none)
			const avatarBg = account ? account.background : "rgba(255,255,255,0.08)";
			const avatarColor = account ? "#0b1020" : "var(--text)";
			const avatarChar = account ? account.avatar : "";
			const imgUrl = (account && account.avatarImage) ? account.avatarImage : DEFAULT_AVATAR_IMAGE;
			const avatarStyles = `background-image:url('${imgUrl}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:rgba(17,23,41,0.6);color:transparent;`;
			const avatarClass = "avatar bet-avatar avatar-has-image";
			return `
				<div class="winner-row">
					<div class="${avatarClass}" style="${avatarStyles}">${hasImage ? "" : avatarChar}</div>
					<div class="winner-summary">
						<div class="name">${name}</div>
						<div class="details">Колонка: ${columnName}</div>
						<div class="amount">+${formatNumber(entry.amount)} монет</div>
					</div>
				</div>
			`;
		})
		.join("");
}

function showWinnerNotification(account, column, amount) {
	// Winner notification disabled per user request
	return;
}

function closeWinnerNotification() {
	const wrapper = document.getElementById("winnerNotification");
	if (wrapper) wrapper.classList.add("hidden");
	if (winnerTimeout) {
		clearTimeout(winnerTimeout);
		winnerTimeout = null;
	}
}

function showHint(id) {
	const element = document.getElementById(id);
	if (!element) return;

	element.classList.remove("hidden");
	if (hintTimers[id]) clearTimeout(hintTimers[id]);
	hintTimers[id] = setTimeout(() => {
		element.classList.add("hidden");
		hintTimers[id] = null;
	}, 2200);
}

function flashBalance() {
	const balanceEl = document.getElementById("currentBalance");
	if (!balanceEl) return;

	balanceEl.classList.remove("balance-alert");
	// Force reflow
	void balanceEl.offsetWidth;
	balanceEl.classList.add("balance-alert");
}

function getColumnConfig(columnId) {
	return COLUMNS.find(column => column.id === columnId);
}

function formatNumber(value) {
	return value.toLocaleString("ru-RU");
}

window.makeBet = makeBet;
window.toggleAuto = toggleAuto;
window.toggleChat = toggleChat;
window.toggleWinners = toggleWinners;
window.switchStatsPeriod = switchStatsPeriod;
window.sendMessage = sendMessage;
window.closeWinnerNotification = closeWinnerNotification;
window.nextAccount = nextAccount;
window.switchAccount = switchAccount;
async function goToNextRoom() {
	// Ensure required modules are available and matchmaking initialized with our bot filler
	async function ensureMMReady() {
		if (window.__mmReady) return window.__mmReady;
		window.__mmReady = (async () => {
			const [{ Settings }, leaguesMod, mm] = await Promise.all([
				import('./src/core/settings.js'),
				import('./src/core/leagues.js'),
				import('./src/core/matchmaking.js'),
			]);

			// Simple bot controller that keeps rooms in 10–15 total occupants (humans+bots)
			const controller = window.__mmBotController || {
				ensureBots(room) {
					try {
						const MAX = 15;
						const MIN = 10;
						const cap = Math.min(room.capacity ?? MAX, MAX);
						if (!room.bots) room.bots = new Map();
						const total = (room.players?.size || 0) + (room.bots?.size || 0);
						if (total < MIN) {
							const need = Math.min(MIN, cap) - total;
							for (let i = 0; i < need; i++) {
								const id = `mm-bot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
								room.bots.set(id, { id, name: 'Бот' });
							}
						} else if (total > MAX) {
							// Trim extra bots if any
							const toRemove = total - MAX;
							let removed = 0;
							for (const key of room.bots.keys()) {
								room.bots.delete(key);
								removed += 1;
								if (removed >= toRemove) break;
							}
						}
					} catch (err) { /* noop */ }
				},
				onRoomCreated(room) { this.ensureBots(room); },
				onPlayerJoined(room/*, player*/) { this.ensureBots(room); },
				onPlayerLeft(room/*, playerId*/) { this.ensureBots(room); }
			};
			window.__mmBotController = controller;

			await Settings.loadAll();
			mm.initMatchmaking({ controller });
			return { leaguesMod, mm };
		})();
		return window.__mmReady;
	}

	try {
		const { leaguesMod, mm } = await ensureMMReady();

		// Resolve current player and league by balance
		const player = (Array.isArray(window.ACCOUNTS) && window.ACCOUNTS[window.currentAccountIndex]) || null;
		if (!player) return;
		const league = leaguesMod.getLeagueByBalance(player.balance || 0);

		// Current room (if any)
		const currentKey = mm.getMembership(player.id);

		// Rooms view with humans/bots counts
		const list = mm.getRooms(league) || [];
		const withTotals = list.map(r => ({...r, total: (r.humans||0)+(r.bots||0)}));

		// Prefer any room with total < 15, excluding the current one
		const candidates = withTotals.filter(r => r.total < 15 && r.id !== currentKey);

		let targetRoom = null;
		if (candidates.length) {
			targetRoom = candidates[Math.floor(Math.random() * candidates.length)];
			mm.switchRoom(league, player, targetRoom.id);
		} else {
			// If ALL rooms are full (==15), create a new room via joinRoom
			const allFull = withTotals.length > 0 && withTotals.every(r => r.total >= 15);
			if (allFull) {
				const room = mm.joinRoom(league, player); // will create if none available
				targetRoom = { id: `${room.league}:${room.id}`, league: room.league, label: room.label };
			} else {
				// No other non-full room except maybe current; nothing to switch to under the rules
				// Gracefully no-op
			}
		}

		// Update URL (no reload) for traceability
		if (targetRoom) {
			try {
				const url = new URL(location.href);
				url.searchParams.set('roomKey', targetRoom.id);
				window.history.replaceState({}, document.title, url.toString());
			} catch (e) { /* ignore */ }

			// Small toast feedback
			try {
				const note = document.createElement('div');
				note.textContent = `Перешли в ${targetRoom.label || 'комнату'}`;
				Object.assign(note.style, {
					position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
					background: 'rgba(20,25,40,0.9)', color: '#fff', padding: '6px 10px', borderRadius: '8px',
					fontSize: '12px', zIndex: 5000
				});
				document.body.appendChild(note);
				setTimeout(() => note.remove(), 1200);
			} catch (e) {}
		}
	} catch (e) {
		console.warn('[NextRoom] Ошибка при переходе в комнату:', e);
	}
}
window.goToNextRoom = goToNextRoom;
window.goToMainMenu = function goToMainMenu() {
	// Simple navigation hook to return to the main menu.
	// Heuristics: if there's a global MAIN_MENU_URL, use it; else try index.html in the same folder; else reload root.
	try {
		if (typeof window.MAIN_MENU_URL === 'string' && window.MAIN_MENU_URL) {
			location.href = window.MAIN_MENU_URL;
			return;
		}
		const base = location.href.split('/').slice(0, -1).join('/');
		const candidate = base + '/index.html';
		// naive redirect (if file missing, browser will just show error or fallback server route)
		location.href = candidate;
	} catch (e) {
		location.assign('/');
	}
};

// Show contextual notice in columns (1: timer disclaimer, 4: duel rules)
window.showColumnNotice = function showColumnNotice(columnId) {
	// Disabled for columns 1 and 4
	if (columnId === 1 || columnId === 4) return;
	
	let id = null;
	if (columnId === 1) id = 'hint-c1-timer';
	if (columnId === 4) id = 'hint-c4-duel';
	if (!id) return;
	const el = document.getElementById(id);
	if (!el) return;
		el.classList.add('is-float');
		el.classList.remove('hidden');
	// auto-hide in 2.2s, reuse hintTimers map
	if (hintTimers[id]) clearTimeout(hintTimers[id]);
	hintTimers[id] = setTimeout(() => {
			el.classList.add('hidden');
			el.classList.remove('is-float');
		hintTimers[id] = null;
	}, 2200);
};

// Debug helpers: allow forcing the winner overlay to verify visibility and positioning
window._debugShowWinner = function(columnId = 1, amount = 123) {
	const col = Number(columnId) || 1;
	const acc = ACCOUNTS[currentAccountIndex] || ACCOUNTS[0];
	showWinnerOverlay(col, acc, amount);
};
window._debugCoins = function(amount = 500) {
	// spawn a temporary centered element to simulate source and trigger coin burst
	const temp = document.createElement('div');
	Object.assign(temp.style, { position: 'fixed', left: '50%', top: '50%', width: '10px', height: '10px', transform: 'translate(-50%, -50%)', zIndex: '1' });
	document.body.appendChild(temp);
	triggerCoinBurstFromOverlayToBalance(temp, amount);
	setTimeout(() => temp.remove(), 100);
};
window._debugHideWinner = function(columnId = 1) {
	const colEl = document.querySelector(`.column[data-column="${columnId}"]`);
	if (!colEl) return;
	const over = colEl.querySelector('.winner-overlay');
	if (over) over.remove();
	colEl.classList.remove('is-winner');
};

document.addEventListener("DOMContentLoaded", initGame);

// === Exports for Bot System ===
// Делаем доступными для системы ботов через window
window.columnState = columnState;
window.COLUMNS = COLUMNS;
window.ACCOUNTS = ACCOUNTS;
window.makeBet = makeBet;
window.getColumnConfig = getColumnConfig;

// =========================
// Universal coin FX helpers
// =========================
// API:
//   flyCoins({ fromEl, toEl, particles=12, duration=900, sprite='🪙' }) -> Promise<void>
//     - Spawns emoji coins near fromEl and animates them to toEl with slight randomness and stagger.
//     - On the last coin arrival, if toEl has data-bump-delta, auto calls bumpBalance({ toEl, delta }).
//     - Also resolves the Promise so callers can chain their own bumpBalance.
//   bumpBalance({ toEl, delta })
//     - Smoothly increments the first number inside toEl's text by delta and flashes a short glow on the element.

(function () {
		function ensureCoinFxStyles() {
		if (document.getElementById('coinfx-styles')) return;
		const css = `
			.coinfx-coin{position:fixed;left:0;top:0;display:grid;place-items:center;width:14px;height:14px;font-size:12px;will-change:transform,opacity;z-index:5000;opacity:0}
			@keyframes coinfx-pop{0%{opacity:0;transform:translate(0,0) scale(.6) rotate(0deg)}100%{opacity:1;transform:translate(0,0) scale(1) rotate(90deg)}}
			@keyframes coinfx-flight{0%{transform:translate(0,0) scale(1) rotate(90deg)}60%{transform:translate(calc(var(--tx,0px)*.6 + var(--ox,0px)),calc(var(--ty,0px)*.6 + var(--oy,0px))) scale(1.1) rotate(180deg)}100%{opacity:0;transform:translate(calc(var(--tx,0px) + var(--ox2,0px)),calc(var(--ty,0px) + var(--oy2,0px))) scale(.9) rotate(260deg)}}
		@keyframes coinfx-glow{0%{box-shadow:0 0 0 2px rgba(255,215,0,.7),0 0 22px rgba(255,215,0,.6) inset}100%{box-shadow:0 0 0 0 rgba(255,215,0,0)}}
		`;
		const style = document.createElement('style');
		style.id = 'coinfx-styles';
		style.textContent = css;
		document.head.appendChild(style);
	}

	function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

	function extractFirstNumberParts(text) {
		// returns { start, end, value } for the first number-like substring
		const noNBSP = text.replace(/\u00A0/g, ' ');
		const re = /-?\d{1,3}(?:[\s\u00A0]?\d{3})*(?:[\.,]\d+)?|-?\d+(?:[\.,]\d+)?/;
		const m = re.exec(noNBSP);
		if (!m) return null;
		const raw = m[0];
		const value = parseFloat(raw.replace(/[\s\u00A0]/g, '').replace(',', '.'));
		// Map positions back to original text (approx since we only replaced NBSP to space)
		return { start: m.index, end: m.index + raw.length, value };
	}

	async function bumpBalance({ toEl, delta }) {
		if (!toEl || typeof delta !== 'number' || !isFinite(delta)) return;
		const original = toEl.textContent || '';
		const parts = extractFirstNumberParts(original);
		if (!parts) {
			// No number found: just glow
			toEl.style.animation = 'coinfx-glow 620ms ease-out';
			toEl.addEventListener('animationend', () => { toEl.style.animation = ''; }, { once: true });
			return;
		}
		const { start, end, value } = parts;
		const target = value + delta;
		const startTs = performance.now();
		const dur = 800;
		function step(now) {
			const t = Math.min(1, (now - startTs) / dur);
			const cur = value + (target - value) * easeOutCubic(t);
			const formatted = cur.toLocaleString('ru-RU');
			const updated = original.slice(0, start) + formatted + original.slice(end);
			toEl.textContent = updated;
			if (t < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
		// quick glow
		toEl.style.animation = 'coinfx-glow 620ms ease-out';
		toEl.addEventListener('animationend', () => { toEl.style.animation = ''; }, { once: true });
	}

		function flyCoins({ fromEl, toEl, particles = 12, duration = 900, sprite = '🪙' } = {}) {
		ensureCoinFxStyles();
		if (!fromEl || !toEl) return Promise.resolve();
		particles = Math.max(1, Math.min(64, Math.floor(particles)));
		const fromRect = fromEl.getBoundingClientRect();
		const toRect = toEl.getBoundingClientRect();
		const startX = fromRect.left + fromRect.width / 2;
		const startY = fromRect.top + fromRect.height / 2;
		const endX = toRect.left + toRect.width * 0.15;
		const endY = toRect.top + toRect.height / 2;
		const dx = endX - startX;
		const dy = endY - startY;

		let completed = 0;
		return new Promise(resolve => {
				const baseDelay = 25; // 20–40 мс, используем среднее и небольшой рандом ниже
				const popMs = 200;
				const lastIndex = particles - 1;
			for (let i = 0; i < particles; i++) {
				const node = document.createElement('span');
				node.className = 'coinfx-coin';
				node.textContent = sprite;
				const jitterR = Math.random() * 36; // px radius near origin
				const jitterA = Math.random() * Math.PI * 2;
				const jx = Math.cos(jitterA) * jitterR;
				const jy = Math.sin(jitterA) * jitterR;
				const ox = (Math.random() - 0.5) * 120; // control point offset
				const oy = (Math.random() - 0.5) * 120;
				const ox2 = (Math.random() - 0.5) * 22;
				const oy2 = (Math.random() - 0.5) * 22;
					const rand = 20 + Math.random() * 20;
					const delay = Math.round((baseDelay + (rand - 20)) * i);
					// Синхронизируем прилёт: чем позже старт, тем короче полёт.
					const durFlight = Math.max(400, Math.round(duration + (baseDelay * lastIndex) - delay));
				Object.assign(node.style, {
					left: `${startX + jx}px`,
					top: `${startY + jy}px`,
					'--tx': `${dx}px`,
					'--ty': `${dy}px`,
					'--ox': `${ox}px`,
					'--oy': `${oy}px`,
					'--ox2': `${ox2}px`,
					'--oy2': `${oy2}px`,
						animation: `coinfx-pop ${popMs}ms ease-out ${delay}ms, coinfx-flight ${durFlight}ms cubic-bezier(0.22,0.61,0.36,1) ${delay + popMs}ms forwards`
				});
				document.body.appendChild(node);
				node.addEventListener('animationend', () => {
					node.remove();
					completed += 1;
					if (completed === particles) {
						// Auto bump if target declares delta
						const ds = toEl?.dataset?.bumpDelta;
						if (ds != null && ds !== '') {
							const val = Number(ds);
							if (!Number.isNaN(val)) bumpBalance({ toEl, delta: val });
						}
						resolve();
					}
				}, { once: true });
			}
		});
	}

	// expose helpers
	window.flyCoins = flyCoins;
	window.bumpBalance = bumpBalance;

	// Optional demo button for quick test: enable with ?coinsDemo=1
	try {
		if (typeof URLSearchParams !== 'undefined') {
			const sp = new URLSearchParams(location.search);
			if (sp.get('coinsDemo') === '1') {
				const btn = document.createElement('button');
				btn.textContent = 'Демо монеты';
				btn.className = 'ghost-button';
				Object.assign(btn.style, { position: 'fixed', bottom: '18px', left: '18px', zIndex: 5001 });
				btn.addEventListener('click', async () => {
					const from = document.querySelector('.column[data-column="1"] .column-timer') || document.body;
					const to = document.getElementById('currentBalance') || document.body;
					await flyCoins({ fromEl: from, toEl: to, particles: 16, duration: 900, sprite: '🪙' });
					bumpBalance({ toEl: to, delta: 123 });
				});
				document.body.appendChild(btn);
			}
		}
	} catch (e) { /* noop */ }

	// Usage example (snippet):
	// const from = document.querySelector('#from');
	// const to = document.querySelector('#balance');
	// flyCoins({ fromEl: from, toEl: to, particles: 16, duration: 1000, sprite: '🪙' })
	//   .then(() => bumpBalance({ toEl: to, delta: 250 }));
})();
