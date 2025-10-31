/*
  EventsUI - Интерфейс панели событий
*/
(function(global) {
  const eventsUI = {
    popupRoot: null,
    timerInterval: null,

    getAccount() {
      return global.ACCOUNTS?.[global.currentAccountIndex] || null;
    },

    async open() {
      const account = this.getAccount();
      if (!account) return alert('Нет данных об аккаунте');

      const popup = this.getPopup();
      if (!popup) return;

      popup.hidden = false;
      await this.render(account);
      
      // Запускаем таймер
      this.startTimer();
    },

    close() {
      const popup = this.getPopup();
      if (popup) popup.hidden = true;
      
      // Останавливаем таймер
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      
      // Убираем подсветку с иконки событий
      this.updateEventsIcon(false);
    },

    getPopup() {
      if (!this.popupRoot) {
        this.popupRoot = document.getElementById('eventsPopup');
      }
      return this.popupRoot;
    },

    async render(account) {
      const loc = global.LocalizationManager;
      const es = global.EventsSystem;
      
      if (!es) {
        console.error('EventsSystem not loaded');
        return;
      }

      const info = await es.getRewardInfo(account);
      const container = document.getElementById('eventsContent');
      
      if (!container) return;

      // Генерируем HTML
      const allRewards = info.allRewards.map((r, idx) => {
        const isCurrent = r.day === info.nextDay && info.canClaim;
        const isPast = r.day < info.nextDay || (info.currentDay === 7 && r.day <= 7);
        const isClaimed = r.day === info.currentDay && info.todayClaimed;
        
        return `
          <div class="reward-day ${isCurrent ? 'reward-day--current' : ''} ${isClaimed ? 'reward-day--claimed' : ''}" data-day="${r.day}">
            <div class="reward-day__header">
              <span class="reward-day__label">${loc.get('events_day', r.day)}</span>
              ${isClaimed ? '<span class="reward-day__check">✓</span>' : ''}
            </div>
            <div class="reward-day__coins">
              <span class="reward-day__icon">💰</span>
              <span class="reward-day__amount">${r.coins}</span>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <div class="events-header">
          <h3 class="events-header__title" data-localize="events_daily_reward">${loc.get('events_daily_reward')}</h3>
          <div class="events-header__streak" data-localize="events_streak" data-localize-params='[${info.currentDay}]'>
            ${loc.get('events_streak', info.currentDay)}
          </div>
        </div>

        <div class="rewards-grid">
          ${allRewards}
        </div>

        <div class="events-actions">
          ${info.canClaim ? `
            <button class="btn btn-claim-reward" id="claimRewardBtn">
              <span class="btn-claim-reward__glow"></span>
              <span class="btn-claim-reward__text" data-localize="events_claim_reward">${loc.get('events_claim_reward')}</span>
              <span class="btn-claim-reward__coins">+${info.reward.coins} 💰</span>
            </button>
          ` : `
            <button class="btn btn-claimed" disabled>
              <span data-localize="events_claimed">${loc.get('events_claimed')}</span>
            </button>
          `}
          
          <div class="events-timer">
            <span class="events-timer__label" data-localize="events_next_reward">${loc.get('events_next_reward')}</span>
            <span class="events-timer__value" id="eventsTimerValue">--:--:--</span>
          </div>
        </div>
      `;

      // Обработчик кнопки получения награды
      const claimBtn = document.getElementById('claimRewardBtn');
      if (claimBtn) {
        claimBtn.addEventListener('click', () => this.claimReward(account));
      }

      // Обновляем таймер
      this.updateTimer(info.timeUntilNext);
      
      // Обновляем иконку событий
      this.updateEventsIcon(info.canClaim);
    },

    async claimReward(account) {
      const es = global.EventsSystem;
      const loc = global.LocalizationManager;
      
      const result = await es.claimReward(account, account.balance);
      
      if (!result.success) {
        return alert(result.message);
      }

      // Обновляем баланс
      account.balance = result.newBalance;
      localStorage.setItem(`balance_${account.id}`, String(result.newBalance));
      
      if (global.renderCurrentAccount) {
        global.renderCurrentAccount();
      }

      // Анимация монеток
      this.playCoinAnimation(result.coins);

      // Перерисовываем UI
      await this.render(account);
    },

    playCoinAnimation(amount) {
      // Простая анимация - показываем уведомление
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.5);
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #000;
        padding: 20px 30px;
        border-radius: 16px;
        font-size: 24px;
        font-weight: 800;
        z-index: 100000;
        box-shadow: 0 8px 32px rgba(251, 191, 36, 0.6);
        animation: coinPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      `;
      notification.textContent = `+${amount} 💰`;
      
      // Добавляем анимацию
      if (!document.getElementById('coinAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'coinAnimStyle';
        style.textContent = `
          @keyframes coinPop {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'coinPop 0.3s reverse';
        setTimeout(() => notification.remove(), 300);
      }, 1500);
    },

    updateTimer(ms) {
      const timerEl = document.getElementById('eventsTimerValue');
      if (!timerEl) return;

      const updateTime = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const diff = tomorrow - now;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      };

      updateTime();
    },

    startTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }

      this.timerInterval = setInterval(() => {
        this.updateTimer();
      }, 1000);
    },

    // Обновление иконки событий (подсветка если награда доступна)
    updateEventsIcon(hasReward) {
      const icon = document.getElementById('eventsBtn');
      if (!icon) return;

      if (hasReward) {
        icon.classList.add('has-notification');
      } else {
        icon.classList.remove('has-notification');
      }
    },

    // Проверка при загрузке страницы
    async checkRewardAvailable() {
      const account = this.getAccount();
      if (!account || !global.EventsSystem) return;

      const info = await global.EventsSystem.getRewardInfo(account);
      this.updateEventsIcon(info.canClaim);
    }
  };

  // Export
  global.openEvents = () => eventsUI.open();
  global.EventsUI = eventsUI;

})(typeof window !== 'undefined' ? window : global);
