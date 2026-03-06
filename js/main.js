/* ============================================================
   main.js — Core game engine, state, rendering, event handling
   Loaded as type="module". Reads GAME_DATA from window.
   ============================================================ */

// ── Wait for constants.js to populate window.GAME_DATA ──
const { CAREER, UPGRADES, HEROES, SKILLS, INCIDENTS, ACHIEVEMENTS } = window.GAME_DATA;
const SFX = window.SFX;

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let S = buildDefaultState();

function buildDefaultState() {
  return {
    // Resources
    tickets: 0,
    lifetimeTickets: 0,
    // Progression
    level: 1,
    xp: 0,
    xpRequired: 100,
    skillPoints: 0,
    // Career / prestige
    careerTier: 0,
    prestiges: 0,
    prestigeMultiplier: 1.0,
    strikes: 0,
    // Stats
    basePerClick: 1,
    basePerSec: 0,
    // Combo
    combo: 0,
    comboTimer: null,
    maxCombo: 0,
    // Skill unlocks (ids)
    unlockedSkills: [],
    // Upgrade ownership { id: count }
    upgradeOwned: {},
    // Hero state { id: { owned, level, xp, status, morale, absenceDays } }
    heroState: {},
    // Tracking day progression
    gameDay: 1,
    dayProgress: 0,
    // Heroes currently available for hire
    applicantPool: [],
    // Achievements earned
    achievedIds: [],
    // Stats for achievement checks
    incidentsResolved: 0,
    dispatches: 0,
    upgradesPurchased: 0,
    heroesOwned: 0,
    // Skill-driven modifiers
    skillMods: {
      perClick: 0,
      perSec: 0,
      perSecMult: 0,
      xpMult: 0,
      comboTime: 1.0,
      critChance: 0,
      critMult: 1,
      squadMult: 0,
      offlineHours: 4,
      prestigeMult: 1.0,
      globalMult: 1.0,
    },
    // Achievement-driven modifiers
    achMods: {
      perClick: 0,
      perSec: 0,
      clickMult: 0,
      globalMult: 0,
      squadMult: 0,
      prestigeMult: 0,
      skillPoints: 0,
    },
    // Timestamps
    lastSave: Date.now(),
    lastTick: Date.now(),
  };
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function fmt(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9 ).toFixed(2) + 'B';
  if (n >= 1e6)  return (n / 1e6 ).toFixed(2) + 'M';
  if (n >= 1e3)  return (n / 1e3 ).toFixed(2) + 'K';
  return Math.floor(n).toLocaleString();
}

function fmtDecimal(n, d = 1) {
  if (n >= 1e9)  return (n / 1e9).toFixed(d) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(d) + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(d) + 'K';
  return n.toFixed(d);
}

function xpForLevel(lvl) {
  return Math.floor(100 * Math.pow(lvl, 1.55));
}

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  document.getElementById('toast-area').appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 350);
  }, 2800);
}

