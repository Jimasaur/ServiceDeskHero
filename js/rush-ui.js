import { createGame, advance, takeAction, selectTicket, drainEvents, getRank, DURATION, ACTIONS } from './rush-engine.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE = 'sdh_rush_v1';
let today = new Date().toISOString().slice(0,10);
let dailySeed = `rush-v1-${today}`;
let saved = {};
try { const parsed = JSON.parse(localStorage.getItem(STORE) || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed; } catch { /* Storage is optional. */ }
let relaxed = false, classId = 'engineer', game = null, previousTime = 0, lastTicketKey = '', lastQueueKey = '', toastTimer = 0, achievementTimer = 0;
let feed = [], audio = null, sound = saved.sound === true, resultRecorded = false, pointerActionTicket = null, pointerActionStage = undefined;
const validBest = mode => Number.isFinite(saved[mode]) && saved[mode] >= 0 ? Math.floor(saved[mode]) : 0;
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch { /* Play continues without persistence. */ } };
function beep(kind) {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const notes = kind === 'fix' ? [620, 880] : kind === 'wrong' ? [190, 140] : kind === 'end' ? [440, 554, 660, 880] : [430];
    notes.forEach((frequency, i) => {
      const osc = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + i * .08;
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, start); gain.gain.exponentialRampToValueAtTime(.001, start + .12);
      osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + .13);
    });
  } catch { /* Sound must never block gameplay. */ }
}
function renderSound() { $('sound-button').textContent = sound ? 'Sound on' : 'Sound off'; $('sound-button').setAttribute('aria-pressed', String(sound)); $('sound-button').setAttribute('aria-label', sound ? 'Disable sound' : 'Enable sound'); }
function renderLobby() {
  const best = validBest(`${relaxed ? 'easy' : 'rush'}-${classId}`);
  $('best-label').textContent = `Local best: ${best ? best.toLocaleString() : '—'}`;
  $('daily-label').textContent = `DAILY SHIFT · ${today.slice(5).replace('-', '/')}`;
  ['engineer-class','faker-class'].forEach((id,i) => { const selected = (i ? 'faker' : 'engineer') === classId; $(id).classList.toggle('selected',selected); $(id).setAttribute('aria-pressed', String(selected)); });
  ['standard-mode','relaxed-mode'].forEach((id,i) => { const selected = Boolean(i) === relaxed; $(id).classList.toggle('selected',selected); $(id).setAttribute('aria-pressed', String(selected)); });
}
function show(section) {
  for (const id of ['lobby','game','results']) $(id).hidden = id !== section;
  document.body.classList.toggle('playing', section === 'game');
}
function announce(text) { $('announcer').textContent = text; }
function toast(text, warning = false) {
  clearTimeout(toastTimer); $('outcome').textContent = text;
  $('outcome').className = `outcome visible${warning ? ' warning' : ''}`;
  toastTimer = setTimeout(() => $('outcome').classList.remove('visible'), 2900);
}
function addFeed(text, warning = false) {
  feed.unshift({text, warning}); feed = feed.slice(0,4);
  $('feed').innerHTML = feed.map(f => `<div class="feed-item${f.warning ? ' warning' : ''}"><span class="feed-symbol" aria-hidden="true">${f.warning ? '!' : '+'}</span><span>${escape(f.text)}</span></div>`).join('');
}
function handleEvents() {
  for (const event of drainEvents(game)) {
    if (event.type === 'achievement') {
      const achievement = event.achievement || event;
      clearTimeout(achievementTimer); $('achievement-banner').hidden = false;
      $('achievement-banner').innerHTML = `<span>NEW ACHIEVEMENT · +${achievement.points || 0}</span><strong>${escape(achievement.title || '')}</strong><p>${escape(achievement.description || '')}</p>`;
      achievementTimer = setTimeout(() => $('achievement-banner').hidden = true,4500);
      $('earned-achievements').innerHTML = game.achievements.map(a => `<span title="${escape(a.description)}">✦ ${escape(a.title)}</span>`).join('');
      beep('end');
    } else if (['boss-arrival','boss-stage','boss-defeated','bluff','narrator'].includes(event.type)) {
      if (event.text) { toast(event.text, event.type === 'bluff' && event.success === false); addFeed(event.text, event.type === 'boss-arrival'); $('chuck-message').textContent = event.text; }
      if (event.type === 'boss-arrival') beep('wrong');
    } else if (event.type === 'outcome') {
      const prefix = event.kind === 'fix' ? `+${event.points} · ${event.boss && !event.defeated ? "Stage cleared. " : "Fixed for good. "}` : event.kind === 'patch' ? '+55 · Back in 11s. ' : event.kind === 'assist' ? '+75 · Teamwork. ' : '−10 morale · Try another move. ';
      toast(prefix + event.text, event.kind === 'wrong');
      addFeed(`${event.title} · ${event.kind === 'fix' ? (event.boss && !event.defeated ? 'stage cleared' : 'resolved') : event.kind === 'patch' ? 'temporarily patched' : event.kind === 'assist' ? 'handled by teammate' : 'still broken'}`,event.kind === 'wrong');
      beep(event.kind); $('score-pop').textContent = event.points ? `+${event.points}` : '';
      if (event.streak === 3) $('chuck-message').textContent = '“Three correct moves. How upsetting. We had already drafted your replacement listing.”';
      if (event.streak === 6) $('chuck-message').textContent = '“Six in a row. Achievement unlocked: your reward is more responsibility.”';
    } else if (['expired','overflow','return'].includes(event.type)) {
      addFeed(event.text,true); toast(event.text,true); beep('wrong');
    } else if (event.type === 'phase') {
      toast(event.text); addFeed(event.text); beep('phase');
      $('chuck-message').textContent = event.phase === 1 ? '“The all-hands meeting is now an all-hands incident.”' : '“One last thing before you go…”';
      announce(event.text);
    } else if (event.type === 'arrival') addFeed(`New ticket · ${event.text}`);
    else if (event.type === 'end') finish();
  }
}
function start() {
  today = new Date().toISOString().slice(0,10); dailySeed = `rush-v1-${today}`;
  game = createGame(dailySeed, relaxed, classId); resultRecorded = false; lastTicketKey = ''; lastQueueKey = ''; feed = []; pointerActionTicket = null;
  $('chuck-message').textContent = '“Welcome, replaceable asset. Your suffering has been marked P3.”';
  clearTimeout(achievementTimer); $('achievement-banner').hidden = true; $('earned-achievements').innerHTML = '';
  $('score-pop').textContent = ''; $('share-status').textContent = ''; $('share-fallback').hidden = true;
  clearTimeout(toastTimer); $('outcome').classList.remove('visible');
  if ($('pause-dialog').open) $('pause-dialog').close();
  show('game'); previousTime = performance.now(); handleEvents(); render();
  $('actions').querySelector('button')?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'});
  announce('Shift started. Read the diagnostic clue and choose a response. Press P to pause.'); beep('start');
}
function render() {
  if (!game || game.status === 'finished') return;
  const left = Math.max(0, Math.ceil(DURATION-game.time));
  $('time').textContent = `${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
  $('time-fill').style.width = `${100*(1-game.time/DURATION)}%`;
  $('score').textContent = game.score.toLocaleString(); $('streak').innerHTML = `${game.streak}<span>×</span>`;
  $('streak-note').textContent = game.streak ? `+${Math.min(game.streak,5)*25} next fix` : 'Make it stick';
  $('morale-number').textContent = `${game.morale}%`; $('morale-fill').style.width = `${game.morale}%`;
  $('morale-meter').setAttribute('aria-valuenow',String(game.morale));
  $('morale-text').textContent = game.morale > 70 ? 'Cautiously optimistic' : game.morale > 35 ? 'The coffee is wearing off' : 'Updating the résumé';
  document.body.classList.toggle('low-morale',game.morale <= 35); document.body.classList.toggle('final-seconds',left <= 15);
  $('phase-name').textContent = ['MONDAY, 9:00 AM','THE ALL-HANDS MEETING','FRIDAY, 4:59 PM'][game.phase];
  $('shift-flavor').textContent = ['A quiet start. Suspiciously quiet.','More tickets. Same headcount.','“Just one quick question before you go.”'][game.phase];
  $('queue-count').textContent = `${game.queue.length} / 5`; $('next-arrival').textContent = `Next ticket in ${Math.max(0,Math.ceil(game.nextArrival-game.time))}s`;
  $('resolved-label').textContent = `${game.resolved} ticket${game.resolved === 1 ? '' : 's'} closed`;
  const queueKey = game.queue.map(t=>`${t.id}/${t.stage || 0}/${game.selected===t.id}`).join(',');
  if (queueKey !== lastQueueKey) {
    const focusedId = document.activeElement?.dataset.ticket;
    lastQueueKey = queueKey;
    $('queue').innerHTML = game.queue.length ? game.queue.map(t=>`<button class="queue-ticket${t.id===game.selected?' selected':''}${t.urgent?' urgent':''}${t.reopened?' reopened':''}" data-ticket="${t.id}" aria-pressed="${t.id===game.selected}" aria-label="${escape(t.source.title)}${t.urgent?', urgent':''}${t.reopened?', reopened':''}"><span class="queue-top"><span class="queue-priority">${t.boss ? `BOSS · ${t.stage}/2` : t.reopened?'REOPENED':t.urgent?'P1 · URGENT':'P2 · NORMAL'}</span><span>#${String(t.id).padStart(3,'0')}</span></span><h3>${escape(t.source.title)}</h3><span class="queue-user">${escape(t.source.user.split(' · ')[0])}</span><span class="queue-timer" data-timer="${t.id}"></span><span class="ticket-patience" data-patience="${t.id}"></span></button>`).join('') : '<p class="queue-empty">Nothing on fire. Yet.</p>';
    if (focusedId) $('queue').querySelector(`[data-ticket="${focusedId}"]`)?.focus({preventScroll:true});
  }
  for (const t of game.queue) {
    const remaining = Math.max(0,t.deadline-game.time), busy = game.work?.ticketId === t.id;
    const button = $('queue').querySelector(`[data-ticket="${t.id}"]`);
    button.querySelector('[data-timer]').textContent = busy ? 'IN PROGRESS' : `${Math.ceil(remaining)}s`;
    button.querySelector('[data-patience]').style.width = `${Math.min(100,remaining/t.patience*100)}%`;
    button.classList.toggle('danger',remaining < 7 && !busy);
    const accessible = `${t.source.title}${t.boss ? `, boss stage ${t.stage} of 2` : ''}${t.urgent ? ', urgent' : ''}${t.reopened ? ', reopened' : ''}, ${busy ? 'in progress' : `${Math.ceil(remaining)} seconds left`}`;
    if (button.getAttribute('aria-label') !== accessible) button.setAttribute('aria-label',accessible);
  }
  const ticket = game.queue.find(t=>t.id===game.selected);
  const key = ticket ? `${ticket.id}-${ticket.stage || 0}-${ticket.actions.map(a=>a.tried?'x':'o').join('')}` : 'empty';
  $('empty-ticket').hidden = Boolean(ticket); $('active-ticket').hidden = !ticket; $('action-area').hidden = !ticket;
  if (key !== lastTicketKey) {
    const hadActionFocus = $('actions').contains(document.activeElement);
    lastTicketKey = key;
    if (ticket) {
      $('active-ticket').innerHTML = `<div class="ticket-meta"><span class="pill ${ticket.urgent?'coral':'purple'}">${ticket.boss ? `BOSS BATTLE · STAGE ${ticket.stage}/2` : ticket.reopened?'REOPENED · AGAIN':ticket.urgent?'P1 · URGENT':'P2 · STANDARD'}</span><span>TICKET #${String(ticket.id).padStart(4,'0')}</span></div><div class="ticket-category"><span aria-hidden="true">${escape(ticket.source.icon)}</span>${escape(ticket.source.category)}</div><h2 id="ticket-title">${escape(ticket.source.title)}</h2><p class="user-quote">“${escape(ticket.source.quote)}”</p><span class="ticket-user">${escape(ticket.source.user)}</span><div class="clue"><span class="clue-label">DIAGNOSTIC CLUE</span><p>${escape(ticket.source.clue)}</p></div>`;
      $('actions').innerHTML = ticket.actions.map((a,i)=>`<button class="action-button" data-action="${i}" data-for-ticket="${ticket.id}" data-stage="${ticket.stage || 0}" ${a.tried?'disabled':''}><span class="action-number" aria-hidden="true">${i+1}</span><span class="action-label">${escape(a.label)}${a.tried?' · tried':''}</span><span class="action-duration">${ACTIONS[a.kind].seconds}s</span></button>`).join('');
      if (hadActionFocus) $('actions').querySelector('button:not([disabled])')?.focus({preventScroll:true});
      announce(`${ticket.source.title}. ${ticket.source.clue}`);
    }
  }
  $('actions').querySelectorAll('button').forEach((button,i)=>{button.disabled = !ticket || Boolean(game.work) || !!ticket?.actions[i]?.tried || game.status !== 'playing';});
  $('boss-status').hidden = !ticket?.boss;
  document.querySelector('.ticket-panel').classList.toggle('boss-active',Boolean(ticket?.boss));
  if (ticket?.boss) $('boss-status').innerHTML = `<span>TECH SKILL <b>${ticket.techSkill}/10</b></span><span>DIAGNOSIS <b>${ticket.stage}/2</b></span><span class="boss-health">${ticket.stage===1?'▰ ▰':'▱ ▰'}</span>`;
  $('bluff-button').hidden = !(ticket?.boss && classId === 'faker');
  $('bluff-button').disabled = !!game.work || !!ticket?.bluffed || game.status !== 'playing';
  $('bluff-description').textContent = ticket?.bluffed ? 'Bluff used. The problem still needs a real fix.' : `Your bluff skill: 4/10 · Boss tech skill: ${ticket?.techSkill || 0}/10 · Buys time, never fixes`;
  $('assist-button').disabled = Boolean(ticket?.boss) || !game.assists || Boolean(game.work) || game.status !== 'playing';
  $('assist-count').textContent = ticket?.boss ? 'Bosses need your expertise' : `${game.assists} left · +75 pts`;
  $('work-status').hidden = !game.work;
  if (game.work) {
    const work = game.work;
    $('work-label').textContent = 'Working on it…'; $('work-seconds').textContent = `${Math.max(0,work.ends-game.time).toFixed(1)}s`;
    $('work-fill').style.width = `${Math.min(100,100*(game.time-work.started)/(work.ends-work.started))}%`;
  }
}
function act(index, expected = game?.selected, stage = undefined) {
  if (game && takeAction(game,index,expected,stage)) { beep('click'); render(); }
}
function pause() {
  if (!game || game.status !== 'playing') return;
  // Apply time since the previous animation frame before pausing.
  advance(game,Math.max(0,(performance.now()-previousTime)/1000)); handleEvents();
  if (game.status === 'finished') return;
  game.status = 'paused'; render(); $('pause-dialog').showModal(); $('resume-button').focus();
}
function resume() {
  if (!game || game.status !== 'paused') return;
  game.status = 'playing'; previousTime = performance.now(); $('pause-dialog').close(); render(); $('pause-button').focus();
}
function finish(quit = false) {
  if (resultRecorded) return;
  resultRecorded = true;
  if (quit) { game.status = 'finished'; game.work = null; game.bonus = 0; }
  if ($('pause-dialog').open) $('pause-dialog').close();
  clearTimeout(toastTimer); $('outcome').classList.remove('visible');
  const rank = getRank(game), bestKey = `${relaxed ? 'easy' : 'rush'}-${classId}`;
  const isBest = !quit && game.score > validBest(bestKey);
  if (isBest) { saved[bestKey] = game.score; save(); }
  $('result-title').textContent = quit ? 'Clocked out early' : rank.title;
  $('result-line').textContent = quit ? 'Sometimes the correct escalation is a break.' : rank.line;
  $('result-status').textContent = quit ? 'SHIFT ENDED EARLY' : game.morale > 0 ? 'SHIFT SURVIVED' : 'MORALE HAS LEFT THE CHAT';
  $('result-mode').textContent = relaxed ? 'EASY SHIFT' : 'RUSH HOUR';
  $('final-score').textContent = game.score.toLocaleString(); $('new-best').hidden = !isBest;
  $('result-fixed').textContent = game.fixes; $('result-streak').textContent = game.bestStreak; $('result-morale').textContent = `${game.morale}%`;
  $('result-breakdown').textContent = `${game.patches} workarounds · ${game.assisted} assists · ${game.missed} missed · ${game.wrong} wrong moves. Morale bonus: +${game.bonus || 0}`;
  $('result-achievements').innerHTML = (game.achievements || []).map(a=>`<div><span>✦</span><strong>${escape(a.title)}</strong><span>+${a.points}</span></div>`).join('');
  $('result-breakdown').textContent += ` Bosses defeated: ${game.bossesDefeated || 0}/2.`;
  $('result-tip').textContent = game.patches >= 3 ? 'Workarounds buy time, but reopened tickets fill the queue. Try a lasting fix.' : game.missed >= 3 ? 'Triage tip: protect the shortest deadline. Teammate assists are instant breathing room.' : game.wrong >= 2 ? 'The clue is your friend. Pause any time to catch your breath.' : 'Clean fixes build a streak: up to +125 per fix, plus +50 for urgent tickets.';
  $('share-status').textContent = ''; $('share-fallback').hidden = true;
  show('results'); $('results').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); beep('end');
  document.body.classList.remove('low-morale','final-seconds'); renderLobby();
}
function frame(now) {
  if (game?.status === 'playing') { const dt = Math.max(0,(now-previousTime)/1000); previousTime = now; advance(game,dt); handleEvents(); render(); }
  requestAnimationFrame(frame);
}
$('start-button').addEventListener('click',start); $('replay-button').addEventListener('click',start);
$('engineer-class').addEventListener('click',()=>{classId='engineer';renderLobby();}); $('faker-class').addEventListener('click',()=>{classId='faker';renderLobby();});
$('standard-mode').addEventListener('click',()=>{relaxed=false;renderLobby();}); $('relaxed-mode').addEventListener('click',()=>{relaxed=true;renderLobby();});
$('menu-button').addEventListener('click',()=>{show('lobby');game=null;renderLobby();$('start-button').focus();});
$('sound-button').addEventListener('click',()=>{sound=!sound;saved.sound=sound;save();renderSound();beep('click');});
$('queue').addEventListener('click',e=>{const button=e.target.closest('[data-ticket]');if(button&&game&&selectTicket(game,Number(button.dataset.ticket)))render();});
// Bind clicks to the ticket visible at pointer-down; an expiring card cannot redirect the click.
$('actions').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-for-ticket]');pointerActionTicket=b?.dataset.forTicket ?? null;pointerActionStage=Number(b?.dataset.stage)||undefined;});
$('actions').addEventListener('pointercancel',()=>{pointerActionTicket=null;pointerActionStage=undefined;});
$('actions').addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button){const expected = pointerActionTicket ?? button.dataset.forTicket;const stage=pointerActionStage ?? (Number(button.dataset.stage)||undefined);pointerActionTicket=null;pointerActionStage=undefined;act(Number(button.dataset.action),Number(expected),stage);}});
function bindSpecialAction(id, action) {
  let pressed = null;
  const button = $(id);
  button.addEventListener('pointerdown',()=>{ const t=game?.queue.find(t=>t.id===game.selected); pressed=t ? {id:t.id,stage:t.stage} : null; });
  button.addEventListener('pointercancel',()=>{pressed=null;});
  button.addEventListener('click',e=>{ const t=game?.queue.find(t=>t.id===game.selected); const target=e.detail===0 ? (t ? {id:t.id,stage:t.stage} : null) : pressed; pressed=null; if(target)act(action,target.id,target.stage); });
}
bindSpecialAction('assist-button','assist'); bindSpecialAction('bluff-button','bluff');
$('pause-button').addEventListener('click',pause); $('resume-button').addEventListener('click',resume); $('quit-button').addEventListener('click',()=>finish(true));
$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>{if(game?.status==='playing')pause();});
document.addEventListener('keydown',e=>{
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const key=e.key.toLowerCase();
  if (!$('lobby').hidden && key==='enter' && (e.target===document.body || e.target===$('main'))) {e.preventDefault();start();return;}
  if (game?.status==='paused') {if(key==='p'){e.preventDefault();resume();}return;}
  if (game?.status!=='playing') return;
  if (key==='p' || key==='escape') {e.preventDefault();pause();return;}
  if (['1','2','3'].includes(key)) {e.preventDefault();act(Number(key)-1);}
  if (key==='q'||key==='e') {e.preventDefault();const index=game.queue.findIndex(t=>t.id===game.selected);const next=game.queue[(index+(key==='e'?1:-1)+game.queue.length)%game.queue.length];if(next){selectTicket(game,next.id);render();}}
});
$('share-button').addEventListener('click',async()=>{
  if (!game) return;
  const text=`Service Desk Hero · ${relaxed?'Easy Shift':'Rush Hour'}\n${game.score.toLocaleString()} points · ${game.fixes} lasting fixes · ${game.bestStreak} best streak\n${game.bossesDefeated || 0}/2 bosses · ${classId === 'faker' ? 'Fake It Till You Make It' : 'Root Cause Ranger'}
${today} daily shift. Can you beat my help desk?`;
  try {if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);$('share-status').textContent='Challenge copied. Send it to your on-call group.';}
  catch {$('share-fallback').value=text;$('share-fallback').hidden=false;$('share-fallback').focus();$('share-fallback').select();$('share-status').textContent='Select and copy your challenge text above.';}
});
renderLobby();renderSound();requestAnimationFrame(frame);
