/**
 * Автоматические эффекты монет при победе
 * Подключается к системе событий и запускает анимации для любого победителя
 */

import { onRoundEnd } from "../core/Events.js";
import { playCoinWin } from "../fx/coins.js";

/**
 * Инициализация автоматических эффектов победы
 */
export function initWinEffects() {
  onRoundEnd(({ columnId, winnerId, isBot, prize }) => {
    console.log('[WinFX] Событие победы:', { columnId, winnerId, isBot, prize });
    
    // Небольшая задержка, чтобы winner-overlay успел отрисоваться
    setTimeout(() => {
      // Определяем элемент-источник - winner-overlay для красивого эффекта
      const originEl = document.querySelector(`.column[data-column="${columnId}"] .winner-overlay`);
      
      if (!originEl) {
        console.warn('[WinFX] Не найден winner-overlay для эффекта');
        return;
      }

      console.log('[WinFX] Источник (overlay):', originEl);
      
      // Вызываем эффект - монеты полетят из overlay в баланс (левый верхний угол)
      playCoinWin({ originEl, targetEl: null, amount: prize, count: 16 });
      console.log(`[WinFX] Золотые монеты запущены для победителя ${winnerId}`);
    }, 150); // Увеличили задержку до 150мс для гарантированной отрисовки overlay
  });

  console.log('[WinFX] Автоматические эффекты победы инициализированы');
}