function floatNumber(text, x, y) {
  const el = document.createElement('div');
  el.className = 'float-num';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  document.getElementById('float-layer').appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ══════════════════════════════════════════════════════════════
// DERIVED STATS
// ══════════════════════════════════════════════════════════════
function calcPerClick() {
  const sm = S.skillMods;
  const am = S.achMods;
  const base = S.basePerClick + sm.perClick + am.perClick;
  const clickMult = 1 + sm.critChance + am.clickMult; // rough clickMult
  const global = (1 + sm.globalMult + am.globalMult) * S.prestigeMultiplier;
  return Math.max(1, base * clickMult * global);
}

function calcPerSec() {
  const sm = S.skillMods;
  const am = S.achMods;
  // Base from upgrades
  let upgradePs = UPGRADES.reduce((acc, u) => {
    const owned = S.upgradeOwned[u.id] || 0;
    return acc + (u.perSecBonus || 0) * owned;
  }, 0);
  // Squad contribution
  let squadPs = 0;
  HEROES.forEach(h => {
    const hs = S.heroState[h.id];
    if (!hs || !hs.owned) return;
    if (hs.status && hs.status !== 'Active') return; // Out on crisis
    const lvlMult = 1 + (hs.level - 1) * 0.25;
    squadPs += h.baseCps * lvlMult;
  });
  squadPs *= (1 + sm.squadMult + am.squadMult);

  const flat = sm.perSec + am.perSec;
  const psMult = 1 + sm.perSecMult;
  const global = (1 + sm.globalMult + am.globalMult) * S.prestigeMultiplier;
  return (upgradePs + squadPs + flat) * psMult * global;
}

function calcXpGain(tickets) {
  const base = tickets * 0.1;
  const mult = 1 + S.skillMods.xpMult;
  // Sam Voss xpBoost
  const samBoost = (S.heroState['sam'] && S.heroState['sam'].owned) ? 1.5 : 1;
  return base * mult * samBoost;
}

// ══════════════════════════════════════════════════════════════
// CORE CLICK
// ══════════════════════════════════════════════════════════════
function handleClick(evt) {
  const sm = S.skillMods;
  let amount = calcPerClick();
  S.totalClicks = (S.totalClicks || 0) + 1;

  // Critical click
  if (sm.critChance > 0 && Math.random() < sm.critChance) {
    amount *= sm.critMult;
    floatNumber(`💥 CRIT! +${fmt(amount)}`, evt.clientX, evt.clientY);
    SFX.crit();
  } else {
    floatNumber(`+${fmt(amount)}`, evt.clientX, evt.clientY);
    SFX.click();
  }

  // Combo
  S.combo = Math.min(S.combo + 1, 200);
  if (S.combo > S.maxCombo) S.maxCombo = S.combo;
  const comboMult = 1 + (S.combo - 1) * 0.02;
  amount *= comboMult;
  if (S.combo > 1 && S.combo % 10 === 0) SFX.comboMilestone();

  // Reset combo timer
  clearTimeout(S.comboTimer);
  const comboMs = 1500 * S.skillMods.comboTime;
  S.comboTimer = setTimeout(() => { S.combo = 0; updateComboUI(); }, comboMs);

  gainTickets(amount);
  gainXp(calcXpGain(amount));
  updateComboUI();

  // Visual feedback
  const btn = document.getElementById('main-clicker');
  btn.classList.remove('click-animate');
  void btn.offsetWidth;
  btn.classList.add('click-animate');
  btn.addEventListener('animationend', () => btn.classList.remove('click-animate'), { once: true });

  // Burst
  const burst = document.querySelector('.click-burst');
  burst.classList.remove('pop');
  void burst.offsetWidth;
  burst.classList.add('pop');
  burst.addEventListener('animationend', () => burst.classList.remove('pop'), { once: true });

  checkAchievements();
}

// ══════════════════════════════════════════════════════════════
// GAIN FUNCTIONS
// ══════════════════════════════════════════════════════════════
function gainTickets(amount) {
  S.tickets += amount;
  S.lifetimeTickets += amount;
  renderStats();
  updateButtonStates();
}

function updateButtonStates() {
  document.querySelectorAll('.upgrade-card').forEach(card => {
    const id = card.dataset.upgrade;
    const u = UPGRADES.find(x => x.id === id);
    if (!u) return;
    const btn = card.querySelector('.btn-buy');
    if (btn) btn.disabled = S.tickets < upgradeCost(u);
  });
  document.querySelectorAll('.hero-card').forEach(card => {
    const id = card.dataset.hero;
    const h = HEROES.find(x => x.id === id);
    if (!h) return;
    const hs = S.heroState[id];
    if (hs && hs.owned) {
      const lvlUpCost = Math.floor(h.levelUpBaseCost * Math.pow(1.35, hs.level - 1));
      const btn = card.querySelector('.btn-levelup');
      if (btn) btn.disabled = S.tickets < lvlUpCost;
    } else {
      const btn = card.querySelector('.btn-recruit');
      if (btn) btn.disabled = S.tickets < h.recruitCost;
    }
  });
}

function gainXp(amount) {
  S.xp += amount;
  while (S.xp >= S.xpRequired) {
    S.xp -= S.xpRequired;
    S.level++;
    S.skillPoints++;
    S.xpRequired = xpForLevel(S.level);
    onLevelUp();
  }
  renderXpBar();
}

function onLevelUp() {
  SFX.levelUp();
  toast(`🎉 LEVEL UP! Now Level ${S.level}. +1 Skill Point!`, 'gold');
  const btn = document.getElementById('main-clicker');
  btn.classList.add('level-up-flash');
  btn.addEventListener('animationend', () => btn.classList.remove('level-up-flash'), { once: true });
  renderSkills();
  renderStats();
  checkAchievements();
}

// ══════════════════════════════════════════════════════════════
// TICK (Idle Income)
// ══════════════════════════════════════════════════════════════
let tickInterval = null;

function startTick() {
  tickInterval = setInterval(() => {
    const ps = calcPerSec();
    if (ps > 0) {
      const earned = ps / 10; // 100ms ticks
      gainTickets(earned);
      gainXp(calcXpGain(earned));
    }
    checkPromotionReady();
    checkAchievements();
    updateDay();
  }, 100);
}

function updateDay() {
  S.dayProgress += 1; // 100ms = 1 tick
  if (S.dayProgress >= 600) { // 60 seconds = 1 day
    S.dayProgress = 0;
    S.gameDay++;
    triggerDailyEvents();
    renderStats();
  }
}

function triggerDailyEvents() {
  const CRISIS_CHANCE = 0.05; // 5% chance per day someone has a crisis
  const statusOptions = [
    { name: 'Sick Kid', days: 3, msg: 'has a sick kid and is out for 3 days.' },
    { name: 'Vacation', days: 7, msg: 'is on vacation for a week!' },
    { name: 'Flu', days: 4, msg: 'caught the flu. Out for 4 days.' },
    { name: 'Family Crisis', days: 5, msg: 'has a family emergency. Out for 5 days.' },
    { name: 'Burnout', days: 2, msg: 'is feeling burnt out. Taking 2 mental health days.' },
  ];

  HEROES.forEach(h => {
    const hs = S.heroState[h.id];
    if (!hs || !hs.owned) return;

    // Handle existing absences
    if (hs.absenceDays > 0) {
      hs.absenceDays--;
      if (hs.absenceDays <= 0) {
        if (hs.status === 'Training' && hs.pendingSkill) {
          if (!h.skills) h.skills = [];
          h.skills.push(hs.pendingSkill);
          toast(`🎓 ${h.name} finished training: ${hs.pendingSkill}!`, 'gold');
          hs.pendingSkill = null;
        }
        hs.status = 'Active';
        hs.absenceDays = 0;
        toast(`✅ ${h.name} is back online!`, 'green');
        renderSquad();
      }
    }

    // Roll for new crisis if active
    if (hs.status === 'Active' && Math.random() < CRISIS_CHANCE) {
      const crisis = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      hs.status = crisis.name;
      hs.absenceDays = crisis.days;
      toast(`🚨 ${h.name} ${crisis.msg}`, 'red');
      SFX.error();
      renderSquad();
    }

    // Boredom decay (if active but not worked)
    if (hs.status === 'Active') {
      hs.daysSinceLastTask = (hs.daysSinceLastTask || 0) + 1;
      if (hs.daysSinceLastTask > 5) {
        const boredomDecay = Math.floor(hs.daysSinceLastTask / 5);
        hs.morale = Math.max(0, hs.morale - boredomDecay);
        if (S.gameDay % 5 === 0 && hs.daysSinceLastTask > 10) {
          toast(`😴 ${h.name} is getting bored...`, 'red');
        }
      }
    }

    // Resignation check
    if (hs.morale < 25) {
      const RESIGN_CHANCE = 0.15; // 15% chance per day if very low morale
      if (Math.random() < RESIGN_CHANCE) {
        toast(`⚠️ ${h.name} has RESIGNED due to low morale!`, 'red');
        hs.owned = false;
        S.heroesOwned--;
        SFX.error();
        renderSquad();
        renderStats();
        return; // Next hero
      }
    }
  });
}

function startTraining(heroId) {
  const h = HEROES.find(x => x.id === heroId);
  const hs = S.heroState[heroId];
  if (!h || !hs) return;

  const cost = 2500 * (h.skills.length + 1); // Cost scales with skill count
  if (S.tickets < cost) {
    toast(`Not enough tickets for training! (${fmt(cost)}🎫)`, 'red');
    SFX.error();
    return;
  }

  S.tickets -= cost;
  hs.status = 'Training';
  hs.absenceDays = 3; // Training takes 3 days
  
  // Pick a new random skill from a global list if they don't have it
  const potentialSkills = ["Automation", "AI/ML", "Cloud Native", "Security Pro", "Diagnostics", "Process Optimization", "Documentation"];
  const newSkill = potentialSkills.find(s => !h.skills.includes(s));
  
  if (newSkill) {
    toast(`🎓 ${h.name} started training for: ${newSkill}!`, 'gold');
    // We'll actually add the skill once training finishes
    hs.pendingSkill = newSkill;
  } else {
    toast(`🎓 ${h.name} is staying sharp!`, 'gold');
  }

  renderSquad();
  renderStats();
  SFX.purchase();
}

// ══════════════════════════════════════════════════════════════
// UPGRADES
// ══════════════════════════════════════════════════════════════
function upgradeCost(upgrade) {
  const owned = S.upgradeOwned[upgrade.id] || 0;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, owned));
}

function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id);
  if (!u) return;
  const cost = upgradeCost(u);
  if (S.tickets < cost) {
    const card = document.querySelector(`[data-upgrade="${id}"]`);
    if (card) { card.classList.remove('shake-animate'); void card.offsetWidth; card.classList.add('shake-animate'); }
    SFX.error();
    toast('Not enough tickets!', 'red');
    return;
  }
  S.tickets -= cost;
  S.upgradeOwned[u.id] = (S.upgradeOwned[u.id] || 0) + 1;
  S.upgradesPurchased++;
  if (u.perClickBonus) S.basePerClick += u.perClickBonus;
  SFX.purchase();
  toast(`✅ Purchased: ${u.name}`, 'green');
  renderUpgrades();
  renderStats();
  checkAchievements();
}

// ══════════════════════════════════════════════════════════════
// SQUAD / HEROES
// ══════════════════════════════════════════════════════════════
function recruitHero(id) {
  const h = HEROES.find(x => x.id === id);
  if (!h) return;
  if (S.tickets < h.recruitCost) {
    SFX.error();
    toast('Not enough tickets to recruit!', 'red');
    return;
  }
  S.tickets -= h.recruitCost;
  S.heroState[id] = { owned: true, level: 1, xp: 0, status: 'Active', morale: 100, absenceDays: 0 };
  S.applicantPool = S.applicantPool.filter(appId => appId !== id);
  S.heroesOwned++;
  SFX.recruit();
  toast(`🦸 ${h.name} joined your squad!`, 'gold');
  renderSquad();
  renderStats();
  checkAchievements();
}

