import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, advance, takeAction, selectTicket, drainEvents, getRank, seededRandom,
  DURATION, CAPACITY, ACTIONS, CLASSES, ACHIEVEMENTS, BOSSES } from '../js/rush-engine.js';
import { TICKETS } from '../js/rush-tickets.js';

const indexFor = (g, kind) => g.queue.find(t => t.id === g.selected).actions.findIndex(a => a.kind === kind);
function playAction(g, kind, steps = 1) {
  assert.equal(takeAction(g, kind === 'assist' || kind === 'bluff' ? kind : indexFor(g, kind)), true);
  for (let i = 0; i < steps; i++) advance(g, ACTIONS[kind].seconds / steps);
}
function quietGame(classId = 'engineer', relaxed = false) {
  const g = createGame('tests', relaxed, classId); g.nextArrival = Infinity; return g;
}
function bossGame(which = 0, classId = 'engineer', relaxed = false) {
  const g = quietGame(classId, relaxed); g.queue = []; g.selected = null;
  advance(g, 30);
  if (which === 1) { g.queue = []; g.selected = null; advance(g, 30); }
  return g;
}
const snapshot = g => JSON.parse(JSON.stringify(g, (key, value) => key === 'random' ? undefined : value));
function cleanRun(seed, relaxed = false, chunks = 1, classId = 'engineer') {
  const g = createGame(seed, relaxed, classId);
  while (g.status === 'playing') {
    if (g.queue.length) {
      const first = [...g.queue].sort((a, b) => a.deadline - b.deadline || a.id - b.id)[0];
      selectTicket(g, first.id); playAction(g, 'fix', chunks);
    } else {
      const next = Math.min(g.nextArrival, (g.phase + 1) * 30, DURATION);
      advance(g, Math.max(0.001, next - g.time));
    }
  }
  return g;
}

test('default game has a selected ticket and the Engineer class', () => {
  const g = createGame();
  assert.equal(g.queue.length, 1); assert.equal(g.selected, g.queue[0].id);
  assert.equal(g.classId, 'engineer'); assert.equal(g.status, 'playing');
  assert.equal(g.time, 0); assert.equal(g.morale, 100); assert.equal(g.assists, 3);
  assert.deepEqual(g.achievements, []); assert.equal(CAPACITY, 5); assert.equal(DURATION, 90);
  assert.equal(createGame('s', false, 'missing').classId, 'engineer');
});

test('seeded random, deck, and action order reproduce exactly', () => {
  const a = seededRandom('fixed'), b = seededRandom('fixed'), c = seededRandom('different');
  const numbers = Array.from({length: 30}, () => a());
  assert.deepEqual(numbers, Array.from({length: 30}, () => b()));
  assert.notDeepEqual(numbers, Array.from({length: 30}, () => c()));
  assert.deepEqual(snapshot(createGame('fixed')), snapshot(createGame('fixed')));
  assert.notDeepEqual(createGame('fixed').deck.map(t => t.id), createGame('different').deck.map(t => t.id));
});

test('each ordinary source has one real fix, workaround, and wrong move', () => {
  for (const t of TICKETS) assert.deepEqual(t.actions.map(a => a.kind).sort(), ['fix', 'patch', 'wrong']);
});

test('a real fix closes a ticket, awards class bonus, and unlocks first-fix once', () => {
  const g = quietGame(); playAction(g, 'fix');
  assert.equal(g.queue.length, 0); assert.equal(g.fixes, 1); assert.equal(g.resolved, 1);
  assert.equal(g.score, 150 + 25 + 100); assert.equal(g.streak, 1);
  assert.equal(g.achievements.filter(a => a.id === 'firstfix').length, 1);
  assert.ok(drainEvents(g).some(e => e.type === 'achievement' && e.id === 'firstfix'));
});

test('Engineer receives exactly 25 more points per correct action than Faker', () => {
  const engineer = quietGame('engineer'), faker = quietGame('faker');
  playAction(engineer, 'fix'); playAction(faker, 'fix');
  assert.equal(engineer.score - faker.score, CLASSES.engineer.fixBonus);
});

