import { Settings } from '../core/settings.js';
import { initLeagues, getLeagueOrder, getLeagueByBalance, getLeagueThreshold } from '../core/leagues.js';
import { initMatchmaking, joinRoom } from '../core/matchmaking.js';

const LEAGUE_LABELS = {
  Bronze: 'Бронза',
  Silver: 'Серебро',
  Gold: 'Золото',
  Diamond: 'Бриллиант'
};

const LEAGUE_CLASSES = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
  Diamond: 'diamond'
};

const STORAGE_KEY = 'menuSelectedLeague';

const numberFormatter = new Intl.NumberFormat('ru-RU');

let bootstrapPromise = null;
let selectedLeague = null;
let isMatchmakingReady = false;

function resolveLabel(league) {
  return LEAGUE_LABELS[league] || league;
}

function formatCoins(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return numberFormatter.format(Math.max(0, Math.round(safeValue)));
}

function getPlayer() {
  const accounts = Array.isArray(window.ACCOUNTS) ? window.ACCOUNTS : null;
  if (!accounts || !accounts.length) {
    return null;
  }
  const idx = Number(window.currentAccountIndex ?? 0);
  if (Number.isNaN(idx) || idx < 0 || idx >= accounts.length) {
    return accounts[0];
  }
  return accounts[idx];
}

function loadStoredLeague() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value || null;
  } catch (error) {
    return null;
  }
}