function refreshJobBoard(cost = 0) {
  if (cost > 0 && S.tickets < cost) {
    SFX.error();
    toast('Not enough tickets to refresh the board!', 'red');
    return;
  }
  if (cost > 0) S.tickets -= cost;
  
  // Find all heroes we don't own yet
  const unowned = HEROES.filter(h => !(S.heroState[h.id] && S.heroState[h.id].owned));
  
  // If we own everyone, don't crash
  if (unowned.length === 0) {
    S.applicantPool = [];
    if (cost > 0) toast('There is no one left to hire!', 'gold');
    renderSquad();
    return;
  }
  
  // Pick up to 4 random heroes
  const poolSize = Math.min(4, unowned.length);
  S.applicantPool = [];
  const shuffled = [...unowned].sort(() => 0.5 - Math.random());
  for (let i = 0; i < poolSize; i++) {
    S.applicantPool.push(shuffled[i].id);
  }
  
  if (cost > 0) {
    SFX.purchase();
    toast('Job board refreshed!', 'green');
    renderStats();
  }
  renderSquad();
}

function levelUpHero(id) {
  const h = HEROES.find(x => x.id === id);
  const hs = S.heroState[id];
  if (!h || !hs) return;
  const cost = Math.floor(h.levelUpBaseCost * Math.pow(1.35, hs.level - 1));
  if (S.tickets < cost) {
    toast('Not enough tickets to level up!', 'red');
    return;
  }
  S.tickets -= cost;
  hs.level++;
  toast(`⬆️ ${h.name} is now Level ${hs.level}!`, 'green');
  renderSquad();
  renderStats();
}

// ══════════════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════════════
function buySkill(id) {
  const skill = SKILLS.find(s => s.id === id);
  if (!skill) return;
  if (S.unlockedSkills.includes(id)) { toast('Already unlocked!'); return; }
  const prereqsMet = skill.requires.every(r => S.unlockedSkills.includes(r));
  if (!prereqsMet) { SFX.error(); toast('Unlock prerequisites first!', 'red'); return; }
  if (S.skillPoints < skill.cost) { SFX.error(); toast('Not enough Skill Points!', 'red'); return; }
  S.skillPoints -= skill.cost;
  S.unlockedSkills.push(id);
  applySkillEffect(skill);
  SFX.skillUnlock();
  toast(`🧠 Skill Unlocked: ${skill.name}!`, 'gold');
  const node = document.querySelector(`[data-skill="${id}"]`);
  if (node) {
    node.classList.add('skill-unlock-ripple');
    node.addEventListener('animationend', () => node.classList.remove('skill-unlock-ripple'), { once: true });
  }
  renderSkills();
  renderStats();
}

function applySkillEffect(skill) {
  const e = skill.effect;
  const sm = S.skillMods;
  if (e.perClick)    sm.perClick    += e.perClick;
  if (e.perSec)      sm.perSec      += e.perSec;
  if (e.perSecMult)  sm.perSecMult  += e.perSecMult;
  if (e.xpMult)      sm.xpMult      += e.xpMult;
  if (e.comboTime)   sm.comboTime   = sm.comboTime * e.comboTime;
  if (e.critChance)  sm.critChance  += e.critChance;
  if (e.critMult)    sm.critMult     = e.critMult;
  if (e.squadMult)   sm.squadMult   += e.squadMult;
  if (e.offlineHours)sm.offlineHours = e.offlineHours;
  if (e.prestigeMult)sm.prestigeMult = sm.prestigeMult * e.prestigeMult;
  if (e.globalMult)  sm.globalMult  += e.globalMult;
}

function reapplyAllSkills() {
  S.skillMods = {
    perClick: 0, perSec: 0, perSecMult: 0, xpMult: 0,
    comboTime: 1.0, critChance: 0, critMult: 1,
    squadMult: 0, offlineHours: 4, prestigeMult: 1.0, globalMult: 1.0,
  };
  S.unlockedSkills.forEach(id => {
    const sk = SKILLS.find(s => s.id === id);
    if (sk) applySkillEffect(sk);
  });
}

// ══════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ══════════════════════════════════════════════════════════════
function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (S.achievedIds.includes(a.id)) return;
    let current = 0;
    if (a.stat === 'lifetime')  current = S.lifetimeTickets;
    if (a.stat === 'heroes')    current = S.heroesOwned;
    if (a.stat === 'upgrades')  current = S.upgradesPurchased;
    if (a.stat === 'incidents') current = S.incidentsResolved;
    if (a.stat === 'dispatches') current = S.dispatches;
    if (a.stat === 'maxCombo')  current = S.maxCombo;
    if (a.stat === 'prestiges') current = S.prestiges;
    if (a.stat === 'level')     current = S.level;
    if (current >= a.goal) {
      S.achievedIds.push(a.id);
      applyAchievementBonus(a);
      SFX.achievement();
      toast(`🏅 Achievement Unlocked: ${a.name}! (${a.reward})`, 'gold');
      const card = document.querySelector(`[data-achievement="${a.id}"]`);
      if (card) { card.classList.add('achieved', 'ach-unlock-flash'); }
    }
    updateAchievementProgress(a, current);
  });
  document.getElementById('skill-points-label').textContent = `${S.skillPoints} SP available`;
}

function applyAchievementBonus(a) {
  const b = a.bonus;
  const am = S.achMods;
  if (b.perClick)    am.perClick    += b.perClick;
  if (b.perSec)      am.perSec      += b.perSec;
  if (b.clickMult)   am.clickMult   += b.clickMult;
  if (b.globalMult)  am.globalMult  += b.globalMult;
  if (b.squadMult)   am.squadMult   += b.squadMult;
  if (b.prestigeMult)am.prestigeMult+= b.prestigeMult;
  if (b.skillPoints) { S.skillPoints += b.skillPoints; }
}

function reapplyAllAchievements() {
  S.achMods = { perClick:0, perSec:0, clickMult:0, globalMult:0, squadMult:0, prestigeMult:0, skillPoints:0 };
  S.achievedIds.forEach(id => {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) applyAchievementBonus(a);
  });
}

// ══════════════════════════════════════════════════════════════
// CAREER / PRESTIGE
// ══════════════════════════════════════════════════════════════
function checkPromotionReady() {
  const nextTier = CAREER[S.careerTier + 1];
  if (!nextTier) return; // Already CIO
  const panel = document.getElementById('promotion-panel');
  if (S.lifetimeTickets >= nextTier.xpRequired) {
    panel.classList.remove('hidden');
    document.getElementById('promo-description').textContent =
      `You've proven yourself. Accept promotion to ${nextTier.icon} ${nextTier.title} and gain ×${nextTier.prestigeBonus} permanent bonus. (Tickets reset, squad and upgrades stay!)`;
  } else {
    panel.classList.add('hidden');
  }
}

