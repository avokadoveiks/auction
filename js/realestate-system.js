/*
  RealEstateSystem module for Auction game
  Features:
  - Property ownership: Room (+25/6h), Apartment (+100/12h), House (+350/24h)
  - Unlock requirement: 500 successful deals
  - Income collection with timers
  - Persistence: Firebase if configured; otherwise localStorage fallback
*/
(function(global){
  const DEFAULTS = {
    unlockRequirement: 500, // successful deals needed
    properties: {
      room: { 
        name: 'Комната',
        cost: 1000, 
        income: 25, 
        intervalHours: 6,
        icon: '🛏️'
      },
      apartment: { 
        name: 'Квартира',
        cost: 3000, 
        income: 100, 
        intervalHours: 12,
        icon: '🏠'
      },
      house: { 
        name: 'Дом',
        cost: 8000, 
        income: 350, 
        intervalHours: 24,
        icon: '🏡'
      }
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
            const ref = col('realestate')?.doc(playerId);
            if (!ref) throw new Error('No Firestore');
            const snap = await ref.get();
            return snap.exists ? snap.data() : null;
          }catch(e){
            console.warn('Firebase read failed, fallback to localStorage', e);
            return JSON.parse(localStorage.getItem(`realestate_${playerId}`) || 'null');
          }
        },
        async write(playerId, data){
          try{
            const ref = col('realestate')?.doc(playerId);
            if (!ref) throw new Error('No Firestore');
            await ref.set(data, { merge: true });
            // also mirror locally for quick gating/offline
            localStorage.setItem(`realestate_${playerId}`, JSON.stringify(data));
          }catch(e){
            console.warn('Firebase write failed, fallback to localStorage', e);
            localStorage.setItem(`realestate_${playerId}`, JSON.stringify(data));
          }
        }
      };
    }
    return {
      async read(playerId){
        return JSON.parse(localStorage.getItem(`realestate_${playerId}`) || 'null');
      },
      async write(playerId, data){
        localStorage.setItem(`realestate_${playerId}`, JSON.stringify(data));
      }
    };
  }

  function now(){ return Date.now(); }
  function hoursToMs(h){ return h * 60 * 60 * 1000; }

  class RealEstateSystem{
    constructor(opts={}){
      this.config = { ...DEFAULTS, ...opts };
      this.storage = createStorage();
    }

    async loadState(player){
      const id = this.playerId(player);
      const base = await this.storage.read(id);
      return base || { 
        successfulDeals: 0,
        owned: {}, // { room: 1, apartment: 0, house: 0 }
        lastCollection: {} // { room: timestamp, apartment: timestamp, house: timestamp }
      };
    }

    async saveState(player, state){
      const id = this.playerId(player);
      await this.storage.write(id, state);
    }

    playerId(player){ return typeof player === 'string' ? player : (player?.id || 'guest'); }

    // Check if player has unlocked real estate
    isUnlocked(state){
      return (state.successfulDeals || 0) >= this.config.unlockRequirement;
    }

    // Get list of available properties
    getProperties(){
      return Object.entries(this.config.properties).map(([key, prop]) => ({
        id: key,
        ...prop
      }));
    }

    // Check if player can afford a property
    canAfford(balance, propertyId){
      const prop = this.config.properties[propertyId];
      if (!prop) return false;
      return balance >= prop.cost;
    }

    // Purchase a property
    async buyProperty(player, balance, propertyId){
      const prop = this.config.properties[propertyId];
      if (!prop) throw new Error('Property not found');
      
      if (balance < prop.cost) throw new Error('Insufficient balance');

      const state = await this.loadState(player);
      if (!this.isUnlocked(state)) throw new Error('Real estate not unlocked');

      // Initialize owned if needed
      if (!state.owned) state.owned = {};
      if (!state.lastCollection) state.lastCollection = {};

      // Increment count
      state.owned[propertyId] = (state.owned[propertyId] || 0) + 1;
      
      // Set initial collection time if first purchase
      if (!state.lastCollection[propertyId]) {
        state.lastCollection[propertyId] = now();
      }

      await this.saveState(player, state);
      
      return {
        success: true,
        newBalance: balance - prop.cost,
        count: state.owned[propertyId]
      };
    }

    // Calculate available income for a property type
    calculateIncome(state, propertyId){
      const prop = this.config.properties[propertyId];
      if (!prop) return { available: 0, nextIn: 0 };

      const owned = state.owned?.[propertyId] || 0;
      if (owned === 0) return { available: 0, nextIn: 0 };

      const lastCollect = state.lastCollection?.[propertyId] || 0;
      const elapsed = now() - lastCollect;
      const interval = hoursToMs(prop.intervalHours);
      
      const periodsElapsed = Math.floor(elapsed / interval);
      const available = periodsElapsed * prop.income * owned;
      const nextIn = interval - (elapsed % interval);

      return { 
        available, 
        nextIn,
        periodsElapsed,
        owned
      };
    }

    // Collect income from a property
    async collectIncome(player, balance, propertyId){
      const state = await this.loadState(player);
      const income = this.calculateIncome(state, propertyId);
      
      if (income.available <= 0) {
        return { success: false, amount: 0, message: 'No income available' };
      }

      // Update collection time
      if (!state.lastCollection) state.lastCollection = {};
      state.lastCollection[propertyId] = now();

      await this.saveState(player, state);

      return {
        success: true,
        amount: income.available,
        newBalance: balance + income.available
      };
    }

    // Collect all available income
    async collectAllIncome(player, balance){
      const state = await this.loadState(player);
      let totalIncome = 0;

      for (const propertyId of Object.keys(this.config.properties)) {
        const income = this.calculateIncome(state, propertyId);
        if (income.available > 0) {
          totalIncome += income.available;
          if (!state.lastCollection) state.lastCollection = {};
          state.lastCollection[propertyId] = now();
        }
      }

      if (totalIncome > 0) {
        await this.saveState(player, state);
      }

      return {
        success: totalIncome > 0,
        amount: totalIncome,
        newBalance: balance + totalIncome
      };
    }

    // Record a successful deal (called from game logic)
    async recordDeal(player){
      const state = await this.loadState(player);
      state.successfulDeals = (state.successfulDeals || 0) + 1;
      await this.saveState(player, state);
      return state.successfulDeals;
    }

    // Get summary for UI
    async getSummary(player, balance){
      const state = await this.loadState(player);
      const unlocked = this.isUnlocked(state);
      
      const properties = this.getProperties().map(prop => {
        const owned = state.owned?.[prop.id] || 0;
        const income = this.calculateIncome(state, prop.id);
        return {
          ...prop,
          owned,
          canBuy: this.canAfford(balance, prop.id),
          income: income.available,
          nextIn: income.nextIn
        };
      });

      let totalAvailable = 0;
      properties.forEach(p => totalAvailable += p.income);

      return {
        unlocked,
        dealsCount: state.successfulDeals || 0,
        dealsNeeded: this.config.unlockRequirement,
        properties,
        totalAvailable
      };
    }
  }

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealEstateSystem;
  } else {
    global.RealEstateSystem = RealEstateSystem;
  }
})(typeof window !== 'undefined' ? window : global);
