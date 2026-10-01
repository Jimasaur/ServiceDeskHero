/** Pure deterministic simulation. No browser APIs, storage, or network. */
import { TICKETS } from './rush-tickets.js';
import { BOSSES } from './rush-bosses.js';
export { BOSSES } from './rush-bosses.js';
export const TOTAL_NORMAL = 12;
export const SLA_SECONDS = Object.freeze({ 3: 15 * 60, 1: 60 });
export const CAPACITY = 5;
export const ACTIONS = Object.freeze({
  fix: { seconds: 2.4, points: 150 },
  patch: { seconds: 0.8, points: 55 },
  wrong: { seconds: 2.4, points: 0 },
  assist: { seconds: 0.4, points: 75 },
  bluff: { seconds: 0.8, points: 75 },
});
export const CLASSES = Object.freeze({
  engineer: { title: 'The Engineer', description: '+25 points for each correct technical action', fixBonus: 25 },
  faker: { title: 'The Faker', description: 'One bluff per boss: skill below 5 buys time; expertise calls your bluff', fixBonus: 0 },
});
export const ACHIEVEMENTS = Object.freeze({
  firstfix: { id: 'firstfix', title: 'Percussive Maintenance Avoided', description: 'Close your first ticket with a real fix', points: 100 },
  threestreak: { id: 'threestreak', title: 'The Documentation Prophecy', description: 'Make three correct technical moves in a row', points: 125 },
  firstboss: { id: 'firstboss', title: 'This Could Have Been a Ticket', description: 'Defeat your first two-stage boss', points: 150 },
  successfulbluff: { id: 'successfulbluff', title: 'Certified in Saying Synergy', description: 'Buy time by bluffing a low-skill boss', points: 100 },
  perfectsurvival: { id: 'perfectsurvival', title: 'The Pager Sleeps Tonight', description: 'Survive the full shift with no missed tickets or wrong moves', points: 200 },
});
export function seededRandom(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(items, random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const EPSILON = 1e-7;
const tickTime = n => Math.round(n * 1e9) / 1e9;
function actionsFor(source, random) { return shuffle(source.actions.map(a => ({ ...a })), random); }
/** The legacy relaxed argument is accepted for callers; every shift uses the same paced lifecycle. */
export function createGame(seed = 'practice', relaxed = false, classId = 'engineer') {
  const random = seededRandom(seed);
  const game = { seed: String(seed), relaxed: Boolean(relaxed), classId: Object.hasOwn(CLASSES, classId) ? classId : 'engineer',
    random, deck: shuffle(TICKETS, random).slice(0, TOTAL_NORMAL), cursor: 0, time: 0, score: 0, morale: 100,
    streak: 0, bestStreak: 0, resolved: 0, fixes: 0, patches: 0, wrong: 0, missed: 0,
    assists: 3, assisted: 0, bluffs: 0, successfulBluffs: 0, bossesDefeated: 0, bossesMissed: 0,
    bossStagesCleared: 0, achievements: [], achievementPoints: 0,
    completedNormal: 0, reportedNormal: 0, totalNormal: TOTAL_NORMAL, normalFixes: 0,
    sev1Unlocked: false, printerDefeated: false,
    bossStatus: Object.fromEntries(BOSSES.map(boss => [boss.id, 'pending'])),
    queue: [], returns: [], nextId: 1,
    selected: null, work: null, phase: 0, status: 'playing', events: [] };
  progressShift(game);
  emit(game, 'narrator', { text: 'Welcome to the Incident Theatre. Read at your own pace, then acknowledge your first Sev 3 ticket to start its 15-minute SLA.' });
  return game;
}
function emit(g, type, detail = {}) { g.events.push({ type, ...detail }); }
function award(g, id) {
  if (g.achievements.some(a => a.id === id)) return;
  const reward = { ...ACHIEVEMENTS[id] };
  g.achievements.push(reward); g.achievementPoints += reward.points; g.score += reward.points;
  emit(g, 'achievement', { ...reward, achievement: reward, text: `${reward.title} · +${reward.points}` });
}
function repairSelection(g) {
  if (!g.queue.some(t => t.id === g.selected)) g.selected = g.queue[0]?.id ?? null;
}
function settleTicket(g, ticket, resolution) {
  if (ticket.resolution) return;
  ticket.resolution = resolution;
  if (ticket.boss) {
    g.bossStatus[ticket.bossId] = resolution === 'fix' ? 'defeated' : 'missed';
    if (ticket.bossId === BOSSES[0].id && resolution === 'fix') g.printerDefeated = true;
  } else {
    g.completedNormal++;
    if (resolution === 'fix') g.normalFixes++;
  }
}
function missTicket(g, ticket) {
  if (ticket.resolution) return;
  const penalty = ticket.boss ? 25 : 14;
  g.morale = Math.max(0, g.morale - penalty); g.missed++; g.streak = 0;
  if (ticket.boss) g.bossesMissed++;
  settleTicket(g, ticket, 'missed');
  if (g.work?.ticketId === ticket.id) g.work = null;
  emit(g, 'expired', { id: ticket.id, boss: !!ticket.boss, bossId: ticket.bossId, penalty,
    text: `${ticket.source.title}: SLA missed. −${penalty} morale` });
}
function reportTicket(g, source, severity, extra = {}) {
  const id = g.nextId++, slaSeconds = SLA_SECONDS[severity];
  const ticket = { id, rootId: id, source, severity, slaSeconds, urgent: severity === 1,
    acknowledged: false, acknowledgedAt: null, reportedAt: g.time, arrival: g.time,
    deadline: severity === 1 ? tickTime(g.time + slaSeconds) : null, patience: slaSeconds,
    reopened: false, patchUsed: false, resolution: null, ...extra,
    actions: actionsFor(source, g.random) };
  g.queue.push(ticket); repairSelection(g);
  return ticket;
}
function addTicket(g) {
  if (g.reportedNormal >= g.totalNormal) return;
  const source = g.deck[g.cursor++];
  const ticket = reportTicket(g, source, g.sev1Unlocked ? 1 : 3);
  g.reportedNormal++;
  emit(g, 'arrival', { id: ticket.id, severity: ticket.severity, text: source.title });
}
function returnTicket(g, returning) {
  const ticket = returning.ticket;
  ticket.reopened = true;
  g.queue.push(ticket); repairSelection(g);
  emit(g, 'return', { id: ticket.id, severity: ticket.severity,
    text: `${ticket.source.title} returns for its encore. The original SLA is still running; this issue now needs a lasting fix.` });
}
function addBoss(g, boss) {
  const severity = boss.id === BOSSES[0].id ? 3 : g.sev1Unlocked ? 1 : 3;
  const ticket = reportTicket(g, boss.stages[0], severity, {
    boss: true, bossId: boss.id, stage: 1, stageCount: boss.stages.length,
    techSkill: boss.techSkill, bluffed: false,
  });
  g.bossStatus[boss.id] = 'active';
  emit(g, 'boss-arrival', { id: ticket.id, bossId: boss.id, severity, techSkill: boss.techSkill,
    title: boss.title, text: boss.entrance });
}
/** Reports the next authored issue only when the previous issue is finally settled. */
function progressShift(g) {
  if (g.status !== 'playing') return;
  if (g.morale <= 0) { endGame(g); return; }
  if (!g.sev1Unlocked && g.normalFixes >= 8 && g.printerDefeated) {
    g.sev1Unlocked = true; g.phase = 2;
    emit(g, 'sev1-unlocked', { text: 'Sev 1 unlocked: eight lasting fixes and the printer defeated. New urgent incidents have a one-minute SLA starting the instant they are reported.' });
    emit(g, 'phase', { phase: 2, text: 'ACT III: SEV 1 INCIDENTS · THE CLOCK STARTS AT REPORT' });
  }
  if (g.queue.length || g.returns.length || g.work) return;
  const boss = BOSSES.find(b => g.bossStatus[b.id] === 'pending' && g.completedNormal >= b.afterNormal);
  if (boss) {
    if (boss.id === BOSSES[0].id) {
      g.phase = 1;
      emit(g, 'phase', { phase: 1, text: 'ACT II: THE PRINTER TAKES THE STAGE · STILL SEV 3' });
    }
    addBoss(g, boss);
  } else if (g.reportedNormal < g.totalNormal) addTicket(g);
  else if (g.completedNormal === g.totalNormal && Object.values(g.bossStatus).every(s => s === 'defeated' || s === 'missed')) endGame(g);
}
/** Acknowledgement starts a Sev 3 SLA once; Sev 1 clocks already started at report. */
export function acknowledgeTicket(g, id) {
  if (g.status !== 'playing') return false;
  const ticket = g.queue.find(t => t.id === id);
  if (!ticket || ticket.acknowledged || (ticket.deadline !== null && ticket.deadline <= g.time + EPSILON)) return false;
  ticket.acknowledged = true; ticket.acknowledgedAt = g.time;
  if (ticket.deadline === null) ticket.deadline = tickTime(g.time + ticket.slaSeconds);
  emit(g, 'acknowledged', { id, severity: ticket.severity, deadline: ticket.deadline,
    text: ticket.severity === 3 ? 'Acknowledged. Your 15-minute SLA starts now.' : 'Acknowledged. The Sev 1 SLA has been running since this incident was reported.' });
  return true;
}
export function selectTicket(g, id) {
  if (g.status !== 'playing' || !g.queue.some(t => t.id === id)) return false;
  g.selected = id; return true;
}
/** Optional expectedStage protects clicks rendered for an earlier boss stage. */
export function takeAction(g, index, expectedTicketId = g.selected, expectedStage = undefined) {
  if (g.status !== 'playing' || g.work || g.selected !== expectedTicketId) return false;
  const ticket = g.queue.find(t => t.id === g.selected);
  if (!ticket || !ticket.acknowledged || (ticket.deadline !== null && ticket.deadline <= g.time + EPSILON) ||
      (expectedStage !== undefined && ticket.stage !== expectedStage)) return false;
  let action;
  if (index === 'assist') {
    if (ticket.boss || g.assists <= 0) return false;
    action = { kind: 'assist', label: 'Ask a teammate', outcome: 'Your teammate takes a bow. You inherit a coffee debt.' };
  } else if (index === 'bluff') {
    if (g.classId !== 'faker' || !ticket.boss || ticket.bluffed) return false;
    action = { kind: 'bluff', label: 'Deploy impressive jargon' };
  } else if (Number.isInteger(index) && index >= 0) action = ticket.actions[index];
  if (!action || action.tried || !Object.hasOwn(ACTIONS, action.kind) || (action.kind === 'patch' && ticket.patchUsed)) return false;
  if (action.kind === 'assist') g.assists--;
  if (action.kind === 'bluff') { ticket.bluffed = true; g.bluffs++; }
  g.work = { ticketId: ticket.id, stage: ticket.stage, action, started: g.time, ends: tickTime(g.time + ACTIONS[action.kind].seconds) };
  emit(g, 'work', { kind: action.kind });
  return true;
}
function completeBluff(g, ticket) {
  const success = ticket.techSkill < 5;
  let points = 0;
  if (success) {
    ticket.deadline = tickTime(ticket.deadline + 10); ticket.patience += 10;
    g.morale = Math.min(100, g.morale + 10); points = ACTIONS.bluff.points; g.score += points;
    g.successfulBluffs++;
  } else { g.morale = Math.max(0, g.morale - 10); g.wrong++; g.streak = 0; }
  emit(g, 'bluff', { id: ticket.id, bossId: ticket.bossId, success, points, techSkill: ticket.techSkill,
    text: success ? '“Cross-functional quantum alignment.” The boss nods. +10s patience, +10 morale, +75 points. The technical problem is still waiting.' : 'The printer requests your packet capture. Bluff detected: −10 morale. The technical problem is still waiting.' });
  if (success) award(g, 'successfulbluff');
}
function completeWork(g) {
  const work = g.work;
  if (!work) return;
  g.work = null;
  const ticket = g.queue.find(t => t.id === work.ticketId);
  if (!ticket) return;
  const kind = work.action.kind;
  if (kind === 'bluff') { completeBluff(g, ticket); return; }
  const completedStage = ticket.stage, completedTitle = ticket.source.title;
  let points = 0, defeated = false, closed = false;
  if (kind === 'wrong') {
    g.wrong++; g.streak = 0; g.morale = Math.max(0, g.morale - 10);
    ticket.actions = ticket.actions.map(a => a === work.action ? { ...a, tried: true } : a);
  } else if (kind === 'fix') {
    g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
    points = ACTIONS.fix.points + CLASSES[g.classId].fixBonus + Math.min(5, g.streak - 1) * 25 + (ticket.urgent && !ticket.boss ? 50 : 0);
    g.morale = Math.min(100, g.morale + 4);
    if (ticket.boss) {
      g.bossStagesCleared++;
      const boss = BOSSES.find(b => b.id === ticket.bossId);
      if (ticket.stage < boss.stages.length) {
        ticket.stage++; ticket.source = boss.stages[ticket.stage - 1]; ticket.actions = actionsFor(ticket.source, g.random);
        emit(g, 'boss-stage', { id: ticket.id, bossId: ticket.bossId, stage: ticket.stage, stageCount: ticket.stageCount,
          text: 'One fault down. The second act begins. Read the new evidence before you make your move.' });
      } else {
        defeated = true; closed = true; g.bossesDefeated++; points += 350;
        emit(g, 'boss-defeated', { id: ticket.id, bossId: ticket.bossId, title: boss.title, points: 350, text: boss.defeat });
      }
    } else closed = true;
    if (closed) {
      g.queue = g.queue.filter(t => t.id !== ticket.id); g.resolved++; g.fixes++;
      settleTicket(g, ticket, 'fix');
    }
  } else {
    g.queue = g.queue.filter(t => t.id !== ticket.id); g.streak = 0;
    if (kind === 'patch') {
      ticket.patchUsed = true;
      ticket.actions = ticket.actions.map(a => a.kind === 'patch' ? { ...a, tried: true } : a);
      g.patches++; points = ACTIONS.patch.points;
      g.returns.push({ at: tickTime(g.time + 11), ticket, source: ticket.source });
    } else {
      g.assisted++; g.resolved++; points = ACTIONS.assist.points; closed = true;
      settleTicket(g, ticket, 'assist');
    }
  }
  g.score += points; repairSelection(g);
  emit(g, 'outcome', { kind, points, text: work.action.outcome, title: completedTitle, streak: g.streak,
    boss: !!ticket.boss, stage: completedStage, defeated, closed });
  if (kind === 'fix') {
    if (closed) award(g, 'firstfix');
    if (g.streak >= 3) award(g, 'threestreak');
    if (defeated) award(g, 'firstboss');
  }
}
function expireTickets(g) {
  const expired = [...g.queue, ...g.returns.map(r => r.ticket)]
    .filter(t => t.deadline !== null && t.deadline <= g.time + EPSILON);
  for (const ticket of expired) {
    g.queue = g.queue.filter(t => t.id !== ticket.id);
    g.returns = g.returns.filter(r => r.ticket.id !== ticket.id);
    missTicket(g, ticket);
  }
  repairSelection(g);
}
function endGame(g) {
  if (g.status === 'finished') return;
  g.status = 'finished'; g.work = null;
  g.completion = g.morale <= 0 ? 'morale' : g.sev1Unlocked ? 'career' : 'practice';
  g.bonus = g.morale > 0 ? Math.round(g.morale * 3) : 0; g.score += g.bonus;
  if (g.completedNormal === g.totalNormal && g.bossesDefeated === BOSSES.length &&
      g.morale > 0 && g.missed === 0 && g.wrong === 0) award(g, 'perfectsurvival');
  emit(g, 'end', { completion: g.completion });
}
/** Event-boundary stepping keeps results independent of frame rate. Pausing freezes all clocks. */
export function advance(g, seconds) {
  if (g.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return;
  const target = tickTime(g.time + seconds);
  if (!Number.isFinite(target)) return;
  while (g.time < target - EPSILON && g.status === 'playing') {
    const deadlines = [...g.queue, ...g.returns.map(r => r.ticket)]
      .filter(t => t.deadline !== null).map(t => t.deadline);
    const boundary = Math.min(target, g.work?.ends ?? Infinity, ...g.returns.map(r => r.at), ...deadlines);
    g.time = Math.max(g.time, boundary);
    // Work completed exactly on the deadline succeeds; work still in progress expires.
    if (g.work && g.work.ends <= g.time + EPSILON) completeWork(g);
    expireTickets(g);
    if (g.morale <= 0) { endGame(g); break; }
    const due = g.returns.filter(r => r.at <= g.time + EPSILON);
    g.returns = g.returns.filter(r => r.at > g.time + EPSILON);
    due.forEach(r => returnTicket(g, r));
    progressShift(g);
  }
}
export function drainEvents(g) { return g.events.splice(0); }
export function getRank(g) {
  if (g.morale <= 0) return { title: 'Out of office', line: 'The queue has seized the theatre. Management calls this audience participation.' };
  if (g.completion === 'practice') return { title: 'Practice Shift Complete', line: 'Keep building your diagnosis skills. Eight lasting normal fixes and a printer defeat unlock Sev 1 incidents.' };
  if (g.score >= (g.classId === 'faker' ? 5800 : 6200)) return { title: 'Incident Theatre Legend', line: 'A standing ovation. Even the printer rises, mostly because its stand is broken.' };
  if (g.score >= 4400) return { title: 'Master of the Ticket Bell', line: 'Chaos arrived with a speech. You sent it away with a working test case.' };
  if (g.score >= 2800) return { title: 'Queue Conjurer', line: 'A lovely performance. Please document the trick before your next holiday.' };
  return { title: 'Certified Survivor', line: 'The curtain falls. You are still standing. That counts as a successful show.' };
}