function doPromotion() {
  const nextTier = CAREER[S.careerTier + 1];
  if (!nextTier) return;
  S.careerTier++;
  S.prestiges++;
  S.prestigeMultiplier = nextTier.prestigeBonus * (1 + S.achMods.prestigeMult + S.skillMods.prestigeMult - 1);
  S.strikes = 0;
  // Soft reset
  S.tickets = 0;
  S.lifetimeTickets = 0;
  S.xp = 0;
  S.level = 1;
  S.skillPoints = Math.floor(S.prestiges * 2);
  S.xpRequired = xpForLevel(1);
  S.upgradeOwned = {};
  S.basePerClick = 1;
  S.basePerSec = 0;
  reapplyAllSkills();
  reapplyAllAchievements();
  SFX.promotion();
  toast(`🚀 PROMOTED to ${nextTier.icon} ${nextTier.title}! Bonus: ×${nextTier.prestigeBonus}`, 'gold');
  if (S.careerTier === CAREER.length - 1) {
    toast('🏆 YOU ARE THE CIO! The ultimate achievement unlocked!', 'gold');
  }
  document.getElementById('promotion-panel').classList.add('hidden');
  renderAll();
}

function addStrike() {
  S.strikes = (S.strikes || 0) + 1;
  renderStats();
  if (S.strikes >= 3) {
    firePlayer();
  } else {
    toast(`⚠️ STRIKE ${S.strikes} / 3! Handle incidents or get fired!`, 'red');
    SFX.error();
  }
}

function firePlayer() {
  S.strikes = 0;
  S.tickets = 0;
  S.lifetimeTickets = 0;
  S.xp = 0;
  S.level = 1;
  S.careerTier = 0;
  S.skillPoints = Math.floor(S.prestiges * 2);
  S.xpRequired = xpForLevel(1);
  S.upgradeOwned = {};
  S.heroState = {};
  S.basePerClick = 1;
  S.basePerSec = 0;
  reapplyAllSkills();
  reapplyAllAchievements();
  SFX.error();
  document.getElementById('fired-modal').classList.remove('hidden');
  renderAll();
}

// ══════════════════════════════════════════════════════════════
// INCIDENTS + DISPATCH SYSTEM
// ══════════════════════════════════════════════════════════════
let activeIncident = null;
let incidentCountdown = null;

function triggerIncident() {
  if (activeIncident) return;
  const inc = INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)];
  activeIncident = { ...inc, timeLeft: inc.timeLimit };
  const banner = document.getElementById('incident-banner');
  document.getElementById('incident-icon').textContent = inc.icon;
  document.getElementById('incident-text').textContent  = inc.title + ' — Tap RESPOND NOW!';
  document.getElementById('incident-timer').textContent = `${inc.timeLimit}s`;
  banner.classList.remove('hidden');
  SFX.incident();
  incidentCountdown = setInterval(() => {
    if (!activeIncident) { clearInterval(incidentCountdown); return; }
    activeIncident.timeLeft--;
    document.getElementById('incident-timer').textContent = `${activeIncident.timeLeft}s`;
    const cn = document.getElementById('dispatch-countdown-num');
    if (cn) cn.textContent = activeIncident.timeLeft;
    if (activeIncident.timeLeft <= 0) dismissIncident(false);
  }, 1000);
}

function dismissIncident(resolved, silently = false) {
  clearInterval(incidentCountdown);
  document.getElementById('incident-banner').classList.add('hidden');
  closeDispatchModal();
  if (!resolved && !silently) {
    toast('⚠️ Incident abandoned! That is a strike!', 'red');
    addStrike();
  } else if (!resolved) {
    // Silent dismiss
  }
  activeIncident = null;
}

// ── Dispatch Modal ──────────────────────────────────────────
function calcSkillMatch(hero, incident) {
  const reqSkills = incident.requiredSkills || [];
  if (reqSkills.length === 0) return { label: '✅ All Capable', cls: 'all', mult: 1.5 };
  const matches = (hero.skills || []).filter(s => reqSkills.includes(s)).length;
  if (matches >= 2) return { label: '🎯 Perfect Match', cls: 'perfect', mult: 3.0 };
  if (matches === 1) return { label: '👍 Good Match',   cls: 'good',    mult: 2.0 };
  return                     { label: '⚠️ Out of Element', cls: 'weak', mult: 0.6 };
}

function openDispatchModal() {
  if (!activeIncident) return;
  const inc = activeIncident;

  // Populate header
  document.getElementById('dispatch-inc-icon').textContent  = inc.icon;
  document.getElementById('dispatch-inc-title').textContent = inc.title;
  document.getElementById('dispatch-inc-text').textContent  = inc.text;
  document.getElementById('dispatch-countdown-num').textContent = inc.timeLeft;

  // Required skills
  const reqEl = document.getElementById('dispatch-required-skills');
  reqEl.innerHTML = (inc.requiredSkills || []).length
    ? (inc.requiredSkills).map(s => `<span class="skill-badge match">${s}</span>`).join('')
    : '<span style="color:var(--text-muted);font-size:0.8rem">Any hero can handle this</span>';

  // Hero list
  const heroListEl = document.getElementById('dispatch-hero-list');
  heroListEl.innerHTML = '';
  const ownedHeroes = HEROES.filter(h => S.heroState[h.id]?.owned);

  if (ownedHeroes.length === 0) {
    heroListEl.innerHTML = '<div class="dispatch-no-heroes">No heroes recruited yet — handle it yourself or recruit from the Squad tab first!</div>';
  } else {
    ownedHeroes.forEach(h => {
      const hs = S.heroState[h.id] || { status: 'Active' };
      const match = calcSkillMatch(h, inc);
      const item = document.createElement('div');
      item.className = `dispatch-hero-item ${hs.status !== 'Active' ? 'disabled' : ''}`;
      const skillBadges = (h.skills || []).map(s => {
        const isMatch = (inc.requiredSkills || []).includes(s);
        return `<span class="skill-badge${isMatch ? ' match' : ''}">${s}</span>`;
      }).join('');
      
      const isDisabled = hs.status !== 'Active';
      const statusText = isDisabled ? `<span class="dispatch-status-out">${hs.status}</span>` : '';

      item.innerHTML = `
        <span class="dispatch-hero-emoji">${h.emoji}</span>
        <div class="dispatch-hero-info">
          <div class="dispatch-hero-name">${h.name} ${statusText}</div>
          <div class="dispatch-hero-role">${h.role}</div>
          <div class="dispatch-skills-row">${skillBadges}</div>
        </div>
        <div class="dispatch-match-label ${match.cls}">${match.label}</div>
        <button class="btn-dispatch-hero" data-hero="${h.id}" ${isDisabled ? 'disabled' : ''}>
          ${isDisabled ? 'Out' : 'Dispatch'}
        </button>
      `;
      if (!isDisabled) {
        item.querySelector('.btn-dispatch-hero').addEventListener('click', () => dispatchHeroToIncident(h.id));
      }
      heroListEl.appendChild(item);
    });
  }

  document.getElementById('dispatch-modal').classList.remove('hidden');
}

function closeDispatchModal() {
  document.getElementById('dispatch-modal').classList.add('hidden');
}

function dispatchHeroToIncident(heroId) {
  if (!activeIncident) return;
  const inc   = activeIncident;
  const hero  = HEROES.find(h => h.id === heroId);
  if (!hero) return;

  const match      = calcSkillMatch(hero, inc);
  const rewardBase = Math.max(calcPerSec() * inc.rewardMult * 10, 500);
  const reward     = Math.floor(rewardBase * match.mult);

  dismissIncident(false, true); // clears banner/modal/timer safely
  S.dispatches++;
  
  // Impact morale and track activity
  const hs = S.heroState[heroId];
  hs.daysSinceLastTask = 0; // Reset boredom

  if (match.cls === 'weak') {
    hs.morale = Math.max(0, (hs.morale || 100) - 15);
    toast(`📉 ${hero.name} is frustrated by the unsuitable task!`, 'red');
  } else {
    hs.morale = Math.min(100, (hs.morale || 100) + 5);
  }

  toast(`📡 ${hero.emoji} ${hero.name} dispatched! Resolving...`, 'gold');

  const resolveTime = 2000 + Math.random() * 2000;
  setTimeout(() => {
    gainTickets(reward);
    gainXp(calcXpGain(reward));
    S.incidentsResolved++;
    toast(`✅ ${hero.name}: ${match.label} — +${fmt(reward)} tickets!`, 'green');
    checkAchievements();
  }, resolveTime);
}

