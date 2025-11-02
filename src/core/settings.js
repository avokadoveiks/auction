const SETTINGS_PATHS = {
  leagues: './settings/leagues.json',
  matchmaking: './settings/matchmaking.json',
  economy: './settings/economy.json'
};

class SettingsLoader {
  constructor() {
    this._cache = null;
  }

  async loadAll() {
    if (this._cache) {
      return this._cache;
    }

    const entries = await Promise.all(
      Object.entries(SETTINGS_PATHS).map(async ([key, path]) => {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load settings: ${path} (${response.status})`);
        }
        const data = await response.json();
        return [key, data];
      })
    );

    this._cache = Object.fromEntries(entries);
    return this._cache;
  }

  get cached() {
    if (!this._cache) {
      throw new Error('Settings not loaded yet. Call loadAll() first.');
    }
    return this._cache;
  }

  invalidate() {
    this._cache = null;
  }
}

export const Settings = new SettingsLoader();
