# ServiceDeskHero Roadmap

_Last updated: 2026-03-05_

## Core Direction
Service Desk Hero should evolve from a themed clicker into a comedic IT/healthcare management game with:
- sharper incident variety
- stronger between-promotion identity
- meaningful org-structure constraints
- player feedback feeding a real backlog
- autonomous nightly GPT-5.4 improvement loops

---

## Near-Term Priorities

### 1. Clock Out / Off Shift System
**Goal:** give online/offline status real meaning.

**V1 scope:**
- add **Clock Out** button
- disable manual clicking while clocked out
- reduce or alter Chuck-specific active bonuses
- allow squad to continue at reduced or adjusted efficiency
- soften/defer incident pressure while off shift
- small rested / back-on-shift return bonus

---

### 2. Promotion Interlude MVP
**Goal:** promotions should feel like advancement, not just a reset screen.

**V1 scope:**
- after promotion, open an **interlude / office-upgrade scene**
- present 3 upgrade choices
- choose 1 permanent bonus
- persist chosen upgrades across runs
- begin visual identity progression between ranks

Examples:
- better chair
- dual monitors
- private office
- executive assistant
- espresso machine
- budget authority

---

### 3. Incident Type Expansion
**Goal:** not every incident should be the same click loop.

**Target mix:**
- dispatch / current fast response
- panic click scramble
- dialogue tree incidents
- quick triage / logic / sorting incidents

**First additions:**
- dialogue tree for exec/user/vendor/compliance incidents
- one lightweight puzzle or triage minigame

---

## New Major Feature: Org Hierarchy / Staffing Limits

### Why
The squad should stop being a flat pile of hires. As Chuck rises, he should build an actual org chart.

### Core Rules
- **Early game:** start with **2 max staff**
- **Team Lead:** cap increases to **3 direct reports**
- **Manager:** can have up to **8 analysts + 1 team lead**
- **Director:** can have up to **5 managers**, each manager can handle their own reporting tree
- **Managers** should normally handle **5 analysts** by default
- **Managers with a Team Lead under them** can stretch to **8 analysts**

### Design Intent
- progression should feel like moving from individual contributor → lead → people manager → org leader
- staffing becomes strategic instead of infinitely additive
- promotions unlock more org complexity and more delegation
- hiring choices matter because capacity is constrained

### UI / UX Requirements
- once managers exist, analysts should **nest under managers**
- team leads should nest under managers as well
- org groups should be **collapsible / expandable** to reduce clutter
- the roster should present as an **org chart / reporting tree**, not one giant card wall
- player should be able to reassign analysts between managers

### System Questions to Solve
- how expensive is adding management overhead?
- does each manager add passive buffs or only capacity?
- do managers improve morale / incident handling / analyst efficiency?
- can bad hires poison an entire branch?
- what happens when a manager is removed or unavailable?

### Suggested MVP
**V1 hierarchy implementation:**
- add role classes: analyst, team lead, manager, director+
- enforce direct-report caps
- add simple assignment UI
- nest roster display by manager
- no deep simulation yet, just capacity + structure + declutter

**V2 expansion:**
- branch morale
- manager buffs/debuffs
- politics between branches
- reporting-line incident modifiers

---

## Feedback Pipeline

### Current State
- feedback backend live (Lambda + DynamoDB)
- feedback modal wired into the site
- feedback backlog mirror script added
- nightly GPT-5.4 jobs refresh the backlog before work

### Next Improvement
- strengthen dedupe/triage in backlog mirror
- optionally snapshot raw feedback into dated inbox files
- let nightly jobs cluster similar feedback automatically

---

## Product Principles
- ship small, real improvements
- favor readability and personality over feature sprawl
- make progression feel organizational, not just numeric
- let office politics and hierarchy become part of the game’s identity
- keep the UI scannable even as complexity increases

---

## Recommended Implementation Order
1. **Clock Out / Off Shift**
2. **Org Hierarchy MVP**
3. **Promotion Interlude MVP**
4. **Dialogue-tree incidents**
5. **Nested manager UI polish + branch mechanics**
