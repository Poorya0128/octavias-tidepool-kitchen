/**
 * One tide night of service: the seeded, deterministic rules that tie the arms, stations,
 * tickets, plate and pass together. Input, the scripted chef and the screenshot scenes all
 * drive a night through `dispatch`, and time only moves through `stepNight`.
 */

import { LAYOUT, TUNING } from './config.js';
import { INGREDIENT, INGREDIENTS } from './data/ingredients.js';
import { NIGHTS } from './data/nights.js';
import { createRng } from './rng.js';
import { createArms, freeArmNear, holdItem, sendArm, updateArms } from './arms.js';
import { clearBurnt, createStations, updateStations, useStation } from './stations.js';
import { selectTicket, servePass, spawnCritic, spawnRegular, trash, updatePass, updateTickets, usePlate } from './orders.js';
import { fireInkBurst, updateInk } from './ink.js';
import { starsFor } from './scoring.js';

/** Centre of an ingredient bin on the counter. */
export function binPoint(index) {
  const b = LAYOUT.bins;
  return { x: b.x + index * (b.w + b.gap) + b.w / 2, y: b.y + 40 };
}

/** A fresh night: empty stations, eight idle arms, the ticket schedule, and `emit` to log events with their moment. */
export function createNight({ nightIndex, upgrades = {}, seed = 1 }) {
  const cfg = NIGHTS[nightIndex];
  const state = {
    nightIndex, cfg, seed, rng: createRng(seed * 7919 + nightIndex * 104729),
    upgrades: { ...upgrades }, time: 0, over: false,
    coins: 0, streak: 0, bestStreak: 0,
    stats: { served: 0, missed: 0, perfectCooks: 0, burnt: 0, tips: 0, twins: 0, ordersChanged: 0 },
    tickets: [], nextTicketId: 1, nextPlateId: 1, selectedTicket: null, spawnTimer: cfg.firstSpawn,
    maxTickets: cfg.maxTickets, rush: { index: 0, warnAt: null, endsAt: null, active: false },
    criticIndex: 0, critic: { live: null, reviews: [] },
    arms: createArms(), stations: createStations(upgrades),
    plate: { recipeId: null, parts: [] }, pass: [], twinsServed: {},
    events: [], toasts: [],
    ink: { meter: 0, active: false, endsAt: 0, uses: 0 },
    moments: {}, speech: [], coach: null,
  };
  state.emit = (event) => {
    state.events.push(event);
    state.moments[event.type] = state.time;
  };
  state.toast = (text, color = '#fff6e6') => {
    state.toasts.push({ text, color, at: state.time });
    if (state.toasts.length > 3) state.toasts.shift();
  };
  return state;
}

/** Whether a Spring Tide rush is running. */
export function inRush(state) {
  return state.rush.active;
}

/** Advances the night by dt seconds. */
export function stepNight(state, dt) {
  if (state.over) return;
  state.time += dt;
  updateInk(state);
  updateArms(state, dt);
  updateStations(state, dt);
  updateTickets(state, dt);
  updatePass(state, dt);
  updateRush(state);
  updateSpawns(state, dt);
  state.toasts = state.toasts.filter((t) => state.time - t.at < 2.6);
  if (state.time >= state.cfg.duration) endNight(state);
}

/** Spring Tide: a warning banner, then tickets arrive much faster for a while. */
function updateRush(state) {
  const r = state.rush;
  const next = state.cfg.rushes[r.index];
  if (!r.active && next !== undefined) {
    if (r.warnAt === null && state.time >= next - TUNING.rushWarning) {
      r.warnAt = state.time;
      state.emit({ type: 'rushWarn' });
    }
    if (state.time >= next) {
      r.active = true;
      r.endsAt = next + TUNING.rushDuration;
      state.maxTickets = state.cfg.maxTickets + 2;
      state.spawnTimer = Math.min(state.spawnTimer, 0.8);
      state.emit({ type: 'rushStart' });
    }
  } else if (r.active && state.time >= r.endsAt) {
    r.active = false;
    r.warnAt = null;
    r.index++;
    state.maxTickets = state.cfg.maxTickets;
    state.emit({ type: 'rushEnd' });
  }
}

/** Regular tickets on the night's pace, plus Madame Mantis at her booked times. */
function updateSpawns(state, dt) {
  const visit = state.cfg.critic[state.criticIndex];
  if (visit !== undefined && state.time >= visit) {
    spawnCritic(state);
    state.criticIndex++;
  }
  if (state.time > state.cfg.duration - 12) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const pace = state.cfg.spawnEvery * (state.rush.active ? TUNING.rushSpawnFactor : 1);
  if (state.tickets.length < state.maxTickets) {
    spawnRegular(state);
    state.spawnTimer = pace * state.rng.range(0.8, 1.2);
  } else {
    state.spawnTimer = 1;
  }
}

/** An idle arm reaches into a bin and takes one ingredient. */
export function grabIngredient(state, ingId) {
  const index = INGREDIENTS.findIndex((i) => i.id === ingId);
  if (index < 0) return { ok: false, reason: 'Unknown ingredient' };
  const at = binPoint(index);
  const arm = freeArmNear(state, at);
  if (!arm) return { ok: false, reason: 'All eight arms are busy!', noArm: true };
  const ing = INGREDIENT[ingId];
  holdItem(state, arm, { ing: ingId, prep: ing.preps.includes('raw') ? 'raw' : null, quality: 'good' });
  sendArm(state, arm, at);
  state.emit({ type: 'grab', ...at, ing: ingId });
  return { ok: true, arm: arm.id };
}

/** Applies one player action; failures leave a toast and an event the audio answers. */
export function dispatch(state, action) {
  if (state.over) return { ok: false, reason: 'The night is over' };
  let res;
  switch (action.type) {
    case 'grab': res = grabIngredient(state, action.ing); break;
    case 'station': res = useStation(state, action.id, action.slot ?? null); break;
    case 'plate': res = usePlate(state); break;
    case 'serve': res = servePass(state, action.index ?? null); break;
    case 'select': res = selectTicket(state, action.id); break;
    case 'cycle': res = selectTicket(state, 'next'); break;
    case 'trash': res = trash(state, clearBurnt); break;
    case 'ink': res = fireInkBurst(state); break;
    default: res = { ok: false, reason: 'Unknown action' };
  }
  if (!res.ok) {
    state.emit({ type: res.noArm ? 'noArm' : 'invalid' });
    state.toast(res.reason, res.noArm ? '#ff7a59' : '#fff6e6');
  }
  return res;
}

/** Closes the bistro for the night. */
function endNight(state) {
  state.over = true;
  state.emit({ type: 'nightOver' });
}

/** The night's results: coins, stars, stats, Ink Bursts fired and the critic's average. */
export function nightSummary(state) {
  const reviews = state.critic.reviews;
  const critic = state.cfg.critic.length ? (reviews.length ? reviews.reduce((a, b) => a + b, 0) / reviews.length : 1) : null;
  return {
    nightIndex: state.nightIndex, coins: state.coins, stars: starsFor(state.coins, state.cfg.stars, critic),
    bestStreak: state.bestStreak, critic, inkBursts: state.ink.uses, ...state.stats,
  };
}
