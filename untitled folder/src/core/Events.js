/**
 * Мини-адаптер событий для системы ботов
 * Простая реализация паттерна Observer для управления событиями игры
 */

const listeners = {};

/**
 * Подписаться на событие
 * @param {string} event - Название события
 * @param {Function} cb - Callback функция
 * @returns {Function} Функция для отписки
 */
export function on(event, cb) {
  (listeners[event] ??= new Set()).add(cb);
  return () => listeners[event].delete(cb);
}

/**
 * Вызвать событие
 * @param {string} event - Название события
 * @param {*} payload - Данные события
 */
export function emit(event, payload) {
  (listeners[event] || []).forEach?.(cb => cb(payload));
}

// Сокращалки под текущий код игры:

/**
 * Событие: ставка размещена
 * Payload: { columnId, playerId, amount, newBank, newTimer }
 */
export const onBidPlaced = cb => on("bidPlaced", cb);

/**
 * Событие: тик таймера
 * Payload: { columnId, timeLeft, state }
 */
export const onTimerTick = cb => on("timerTick", cb);

/**
 * Событие: раунд завершен
 * Payload: { columnId, winnerId, winAmount, participants }
 */
export const onRoundEnd = cb => on("roundEnd", cb);

/**
 * Событие: игрок присоединился
 * Payload: { playerId, name, balance }
 */
export const onPlayerJoined = cb => on("playerJoined", cb);

// Эмиттеры событий
export const emitBidPlaced = (p) => emit("bidPlaced", p);
export const emitTimerTick = (p) => emit("timerTick", p);
export const emitRoundEnd = (p) => emit("roundEnd", p);
export const emitPlayerJoined = (p) => emit("playerJoined", p);