// ── Handle Myself → Minigame ───────────────────────────────────
let mgState = null;

function handleSelf() {
  if (!activeIncident) return;
  closeDispatchModal();
  openMinigame(activeIncident);
}

function openMinigame(inc) {
  // Dismiss banner & pause incident timer — keep activeIncident for reward
  clearInterval(incidentCountdown);
  document.getElementById('incident-banner').classList.add('hidden');

  const clicksNeeded = Math.max(15, Math.min(40, Math.round(inc.rewardMult * 3.5)));
  const timeLimit    = Math.min(inc.timeLeft, 15);
  const baseReward   = Math.max(calcPerSec() * inc.rewardMult * 6, 300);

  mgState = { inc, clicksNeeded, timeLimit, timeLeft: timeLimit,
              clicksMade: 0, progress: 0, baseReward, done: false, timer: null };

  // Populate
  document.getElementById('minigame-icon').textContent    = inc.icon;
  document.getElementById('minigame-title').textContent   = inc.title;
  document.getElementById('minigame-subtitle').textContent =
    `Mash to resolve — need ${clicksNeeded} clicks before time runs out!`;
  document.getElementById('minigame-timer').textContent   = `${timeLimit}s`;
  document.getElementById('minigame-bar').style.width     = '0%';
  document.getElementById('minigame-bar-label').textContent = '0%';
  document.getElementById('minigame-click-counter').innerHTML =
    `Clicks: <strong>0 / ${clicksNeeded}</strong>`;
  document.getElementById('minigame-reward-preview').innerHTML =
    `Reward: <strong>${fmt(Math.floor(baseReward * 0.5))}–${fmt(Math.floor(baseReward * 2))} tickets</strong>`;
  document.getElementById('btn-minigame-resolve').classList.add('hidden');
  document.getElementById('minigame-active').classList.remove('hidden');
  document.getElementById('minigame-result').classList.add('hidden');
  document.getElementById('minigame-panel').classList.remove('urgent');
  document.getElementById('minigame-timer').classList.remove('urgent');
  document.getElementById('btn-minigame-click').classList.remove('urgent');
  document.getElementById('minigame-bar').classList.remove('urgent');
  document.getElementById('minigame-modal').classList.remove('hidden');

  mgState.timer = setInterval(() => {
    if (mgState.done) return;
    mgState.timeLeft--;
    document.getElementById('minigame-timer').textContent = `${mgState.timeLeft}s`;
    if (mgState.timeLeft <= 5) {
      document.getElementById('minigame-panel').classList.add('urgent');
      document.getElementById('minigame-timer').classList.add('urgent');
      document.getElementById('btn-minigame-click').classList.add('urgent');
      document.getElementById('minigame-bar').classList.add('urgent');
    }
    if (mgState.timeLeft <= 0) endMinigame(false);
  }, 1000);
}

function onMinigameClick() {
  if (!mgState || mgState.done) return;
  mgState.clicksMade++;
  mgState.progress = Math.min(mgState.clicksMade / mgState.clicksNeeded, 1);
  SFX.minigameClick();
  const pct = Math.round(mgState.progress * 100);
  document.getElementById('minigame-bar').style.width     = pct + '%';
  document.getElementById('minigame-bar-label').textContent = pct + '%';
  document.getElementById('minigame-click-counter').innerHTML =
    `Clicks: <strong>${mgState.clicksMade} / ${mgState.clicksNeeded}</strong>`;
  const previewReward = Math.floor(mgState.baseReward * (0.5 + mgState.progress * 1.5));
  document.getElementById('minigame-reward-preview').innerHTML =
    `Current Reward: <strong>${fmt(previewReward)} tickets</strong>`;
  if (mgState.progress >= 1) {
    document.getElementById('btn-minigame-resolve').classList.remove('hidden');
    endMinigame(true);
  }
}

function endMinigame(success) {
  if (!mgState) return;
  mgState.done = true;
  clearInterval(mgState.timer);
  const mult   = success ? (0.5 + mgState.progress * 1.8) : (mgState.progress * 0.5);
  const reward = Math.max(Math.floor(mgState.baseReward * mult), success ? 50 : 0);

  document.getElementById('minigame-active').classList.add('hidden');
  document.getElementById('minigame-result').classList.remove('hidden');
  const titleEl = document.getElementById('minigame-result-title');
  const emojiEl = document.getElementById('minigame-result-emoji');

  if (success || mgState.progress >= 1) {
    emojiEl.textContent = '🎉'; titleEl.textContent = 'INCIDENT RESOLVED!';
    titleEl.className = 'minigame-result-title success';
    document.getElementById('minigame-result-reward').textContent = `+${fmt(reward)} tickets earned!`;
    SFX.minigameWin();
  } else if (mgState.progress >= 0.5) {
    emojiEl.textContent = '😅'; titleEl.textContent = 'Partially Resolved';
    titleEl.className = 'minigame-result-title success';
    document.getElementById('minigame-result-reward').textContent =
      `Salvaged +${fmt(reward)} tickets (${Math.round(mgState.progress*100)}% complete)`;
    SFX.minigameWin();
  } else {
    emojiEl.textContent = '💀'; titleEl.textContent = 'INCIDENT FAILED!';
    titleEl.className = 'minigame-result-title failed';
    document.getElementById('minigame-result-reward').textContent =
      `Only ${Math.round(mgState.progress*100)}% resolved. You gained a STRIKE.`;
    SFX.minigameFail();
    addStrike();
  }

  if (reward > 0) { gainTickets(reward); gainXp(calcXpGain(reward)); }
  S.incidentsResolved++;
  activeIncident = null;
  mgState = null;
  checkAchievements();
}

function closeMinigame() {
  if (mgState && !mgState.done) { clearInterval(mgState.timer); mgState = null; }
  activeIncident = null;
  document.getElementById('minigame-modal').classList.add('hidden');
}

// ── Schedule incidents every 30-90 seconds ──
function scheduleNextIncident() {
  const delay = 30_000 + Math.random() * 60_000;
  setTimeout(() => { triggerIncident(); scheduleNextIncident(); }, delay);
}

// ══════════════════════════════════════════════════════════════
// OFFLINE INCOME
// ══════════════════════════════════════════════════════════════
function calcOfflineIncome() {
  const now = Date.now();
  const elapsed = (now - (S.lastTick || now)) / 1000; // seconds
  const maxSeconds = S.skillMods.offlineHours * 3600;
  const credited = Math.min(elapsed, maxSeconds);
  if (credited > 60) {
    const income = calcPerSec() * credited * 0.5; // 50% efficiency offline
    gainTickets(income);
    toast(`💤 Welcome back! Earned ${fmt(income)} tickets while away.`, 'gold');
  }
  S.lastTick = now;
}

