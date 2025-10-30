/**
 * BotDirector - дирижёр интенсивности активности ботов
 * Управляет:
 * - Созданием ботов
 * - Распределением активности по времени
 * - Адаптацией к количеству живых игроков
 * - Достижением целевого RPM (ставок в минуту)
 */

import { makeTurtle } from "./BotArchetypes.js";
import { BotRunner } from "./BotRunner.js";

export class BotDirector {
  /**
   * @param {Object} params
   * @param {Function} params.placeBid - Функция размещения ставки
   * @param {Function} params.getColumns - Функция получения колонок
   * @param {Function} params.getNextBidAmount - Функция получения суммы ставки
   * @param {Function} params.getActivePlayersCount - Функция получения количества активных игроков
   * @param {Object} params.config - Конфигурация из bots.config.json
   */
  constructor({ placeBid, getColumns, getNextBidAmount, getActivePlayersCount, shouldThrottleWins, config }) {
    this.cfg = config;
    this.archetype = makeTurtle();
    this.bots = []; // [{id, name}]
    this.getActivePlayersCount = getActivePlayersCount;
    this.shouldThrottleWins = typeof shouldThrottleWins === 'function' ? shouldThrottleWins : () => false;
    this.runner = new BotRunner({ 
      placeBid, 
      getColumns, 
      getNextBidAmount, 
      getActivePlayersCount: this.getActivePlayersCount,
      shouldThrottleWins: this.shouldThrottleWins,
      config 
    });
    this.timer = null;
  }

  /**
   * Создать n ботов
   * @param {number} n - Количество ботов для создания
   */
  spawnBots(n = 3) {
    for (let i = 0; i < n; i++) {
      this.bots.push({ 
        id: `bot_turtle_${i + 1}`, 
        name: `Turtle #${i + 1}` 
      });
    }
  }

  /**
   * Запустить активность ботов
   */
  start() {
    if (!this.cfg.enabled) return;
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 1000);
  }

  /**
   * Остановить активность ботов
   */
  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Тик - каждую секунду проверяем, нужно ли запланировать ставки
   */
  tick() {
    const humans = this.getActivePlayersCount();
    const cols = this.runner.getColumns();
    if (!cols?.length) return;

    // Простейший таргет RPM по комнате, снижаем от людей
    // Чем больше людей, тем меньше активность ботов
    const roomTargetRPM = Math.max(4, this.cfg.targetRPM - humans * 2);
    const perSecTarget = roomTargetRPM / 60;

    // Планируем нестрого: в среднем perSecTarget действий/сек на все колонки
    // Вероятностный подход для естественного распределения
    const attempts = Math.random() < perSecTarget ? 1 : 0;

    for (let i = 0; i < attempts; i++) {
      // Случайная колонка
      const col = cols[Math.floor(Math.random() * cols.length)];
      // Случайный бот
      const bot = this.bots[Math.floor(Math.random() * this.bots.length)];
      
      if (!bot || !col) continue;
      
      // Планируем ставку с задержкой согласно архетипу
      this.runner.schedule(bot, col.id, this.archetype);
    }
  }

  /**
   * Обработчик окончания раунда
   * Пополняет балансы всех ботов
   */
  onRoundEnd() {
    this.runner.refillOnRoundEnd();
  }
}
