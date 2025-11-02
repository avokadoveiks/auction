import { Settings } from './settings.js';
import { getLeagueOrder } from './leagues.js';

const roomsByLeague = new Map();
const membership = new Map(); // playerId -> roomId
let config = null;
let botController = null;
const emitter = new EventTarget();

const ROOM_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function ensureConfig() {
  if (!config) {
    config = Settings.cached.matchmaking;
  }
  return config;
}

function getRoomKey(room) {
  return `${room.league}:${room.id}`;
}

function ensureLeagueArray(league) {
  if (!roomsByLeague.has(league)) {
    roomsByLeague.set(league, []);
  }
  return roomsByLeague.get(league);
}

function nextRoomLabel(league) {
  const rooms = ensureLeagueArray(league);
  const idx = rooms.length % ROOM_LABELS.length;
  return ROOM_LABELS[idx] || `R${rooms.length + 1}`;
}

function createRoom(league) {
  const settings = ensureConfig();
  const label = nextRoomLabel(league);
  const room = {
    id: `${league}-${label}`,
    league,
    label: `Комната ${label}`,
    createdAt: Date.now(),
    capacity: settings.roomCapacity,
    players: new Map(),
    bots: new Map(),
    phase: 'waiting'
  };

  ensureLeagueArray(league).push(room);
  emitter.dispatchEvent(new CustomEvent('room-created', { detail: { room } }));
  if (botController) {
    botController.onRoomCreated(room);
  }
  return room;
}

function pruneEmptyRooms(league) {
  const settings = ensureConfig();
  const rooms = ensureLeagueArray(league);
  if (!rooms.length) return;

  if (!settings.alwaysOn) return;
  // Keep at least one room per league
  if (rooms.length <= 1) return;

  for (let i = rooms.length - 1; i >= 0; i -= 1) {
    const room = rooms[i];
    if (room.players.size === 0 && room.bots.size === 0) {
      rooms.splice(i, 1);
      emitter.dispatchEvent(new CustomEvent('room-removed', { detail: { room } }));
      if (botController) {
        botController.onRoomRemoved(room);
      }
    }
    if (rooms.length === 1) break;
  }
}

function ensureActiveRoom(league) {
  const rooms = ensureLeagueArray(league);
  if (!rooms.length) {
    return createRoom(league);
  }
  return rooms[0];
}

function getRoomForPlayer(playerId) {
  const roomId = membership.get(playerId);
  if (!roomId) return null;
  const [league, id] = roomId.split(':');
  const rooms = ensureLeagueArray(league);
  return rooms.find(r => getRoomKey(r) === roomId) || null;
}

function addPlayerToRoom(room, player) {
  if (room.players.has(player.id)) return room;
  if (room.players.size >= room.capacity) {
    throw new Error('Комната заполнена');
  }
  room.players.set(player.id, player);
  membership.set(player.id, getRoomKey(room));
  emitter.dispatchEvent(new CustomEvent('room-update', { detail: { room } }));
  if (botController) {
    botController.onPlayerJoined(room, player);
  }
  return room;
}

function removePlayerFromRoom(room, playerId) {
  if (!room) return;
  if (room.players.delete(playerId)) {
    membership.delete(playerId);
    emitter.dispatchEvent(new CustomEvent('room-update', { detail: { room } }));
    if (botController) {
      botController.onPlayerLeft(room, playerId);
    }
  }
}

export function initMatchmaking({ controller } = {}) {
  ensureConfig();
  botController = controller || null;

  const leagues = getLeagueOrder();
  leagues.forEach(ensureActiveRoom);
}

export function setBotController(controller) {
  botController = controller;
}

export function joinRoom(league, player) {
  ensureConfig();
  ensureActiveRoom(league);

  const existing = getRoomForPlayer(player.id);
  if (existing && existing.league === league) {
    if (botController) {
      botController.ensureBots(existing);
    }
    return existing;
  }

  const rooms = ensureLeagueArray(league)
    .filter(room => room.players.size < room.capacity);

  const room = rooms.length ? rooms[0] : createRoom(league);

  if (existing) {
    removePlayerFromRoom(existing, player.id);
  }

  addPlayerToRoom(room, player);

  if (botController) {
    botController.ensureBots(room);
  }

  return room;
}

export function leaveCurrentRoom(playerId) {
  const room = getRoomForPlayer(playerId);
  if (!room) return null;
  removePlayerFromRoom(room, playerId);
  pruneEmptyRooms(room.league);
  return room;
}

export function switchRoom(league, player, targetRoomId) {
  const current = getRoomForPlayer(player.id);
  if (current) {
    removePlayerFromRoom(current, player.id);
  }

  const rooms = ensureLeagueArray(league);
  let target = rooms.find(r => getRoomKey(r) === targetRoomId);
  if (!target) {
    target = joinRoom(league, player);
  } else {
    if (target.players.size >= target.capacity) {
      throw new Error('Комната заполнена');
    }
    addPlayerToRoom(target, player);
  }

  pruneEmptyRooms(league);
  if (botController) {
    botController.ensureBots(target);
  }
  return target;
}

export function getRooms(league) {
  ensureConfig();
  ensureActiveRoom(league);
  return ensureLeagueArray(league).map(room => ({
    id: getRoomKey(room),
    league: room.league,
    label: room.label,
    humans: room.players.size,
    bots: room.bots.size,
    capacity: room.capacity
  }));
}

export function getRoomByKey(roomKey) {
  const [league] = roomKey.split(':');
  const rooms = ensureLeagueArray(league);
  return rooms.find(r => getRoomKey(r) === roomKey) || null;
}

export function subscribe(callback) {
  const handler = (event) => {
    callback(event.type, event.detail.room);
  };
  emitter.addEventListener('room-created', handler);
  emitter.addEventListener('room-update', handler);
  emitter.addEventListener('room-removed', handler);
  return () => {
    emitter.removeEventListener('room-created', handler);
    emitter.removeEventListener('room-update', handler);
    emitter.removeEventListener('room-removed', handler);
  };
}

export function getMembership(playerId) {
  return membership.get(playerId) || null;
}
