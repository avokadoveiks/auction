const GAME_CONFIG = {
	baseTimer: 20
};

const COLUMNS = [
	{ id: 1, label: "Шанс", bet: 2, baseBank: 3, autoAllowed: false, autoThreshold: 5, bonusThreshold: 18 },
	{ id: 2, label: "Любитель", bet: 4, baseBank: 6, autoAllowed: true, autoThreshold: 6, bonusThreshold: 24 },
	{ id: 3, label: "Профессионал", bet: 6, baseBank: 9, autoAllowed: true, autoThreshold: 6, bonusThreshold: 36 },
	{ id: 4, label: "Дуэль", bet: 8, baseBank: 12, autoAllowed: true, autoThreshold: 7, bonusThreshold: 40 },
	{ id: 5, label: "Мастер", bet: 10, baseBank: 15, autoAllowed: true, autoThreshold: 8, bonusThreshold: 45 }
];

const ACCOUNTS = [
	{ id: "alpha", name: "Александр", avatar: "🦊", background: "linear-gradient(135deg,#f97316,#fb923c)", balance: 540 },
	{ id: "bravo", name: "Марина", avatar: "🐱", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", balance: 620 },
	{ id: "charlie", name: "Илья", avatar: "🐻", background: "linear-gradient(135deg,#facc15,#f97316)", balance: 480 },
	{ id: "delta", name: "Олег", avatar: "🐼", background: "linear-gradient(135deg,#10b981,#34d399)", balance: 560 }
];

const columnState = {};
const hintTimers = {};
let winners = [];
let currentAccountIndex = 0;
let winnerTimeout = null;
let compactLayout = false;

function initGame() {
	populateAccountSelector();
	renderCurrentAccount();

	COLUMNS.forEach(config => {
		columnState[config.id] = {
			bank: config.baseBank,
			timer: GAME_CONFIG.baseTimer,
			interval: null,
			bettor: null,
			lastBetAmount: 0,
			auto: { active: false, accountIndex: null, lastTrigger: 0 }
		};

		updateBankDisplay(config.id);
		updateTimerDisplay(config.id);
		updateBonus(config.id);
		hideBetInfo(config.id);
		updateAutoButton(config.id);
		startColumnTimer(config.id);
	});

	evaluateLayoutMode();

	renderWinners();
	appendChatMessage("Система", "Добро пожаловать в аукцион! Делайте ставки и ловите удачу.", "system");

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
	if (!element || !account) return;
	element.textContent = account.avatar;
	element.style.background = account.background;
	element.style.color = "#0b1020";
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

	state.timer -= 1;
	if (state.timer <= 0) {
		resolveColumn(columnId);
		return;
	}

	updateTimerDisplay(columnId);
	maybeTriggerAuto(columnId);
}

function maybeTriggerAuto(columnId) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	if (!state || !config) return;

	const auto = state.auto;
	if (!auto.active) return;

	const account = ACCOUNTS[auto.accountIndex];
	if (!account || account.balance < config.bet) {
		disableAuto(columnId, "Недостаточно средств для автоставки");
		return;
	}

	if (state.bettor === auto.accountIndex) return;
	if (state.timer > config.autoThreshold) return;
	const now = Date.now();
	if (now - auto.lastTrigger < 1200) return;

	auto.lastTrigger = now;
	makeBet(columnId, auto.accountIndex, true);
}

function makeBet(columnId, accountIndex = currentAccountIndex, isAuto = false) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	const account = ACCOUNTS[accountIndex];
	if (!state || !config || !account) return false;

	if (account.balance < config.bet) {
		if (isAuto) {
			disableAuto(columnId, "Автоставка остановлена: нехватка средств");
		} else if (accountIndex === currentAccountIndex) {
			flashBalance();
			appendChatMessage("Система", "Недостаточно монет для ставки.", "system");
		}
		return false;
	}

	account.balance -= config.bet;
	state.bank += config.bet;
	state.bettor = accountIndex;
	state.lastBetAmount = config.bet;
	state.timer = GAME_CONFIG.baseTimer;

	updateBankDisplay(columnId);
	updateTimerDisplay(columnId);
	updateBonus(columnId);
	showBetInfo(columnId, account, config.bet);

	if (accountIndex === currentAccountIndex) {
		renderCurrentAccount();
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
	showWinnerNotification(account, config, winnings);
	appendChatMessage("Система", `${account.name} выигрывает ${formatNumber(winnings)} монет в колонке "${config.label}"`, "system");

	if (winnerIndex === currentAccountIndex) {
		renderCurrentAccount();
	}

	resetColumn(columnId);
}

function resetColumn(columnId) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	if (!state || !config) return;

	state.bank = config.baseBank;
	state.timer = GAME_CONFIG.baseTimer;
	state.bettor = null;
	state.lastBetAmount = 0;

	// Clear column background avatar state
	const colEl = document.querySelector(`.column[data-column="${columnId}"]`);
	if (colEl) {
		colEl.classList.remove("has-bet");
		// Remove the data attribute used by CSS ::before
		delete colEl.dataset.bgEmoji;
		colEl.removeAttribute("data-bg-emoji");
	}

	updateBankDisplay(columnId);
	updateTimerDisplay(columnId);
	updateBonus(columnId);
	hideBetInfo(columnId);
}