test('wrong move leaves ticket open, costs morale, and cannot be retried', () => {
  const g = quietGame(); const index = indexFor(g, 'wrong');
  assert.equal(takeAction(g, index), true); advance(g, 2.4);
  assert.equal(g.wrong, 1); assert.equal(g.morale, 90); assert.equal(g.score, 0);
  assert.equal(g.queue.length, 1); assert.equal(g.queue[0].actions[index].tried, true);
  assert.equal(takeAction(g, index), false);
  playAction(g, 'fix'); assert.equal(g.queue.length, 0);
});

test('ticket action state never contaminates the source data or another game', () => {
  const g = quietGame(), other = quietGame(); playAction(g, 'wrong');
  assert.ok(g.queue[0].actions.some(a => a.tried));
  assert.ok(other.queue[0].actions.every(a => !a.tried));
  assert.ok(TICKETS.every(t => t.actions.every(a => !a.tried)));
});

test('workaround returns the same unresolved issue exactly 11 seconds later', () => {
  const g = quietGame(); const source = g.queue[0].source;
  playAction(g, 'patch'); assert.equal(g.patches, 1); assert.equal(g.score, 55);
  assert.equal(g.queue.length, 0); assert.equal(g.returns[0].at, 11.8);
  advance(g, 10.9); assert.equal(g.queue.length, 0);
  advance(g, 0.1); assert.equal(g.queue.length, 1);
  assert.equal(g.queue[0].source, source); assert.equal(g.queue[0].reopened, true);
  assert.equal(g.queue[0].urgent, false); assert.equal(g.returns.length, 0);
});

test('assists are limited and close normal tickets without counting as real fixes', () => {
  const g = quietGame(); playAction(g, 'assist');
  assert.equal(g.assists, 2); assert.equal(g.assisted, 1); assert.equal(g.score, 75); assert.equal(g.fixes, 0);
  const noAssists = quietGame(); noAssists.assists = 0;
  assert.equal(takeAction(noAssists, 'assist'), false);
  assert.equal(takeAction(bossGame(), 'assist'), false);
});

test('duplicate actions and stale ticket targets cannot change or spend resources', () => {
  const g = quietGame(); const id = g.selected;
  assert.equal(takeAction(g, 'assist', id + 1), false);
  assert.equal(takeAction(g, 'assist', id), true);
  assert.equal(takeAction(g, 'assist', id), false); assert.equal(g.assists, 2);
  assert.equal(takeAction(g, indexFor(g, 'fix'), id), false);
  advance(g, 0.4); assert.equal(takeAction(g, 'assist', id), false);
});

test('invalid action values and invalid selection are rejected safely', () => {
  const g = quietGame();
  for (const bad of [-1, 99, 0.5, NaN, 'constructor', '0', null, {}, 'bluff']) assert.equal(takeAction(g, bad), false);
  assert.equal(selectTicket(g, -1), false); assert.equal(g.work, null);
});

test('active work protects its ticket SLA, but other tickets still expire', () => {
  const g = quietGame(); g.queue[0].deadline = 1;
  playAction(g, 'fix'); assert.equal(g.fixes, 1); assert.equal(g.missed, 0);
  const second = quietGame(); second.queue[0].deadline = 1;
  playAction(second, 'wrong'); assert.equal(second.wrong, 1); assert.equal(second.missed, 1);
  assert.equal(second.morale, 76); assert.equal(second.queue.length, 0);
});

test('ordinary expiry costs 14 morale and repairs selection', () => {
  const g = quietGame(); advance(g, 24);
  assert.equal(g.missed, 1); assert.equal(g.morale, 86); assert.equal(g.selected, null);
  const event = drainEvents(g).find(e => e.type === 'expired'); assert.equal(event.penalty, 14);
});

