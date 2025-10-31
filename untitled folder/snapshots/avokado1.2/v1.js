const GAME_CONFIG = {
	baseTimer: 20
};

const COLUMNS = [
	{ id: 1, label: "Шанс", bet: 2, baseBank: 3, autoAllowed: false, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 18 },
	{ id: 2, label: "Любитель", bet: 4, baseBank: 6, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 24 },
	{ id: 3, label: "Профессионал", bet: 6, baseBank: 9, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 36 },
	{ id: 4, label: "Дуэль", bet: 8, baseBank: 12, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 40 },
	{ id: 5, label: "Мастер", bet: 10, baseBank: 15, autoAllowed: true, autoThreshold: GAME_CONFIG.baseTimer, bonusThreshold: 45 }
];

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

const columnState = {};
const hintTimers = {};
let winners = [];
let currentAccountIndex = 0;
let winnerTimeout = null;
let compactLayout = false;
const AUTO_REACTION_COOLDOWN = 300;
// Chat read tracking
let messageCounter = 0; // increments for each chat message
const lastReadIndex = {}; // per-account last read message index

function initGame() {
	populateAccountSelector();
	renderCurrentAccount();

	COLUMNS.forEach(config => {
		columnState[config.id] = {
			bank: config.baseBank,
			// allow shorter timer for specific columns (e.g., column 2 should be 10s)
			timer: config.id === 2 ? 10 : GAME_CONFIG.baseTimer,
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
			participants: new Set()
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

	evaluateLayoutMode();

	renderWinners();
	// чат используется только для общения игроков — без системных сообщений
	updateChatButton();

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
	setLabelForLayout(document.querySelector(".top-actions button[data-role='winners-toggle']"), "Победы", "История побед");
	setLabelForLayout(document.querySelector(".bottom-bar button[data-role='winners-toggle']"), "Победы", "Победители");
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

	const hasImage = Boolean(account.avatarImage);
	element.classList.toggle("avatar-has-image", hasImage);

	if (hasImage) {
		element.style.background = "rgba(17, 23, 41, 0.65)";
		element.style.backgroundImage = `url(${account.avatarImage})`;
		element.style.backgroundSize = "cover";
		element.style.backgroundPosition = "center";
		element.style.backgroundRepeat = "no-repeat";
		element.style.color = "transparent";
	} else {
		element.textContent = account.avatar;
		element.style.background = account.background;
		element.style.color = "#0b1020";
	}
}

function renderCurrentAccount() {
	const account = ACCOUNTS[currentAccountIndex];
	const nameEl = document.getElementById("currentName");
	const balanceEl = document.getElementById("currentBalance");
	const avatarEl = document.getElementById("currentAvatar");
	const selector = document.getElementById("accountSelector");

	if (nameEl) nameEl.textContent = account.name;
	if (balanceEl) balanceEl.textContent = `Баланс: ${formatNumber(account.balance)} монет`;
	if (avatarEl) setAvatar(avatarEl, account);
	if (selector) selector.value = String(currentAccountIndex);

	COLUMNS.forEach(config => updateAutoButton(config.id));
	updateChatButton();
}

function switchAccount(index) {
	if (index < 0 || index >= ACCOUNTS.length) return;
	currentAccountIndex = index;
	renderCurrentAccount();
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

	// Special rule: column 4 (Дуэль) can have only 2 unique participants per round
	if (columnId === 4) {
		const participants = state.participants || new Set();
		if (!participants.has(accountIndex)) {
			if (participants.size >= 2) {
				// silently ignore third unique bettor
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
	if (!isFirstBetOfRound) {
		state.bank += config.bet;
		showBetPulse(columnId, config.bet);
	}

	// If a bet is placed during the zero-grace window, cancel the remaining grace
	if (state.zeroGrace && state.zeroGrace > 0) {
		state.zeroGrace = 0;
	}
	state.bettor = accountIndex;
	state.lastBetAmount = config.bet;
	// extend timer by 5 seconds on any successful bet (auto or manual)
	// If we are in zero-grace, cancel the grace and set timer to 5s to allow the fight
	if (state.zeroGrace && state.zeroGrace > 0) {
		state.zeroGrace = 0;
		state.timer = 5;
	} else {
		// add 5 seconds to current timer (or set to 5 if timer was not positive)
		const cur = typeof state.timer === 'number' && state.timer > 0 ? state.timer : 0;
		state.timer = cur + 5;
	}

	updateBankDisplay(columnId);
	updateTimerDisplay(columnId);
	// бонусная полоса отключена — ничего не делаем
	showBetInfo(columnId, account, config.bet);

	if (accountIndex === currentAccountIndex) {
		renderCurrentAccount();
	}

	if (!isAuto) {
		maybeTriggerAuto(columnId, true);
	}

	return true;
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
	winners.unshift({
		accountIndex: winnerIndex,
		columnId,
		amount: winnings,
		timestamp: Date.now()
	});
	if (winners.length > 25) winners.pop();

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

	// ensure any existing overlay is removed
	const existing = colEl.querySelector('.winner-overlay');
	if (existing) existing.remove();

	// render a compact centered winner card
	const overlay = document.createElement('div');
	overlay.className = 'winner-overlay';
		overlay.innerHTML = `
			<div class="winner-title-bar">Победитель!</div>
			<div class="winner-center" role="status" aria-live="polite">
				<div class="winner-amount">+${formatNumber(amount)} монет</div>
			</div>
		`;
	colEl.appendChild(overlay);
	colEl.classList.add('is-winner');

	// trigger coin burst animation towards balance
	try {
		triggerCoinBurstFromOverlayToBalance(overlay, amount);
	} catch (e) {
		console.warn('coin burst failed', e);
	}

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

function resetColumn(columnId) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	if (!state || !config) return;

	state.bank = config.baseBank;
	state.timer = GAME_CONFIG.baseTimer;
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
	// reset zero-grace
	if (typeof state.zeroGrace !== 'undefined') state.zeroGrace = 0;
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
		const emoji = account.avatar || "🎯";
		if (backdrop) {
			const image = account.avatarImage;
			if (image) {
				backdrop.textContent = "";
				backdrop.style.backgroundImage = `url(${image})`;
				backdrop.classList.add("has-image");
				backdrop.dataset.image = image;
				delete backdrop.dataset.emoji;
			} else {
				backdrop.style.backgroundImage = "none";
				backdrop.classList.remove("has-image");
				backdrop.textContent = emoji;
				backdrop.dataset.emoji = emoji;
				delete backdrop.dataset.image;
			}
			backdrop.classList.add("active");
		}
		if (account.avatarImage) {
			colEl.dataset.bgImage = account.avatarImage;
			delete colEl.dataset.bgEmoji;
		} else {
			colEl.dataset.bgEmoji = emoji;
			delete colEl.dataset.bgImage;
		}
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

function showBetPulse(columnId, amount) {
	const pulse = document.getElementById(`pulse-${columnId}`);
	if (!pulse) return;
	pulse.textContent = `+${formatNumber(amount)}`;
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

function renderWinners() {
	const list = document.getElementById("winnersList");
	if (!list) return;

	if (!winners.length) {
		list.innerHTML = '<div class="winner-empty">Побед пока нет</div>';
		return;
	}

	list.innerHTML = winners
		.map(entry => {
			const account = ACCOUNTS[entry.accountIndex];
			const column = getColumnConfig(entry.columnId);
			const name = account ? account.name : "Игрок";
			const columnName = column ? column.label : `#${entry.columnId}`;
			const hasImage = Boolean(account?.avatarImage);
			const avatarBg = account ? account.background : "rgba(255,255,255,0.08)";
			const avatarColor = account ? "#0b1020" : "var(--text)";
			const avatarChar = account ? account.avatar : "🎯";
			const avatarStyles = hasImage
				? `background-image:url('${account.avatarImage}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:rgba(17,23,41,0.6);color:transparent;`
				: `background:${avatarBg};color:${avatarColor};`;
			const avatarClass = hasImage ? "avatar bet-avatar avatar-has-image" : "avatar bet-avatar";
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
window.sendMessage = sendMessage;
window.closeWinnerNotification = closeWinnerNotification;
window.nextAccount = nextAccount;
window.switchAccount = switchAccount;

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