function persistStoredLeague(balance) {
  try {
    if (selectedLeague) {
      const threshold = getLeagueThreshold(selectedLeague);
      if (balance >= threshold) {
        localStorage.setItem(STORAGE_KEY, selectedLeague);
        return;
      }
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {}
}

function ensureSelectedLeague(balance) {
  const order = getLeagueOrder();
  if (!order.length) {
    selectedLeague = null;
    return null;
  }

  const playerLeague = getLeagueByBalance(balance) || order[0];

  if (!selectedLeague || !order.includes(selectedLeague)) {
    selectedLeague = playerLeague;
  }

  const threshold = getLeagueThreshold(selectedLeague);
  if (balance < threshold) {
    selectedLeague = playerLeague;
  }

  persistStoredLeague(balance);
  return playerLeague;
}

function renderSummary(player, playerLeague) {
  const balance = player?.balance ?? 0;
  const currentEl = document.getElementById('leagueCurrentValue');
  const hintEl = document.getElementById('leagueNextHint');

  if (currentEl) {
    if (!playerLeague && !selectedLeague) {
      currentEl.textContent = '—';
    } else if (selectedLeague && playerLeague && selectedLeague !== playerLeague) {
      currentEl.textContent = `${resolveLabel(playerLeague)} → ${resolveLabel(selectedLeague)}`;
    } else {
      const leagueToShow = selectedLeague || playerLeague;
      currentEl.textContent = leagueToShow ? resolveLabel(leagueToShow) : '—';
    }
  }

  if (hintEl) {
    if (!selectedLeague) {
      hintEl.textContent = 'Выберите лигу, чтобы начать матч.';
      return;
    }
    const threshold = getLeagueThreshold(selectedLeague);
    if (balance >= threshold) {
      hintEl.textContent = `Лига ${resolveLabel(selectedLeague)} готова. Нажмите «Играть».`;
    } else {
      const diff = Math.max(0, threshold - balance);
      hintEl.textContent = `До ${resolveLabel(selectedLeague)} осталось накопить ${formatCoins(diff)} монет.`;
    }
  }
}

function renderChoices(playerLeague, balance) {
  const container = document.getElementById('leagueChoices');
  if (container) {
    const order = getLeagueOrder();
    container.innerHTML = '';

    order.forEach(league => {
      const threshold = getLeagueThreshold(league);
      const accessible = balance >= threshold;
      const colorClass = LEAGUE_CLASSES[league] || '';
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.league = league;
      button.className = ['league-choice', colorClass].filter(Boolean).join(' ');
      button.innerHTML = `<span>${resolveLabel(league)}</span><span>от ${formatCoins(threshold)} монет</span>`;
      if (league === selectedLeague) {
        button.classList.add('is-selected');
      }

      if (!accessible && league !== playerLeague) {
        button.classList.add('is-locked');
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = `Нужно ${formatCoins(threshold)} монет`;
      } else {
        button.addEventListener('click', () => {
          if (selectedLeague === league) return;
          selectedLeague = league;
          persistStoredLeague(balance);
          renderSummary(getPlayer(), playerLeague);
          renderChoices(playerLeague, balance);
        });
      }

      container.appendChild(button);
    });
  }

  notifyLeagueState(balance, playerLeague);
}

function notifyLeagueState(balance, playerLeague) {
  const threshold = selectedLeague ? getLeagueThreshold(selectedLeague) : null;
  const accessible = Boolean(selectedLeague && threshold != null && balance >= threshold);
  let reason = null;

  if (!selectedLeague) {
    reason = 'Выберите лигу, чтобы начать матч.';
  } else if (!accessible) {
    const diff = threshold == null ? 0 : Math.max(0, threshold - balance);
    reason = diff > 0 ? `Нужно ещё ${formatCoins(diff)} монет.` : 'Лига ещё недоступна.';
  }

  try {
    window.dispatchEvent(new CustomEvent('league-state', {
      detail: {
        league: selectedLeague,
        label: selectedLeague ? resolveLabel(selectedLeague) : null,
        accessible,
        reason,
        threshold,
        balance,
        playerLeague
      }
    }));
  } catch (error) {}
}

function handlePlayerChange() {
  const player = getPlayer();
  const balance = player?.balance ?? 0;
  const playerLeague = ensureSelectedLeague(balance);
  renderSummary(player, playerLeague);
  renderChoices(playerLeague, balance);
}

async function prepareSelectedLeagueRoom() {
  await initLeaguesPanel();
  if (!isMatchmakingReady) {
    throw new Error('Матчмейкинг ещё не готов');
  }
  const player = getPlayer();
  if (!player) {
    throw new Error('Не удалось определить игрока');
  }
  if (!selectedLeague) {
    throw new Error('Сначала выберите лигу');
  }

  const threshold = getLeagueThreshold(selectedLeague);
  const balance = player.balance ?? 0;
  if (balance < threshold) {
    throw new Error(`Для входа в лигу ${resolveLabel(selectedLeague)} нужно ${formatCoins(threshold)} монет.`);
  }

  const room = joinRoom(selectedLeague, player);
  const roomKey = `${room.league}:${room.id}`;

  try {
    sessionStorage.setItem('pendingRoomKey', roomKey);
  } catch (error) {
    console.warn('[LeaguesPanel] Не удалось сохранить выбранную комнату', error);
  }

  try {
    window.dispatchEvent(new CustomEvent('room-selected', {
      detail: { roomKey, league: room.league, roomLabel: room.label }
    }));
  } catch (error) {}

  return { roomKey, league: room.league, label: room.label };
}

async function bootstrap() {
  try {
    await Settings.loadAll();
    initLeagues();
    initMatchmaking();
    isMatchmakingReady = true;

    selectedLeague = loadStoredLeague();
    handlePlayerChange();
    window.addEventListener('player-changed', handlePlayerChange);
  } catch (error) {
    console.error('[LeaguesPanel] Инициализация не удалась', error);
    const hintEl = document.getElementById('leagueNextHint');
    if (hintEl) {
      hintEl.textContent = 'Не удалось загрузить данные лиг.';
    }
    notifyLeagueState(0, null);
    throw error;
  }
}

export function initLeaguesPanel() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }
  return bootstrapPromise;
}

const leaguesApi = {
  getSelectedLeague: () => selectedLeague,
  getSelectedLeagueLabel: () => (selectedLeague ? resolveLabel(selectedLeague) : null),
  preparePlay: prepareSelectedLeagueRoom,
  ensureReady: () => initLeaguesPanel()
};

window.menuLeagues = Object.assign({}, window.menuLeagues, leaguesApi);
