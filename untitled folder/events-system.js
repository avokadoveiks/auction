/*
  EventsSystem - Система событий и ежедневных наград
*/
(function(global) {
  const DAILY_REWARDS = [
    { day: 1, coins: 10 },
    { day: 2, coins: 15 },
    { day: 3, coins: 20 },
    { day: 4, coins: 25 },
    { day: 5, coins: 30 },
    { day: 6, coins: 35 },
    { day: 7, coins: 50 }
  ];

  class EventsSystem {
    constructor() {
      this.storage = this.createStorage();
    }

    // Создание хранилища (localStorage fallback)
    createStorage() {
      const hasFirebase = typeof global.firebase !== 'undefined' && global.firebase?.apps?.length > 0;
      
      if (hasFirebase) {
        const db = firebase.firestore ? firebase.firestore() : (firebase.getFirestore && firebase.getFirestore());
        return {
          async read(playerId) {
            try {
              const ref = db.collection('events').doc(playerId);
              const snap = await ref.get();
              return snap.exists ? snap.data() : null;
            } catch (e) {
              return JSON.parse(localStorage.getItem(`events_${playerId}`) || 'null');
            }
          },
          async write(playerId, data) {
            try {
              const ref = db.collection('events').doc(playerId);
              await ref.set(data, { merge: true });
            } catch (e) {
              localStorage.setItem(`events_${playerId}`, JSON.stringify(data));
            }
          }
        };
      }

      return {
        async read(playerId) {
          return JSON.parse(localStorage.getItem(`events_${playerId}`) || 'null');
        },
        async write(playerId, data) {
          localStorage.setItem(`events_${playerId}`, JSON.stringify(data));
        }
      };
    }

    playerId(player) {
      return typeof player === 'string' ? player : (player?.id || 'guest');
    }

    // Загрузить состояние
    async loadState(player) {
      const id = this.playerId(player);
      let state = await this.storage.read(id);
      
      if (!state) {
        state = {
          currentDay: 0,
          lastClaimDate: null,
          todayClaimed: false
        };
      }
      
      return state;
    }

    // Сохранить состояние
    async saveState(player, state) {
      const id = this.playerId(player);
      await this.storage.write(id, state);
    }

    // Получить сегодняшнюю дату (YYYY-MM-DD)
    getTodayDate() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // Проверить, можно ли получить награду
    async canClaimReward(player) {
      const state = await this.loadState(player);
      const today = this.getTodayDate();
      
      // Если уже забрал сегодня
      if (state.lastClaimDate === today && state.todayClaimed) {
        return false;
      }
      
      return true;
    }

    // Получить информацию о текущей награде
    async getRewardInfo(player) {
      const state = await this.loadState(player);
      const today = this.getTodayDate();
      const canClaim = await this.canClaimReward(player);
      
      // Проверяем, не пропустил ли игрок день
      let currentDay = state.currentDay;
      if (state.lastClaimDate && state.lastClaimDate !== today) {
        const lastDate = new Date(state.lastClaimDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        // Если пропустил день - сбрасываем
        if (diffDays > 1) {
          currentDay = 0;
        }
      }
      
      // Следующий день награды
      const nextDay = (currentDay % 7) + 1;
      const reward = DAILY_REWARDS.find(r => r.day === nextDay);
      
      // Время до следующей награды
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilNext = tomorrow - now;
      
      return {
        currentDay: currentDay,
        nextDay: nextDay,
        reward: reward,
        canClaim: canClaim,
        todayClaimed: state.lastClaimDate === today && state.todayClaimed,
        timeUntilNext: timeUntilNext,
        allRewards: DAILY_REWARDS
      };
    }

    // Забрать награду
    async claimReward(player, currentBalance) {
      const canClaim = await this.canClaimReward(player);
      if (!canClaim) {
        return { success: false, message: 'Already claimed today' };
      }

      const state = await this.loadState(player);
      const today = this.getTodayDate();
      
      // Проверяем серию
      let currentDay = state.currentDay;
      if (state.lastClaimDate && state.lastClaimDate !== today) {
        const lastDate = new Date(state.lastClaimDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
          currentDay = 0; // Сброс серии
        }
      }
      
      // Следующий день
      const nextDay = (currentDay % 7) + 1;
      const reward = DAILY_REWARDS.find(r => r.day === nextDay);
      
      if (!reward) {
        return { success: false, message: 'Reward not found' };
      }
      
      // Обновляем состояние
      state.currentDay = nextDay;
      state.lastClaimDate = today;
      state.todayClaimed = true;
      
      await this.saveState(player, state);
      
      return {
        success: true,
        coins: reward.coins,
        day: nextDay,
        newBalance: currentBalance + reward.coins
      };
    }

    // Получить все награды для отображения
    getAllRewards() {
      return DAILY_REWARDS;
    }
  }

  // Создаем глобальный экземпляр
  const eventsSystem = new EventsSystem();

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = eventsSystem;
  } else {
    global.EventsSystem = eventsSystem;
  }
})(typeof window !== 'undefined' ? window : global);
