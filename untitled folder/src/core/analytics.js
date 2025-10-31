class Analytics {
  constructor() {
    this._enabled = true;
  }

  track(eventName, payload = {}) {
    if (!this._enabled) return;
    const detail = { event: eventName, payload, timestamp: Date.now() };
    console.log(`[analytics] ${eventName}`, detail);
    window.dispatchEvent(new CustomEvent('analytics', { detail }));
  }

  setEnabled(flag) {
    this._enabled = Boolean(flag);
  }
}

export const analytics = new Analytics();