function updateBankDisplay(columnId) {
	const state = columnState[columnId];
	const element = document.getElementById(`bank-${columnId}`);
	if (state && element) {
		element.textContent = `Банк: ${formatNumber(state.bank)}`;
	}
}

function updateTimerDisplay(columnId) {
	const state = columnState[columnId];
	const element = document.getElementById(`timer-${columnId}`);
	if (state && element) {
		const minutes = Math.floor(state.timer / 60);
		const seconds = state.timer % 60;
		element.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
	}
}

function updateBonus(columnId) {
	const state = columnState[columnId];
	const config = getColumnConfig(columnId);
	const element = document.getElementById(`bonus-${columnId}`);
	if (!element || !state || !config) return;

	if (state.bank >= config.bonusThreshold) {
		element.classList.remove("hidden");
	} else {
		element.classList.add("hidden");
	}
}

function showBetInfo(columnId, account, amount) {
	const info = document.getElementById(`bet-info-${columnId}`);
	const avatar = document.getElementById(`bet-avatar-${columnId}`);
	const name = document.getElementById(`bet-name-${columnId}`);
	const extra = document.getElementById(`bet-amount-${columnId}`);

	if (!info || !avatar || !name || !extra) return;

	// Reflect bettor avatar as a faint background on entire column except buttons
	const colEl = document.querySelector(`.column[data-column="${columnId}"]`);
	if (colEl && account) {
		colEl.dataset.bgEmoji = account.avatar || "🎯";
		colEl.classList.add("has-bet");
	}

	setAvatar(avatar, account);
	name.textContent = account.name;
	extra.textContent = `Ставка: ${formatNumber(amount)} монет`;
	info.classList.remove("hidden");
}

function hideBetInfo(columnId) {
	const info = document.getElementById(`bet-info-${columnId}`);
	if (info) info.classList.add("hidden");
}

function toggleAuto(columnId) {
	const config = getColumnConfig(columnId);
	const state = columnState[columnId];
	if (!config || !state) return;

	if (!config.autoAllowed) {
		showHint("hint-auto-disabled");
		return;
	}

	if (state.auto.active && state.auto.accountIndex === currentAccountIndex) {
		const accountName = ACCOUNTS[currentAccountIndex]?.name ?? "Игрок";
		state.auto.active = false;
		state.auto.accountIndex = null;
		state.auto.lastTrigger = 0;
		updateAutoButton(columnId);
		appendChatMessage("Система", `${accountName} отключает автоставку в колонке "${config.label}"`, "system");
		return;
	}

	const account = ACCOUNTS[currentAccountIndex];
	if (!account || account.balance < config.bet) {
		flashBalance();
		appendChatMessage("Система", `Недостаточно монет для включения автоставки в колонке "${config.label}"`, "system");
		return;
	}

	state.auto.active = true;
	state.auto.accountIndex = currentAccountIndex;
	state.auto.lastTrigger = 0;
	updateAutoButton(columnId);
	appendChatMessage("Система", `${account.name} включает автоставку в колонке "${config.label}"`, "system");
}

function disableAuto(columnId, message) {
	const state = columnState[columnId];
	if (!state || !state.auto.active) return;

	state.auto.active = false;
	const config = getColumnConfig(columnId);
	const accountIndex = state.auto.accountIndex;
	state.auto.accountIndex = null;
	state.auto.lastTrigger = 0;
	updateAutoButton(columnId);

	if (message && accountIndex === currentAccountIndex && config) {
		appendChatMessage("Система", `${message} в колонке "${config.label}"`, "system");
	}
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

	if (!state.auto.active) {
		button.textContent = compactLayout ? "Авто выкл" : "Автоставка (выкл)";
		button.classList.remove("active");
	} else {
		const account = ACCOUNTS[state.auto.accountIndex];
		const baseName = account ? account.name.split(" ")[0] : "—";
		const compactName = compactLayout ? baseName.slice(0, 3) : baseName;
		button.textContent = compactLayout ? `Авто ${compactName}` : `Авто (${baseName})`;
		button.classList.add("active");
	}
}

function toggleChat() {
	const panel = document.getElementById("chatPanel");
	if (panel) panel.classList.toggle("open");
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
			const avatarBg = account ? account.background : "rgba(255,255,255,0.08)";
			const avatarColor = account ? "#0b1020" : "var(--text)";
			const avatarChar = account ? account.avatar : "🎯";
			return `
				<div class="winner-row">
					<div class="avatar bet-avatar" style="background:${avatarBg};color:${avatarColor};">${avatarChar}</div>
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

document.addEventListener("DOMContentLoaded", initGame);
