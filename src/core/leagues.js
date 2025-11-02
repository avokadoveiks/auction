import { Settings } from './settings.js';

let leagueOrder = ['Bronze', 'Silver', 'Gold', 'Diamond'];
let thresholds = {};
let columns = [];

const leagueRankMap = new Map();

function ensureLoaded() {
  const { leagues } = Settings.cached;
  thresholds = leagues.thresholds;
  columns = leagues.columns;
  leagueOrder = leagues.leagueOrder || Object.keys(thresholds);

  leagueRankMap.clear();
  leagueOrder.forEach((name, idx) => leagueRankMap.set(name, idx));
}

export function initLeagues() {
  ensureLoaded();
}

export function getLeagueOrder() {
  return [...leagueOrder];
}

export function getColumns() {
  return [...columns];
}

export function getLeagueByBalance(balance) {
  ensureLoaded();
  let current = leagueOrder[0];
  for (const league of leagueOrder) {
    const threshold = thresholds[league] ?? 0;
    if (balance >= threshold) {
      current = league;
    } else {
      break;
    }
  }
  return current;
}

export function isLowerLeagueVisit(playerLeague, targetLeague) {
  ensureLoaded();
  const playerRank = leagueRankMap.get(playerLeague);
  const targetRank = leagueRankMap.get(targetLeague);
  if (playerRank === undefined || targetRank === undefined) return false;
  return targetRank < playerRank;
}

export function isHigherLeagueVisit(playerLeague, targetLeague) {
  ensureLoaded();
  const playerRank = leagueRankMap.get(playerLeague);
  const targetRank = leagueRankMap.get(targetLeague);
  if (playerRank === undefined || targetRank === undefined) return false;
  return targetRank > playerRank;
}

export function getAccessibleColumns(playerLeague, targetLeague, { balance } = {}) {
  ensureLoaded();
  const cols = getColumns();
  const list = [];
  const lockLowerReason = 'Вы выше по уровню — в этой лиге доступна только колонка «Мастер».\u00A0';
  const lockHigherReason = 'Недостаточно средств для ставок в этой лиге.';

  const isLower = isLowerLeagueVisit(playerLeague, targetLeague);
  const insufficient = (() => {
    const threshold = thresholds[targetLeague] ?? 0;
    const currentBalance = balance ?? 0;
    return currentBalance < threshold;
  })();

  cols.forEach((colName, idx) => {
    let locked = false;
    let reason = '';
    if (insufficient) {
      locked = true;
      reason = lockHigherReason;
    } else if (isLower && idx < cols.length - 1) {
      locked = true;
      reason = lockLowerReason;
    }

    list.push({
      name: colName,
      index: idx,
      locked,
      reason: locked ? reason : ''
    });
  });

  return list;
}

export function getLeagueThreshold(league) {
  ensureLoaded();
  return thresholds[league] ?? 0;
}
