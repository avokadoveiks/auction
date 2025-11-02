/*
  BankSystem module for Auction game
  Features:
  - Deposits: short(1d, +5%), medium(7d, +15%), long(30d, +40%), perpetual (+2% per 24h)
  - Credits: 1d(10%), 7d(30%), 30d(70%), overdue blocks betting until repaid
  - Daily reward: once every 24h, +50 coins (configurable)
  - Persistence: Firebase if configured; otherwise localStorage fallback
*/
(function(global){
  const DEFAULTS = {
    dailyRewardAmount: 50,
    deposits: {
      short: { days: 1, rate: 0.05 },
      medium: { days: 7, rate: 0.15 },
      long: { days: 30, rate: 0.40 },
      perpetual: { days: 0, ratePerDay: 0.02 } // compound each 24h
    },
    credits: {
      d1: { days: 1, rate: 0.10 },
      d7: { days: 7, rate: 0.30 },
      d30: { days: 30, rate: 0.70 }
    }
  };

  // Simple persistence adapter: attempts Firebase, falls back to localStorage
  function createStorage(){
    const hasFirebase = typeof global.firebase !== 'undefined' && global.firebase?.apps?.length > 0;
    if (hasFirebase){
      const db = firebase.firestore ? firebase.firestore() : (firebase.getFirestore && firebase.getFirestore());
      const col = (name) => db.collection ? db.collection(name) : null;
      return {
        async read(playerId){
          try{
            const ref = col('bank')?.doc(playerId);
            if (!ref) throw new Error('No Firestore');
            const snap = await ref.get();
            return snap.exists ? snap.data() : null;
          }catch(e){
            console.warn('Firebase read failed, fallback to localStorage', e);
            return JSON.parse(localStorage.getItem(`bank_${playerId}`) || 'null');
          }
        },
        async write(playerId, data){
          try{
            const ref = col('bank')?.doc(playerId);
            if (!ref) throw new Error('No Firestore');
            await ref.set(data, { merge: true });
            // also mirror locally for quick gating/offline
            localStorage.setItem(`bank_${playerId}`, JSON.stringify(data));
          }catch(e){
            console.warn('Firebase write failed, fallback to localStorage', e);
            localStorage.setItem(`bank_${playerId}`, JSON.stringify(data));
          }
        }
      };
    }
    return {
      async read(playerId){
        return JSON.parse(localStorage.getItem(`bank_${playerId}`) || 'null');
      },
      async write(playerId, data){
        localStorage.setItem(`bank_${playerId}`, JSON.stringify(data));
      }
    };
  }

  function now(){ return Date.now(); }
  function addDays(ts, days){ return ts + days*24*60*60*1000; }
  function clamp(num, min, max){ return Math.max(min, Math.min(max, num)); }

  class BankSystem{
    constructor(opts={}){
      this.config = { ...DEFAULTS, ...opts };
      this.storage = createStorage();
    }

    async loadState(player){
      const id = this.playerId(player);
      const base = await this.storage.read(id);
      return base || { deposits: [], credits: [], reward: { lastAt: 0 } };
    }

    async saveState(player, state){
      const id = this.playerId(player);
      await this.storage.write(id, state);
    }

    playerId(player){ return typeof player === 'string' ? player : (player?.id || 'guest'); }

    async syncProfile(player, balance){
      // Persist player's display name and current balance
      try{
        const id = this.playerId(player);
        const name = typeof player==='string'? player : (player?.name||'Игрок');
        if (typeof window.firebase !== 'undefined' && window.firebase?.apps?.length>0){
          const db = firebase.firestore ? firebase.firestore() : (firebase.getFirestore && firebase.getFirestore());
          const ref = db.collection ? db.collection('players').doc(id) : null;
          if (ref){ await ref.set({ name, balance: Number(balance)||0, updatedAt: Date.now() }, { merge: true }); return; }
        }
        // fallback
        localStorage.setItem(`player_${id}`, JSON.stringify({ name, balance: Number(balance)||0, updatedAt: Date.now() }));
      }catch(e){ console.warn('syncProfile failed', e); }
    }

    // Deposits
    calcDepositProfit({ type, amount, startAt }){
      const cfg = this.config.deposits;
      const amt = Number(amount)||0; if (amt<=0) return 0;
      if (type === 'perpetual'){
        const days = Math.floor((now() - (startAt||now())) / (24*60*60*1000));
        // compound daily: amount * ((1+rate)^days - 1)
        const r = cfg.perpetual.ratePerDay;
        return Math.max(0, Math.round(amt * (Math.pow(1+r, clamp(days,0,3650)) - 1)));
      }
      const map = { short: cfg.short, medium: cfg.medium, long: cfg.long };
      const p = map[type]?.rate || 0;
      return Math.max(0, Math.round(amt * p));
    }

    async openDeposit(player, { type, amount }){
      const state = await this.loadState(player);
      const start = now();
      const cfg = this.config.deposits;
      const duration = type==='short'?cfg.short.days: type==='medium'?cfg.medium.days: type==='long'?cfg.long.days: 0;
      state.deposits.push({ id: `dep_${start}`, type, amount: Number(amount)||0, startAt: start, endAt: duration? addDays(start, duration): 0, closed: false });
      await this.saveState(player, state);
      return state;
    }

    async closeDeposit(player, depId){
      const state = await this.loadState(player);
      const dep = state.deposits.find(d=>d.id===depId && !d.closed);
      if (!dep) return state;
      const profit = this.calcDepositProfit(dep);
      dep.closed = true; dep.closedAt = now(); dep.profit = profit;
      await this.saveState(player, state);
      return { state, profit };
    }

    // Credits
    calcCreditDue({ plan, principal, startAt }){
      const cfg = this.config.credits;
      const rate = plan==='d1'?cfg.d1.rate: plan==='d7'?cfg.d7.rate: cfg.d30.rate;
      const days = plan==='d1'?cfg.d1.days: plan==='d7'?cfg.d7.days: cfg.d30.days;
      const dueAt = addDays(startAt, days);
      const interest = Math.round(Number(principal||0) * rate);
      const total = Math.round(Number(principal||0) + interest);
      const overdue = now() > dueAt;
      return { total, interest, dueAt, overdue };
    }

    async takeCredit(player, { plan, amount }){
      const state = await this.loadState(player);
      const start = now();
      state.credits.push({ id:`cr_${start}`, plan, principal: Number(amount)||0, startAt: start, repaid:false });
      await this.saveState(player, state);
      return state;
    }

    async repayCredit(player, creditId, payment){
      const state = await this.loadState(player);
      const cr = state.credits.find(c=>c.id===creditId && !c.repaid);
      if (!cr) return state;
      const { total } = this.calcCreditDue(cr);
      if (Number(payment||0) < total) throw new Error('Недостаточно для погашения');
      cr.repaid = true; cr.repaidAt = now(); cr.paid = total;
      await this.saveState(player, state);
      return state;
    }

    async hasOverdueCredit(player){
      const state = await this.loadState(player);
      return state.credits.some(c=>!c.repaid && this.calcCreditDue(c).overdue);
    }

    // Daily Reward
    async canClaimDaily(player){
      const state = await this.loadState(player);
      const last = state.reward?.lastAt||0;
      return now() - last >= 24*60*60*1000;
    }

    async claimDaily(player){
      const state = await this.loadState(player);
      const ok = await this.canClaimDaily(player);
      if (!ok) throw new Error('Уже получено сегодня');
      state.reward.lastAt = now();
      await this.saveState(player, state);
      return this.config.dailyRewardAmount;
    }
  }

  global.BankSystem = BankSystem;
})(window);