test('boss arrives at exactly 30 seconds with two stages and visible skill', () => {
  const g = quietGame(); g.queue = []; advance(g, 29.99); assert.equal(g.queue.length, 0);
  advance(g, 0.01); const t = g.queue[0];
  assert.equal(t.boss, true); assert.equal(t.bossId, 'PrinterThatCannotBeFound');
  assert.equal(t.stage, 1); assert.equal(t.stageCount, 2); assert.equal(t.techSkill, 8); assert.equal(t.bluffed, false);
  assert.ok(drainEvents(g).some(e => e.type === 'boss-arrival'));
});

test('Friday boss arrives at exactly 60 seconds with skill two', () => {
  const g = bossGame(1); assert.equal(g.time, 60);
  assert.equal(g.queue[0].bossId, 'Friday4:59ChangeRequest'); assert.equal(g.queue[0].techSkill, 2);
});

test('boss stages require correct technical choices and cannot be skipped', () => {
  const g = bossGame(); const ticket = g.queue[0], source = ticket.source;
  playAction(g, 'wrong'); assert.equal(ticket.stage, 1); assert.equal(g.bossesDefeated, 0);
  playAction(g, 'fix'); assert.equal(ticket.stage, 2); assert.notEqual(ticket.source, source);
  assert.equal(g.queue.length, 1); assert.equal(g.bossStagesCleared, 1); assert.equal(g.fixes, 0);
  assert.equal(takeAction(g, indexFor(g, 'fix'), ticket.id, 1), false);
  assert.equal(takeAction(g, 'assist'), false);
  playAction(g, 'fix'); assert.equal(g.queue.length, 0); assert.equal(g.bossesDefeated, 1);
  assert.equal(g.bossStagesCleared, 2); assert.equal(g.fixes, 1); assert.equal(g.resolved, 1);
  assert.ok(g.achievements.some(a => a.id === 'firstboss'));
  assert.ok(drainEvents(g).some(e => e.type === 'boss-defeated' && e.points === 350));
});

test('boss definitions contain substantive two-stage clues with no workaround shortcuts', () => {
  for (const boss of BOSSES) {
    assert.equal(boss.stages.length, 2);
    for (const stage of boss.stages) {
      assert.ok(stage.clue.length > 100);
      assert.deepEqual(stage.actions.map(a => a.kind).sort(), ['fix', 'wrong', 'wrong']);
      for (const key of ['id', 'category', 'title', 'quote', 'clue', 'user', 'icon']) assert.ok(stage[key]);
    }
  }
});

test('boss takes the oldest nonworking normal seat when the queue is full', () => {
  const g = quietGame(); const source = g.queue[0].source;
  g.queue = Array.from({length: CAPACITY}, (_, i) => ({ id: i + 100, source, urgent: false, arrival: i,
    deadline: 100, patience: 100, actions: source.actions.map(a => ({...a})) }));
  g.selected = 100; advance(g, 29); assert.equal(takeAction(g, indexFor(g, 'fix')), true);
  advance(g, 1);
  assert.equal(g.queue.length, CAPACITY); assert.ok(g.queue.some(t => t.boss));
  assert.ok(g.queue.some(t => t.id === 100)); assert.ok(!g.queue.some(t => t.id === 101));
  assert.equal(g.work.ticketId, 100); assert.equal(g.missed, 1); assert.equal(g.morale, 86);
  advance(g, 1.4); assert.equal(g.fixes, 1);
});

test('overflow of an ordinary incoming ticket leaves protected work intact', () => {
  const g = quietGame(); const ticket = g.queue[0];
  g.queue = Array.from({length: CAPACITY}, (_, i) => ({...ticket, id: 100 + i, deadline: 100}));
  g.selected = 100; g.nextArrival = 1;
  assert.equal(takeAction(g, indexFor(g, 'fix')), true); advance(g, 1);
  assert.equal(g.queue.length, CAPACITY); assert.equal(g.work.ticketId, 100);
  assert.equal(g.missed, 1); assert.equal(g.morale, 86);
});

test('boss expiry costs 25 morale rather than the ordinary 14', () => {
  const g = bossGame(); advance(g, 26);
  assert.equal(g.bossesMissed, 1); assert.equal(g.missed, 1); assert.equal(g.morale, 75);
  assert.equal(g.queue.length, 0);
  assert.ok(drainEvents(g).some(e => e.type === 'expired' && e.boss && e.penalty === 25));
});

