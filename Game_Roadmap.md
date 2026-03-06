# 🗺️ Service Desk Hero — Game Roadmap: The Deep Management Expansion

This roadmap outlines the planned expansion to add significant depth, emotional attachment, consequences, and a more realistic (and slightly grindy) corporate management simulation to the game.

---

## 📅 Roadmap Overview

### Phase 1: Expanded Career Hierarchy & Slower Progression

**Goal:** Make reaching CIO a monumental achievement that takes hours of dedicated play, with a steeper, more granular corporate ladder.

- **New Titles (The Pyramid):**
  1. Analyst I
  2. Analyst II
  3. Analyst III
  4. Analyst IV
  5. Analyst V
  6. Team Lead _(Can hire Team Leads who boost squad stats)_
  7. Manager
  8. Senior Manager
  9. Director
  10. Senior Director
  11. Junior VP
  12. VP
  13. Senior VP
  14. CIO
- **XP/Ticket Rebalance:** Exponential curve tweaking to ensure the "grind" feels earned. Early game (Analyst I-V) focuses heavily on manual clicking and cheap upgrades before automation takes over.

### Phase 2: The "Fired" Mechanic & Evolving Incidents

**Goal:** Real stakes. If you perform poorly, you lose your job.

- **Evolving Incidents:** Incidents scale in difficulty (time limits, required clicks, correct skill match) based on your current Title.
- **The Strike System:** Failing an incident gives you a "Strike." Accruing 3 strikes at your current title results in getting FIRED.
- **Getting Fired:** Triggers a hard reset of your current run (losing tickets and squad, keeping prestige/skill tree bonuses), complete with a "clean out your desk" UI sequence.

### Phase 3: Roster of 100 Unique Recruits & Sprite Plan

**Goal:** A massive pool of potential hires to encounter, each with balanced skills, backstories, and unique portraits.

- **The "Applicant Pool" System:** Instead of seeing all recruits at once, you refresh a daily job board to see who is applying.
- **Sprite Execution Plan:**
  - **Format:** 64x64 pixel art portraits, strict color palette (modern tech/cyberpunk accents).
  - **Generation:** Use the `generate_image` tool dynamically to create base portraits (e.g., `"A 64x64 pixel art portrait of an IT worker, solid dark blue background, wearing glasses, flat lighting, clean pixel style"`).
  - **Implementation:** Store in an `/assets/portraits/` folder. Load them dynamically based on the character's JSON ID.
- **Balanced Skill Generation:** Characters will have procedural or semi-procedural stat budgets based on rarity (Common, Uncommon, Rare, Epic, Legendary).

### Phase 4: Character Attachment & The "Crises" System (Life Happens)

**Goal:** Make squad members feel like real people with real lives, leading to attachment.

- **In-Game Time Tracking:** Implement a "Day" system (e.g., 1 minute = 1 in-game day).
- **Absences & Crises:** Characters will randomly experience life events:
  - _"Sick Kid"_ (Out for 3 days - CPS contribution drops to 0)
  - _"Family Vacation"_ (Out for 14 days)
  - _"New Baby"_ (Out for 60 days - Requires you to hire a temp or tough it out)
  - _"Mental Health Day"_ (Out for 1 day)
- **Morale System:** Every character has a hidden "Morale" meter.

### Phase 5: Training, Boredom, and Resignations

**Goal:** Talent management. You must grow your team, but overqualified people quit if underutilized.

- **Training Programs:** Spend tickets to send a squad member to a "Bootcamp" (takes them offline for X days) to gain a new skill tag (e.g., _Database Expert_, _Cloud Native_).
- **Misalignment Penalty:** Dispatching a hero to an incident they aren't skilled for repeatedly lowers their Morale.
- **The Boredom Drain:** If a character has 4+ skills but isn't dispatched to challenging incidents frequently, they get bored.
- **Resignation:** If Morale hits zero, you receive a "Two Weeks Notice." If you don't raise their morale (via a pay raise/ticket bonus, or assigning them good tasks), they permanently leave your squad.

---

## 🛠️ Execution Strategy: Next Steps

We will build these features incrementally.

**Next Step Recommendation:** Let's tackle **Phase 1** and **Phase 2** first (The Hierarchy, rebalancing progression, and the Fired mechanic) to establish the structural pacing of the game. Once the consequences and pacing are locked in, we can move to Phase 3 and build out the vibrant 100-character roster and the complex Life/Morale systems.

_Ready to execute Phase 1?_