// ══════════════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════════════
function renderStats() {
  const ps = calcPerSec();
  const pc = calcPerClick();
  document.getElementById('tickets-display').textContent  = fmt(S.tickets);
  document.getElementById('lifetime-display').textContent = fmt(S.lifetimeTickets);
  document.getElementById('per-click-display').textContent= fmtDecimal(pc);
  document.getElementById('per-sec-display').textContent  = fmtDecimal(ps);
  document.getElementById('per-min-display').textContent  = fmtDecimal(ps * 60);
  document.getElementById('prestige-display').textContent = S.prestiges;
  document.getElementById('prestige-bonus-display').textContent = `×${S.prestigeMultiplier.toFixed(2)}`;
  
  // Day display (new)
  const dayEl = document.getElementById('game-day-label');
  if (dayEl) dayEl.textContent = `Day ${S.gameDay}`;

  // Strikes display
  const strikesRow = document.getElementById('strikes-row');
  if (strikesRow) {
    if (S.strikes > 0) {
      strikesRow.style.display = 'flex';
      document.getElementById('strikes-display').textContent = `${S.strikes} / 3`;
    } else {
      strikesRow.style.display = 'none';
    }
  }
  
  document.getElementById('click-power-label').textContent = `+${fmtDecimal(pc)} ticket${pc !== 1 ? 's' : ''}`;

  // Career progress bar
  const tier = CAREER[S.careerTier];
  const nextTier = CAREER[S.careerTier + 1];
  if (nextTier) {
    const pct = Math.min(S.lifetimeTickets / nextTier.xpRequired * 100, 100);
    document.getElementById('career-progress-bar').style.width = pct + '%';
  } else {
    document.getElementById('career-progress-bar').style.width = '100%';
  }
  document.getElementById('career-title').textContent = `${tier.icon} ${tier.title}`;
}

function renderXpBar() {
  const pct = Math.min(S.xp / S.xpRequired * 100, 100);
  document.getElementById('xp-bar').style.width = pct + '%';
  document.getElementById('xp-label').textContent = `${fmt(S.xp)} / ${fmt(S.xpRequired)} XP`;
  document.getElementById('hero-level').textContent = S.level;
}

function updateComboUI() {
  const el = document.getElementById('combo-meter');
  if (S.combo <= 1) {
    el.classList.add('hidden');
  } else {
    el.classList.remove('hidden');
    document.getElementById('combo-count').textContent = `×${S.combo}`;
  }
}

function renderUpgrades() {
  const container = document.getElementById('upgrades-list');
  container.innerHTML = '';
  UPGRADES.forEach(u => {
    const owned = S.upgradeOwned[u.id] || 0;
    const cost  = upgradeCost(u);
    const canAfford = S.tickets >= cost;
    const div = document.createElement('div');
    div.className = 'upgrade-card';
    div.dataset.upgrade = u.id;
    const bonusTags = [];
    if (u.perClickBonus) bonusTags.push(`<span class="upgrade-tag">+${u.perClickBonus} /click</span>`);
    if (u.perSecBonus)   bonusTags.push(`<span class="upgrade-tag green">+${fmtDecimal(u.perSecBonus)} /sec</span>`);
    div.innerHTML = `
      <span class="upgrade-icon">${u.icon}</span>
      <div class="upgrade-info">
        <div class="upgrade-name">${u.name}</div>
        <div class="upgrade-desc">${u.desc}</div>
        <div class="upgrade-stats">${bonusTags.join('')}</div>
        <div class="upgrade-owned">Owned: ${owned}</div>
      </div>
      <button class="btn-buy" ${canAfford ? '' : 'disabled'}>${fmt(cost)} 🎫</button>
    `;
    div.querySelector('.btn-buy').addEventListener('click', () => buyUpgrade(u.id));
    container.appendChild(div);
  });
}

function renderSquad() {
  const rosterEl   = document.getElementById('squad-roster');
  const recruitEl  = document.getElementById('recruit-roster');
  rosterEl.innerHTML  = '';
  recruitEl.innerHTML = '';

  HEROES.forEach(h => {
    const hs = S.heroState[h.id];
    if (hs && hs.owned) {
      const card = buildHeroCard(h, hs, true);
      rosterEl.appendChild(card);
    }
  });

  S.applicantPool.forEach(id => {
    const h = HEROES.find(x => x.id === id);
    if (!h) return;
    const card = buildHeroCard(h, null, false);
    recruitEl.appendChild(card);
  });

  if (rosterEl.children.length === 0) {
    rosterEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No heroes recruited yet. Hire from the Available Recruits below!</p>';
  }
}

function buildHeroCard(h, hs, owned) {
  const card = document.createElement('div');
  card.className = `hero-card ${h.rarity}`;
  card.dataset.hero = h.id;

  const rarityColors = { common:'#9ea5d1', uncommon:'#4ade80', rare:'#3b82f6', epic:'#a78bfa', legendary:'#ffc94b' };
  const rarityColor  = rarityColors[h.rarity] || '#fff';

  // Skill badges on owned hero cards
  if (owned) {
    const lvl = hs.level;
    const lvlUpCost = Math.floor(h.levelUpBaseCost * Math.pow(1.35, lvl - 1));
    const trainCost = 2500 * ((h.skills || []).length + 1);
    const cpsContrib = fmtDecimal(h.baseCps * (1 + (lvl - 1) * 0.25));
    const skillBadges = (h.skills || []).map(s => `<span class="skill-badge">${s}</span>`).join('');
    
    if (hs.morale === undefined) hs.morale = 100;
    const moraleColor = hs.morale > 70 ? 'var(--green)' : hs.morale > 30 ? 'var(--gold)' : 'var(--red)';
    const statusClass = hs.status === 'Active' ? 'status-active' : 'status-out';

    card.innerHTML = `
      <div class="hero-card-top">
        <span class="hero-emoji">${h.emoji}</span>
        <div class="hero-meta">
          <div class="hero-card-name">${h.name} <span class="hero-status-pill ${statusClass}">${hs.status}</span></div>
          <div class="hero-card-role">${h.role}</div>
          <div class="hero-card-rarity" style="color:${rarityColor}">${h.rarity.toUpperCase()}</div>
        </div>
      </div>
      <div class="hero-skills-row">${skillBadges}</div>
      <div class="hero-card-stats">
        <div class="hero-stat">Level<span>${lvl}</span></div>
        <div class="hero-stat">Tickets/sec<span>${hs.status === 'Active' ? cpsContrib : '0'}</span></div>
      </div>
      <div class="hero-morale-wrap">
        <div class="hero-morale-label">Morale: ${hs.morale}%</div>
        <div class="hero-morale-bar-bg"><div class="hero-morale-bar" style="width:${hs.morale}%; background:${moraleColor}"></div></div>
      </div>
      <div class="hero-lvl-bar-wrap"><div class="hero-lvl-bar" style="width:${Math.min((lvl/20)*100,100)}%"></div></div>
      <div class="hero-card-actions" style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button class="btn-hero btn-levelup" ${S.tickets >= lvlUpCost ? '' : 'disabled'}>Lvl Up (${fmt(lvlUpCost)}🎫)</button>
        <button class="btn-hero btn-train" ${S.tickets >= trainCost && hs.status === 'Active' ? '' : 'disabled'}>Train (${fmt(trainCost)}🎫)</button>
      </div>
    `;
    card.querySelector('.btn-levelup').addEventListener('click', () => levelUpHero(h.id));
    card.querySelector('.btn-train').addEventListener('click', () => startTraining(h.id));
  } else {
    const skillBadges = (h.skills || []).map(s => `<span class="skill-badge">${s}</span>`).join('');
    card.innerHTML = `
      <div class="hero-card-top">
        <span class="hero-emoji">${h.emoji}</span>
        <div class="hero-meta">
          <div class="hero-card-name">${h.name}</div>
          <div class="hero-card-role">${h.role}</div>
          <div class="hero-card-rarity" style="color:${rarityColor}">${h.rarity.toUpperCase()}</div>
        </div>
      </div>
      <div class="hero-skills-row">${skillBadges}</div>
      <p style="font-size:0.79rem;color:var(--text-dim);margin:0 0 8px;">${h.desc}</p>
      <div class="hero-card-stats">
        <div class="hero-stat">Base CPS<span>${h.baseCps}</span></div>
        <div class="hero-stat">Cost<span>${fmt(h.recruitCost)}🎫</span></div>
      </div>
      <div class="hero-card-actions">
        <button class="btn-hero btn-recruit" ${S.tickets >= h.recruitCost ? '' : 'disabled'}>Recruit</button>
      </div>
    `;
    card.querySelector('.btn-recruit').addEventListener('click', () => recruitHero(h.id));
  }
  return card;
}