test('Faker bluff against low-skill boss buys time but never fixes an outage', () => {
  const g = bossGame(1, 'faker'); const t = g.queue[0], oldDeadline = t.deadline, source = t.source;
  g.morale = 72; playAction(g, 'bluff');
  assert.equal(t.deadline, oldDeadline + 10); assert.equal(g.morale, 82);
  assert.equal(g.score, 75 + 100); assert.equal(g.successfulBluffs, 1); assert.equal(t.bluffed, true);
  assert.equal(t.stage, 1); assert.equal(t.source, source); assert.equal(g.fixes, 0); assert.equal(g.bossesDefeated, 0);
  assert.equal(takeAction(g, 'bluff'), false);
  playAction(g, 'fix'); assert.equal(t.stage, 2); assert.equal(takeAction(g, 'bluff'), false);
  assert.ok(drainEvents(g).some(e => e.type === 'bluff' && e.success && e.points === 75));
});

test('technical boss detects a bluff and penalizes it exactly once', () => {
  const g = bossGame(0, 'faker'); const t = g.queue[0], oldDeadline = t.deadline;
  playAction(g, 'bluff');
  assert.equal(g.morale, 90); assert.equal(g.wrong, 1); assert.equal(g.score, 0);
  assert.equal(t.stage, 1); assert.equal(t.deadline, oldDeadline); assert.equal(takeAction(g, 'bluff'), false);
  assert.equal(g.bluffs, 1); assert.equal(g.successfulBluffs, 0);
  assert.ok(drainEvents(g).some(e => e.type === 'bluff' && !e.success));
});

test('Engineer cannot bluff and Faker cannot bluff ordinary tickets', () => {
  assert.equal(takeAction(bossGame(), 'bluff'), false);
  assert.equal(takeAction(quietGame('faker'), 'bluff'), false);
});

test('morale stays capped at 100 after a successful bluff', () => {
  const g = bossGame(1, 'faker'); playAction(g, 'bluff'); assert.equal(g.morale, 100);
});

test('paused, finished, and invalid-time inputs cannot advance the simulation', () => {
  const g = quietGame(); const before = snapshot(g);
  for (const dt of [0, -1, NaN, Infinity]) advance(g, dt);
  assert.deepEqual(snapshot(g), before);
  g.status = 'paused'; advance(g, 30); assert.equal(g.time, 0);
  assert.equal(takeAction(g, 0), false); assert.equal(selectTicket(g, g.selected), false);
  g.status = 'finished'; advance(g, 30); assert.equal(g.time, 0);
});

test('large and small timesteps produce identical unattended results', () => {
  const large = createGame('clock'), small = createGame('clock');
  advance(large, 90); for (let i = 0; i < 900; i++) advance(small, 0.1);
  assert.deepEqual(snapshot(small), snapshot(large));
});

test('full clean runs are seeded and invariant to action-time subdivision', () => {
  for (const relaxed of [false, true]) {
    const one = cleanRun('full-shift', relaxed, 1), many = cleanRun('full-shift', relaxed, 24);
    assert.deepEqual(snapshot(one), snapshot(many));
    assert.equal(one.time, 90); assert.equal(one.status, 'finished');
    assert.equal(one.bossesDefeated, 2); assert.equal(one.morale, 100);
    assert.equal(one.wrong, 0); assert.equal(one.missed, 0);
  }
});

test('achievements have balanced bonuses, unlock once, and reward actual play', () => {
  const g = cleanRun('medals'); const ids = g.achievements.map(a => a.id);
  assert.deepEqual(new Set(ids), new Set(['firstfix', 'threestreak', 'firstboss', 'perfectsurvival']));
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(g.achievementPoints, g.achievements.reduce((sum, a) => sum + a.points, 0));
  for (const reward of Object.values(ACHIEVEMENTS)) assert.ok(reward.points >= 100 && reward.points <= 200);
  assert.equal(g.bonus, 300); assert.equal(getRank(g).title, 'Incident Theatre Legend');
});

