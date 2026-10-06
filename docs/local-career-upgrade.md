# SDH local career upgrade — not published

Base: local tested reliability commit `9421c91c3195eb0c96c04ea01c150da0333de613`. Work is isolated on `local/dungeon-career-v1`; the fix commit is unchanged. No GitHub publication, cloud resources, registration, model calls or account reuse occurred.

## Architecture and reuse

The existing deterministic ticket simulation, authored evidence, two-stage encounters, build choices, causal risk queue, project worker, relationship scenes and original Career mode remain. `rush-career.js` supplies campaign rules; `rush-manager-boss.js` adds an authored middle finale; `rush-campaign-save.js` supplies an independent versioned morning-checkpoint store. Existing pure-engine callers retain the original two-boss fixture unless they opt into `options.career`. The dungeon UI opts in.

ResiliencyGames' separate local career engine and README were inspected read-only. Reused ideas are domain-specific seeded design defects, outcome-derived manager credit, stable award boundaries, immutable queued save capture and locked stale-writer rejection. No source files, accounts, state, resources or deployment flows from that project were modified or copied wholesale. SDH's registration and future cloud saves require their own scoped approval. Work uses SDH localhost port 4176 and one browser worker; the other project's documented port is 8765.

## First playable slice

- Floor one has Pam Papertrail (process) and the Vanishing Printer. Floor two has Dash Dashboard (results) and the new two-stage Spreadsheet Hydra. Floor three has Vera Visibility (optics) and the Friday 4:59 Change Request.
- The paused character sheet explains manager preferences and promotion thresholds. Process rewards bounded evidence and tested delivery; results rewards actual routine repairs and clean quick releases; optics rewards evidence, tested delivery and successful presentations. Favor caps at four per manager per shift and is retained only when that manager's finale is defeated. Three retained favor earns each sequential promotion. Development days remain playable; earlier manager relationships persist.
- A lasting technical, incident-lead or people-lead path can be selected in the character sheet. After one promotion, technical work is faster and matching design odds fall; incident repairs and preventative rollback are faster; people leadership adds capped morning support and actual repair morale. Paths never remove evidence or prevent direct diagnosis.
- Platform/network design defects are deterministically sampled at shift creation using separate per-project seeds. Technical 2 aptitude reduces only the chosen domain's initial defect probability; an earned technical path adds another matching reduction. Tests reveal the existing sample, and include the existing authored correction/verification step. They do not reroll defect odds. Changes in build after creation do not retroactively erase defects.
- A quick release takes two seconds, skips the 18-second test and saves four seconds versus the release step alone. A healthy sample stays a win (+350, compared with +450 tested delivery), and results managers recognize it. A defective sample creates the existing causal risk and recoverable incident. Rollback prevents/contains impact; self-created risk repair grants no farming reward.
- Completed-day promotions, favors, build, life relationships, preferences and bounded unresolved recovery records carry forward. A retained handoff record is not a claimed repair and causes no additional penalty beyond SDH's existing bounded handoff cost. Replaying a current unsaved shift cannot repeat already checkpointed days' career awards.

## Save boundary and limits

Complete the home choices, then select **Save next morning locally**. The new `sdh_dungeon_campaign_v1` envelope has independent identity, content/schema version and revision. It retains the next morning's life, original seed, build and career consequences. Resume starts that saved shift at time zero; it deliberately does not promise mid-shift restoration. Full serializable simulation/RNG snapshots, import, content migrations, explicit recovery gameplay for retained handoffs, registered saves and daily shared editions remain later milestones.

Web Locks serialize writes on HTTPS/localhost. Writers compare their captured predecessor, reject stale tabs, preserve previous data on write failure and capture queued values immutably. Damaged/incompatible values are retained with resume disabled. Replacing a different or damaged campaign requires the player's explicit confirmation. Saves are device-local and unverified; they are not competitive or account-trusted records. Original `sdh_save_v2` Career data and existing preferences are untouched. Do not overwrite incompatible content during a future update; provide a migration or explicit recovery choice.

