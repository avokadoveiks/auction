/**
 * Модуль эффектов монет
 * Обёртка над window.flyCoins для использования в модульной системе
 */

/**
 * Воспроизвести эффект победы с монетами
 * @param {Object} params
 * @param {HTMLElement} params.originEl - Элемент-источник (колонка)
 * @param {HTMLElement} params.targetEl - Элемент-цель (баланс/кошелёк)
 * @param {number} params.amount - Сумма выигрыша (для отображения)
 * @param {number} params.count - Количество монет в анимации
 */
export async function playCoinWin({ originEl, targetEl, amount, count = 12 }) {
  console.log('[FX-coins] playCoinWin вызван:', { originEl, targetEl, amount, count });
  
  // Используем старый красивый эффект с золотыми монетами
  if (typeof window.triggerCoinBurstFromOverlayToBalance !== 'function') {
    console.warn('[FX-coins] triggerCoinBurstFromOverlayToBalance не доступен');
    return;
  }

  if (!originEl) {
    console.warn('[FX-coins] Не указан originEl для эффекта монет');
    return;
  }

  console.log('[FX-coins] Запускаем красивый эффект золотых монет...');

  try {
    // Вызываем старый эффект, который делает красивые золотые монеты
    window.triggerCoinBurstFromOverlayToBalance(originEl, amount);
    console.log('[FX-coins] Эффект завершён успешно');
  } catch (error) {
    console.error('[FX-coins] Ошибка при воспроизведении эффекта монет:', error);
  }
}