test('imperfect survival cannot unlock the perfect-shift achievement', () => {
  const g = quietGame(); playAction(g, 'wrong'); g.queue = []; advance(g, 30 - g.time);
  playAction(g, 'fix'); playAction(g, 'fix'); advance(g, 60 - g.time);
  playAction(g, 'fix'); playAction(g, 'fix'); advance(g, 90 - g.time);
  assert.equal(g.status, 'finished'); assert.ok(!g.achievements.some(a => a.id === 'perfectsurvival'));
});

test('end event and morale bonus happen exactly once', () => {
  const g = cleanRun('end-once'); const score = g.score;
  assert.equal(drainEvents(g).filter(e => e.type === 'end').length, 1);
  advance(g, 90); advance(g, 1); assert.equal(g.score, score); assert.deepEqual(drainEvents(g), []);
  assert.equal(takeAction(g, 'assist'), false);
});

test('zero morale ends promptly and never gives a survival bonus', () => {
  const g = quietGame(); g.morale = 10; playAction(g, 'wrong');
  assert.equal(g.morale, 0); assert.equal(g.status, 'finished'); assert.equal(g.time, 2.4); assert.equal(g.bonus, 0);
  assert.equal(drainEvents(g).filter(e => e.type === 'end').length, 1);
  assert.equal(getRank(g).title, 'Out of office');
});

test('easy shift extends ordinary/boss patience and spaces arrivals farther apart', () => {
  const standard = createGame('mode'), easy = createGame('mode', true);
  assert.equal(easy.queue[0].patience, standard.queue[0].patience * 1.6);
  assert.ok(easy.nextArrival > standard.nextArrival);
  advance(standard, 6); advance(easy, 6);
  assert.equal(standard.queue.length, 2); assert.equal(easy.queue.length, 1);
  assert.equal(bossGame(0, 'engineer', true).queue[0].patience, BOSSES[0].patience * 1.6);
});

test('game engine and boss data require no persistence, browser globals, or network', () => {
  for (const path of ['../js/rush-engine.js', '../js/rush-bosses.js']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|document|window|fetch|XMLHttpRequest)\s*[.(]/);
  }
  assert.equal(typeof createGame('node-only').random, 'function');
});

test('a second boss cannot displace the first boss or protected work', () => {
  const g = bossGame(); const printer = g.queue[0]; printer.deadline = 100;
  const normal = TICKETS[0];
  g.queue.push(...Array.from({length: 4}, (_, i) => ({ id: 100 + i, source: normal, arrival: i,
    deadline: 100, patience: 100, actions: normal.actions.map(a => ({...a})) })));
  g.selected = 100; advance(g, 29); assert.equal(takeAction(g, indexFor(g, 'fix')), true);
  advance(g, 1);
  assert.equal(g.queue.length, CAPACITY); assert.equal(g.queue.filter(t => t.boss).length, 2);
  assert.ok(g.queue.includes(printer)); assert.ok(g.queue.some(t => t.id === 100));
  assert.ok(!g.queue.some(t => t.id === 101)); assert.equal(g.work.ticketId, 100);
});

test('bluff success uses the explicit below-five threshold', () => {
  for (const skill of [4, 5]) {
    const g = bossGame(1, 'faker'); g.queue[0].techSkill = skill;
    playAction(g, 'bluff'); assert.equal(g.successfulBluffs, skill < 5 ? 1 : 0);
  }
});

test('boss reward is two correct actions, combo/class points, and a 350-point defeat', () => {
  const g = bossGame(); playAction(g, 'fix');
  assert.equal(g.score, 175); assert.equal(g.achievements.length, 0);
  const first = drainEvents(g).find(e => e.type === 'outcome');
  assert.equal(first.title, BOSSES[0].stages[0].title); assert.equal(first.closed, false);
  playAction(g, 'fix');
  assert.equal(g.score, 175 + 200 + 350 + 100 + 150);
  assert.equal(g.achievementPoints, 250);
});