New three-boss best scores use a content-specific local key, preserving older two-boss records without comparing them. No cloud leaderboard is introduced here.

## Verification

Use `npm run check`, `npm test`, and `npx playwright test --workers=1`. Added tests exercise fixed defects, clean and defective shortcuts, manager/finale gating, no repeated career awards, actual unlock durations, malformed checkpoint retention, immutable queued values, quota failures and competing tabs. Browser coverage includes mobile/desktop managers and exact morning resume. Full-shift browser fixtures explicitly use a defect-bearing date for incident tests instead of assuming every shortcut must fail.

Publication is separately blocked by the prior automatic approval decisions. This local engineering task does not retry or circumvent that blocker. Do not deploy this checkout until a distinct publication/release task has approval and a verified release manifest.

Verified locally: syntax checks and 100/100 unit tests passed; the complete 50/50 Chromium browser suite passed. Following final save-revision, path-control and score-key polish, all 100 unit tests and five targeted browser tests passed, including a complete clean shift and save/resume/concurrency/quarantine checks. Desktop 1440px and mobile 390px screenshots were visually reviewed. Logs are in the parent task folder (`career-check.txt`, `career-unit-tests.txt`, `career-browser-tests.txt`, `career-final-targeted-tests.txt`).
## Independent review corrections

Three P2 findings were reproduced and corrected locally:

- Schema-1 checkpoints now require their complete persisted dungeon build and clean morning object state, including a nonempty original seed, object-shaped relationship memory and inbox, fresh morning choices, history shapes, exact retained skill/gear/checkpoint sets and balanced earned point budgets. The tolerant engine carry constructor is unchanged. Valid full snapshots retain their build; incompatible/damaged bytes are quarantined with resume disabled. No legacy migration is invented: this campaign schema always produced full snapshots. Replacing quarantined data still requires explicit confirmation.
- Workarounds awaiting their eleven-second return are included in deduplicated, bounded retained recovery consequences. Their title survives clock-out and save/resume, with no extra restoration credit, reward or penalty.
- Choosing a promoted career path invalidates both ticket and project display caches. Project/incident controls refresh immediately. Shortcut time savings are derived from actual build-adjusted project durations; work completion uses its captured effects.

Focused reproduction originally accepted 14 damaged-build cases. New validation regressions cover missing build fields, incompatible class/prerequisites/gear, progression consistency, primitive nested fields and stale morning choices. Browser verification earns all three promotions, two real skills and two real gear choices through public controls before saving and reloading, then checks exact build retention, all required-field quarantine cases, declined replacement preservation, technical project timings, incident repair timings and workaround handoffs. The screenshot `career-earned-resume.png` records the genuinely earned promoted character.

Final verification after independent review: syntax checks, 127/127 unit tests and the complete 52/52 serial Chromium browser suite passed. The genuinely earned promotion/build resume screenshot was visually reviewed. No publication or account changes occurred.

## Narrow retained-history crash correction

The independent reviewer additionally reproduced `previousDays: [null]` being accepted, then crashing character rendering after the game had paused. Saved previous days are now limited to seven valid object entries with a valid day and bounded nonempty text. A pending recap and the journal, boss-reaction and project-log text consumed by rendering are checked before resume. Malformed data remains quarantined; valid historical text remains byte-for-byte unchanged. No migration or normalization was added.

Character-sheet opening renders within a guarded operation. An unexpected render or dialog-opening failure restores live play and reports the failure rather than leaving the game paused behind a closed dialog. A browser regression injects a rendering failure and proves real ticket work can still complete afterward. The earned-build browser case also corrupts previous-day entries and confirms hidden resume and unchanged stored bytes.

Final verification after independent review: syntax checks, 137/137 unit tests and the complete 53/53 serial Chromium browser suite passed. The genuinely earned promotion/build resume screenshot was visually reviewed. No publication or account changes occurred.