function renderSkills() {
  const tree = document.getElementById('skill-tree');
  tree.innerHTML = '';
  SKILLS.forEach(sk => {
    const unlocked = S.unlockedSkills.includes(sk.id);
    const prereqsMet = sk.requires.every(r => S.unlockedSkills.includes(r));
    const affordable = S.skillPoints >= sk.cost && !unlocked && prereqsMet;
    const locked = !prereqsMet && !unlocked;
    const node = document.createElement('div');
    node.className = `skill-node${unlocked ? ' unlocked' : ''}${locked ? ' locked' : ''}${affordable ? ' affordable' : ''}`;
    node.dataset.skill = sk.id;
    const prereqNames = sk.requires.map(r => SKILLS.find(s => s.id === r)?.name || r).join(', ');
    node.innerHTML = `
      <div class="skill-icon">${sk.icon}</div>
      <div class="skill-name">${sk.name}</div>
      <div class="skill-desc">${sk.desc}</div>
      ${sk.requires.length ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">Requires: ${prereqNames}</div>` : ''}
      <div class="skill-cost">${unlocked ? '✓ Unlocked' : `${sk.cost} SP`}</div>
    `;
    if (!unlocked && !locked) node.addEventListener('click', () => buySkill(sk.id));
    tree.appendChild(node);
  });
  document.getElementById('skill-points-label').textContent = `${S.skillPoints} SP available`;
}

function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const achieved = S.achievedIds.includes(a.id);
    let current = 0;
    if (a.stat === 'lifetime')  current = S.lifetimeTickets;
    if (a.stat === 'heroes')    current = S.heroesOwned;
    if (a.stat === 'upgrades')  current = S.upgradesPurchased;
    if (a.stat === 'incidents') current = S.incidentsResolved;
    if (a.stat === 'dispatches') current = S.dispatches;
    if (a.stat === 'maxCombo')  current = S.maxCombo;
    if (a.stat === 'prestiges') current = S.prestiges;
    if (a.stat === 'level')     current = S.level;
    const pct = Math.min(current / a.goal * 100, 100);
    const card = document.createElement('div');
    card.className = `achievement-card${achieved ? ' achieved' : ''}`;
    card.dataset.achievement = a.id;
    card.innerHTML = `
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
      <div class="ach-progress-wrap"><div class="ach-progress-bar" style="width:${pct}%"></div></div>
      <div class="ach-progress-label">${fmt(current)} / ${fmt(a.goal)}</div>
      <div class="ach-reward">${achieved ? '✅ ' : '🔒 '}${a.reward}</div>
    `;
    grid.appendChild(card);
  });
}

function updateAchievementProgress(a, current) {
  const card = document.querySelector(`[data-achievement="${a.id}"]`);
  if (!card) return;
  const pct = Math.min(current / a.goal * 100, 100);
  const bar = card.querySelector('.ach-progress-bar');
  if (bar) bar.style.width = pct + '%';
  const lbl = card.querySelector('.ach-progress-label');
  if (lbl) lbl.textContent = `${fmt(current)} / ${fmt(a.goal)}`;
}

// ══════════════════════════════════════════════════════════════
// STATS TAB
// ══════════════════════════════════════════════════════════════
function renderStatsTab() {
  const el = document.getElementById('stats-content');
  if (!el) return;
  const tier = CAREER[S.careerTier];
  const ps = calcPerSec();
  const pc = calcPerClick();
  const totalClicks = S.totalClicks || 0;
  const playTime = getPlayTimeStr();
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><span class="stat-card-icon">🖥️</span><div class="stat-card-label">Current Title</div><div class="stat-card-value">${tier.icon} ${tier.title}</div></div>
      <div class="stat-card"><span class="stat-card-icon">⭐</span><div class="stat-card-label">Level</div><div class="stat-card-value">${S.level}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🎫</span><div class="stat-card-label">Current Tickets</div><div class="stat-card-value">${fmt(S.tickets)}</div></div>
      <div class="stat-card"><span class="stat-card-icon">📊</span><div class="stat-card-label">Lifetime Tickets</div><div class="stat-card-value">${fmt(S.lifetimeTickets)}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🖱️</span><div class="stat-card-label">Total Clicks</div><div class="stat-card-value">${fmt(totalClicks)}</div></div>
      <div class="stat-card"><span class="stat-card-icon">⚡</span><div class="stat-card-label">Per Click</div><div class="stat-card-value">${fmtDecimal(pc)}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🔄</span><div class="stat-card-label">Per Second</div><div class="stat-card-value">${fmtDecimal(ps)}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🏆</span><div class="stat-card-label">Promotions</div><div class="stat-card-value">${S.prestiges}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🔥</span><div class="stat-card-label">Best Combo</div><div class="stat-card-value">×${S.maxCombo}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🚨</span><div class="stat-card-label">Incidents Resolved</div><div class="stat-card-value">${S.incidentsResolved}</div></div>
      <div class="stat-card"><span class="stat-card-icon">📡</span><div class="stat-card-label">Dispatches</div><div class="stat-card-value">${S.dispatches}</div></div>
      <div class="stat-card"><span class="stat-card-icon">👥</span><div class="stat-card-label">Heroes Recruited</div><div class="stat-card-value">${S.heroesOwned} / ${HEROES.length}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🛒</span><div class="stat-card-label">Upgrades Purchased</div><div class="stat-card-value">${S.upgradesPurchased}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🧠</span><div class="stat-card-label">Skills Unlocked</div><div class="stat-card-value">${S.unlockedSkills.length} / ${SKILLS.length}</div></div>
      <div class="stat-card"><span class="stat-card-icon">🏅</span><div class="stat-card-label">Achievements</div><div class="stat-card-value">${S.achievedIds.length} / ${ACHIEVEMENTS.length}</div></div>
      <div class="stat-card"><span class="stat-card-icon">⏱️</span><div class="stat-card-label">Play Time</div><div class="stat-card-value">${playTime}</div></div>
    </div>
  `;
}

function getPlayTimeStr() {
  const started = S.gameStarted || Date.now();
  const ms = Date.now() - started;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ══════════════════════════════════════════════════════════════
// EXPORT / IMPORT / SHARE
// ══════════════════════════════════════════════════════════════
function exportSave() {
  saveGame();
  const data = localStorage.getItem(SAVE_KEY);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `servicedeskhero_save_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('💾 Save exported!', 'green');
}

function importSave() {
  document.getElementById('import-file-input').click();
}

function handleImportFile(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.lifetimeTickets && data.lifetimeTickets !== 0) throw new Error('Invalid save');
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      loadGame();
      calcOfflineIncome();
      renderAll();
      toast('📂 Save imported successfully!', 'green');
    } catch (err) {
      toast('❌ Invalid save file!', 'red');
    }
  };
  reader.readAsText(file);
  evt.target.value = '';
}

function shareStats() {
  const tier = CAREER[S.careerTier];
  const ps = calcPerSec();
  const text = [
    `🖥️ Service Desk Hero — Career Stats`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `${tier.icon} Title: ${tier.title}`,
    `⭐ Level: ${S.level}`,
    `🏆 Promotions: ${S.prestiges}`,
    `🎫 Lifetime Tickets: ${fmt(S.lifetimeTickets)}`,
    `⚡ Tickets/sec: ${fmtDecimal(ps)}`,
    `🔥 Best Combo: ×${S.maxCombo}`,
    `🚨 Incidents Resolved: ${S.incidentsResolved}`,
    `🏅 Achievements: ${S.achievedIds.length}/${ACHIEVEMENTS.length}`,
    ``,
    `Play at www.servicedeskhero.com`
  ].join('\n');
  navigator.clipboard.writeText(text).then(() => {
    toast('📋 Stats copied to clipboard!', 'green');
  }).catch(() => {
    toast('❌ Could not copy to clipboard', 'red');
  });
}

// ══════════════════════════════════════════════════════════════
// HELP MODAL
// ══════════════════════════════════════════════════════════════
function openHelp() {
  document.getElementById('help-modal').classList.remove('hidden');
}
function closeHelp() {
  document.getElementById('help-modal').classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════
// SOUND TOGGLE
// ══════════════════════════════════════════════════════════════
function toggleSound() {
  const on = SFX.toggle();
  document.getElementById('btn-sound').textContent = on ? '🔊' : '🔇';
  localStorage.setItem('sdh_sound', on ? '1' : '0');
}

function loadSoundPref() {
  const pref = localStorage.getItem('sdh_sound');
  if (pref === '0') {
    SFX.enabled = false;
    document.getElementById('btn-sound').textContent = '🔇';
  }
}

function renderAll() {
  renderStats();
  renderXpBar();
  renderUpgrades();
  renderSquad();
  renderSkills();
  renderAchievements();
  renderStatsTab();
  checkPromotionReady();
}

// ══════════════════════════════════════════════════════════════
// SAVE / LOAD
// ══════════════════════════════════════════════════════════════
const SAVE_KEY = 'sdh_save_v2';

function saveGame() {
  S.lastSave = Date.now();
  S.lastTick = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  const ind = document.getElementById('save-indicator');
  ind.textContent = '💾 Saved';
  ind.style.color = 'var(--green)';
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    const defaults = buildDefaultState();
    // Carefully merge nested objects so we don't overwrite new defaults with undefined
    const merged = Object.assign({}, defaults, saved);
    merged.skillMods = Object.assign({}, defaults.skillMods, saved.skillMods || {});
    merged.heroState = Object.assign({}, defaults.heroState, saved.heroState || {});
    merged.upgradeOwned = Object.assign({}, defaults.upgradeOwned, saved.upgradeOwned || {});
    S = merged;
    // Restore non-serializable (timers)
    S.comboTimer = null;
    // Re-apply modifiers from scratch to avoid double-stacking
    reapplyAllSkills();
    reapplyAllAchievements();
  } catch(e) {
    console.error('Failed to load save:', e);
  }
}

let _resetPending = false;
function resetGame() {
  const btn = document.getElementById('btn-reset');
  if (!_resetPending) {
    // First click: arm the button
    _resetPending = true;
    btn.textContent = 'Sure? Click again';
    btn.style.background = 'rgba(248,113,113,0.25)';
    setTimeout(() => {
      if (_resetPending) {
        _resetPending = false;
        btn.textContent = 'Reset';
        btn.style.background = '';
      }
    }, 3000);
    return;
  }
  // Second click: actually reset
  _resetPending = false;
  btn.textContent = 'Reset';
  btn.style.background = '';

  // Stop the tick so it doesn't re-save over the cleared state
  clearInterval(tickInterval);
  tickInterval = null;

  localStorage.removeItem(SAVE_KEY);
  S = buildDefaultState();

  renderAll();
  startTick();
  toast('💀 Game reset. Fresh start!', 'red');
}

// ── Auto-save every 30s ──
setInterval(saveGame, 30_000);

// ══════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // Re-render active tab for freshness
      if (btn.dataset.tab === 'squad')        renderSquad();
      if (btn.dataset.tab === 'upgrades')     renderUpgrades();
      if (btn.dataset.tab === 'skills')       renderSkills();
      if (btn.dataset.tab === 'achievements') renderAchievements();
      if (btn.dataset.tab === 'stats')        renderStatsTab();
    });
  });
}

// ══════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════
(function init() {
  loadGame();
  // Ensure gameStarted is tracked
  if (!S.gameStarted) S.gameStarted = Date.now();
  if (!S.totalClicks) S.totalClicks = 0;
  if (!S.applicantPool || S.applicantPool.length === 0) refreshJobBoard(0);
  calcOfflineIncome();
  initTabs();
  loadSoundPref();
  renderAll();
  startTick();
  scheduleNextIncident();

  // Show help on first visit
  if (!localStorage.getItem('sdh_seen_help')) {
    openHelp();
    localStorage.setItem('sdh_seen_help', '1');
  }

  // Event bindings
  document.getElementById('btn-refresh-board').addEventListener('click', () => refreshJobBoard(500));
  document.getElementById('main-clicker').addEventListener('click', handleClick);
  document.getElementById('btn-save').addEventListener('click', saveGame);
  document.getElementById('btn-reset').addEventListener('click', resetGame);
  document.getElementById('btn-promote').addEventListener('click', doPromotion);
  document.getElementById('btn-sound').addEventListener('click', toggleSound);
  document.getElementById('btn-help').addEventListener('click', openHelp);
  document.getElementById('btn-close-help').addEventListener('click', closeHelp);
  document.getElementById('help-overlay').addEventListener('click', closeHelp);
  // Incident: RESPOND NOW opens dispatch modal
  document.getElementById('incident-resolve').addEventListener('click', openDispatchModal);
  // Dispatch modal: self-handle + overlay close
  document.getElementById('dispatch-self-btn').addEventListener('click', handleSelf);
  document.getElementById('dispatch-overlay').addEventListener('click', closeDispatchModal);
  // Minigame: click button + close/continue
  document.getElementById('btn-minigame-click').addEventListener('click', onMinigameClick);
  document.getElementById('btn-minigame-close').addEventListener('click', closeMinigame);
  document.getElementById('btn-share').addEventListener('click', shareStats);
  document.getElementById('btn-export').addEventListener('click', exportSave);
  document.getElementById('btn-import').addEventListener('click', importSave);
  document.getElementById('import-file-input').addEventListener('change', handleImportFile);
  
  // Fired Modal
  document.getElementById('btn-accept-fired').addEventListener('click', () => {
    document.getElementById('fired-modal').classList.add('hidden');
  });

  // Auto-save on window close or refresh
  window.addEventListener('beforeunload', saveGame);
})();
