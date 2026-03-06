/* ============================================================
   constants.js — All static game data
   ============================================================ */

window.GAME_DATA = (() => {

  // ── Career Tiers (Expanded 14-tier pyramid) ──
  // The XP required scales steeply so that reaching CIO is a multi-hour commitment.
  const CAREER = [
    { id: 0, title: "Analyst I",              xpRequired: 1_000,          prestigeBonus: 1.0,   icon: "🔋" },
    { id: 1, title: "Analyst II",             xpRequired: 3_500,          prestigeBonus: 1.15,  icon: "🔧" },
    { id: 2, title: "Analyst III",            xpRequired: 10_000,         prestigeBonus: 1.35,  icon: "⚙️" },
    { id: 3, title: "Analyst IV",             xpRequired: 25_000,         prestigeBonus: 1.6,   icon: "🛠️" },
    { id: 4, title: "Analyst V",              xpRequired: 60_000,         prestigeBonus: 1.9,   icon: "🖥️" },
    { id: 5, title: "Team Lead",              xpRequired: 150_000,        prestigeBonus: 2.25,  icon: "👔" },
    { id: 6, title: "Manager",                xpRequired: 400_000,        prestigeBonus: 2.7,   icon: "📊" },
    { id: 7, title: "Senior Manager",         xpRequired: 1_000_000,      prestigeBonus: 3.25,  icon: "💼" },
    { id: 8, title: "Director",               xpRequired: 2_500_000,      prestigeBonus: 3.9,   icon: "🏢" },
    { id: 9, title: "Senior Director",        xpRequired: 6_000_000,      prestigeBonus: 4.65,  icon: "🏙️" },
    { id: 10,title: "Junior VP",              xpRequired: 15_000_000,     prestigeBonus: 5.5,   icon: "📈" },
    { id: 11,title: "VP of Technology",       xpRequired: 35_000_000,     prestigeBonus: 6.5,   icon: "🚀" },
    { id: 12,title: "Senior VP",              xpRequired: 80_000_000,     prestigeBonus: 7.75,  icon: "💎" },
    { id: 13,title: "CIO",                    xpRequired: Infinity,       prestigeBonus: 10.0,  icon: "👑" },
  ];

  // ── Upgrades ──
  const UPGRADES = [
    { id: "macros",      name: "Macro Library",            icon: "⌨️", desc: "Canned responses for common issues. Fingers fly faster.",               baseCost: 50,        perClickBonus: 1,  costScale: 1.18, tier: 1 },
    { id: "coffee",      name: "Bottomless Coffee Pot",    icon: "☕", desc: "Infinite caffeine. Infinite focus. Infinite tickets.",                  baseCost: 150,       perSecBonus: 1.5,  costScale: 1.18, tier: 1 },
    { id: "dual_monitor",name: "Dual Monitors",            icon: "🖥️", desc: "Double the screen, double the throughput.",                             baseCost: 400,       perClickBonus: 3,  perSecBonus: 2,  costScale: 1.18, tier: 1 },
    { id: "kb_shortcut", name: "KB Article Shortcuts",     icon: "📋", desc: "Pre-built knowledge base links. One click, solved.",                   baseCost: 900,       perClickBonus: 6,  costScale: 1.18, tier: 2 },
    { id: "ai_triage",   name: "AI Triage Assistant",      icon: "🤖", desc: "AI sorts P1–P3's, putting Chuck on escalations only.",                  baseCost: 2_500,     perSecBonus: 12,   costScale: 1.18, tier: 2 },
    { id: "automation",  name: "Automation Playbooks",     icon: "📜", desc: "Self-healing scripts resolve incidents before users notice.",           baseCost: 6_000,     perSecBonus: 30,   perClickBonus: 5, costScale: 1.18, tier: 2 },
    { id: "war_room",    name: "War Room Setup",           icon: "🎯", desc: "Dedicated incident bridge. All hands, all fast.",                      baseCost: 15_000,    perSecBonus: 75,   costScale: 1.18, tier: 3 },
    { id: "monitoring",  name: "Proactive Monitoring Suite",icon:"📡", desc: "Catch fires before they start. MTTD drops to zero.",                   baseCost: 40_000,    perSecBonus: 180,  perClickBonus: 10, costScale: 1.18, tier: 3 },
    { id: "chatbot",     name: "Self-Service Chatbot",     icon: "💬", desc: "Deflects 40% of tickets before they touch human hands.",               baseCost: 100_000,   perSecBonus: 450,  costScale: 1.18, tier: 3 },
    { id: "cloud_auto",  name: "Cloud Automation Pipeline",icon: "☁️", desc: "Serverless functions handle provisioning around the clock.",            baseCost: 300_000,   perSecBonus: 1_200, perClickBonus: 25, costScale: 1.18, tier: 4 },
    { id: "ai_ops",      name: "AIOps Platform",           icon: "🧠", desc: "ML correlates events across 500 systems simultaneously.",              baseCost: 1_000_000, perSecBonus: 4_000, costScale: 1.18, tier: 4 },
    { id: "quantum_sla", name: "Quantum SLA Engine",       icon: "⚡", desc: "Predictive SLA breach prevention. Customers never know it happened.",  baseCost: 5_000_000, perSecBonus: 15_000, perClickBonus: 100, costScale: 1.18, tier: 4 },
  ];

  // ── Squad Heroes (with skills) ──
  const HEROES = window.RECRUIT_POOL || [];

  // ── Skill Tree ──
  const SKILLS = [
    { id: "fast_fingers", name: "Fast Fingers",      icon: "✋", cost: 1, row: 0, col: 0, requires: [],           desc: "Clicks produce +2 tickets each.",          effect: { perClick: 2 } },
    { id: "speed_read",   name: "Speed Reader",      icon: "👁️", cost: 1, row: 0, col: 1, requires: [],           desc: "+20% auto-resolve speed.",                 effect: { perSecMult: 0.20 } },
    { id: "coffee_drip",  name: "Coffee Drip",       icon: "☕", cost: 1, row: 0, col: 2, requires: [],           desc: "+0.5 tickets/sec passive.",                effect: { perSec: 0.5 } },
    { id: "macro_god",    name: "Macro God",         icon: "⌨️", cost: 2, row: 1, col: 0, requires: ["fast_fingers"], desc: "+5 per click flat.",                   effect: { perClick: 5 } },
    { id: "surge",        name: "Surge Mode",        icon: "⚡", cost: 2, row: 1, col: 1, requires: ["speed_read"], desc: "Combo meter lasts 50% longer.",          effect: { comboTime: 1.5 } },
    { id: "xp_boost",     name: "XP Accelerator",   icon: "📈", cost: 2, row: 1, col: 2, requires: ["coffee_drip"], desc: "Earn +30% XP per ticket.",              effect: { xpMult: 0.30 } },
    { id: "crit_click",   name: "Critical Click",   icon: "💥", cost: 3, row: 2, col: 0, requires: ["macro_god"],  desc: "5% chance of 10× click bonus.",          effect: { critChance: 0.05, critMult: 10 } },
    { id: "dispatch",     name: "Dispatch Protocol", icon: "📡", cost: 3, row: 2, col: 1, requires: ["surge"],     desc: "Squad produces +25% more tickets.",      effect: { squadMult: 0.25 } },
    { id: "overtime",     name: "Overtime Mode",     icon: "🌙", cost: 3, row: 2, col: 2, requires: ["xp_boost"],  desc: "Offline income tracked up to 12 hours.", effect: { offlineHours: 12 } },
    { id: "automation_ai",name: "Deep Automation",  icon: "🤖", cost: 4, row: 3, col: 0, requires: ["crit_click","dispatch"], desc: "+100 tickets/sec flat.",       effect: { perSec: 100 } },
    { id: "prestige_plus",name: "Prestige Amplifier",icon:"🏆", cost: 4, row: 3, col: 1, requires: ["dispatch","overtime"],   desc: "Each promotion bonus ×1.5.",  effect: { prestigeMult: 1.5 } },
    { id: "cio_vision",   name: "CIO Vision",       icon: "👁️‍🗨️", cost: 5, row: 3, col: 2, requires: ["automation_ai","prestige_plus"], desc: "All production ×2.", effect: { globalMult: 2.0 } },
  ];

  // ── Incidents — 18 total, from clerical to highly technical ──
  const INCIDENTS = [
    // ── Highly Technical ──────────────────────────────────────────
    {
      id: "srv_down",   icon: "🔴", category: "critical",
      title: "Production Server Down!",
      text: "PROD is on fire. 10,000 users can't connect. Every second costs $5,000.",
      requiredSkills: ["Highly Technical", "Infrastructure"],
      rewardMult: 8, timeLimit: 30,
    },
    {
      id: "breach",     icon: "🚨", category: "security",
      title: "Security Breach Detected",
      text: "Unknown actor inside the perimeter. Lateral movement detected across 3 subnets.",
      requiredSkills: ["Security Pro", "Zero-Day"],
      rewardMult: 10, timeLimit: 25,
    },
    {
      id: "db_lock",    icon: "🗄️", category: "database",
      title: "Database Deadlock",
      text: "500 transactions stuck. The order queue is frozen. Finance is unhinged.",
      requiredSkills: ["Database Expert", "Highly Technical"],
      rewardMult: 6, timeLimit: 35,
    },
    {
      id: "ddos",       icon: "🌊", category: "network",
      title: "DDoS Attack",
      text: "Inbound traffic is 50× normal. The load balancer is melting.",
      requiredSkills: ["Network Expert", "Security Pro"],
      rewardMult: 9, timeLimit: 28,
    },
    {
      id: "dns",        icon: "📡", category: "network",
      title: "DNS Failure",
      text: "Half the internet thinks you don't exist. DNS propagation is chaos.",
      requiredSkills: ["Network Expert", "Infrastructure"],
      rewardMult: 7, timeLimit: 32,
    },
    {
      id: "k8s_melt",   icon: "⚓", category: "devops",
      title: "Kubernetes Meltdown",
      text: "Pods are crash-looping across all regions. CrashLoopBackOff everywhere.",
      requiredSkills: ["DevOps", "Highly Technical"],
      rewardMult: 9, timeLimit: 30,
    },
    {
      id: "ransomware", icon: "💀", category: "security",
      title: "Ransomware Attack",
      text: "Files are encrypting on 200 workstations. Attacker wants 5 BTC. Isolate NOW.",
      requiredSkills: ["Security Pro", "Penetration Testing"],
      rewardMult: 12, timeLimit: 22,
    },
    {
      id: "db_corrupt", icon: "⚠️", category: "database",
      title: "Database Corruption",
      text: "Indexes are corrupt after a botched migration. 3 days of data at risk.",
      requiredSkills: ["Database Expert", "Query Optimization"],
      rewardMult: 11, timeLimit: 35,
    },
    {
      id: "cloud_bill", icon: "💸", category: "cloud",
      title: "Cloud Cost Explosion",
      text: "AWS bill jumped $80K overnight. A runaway Lambda is burning money.",
      requiredSkills: ["Cloud Native", "Highly Technical"],
      rewardMult: 7, timeLimit: 40,
    },
    {
      id: "api_limit",  icon: "🔌", category: "devops",
      title: "API Gateway Meltdown",
      text: "Rate limits hit. 1,200 downstream services timing out. SLA breach in 5 min.",
      requiredSkills: ["Highly Technical", "Cloud Native"],
      rewardMult: 8, timeLimit: 28,
    },
    {
      id: "cert_exp",   icon: "📜", category: "security",
      title: "SSL Certificate Expired",
      text: "Browsers red-flagging the whole site. Customer trust is evaporating.",
      requiredSkills: ["Security Pro", "Infrastructure"],
      rewardMult: 6, timeLimit: 30,
    },
    // ── Network / Mid-tier ─────────────────────────────────────────
    {
      id: "vpn_fail",   icon: "🔑", category: "network",
      title: "VPN Outage",
      text: "2,000 remote workers offline. CEO can't connect and is calling personally.",
      requiredSkills: ["Network Expert", "Infrastructure"],
      rewardMult: 5, timeLimit: 40,
    },
    {
      id: "wifi_conf",  icon: "📶", category: "network",
      title: "Conference Room WiFi Down",
      text: "Board presentation in 10 minutes. WiFi dead in every conference room.",
      requiredSkills: ["Network Expert", "Diagnostics"],
      rewardMult: 3, timeLimit: 45,
    },
    {
      id: "phishing",   icon: "🎣", category: "security",
      title: "Phishing Campaign Live",
      text: "300 users clicked a malicious link. Credentials may be compromised.",
      requiredSkills: ["Security Pro", "Customer Service"],
      rewardMult: 6, timeLimit: 35,
    },
    {
      id: "backup",     icon: "💾", category: "critical",
      title: "Backup Failure",
      text: "3 days of backups silent. DR audit is next week. Panic is setting in.",
      requiredSkills: ["Highly Technical", "Infrastructure"],
      rewardMult: 5, timeLimit: 45,
    },
    // ── Clerical / Mid-tier ────────────────────────────────────────
    {
      id: "pw_tsunami", icon: "🔑", category: "clerical",
      title: "Password Reset Tsunami",
      text: "Forced rotation hit 800 users at once. The help desk phone won't stop.",
      requiredSkills: ["Clerical Savant", "Customer Service"],
      rewardMult: 4, timeLimit: 50,
    },
    {
      id: "compliance", icon: "📋", category: "clerical",
      title: "Compliance Audit Surprise",
      text: "Auditors arrived early. They want evidence for 120 controls by 3pm.",
      requiredSkills: ["Compliance", "Documentation"],
      rewardMult: 5, timeLimit: 45,
    },
    {
      id: "printer",    icon: "🖨️", category: "clerical",
      title: "Printer Apocalypse",
      text: "Every printer on floor 3 decided today is a great day to stop working.",
      requiredSkills: ["Clerical Savant", "Diagnostics"],
      rewardMult: 2, timeLimit: 60,
    },
  ];

  // ── Achievements ──
  const ACHIEVEMENTS = [
    { id: "first_ticket", icon: "🎫", name: "First Ticket",        desc: "Resolve your first ticket.",          goal: 1,        stat: "lifetime",   reward: "🎯 +1 click power",      bonus: { perClick: 1 } },
    { id: "century",      icon: "💯", name: "The Century",         desc: "Resolve 100 tickets.",                goal: 100,      stat: "lifetime",   reward: "⚡ +5% global speed",     bonus: { globalMult: 0.05 } },
    { id: "kilo",         icon: "🎖️", name: "1K Hero",             desc: "Resolve 1,000 tickets.",             goal: 1_000,    stat: "lifetime",   reward: "⚡ +1.5 tickets/sec",    bonus: { perSec: 1.5 } },
    { id: "tenk",         icon: "🥇", name: "10K Marathoner",      desc: "Resolve 10,000 tickets.",            goal: 10_000,   stat: "lifetime",   reward: "💥 +10% click power",    bonus: { clickMult: 0.10 } },
    { id: "hundredk",     icon: "🏆", name: "100K Legend",         desc: "Resolve 100,000 tickets.",           goal: 100_000,  stat: "lifetime",   reward: "🚀 +20% all production",  bonus: { globalMult: 0.20 } },
    { id: "million",      icon: "💎", name: "Millionaire",         desc: "Resolve 1,000,000 tickets.",         goal: 1_000_000,stat: "lifetime",   reward: "⭐ +50% all production",  bonus: { globalMult: 0.50 } },
    { id: "squad_first",  icon: "👥", name: "First Recruit",       desc: "Hire your first squad member.",      goal: 1,        stat: "heroes",     reward: "📡 +10% squad speed",    bonus: { squadMult: 0.10 } },
    { id: "full_squad",   icon: "🦸", name: "Full Squad",          desc: "Recruit all 9 heroes.",              goal: 9,        stat: "heroes",     reward: "🔥 +35% squad speed",    bonus: { squadMult: 0.35 } },
    { id: "upgrade5",     icon: "🔧", name: "Upgrade Addict",      desc: "Purchase 5 upgrades.",               goal: 5,        stat: "upgrades",   reward: "🛒 +5% click power",     bonus: { clickMult: 0.05 } },
    { id: "upgrade20",    icon: "🏭", name: "Automation King",     desc: "Purchase 20 upgrades.",              goal: 20,       stat: "upgrades",   reward: "🤖 +25% all production",  bonus: { globalMult: 0.25 } },
    { id: "incident5",    icon: "🚒", name: "First Responder",     desc: "Resolve 5 incidents.",               goal: 5,        stat: "incidents",  reward: "🚨 +10 tickets/sec",     bonus: { perSec: 10 } },
    { id: "incident25",   icon: "🦺", name: "Crisis Commander",    desc: "Resolve 25 incidents.",              goal: 25,       stat: "incidents",  reward: "💪 +25% all production",  bonus: { globalMult: 0.25 } },
    { id: "dispatchpro",  icon: "📡", name: "Dispatch Pro",        desc: "Dispatch heroes to 10 incidents.",   goal: 10,       stat: "dispatches", reward: "🦸 +20% squad speed",    bonus: { squadMult: 0.20 } },
    { id: "combo10",      icon: "🔥", name: "On Fire",             desc: "Reach a ×10 combo.",                goal: 10,       stat: "maxCombo",   reward: "⚡ +2 click power",      bonus: { perClick: 2 } },
    { id: "combo50",      icon: "🌋", name: "Unstoppable",         desc: "Reach a ×50 combo.",                goal: 50,       stat: "maxCombo",   reward: "💥 +15% click power",    bonus: { clickMult: 0.15 } },
    { id: "prestige1",    icon: "📗", name: "Moving On Up",        desc: "Earn your first promotion.",         goal: 1,        stat: "prestiges",  reward: "🏅 +10% prestige power",  bonus: { prestigeMult: 0.10 } },
    { id: "prestige5",    icon: "📘", name: "Career Climber",      desc: "Earn 5 promotions.",                goal: 5,        stat: "prestiges",  reward: "🌟 +40% prestige power",  bonus: { prestigeMult: 0.40 } },
    { id: "level10",      icon: "🏅", name: "Level Up!",           desc: "Reach level 10.",                   goal: 10,       stat: "level",      reward: "📈 +1 skill point",      bonus: { skillPoints: 1 } },
    { id: "level25",      icon: "⭐", name: "Expert",              desc: "Reach level 25.",                   goal: 25,       stat: "level",      reward: "📈 +2 skill points",     bonus: { skillPoints: 2 } },
  ];

  const DIFFICULTY_MODES = [
    {
      id: "easy", name: "Easy", desc: "~1 hour to CIO",
      incomeMultiplier: 1.8, xpMultiplier: 1.5,
      upgradeCostMultiplier: 0.7, recruitCostMultiplier: 0.7,
      heroLevelCostMultiplier: 0.8, careerScale: 0.5,
      fireCostMultiplier: 0.5, badHireChance: 0.08,
    },
    {
      id: "medium", name: "Medium", desc: "~5 hours to CIO",
      incomeMultiplier: 1.0, xpMultiplier: 1.0,
      upgradeCostMultiplier: 1.0, recruitCostMultiplier: 1.0,
      heroLevelCostMultiplier: 1.0, careerScale: 1.0,
      fireCostMultiplier: 0.7, badHireChance: 0.12,
    },
    {
      id: "hard", name: "Hard", desc: "~10 hours to CIO",
      incomeMultiplier: 0.6, xpMultiplier: 0.7,
      upgradeCostMultiplier: 1.5, recruitCostMultiplier: 1.4,
      heroLevelCostMultiplier: 1.6, careerScale: 2.0,
      fireCostMultiplier: 1.0, badHireChance: 0.15,
    },
    {
      id: "insane", name: "Maybe Try a Real Job?", desc: "~100 hours to CIO",
      incomeMultiplier: 0.2, xpMultiplier: 0.3,
      upgradeCostMultiplier: 3.0, recruitCostMultiplier: 2.5,
      heroLevelCostMultiplier: 3.0, careerScale: 10.0,
      fireCostMultiplier: 2.0, badHireChance: 0.20,
    },
  ];

  return { CAREER, UPGRADES, HEROES, SKILLS, INCIDENTS, ACHIEVEMENTS, DIFFICULTY_MODES };
})();
