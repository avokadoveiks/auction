/**
 * Интеграция системы ботов в игру
 * Подключает BotDirector к основной логике игры
 */

import { BotDirector } from './bots/BotDirector.js';
import { emitRoundEnd, onRoundEnd } from './core/Events.js';

// Загрузка конфигурации
let botConfig = null;
let botDirector = null;
let recentWins = []; // store last N results: true if bot won
const WIN_WINDOW = 12;

// Экспортируем emitRoundEnd для использования в v1.js
export { emitRoundEnd };

/**
 * Инициализация системы ботов
 */
export async function initBotSystem() {
  try {
    // Загружаем конфигурацию
    const response = await fetch('./src/config/bots.config.json');
    botConfig = await response.json();
    
    if (!botConfig.enabled) {
      console.log('[Bots] Система ботов отключена в конфиге');
      return null;
    }

    // Создаём директора с привязкой к игровым функциям
    botDirector = new BotDirector({
      placeBid: botPlaceBid,
      getColumns: botGetColumns,
      getNextBidAmount: botGetNextBidAmount,
      getActivePlayersCount: botGetActivePlayersCount,
      shouldThrottleWins,
      config: botConfig
    });

  // Создаём 3 бота-черепахи
    botDirector.spawnBots(3);
    
    // Подписка на окончание раунда для статистики побед
    onRoundEnd((p) => {
      const isBot = !!p?.isBot;
      recentWins.push(isBot);
      if (recentWins.length > WIN_WINDOW) recentWins.shift();
    });

    // Запускаем активность
    botDirector.start();
    
    console.log('[Bots] Система ботов запущена: 3 Turtle ботов, target RPM:', botConfig.targetRPM);
    return botDirector;
    
  } catch (error) {
    console.error('[Bots] Ошибка инициализации системы ботов:', error);
    return null;
  }
}

/**
 * Обработчик окончания раунда
 * Вызывать из resetColumn() или аналогичной функции
 */
export function onBotRoundEnd(columnId) {
  if (botDirector) {
    botDirector.onRoundEnd();
  }
}

/**
 * Остановка системы ботов
 */
export function stopBots() {
  if (botDirector) {
    botDirector.stop();
    console.log('[Bots] Система ботов остановлена');
  }
}

// === Адаптеры для подключения к основной игре ===

/**
 * Размещение ставки ботом
 * Должна вызывать существующую функцию makeBet из v1.js
 */
function botPlaceBid({ columnId, userId, amount }) {
  // Ищем подходящий бот-аккаунт из ACCOUNTS
  if (typeof window.makeBet !== 'function' || !Array.isArray(window.ACCOUNTS)) return false;
  const ACCS = window.ACCOUNTS;
  const st = window.columnState?.[columnId];
  const currentLeader = typeof st?.bettor === 'number' ? ACCS[st.bettor] : null;
  // Кандидаты: только боты с достаточно средств, не текущий лидер
  const candidates = ACCS
    .map((acc, idx) => ({ acc, idx }))
    .filter(x => x.acc?.isBot && x.acc.balance >= (amount ?? botGetNextBidAmount(columnId)) && st?.bettor !== x.idx);

  if (!candidates.length) return false;

  // Выбор случайного бота
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  try {
    return !!window.makeBet(columnId, pick.idx, false);
  } catch (error) {
    console.error('[Bots] Ошибка при размещении ставки от имени бота:', error);
    return false;
  }
}

/**
 * Получение информации о колонках
 * Возвращает массив {id, secondsLeft, heat}
 */
function botGetColumns() {
  // Используем глобальный columnState из v1.js
  if (typeof window.columnState === 'undefined') {
    return [];
  }
  
  const columns = [];
  for (const [id, state] of Object.entries(window.columnState)) {
    // Пропускаем колонки, где идёт таймер победителя
    if (state.winnerTimer && state.winnerTimer > 0) {
      continue;
    }
    
    const bettorIdx = typeof state.bettor === 'number' ? state.bettor : null;
    const bettor = (bettorIdx != null) ? window.ACCOUNTS?.[bettorIdx] : null;
    const humanLeader = !!(bettor && !bettor.isBot);
    columns.push({
      id: parseInt(id),
      secondsLeft: state.timer || 0,
      heat: state.betCount || 0,
      humanLeader
    });
  }
  
  return columns;
}

/**
 * Получение суммы следующей ставки для колонки
 */
function botGetNextBidAmount(columnId) {
  // Используем COLUMNS из v1.js
  if (typeof window.COLUMNS === 'undefined') {
    return 2; // fallback
  }
  
  const column = window.COLUMNS.find(c => c.id === columnId);
  return column ? column.bet : 2;
}

/**
 * Получение количества активных игроков (не ботов)
 */
function botGetActivePlayersCount() {
  // Используем ACCOUNTS из v1.js
  if (typeof window.ACCOUNTS === 'undefined') {
    return 1; // fallback
  }
  
  // Считаем только не-ботов
  return window.ACCOUNTS.filter(acc => !acc.isBot).length;
}

// Экспорт вспомогательной проверки для ограничения побед ботов
function shouldThrottleWins() {
  const cap = botConfig?.winCap;
  if (!cap) return false;
  const windowSize = cap.windowSize ?? WIN_WINDOW;
  const maxBotWins = cap.maxBotWinsPerWindow ?? Math.ceil(windowSize / 6);
  // Подсчёт в последних windowSize записях
  const recent = recentWins.slice(-windowSize);
  const botWins = recent.filter(Boolean).length;
  return botWins >= maxBotWins;
}

// Экспортируем для использования в консоли
window.botSystem = {
  init: initBotSystem,
  stop: stopBots,
  onRoundEnd: onBotRoundEnd
};
