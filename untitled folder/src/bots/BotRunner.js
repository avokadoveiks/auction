/**
 * BotRunner - планировщик и управление ставками ботов
 * Отвечает за:
 * - Планирование ставок с задержками
 * - Управление балансами ботов
 * - Проверку условий для ставок
 * - Анти-токсичность (ограничение перебиваний)
 */

function rnd(min, max) {
  return Math.random() * (max - min) + min;
}

export class BotRunner {
  /**
   * @param {Object} params
   * @param {Function} params.placeBid - Функция размещения ставки (columnId, userId, amount) -> boolean
   * @param {Function} params.getColumns - Функция получения колонок -> [{id, secondsLeft, heat}]
   * @param {Function} params.getNextBidAmount - Функция получения суммы ставки (columnId) -> number
   * @param {Object} params.config - Конфигурация из bots.config.json
   */
  constructor({ placeBid, getColumns, getNextBidAmount, getActivePlayersCount, shouldThrottleWins, config }) {
    this.placeBid = placeBid;
    this.getColumns = getColumns;                         // -> массив { id, secondsLeft, heat? }
    this.getNextBidAmount = getNextBidAmount;             // -> число
    this.cfg = config;
    this.state = new Map(); // botId -> {balance, lastTarget, lastOverbidVictimId, lastBidAt}
    this.getActivePlayersCount = getActivePlayersCount;
    this.shouldThrottleWins = shouldThrottleWins || (() => false);
  }

  /**
   * Инициализация или получение состояния бота
   * @param {Object} bot - Объект бота с id
   * @returns {Object} Состояние бота
   */
  ensureBot(bot) {
    if (!this.state.has(bot.id)) {
      const bal = Math.floor(rnd(this.cfg.economy.minBalance, this.cfg.economy.maxBalance));
      this.state.set(bot.id, { 
        balance: bal, 
        lastTarget: null, 
        lastOverbidVictimId: null, 
        lastBidAt: 0 
      });
    }
    return this.state.get(bot.id);
  }

  /**
   * Запланировать ставку для бота с задержкой
   * @param {Object} bot - Объект бота
   * @param {number} columnId - ID колонки
   * @param {Object} archetype - Архетип поведения
   */
  schedule(bot, columnId, archetype) {
    const delays = this.cfg?.delays || {};
    const dMin = delays.minMs ?? (archetype.baseDelayMsRange?.[0] ?? 2200);
    const dMax = delays.maxMs ?? (archetype.baseDelayMsRange?.[1] ?? 4800);
    const delay = Math.floor(rnd(dMin, dMax));
    setTimeout(() => this.tryBid(bot, columnId, archetype), delay);
  }

  /**
   * Попытка сделать ставку
   * @param {Object} bot - Объект бота
   * @param {number} columnId - ID колонки
   * @param {Object} archetype - Архетип поведения
   */
  tryBid(bot, columnId, archetype) {
    const s = this.ensureBot(bot);
    const now = performance.now();
    
    // Проверка кулдауна после последней ставки
    if (now - s.lastBidAt < this.cfg.cooldowns.afterBidMs) return;

    // Решаем шанс попытки с учётом контекста
    const probs = this.cfg?.probabilities || {};
    const baseChance = probs.baseBidChance ?? archetype.bidChance ?? 0.25;
    const cols = this.getColumns?.() || [];
    const col = cols.find(c => c.id === columnId);
    const humans = typeof this.getActivePlayersCount === 'function' ? this.getActivePlayersCount() : 1;

    let chance = baseChance;

    // Если лидирует человек — ставим редко (20–30%)
    if (col?.humanLeader) {
      chance = probs.humanLeaderBidChance ?? 0.25;
      // Защита человека в последние секунды
      const protectSec = probs.protectHumanLastSeconds ?? 2;
      const protectSkip = probs.protectHumanSkipChance ?? 0.8;
      if ((col.secondsLeft ?? 999) <= protectSec && Math.random() < protectSkip) return;
    } else {
      // Мало активных людей — чуть активнее (до 60%)
      const lowThr = probs.lowPlayersThreshold ?? 3;
      if (humans < lowThr) {
        chance = probs.lowPlayersActiveChance ?? 0.6;
      }
    }

    // Ограничение частоты побед ботов: при превышении — глушим ставки под конец раунда
    const thrNear = this.cfg?.winCap?.throttleNearEndSec ?? 3;
    const thrSkip = this.cfg?.winCap?.throttleSkipChance ?? 0.8;
    if ((col?.secondsLeft ?? 999) <= thrNear && this.shouldThrottleWins()) {
      if (Math.random() < thrSkip) return;
    }

    // Шанс вообще попытаться (случайность поведения)
    if (Math.random() > chance) return;

    const amount = this.getNextBidAmount(columnId);
    
    // Экономия: не тратим последние деньги
    if (s.balance - amount < archetype.minReserve) return;

    // Анти-токсичность: не перебиваем одного и того же > N раз
    if (bot.lastOverbidCount && bot.lastOverbidCount > this.cfg.limits.maxConsecutiveOverbidSamePlayer) return;

    // Попытка разместить ставку
    const ok = this.placeBid({ columnId, userId: bot.id, amount });
    if (ok) {
      s.balance -= amount;
      s.lastBidAt = now;
      s.lastTarget = columnId;
    }
  }

  /**
   * Пополнение баланса всех ботов после окончания раунда
   */
  refillOnRoundEnd() {
    for (const s of this.state.values()) {
      s.balance = Math.min(
        s.balance + this.cfg.economy.refillPerRound, 
        this.cfg.economy.maxBalance
      );
    }
  }
}
