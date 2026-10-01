# Service Desk Hero

A fictional IT game, currently in **live development playtest**. First Shift is a paced technical challenge with a theatrical, deeply unhelpful scripted supervisor. Read a ticket, acknowledge it, then troubleshoot. There is no global round timer. The original incremental Career mode remains available with its existing local saves.

## Play

- `index.html`: First Shift. Read diagnostic evidence, acknowledge the issue, choose a specific fix, manage its SLA, and fight two-stage printer and change-request bosses.
- `career.html`: the original recruit, upgrade, incident, and promotion game.

First Shift has two classes: **Root Cause Ranger** earns +25 for technical fixes; **Fake It Till You Make It** can bluff a low-tech boss to buy time (never to solve its technical fault). The scripted supervisor and unreliable callers are authored fiction, not a live AI service.

Reports arrive independently every **30–120 seconds**, even when other cases are open. The finite shift contains 12 routine tickets, two two-stage bosses, and two project decisions. Read Sev 3 tickets indefinitely before acknowledgement, then receive a **900-second SLA**. Questions and diagnostics reveal the information needed to solve every case. Leading or irrelevant questions can waste time and produce unreliable answers; verified diagnostics stay in the case notes. Knowing the answer lets you fix it immediately: a first-try correct fix without investigation gets a +25 efficiency bonus. Asking every question is never required.

Testing and project work share your one worker with tickets. Compatibility test: 18s; verified release: 6s and +450. An explicit untested release takes 2s and creates a visible, explained 60-second risk. Correct it with an 18-second rollback/test task for +400 prevention points, or defer an unreleased project safely without reward. A neglected risk causes the first **Sev 2 with 180 seconds from report**, including before ACK. Its successful recovery gives +200 and +10 morale. After eight lasting routine fixes and defeating the printer, later neglected risks can produce **Sev 1 with 60 seconds from report** (+300 recovery). Safe play can avoid every major incident. Dangerous boss choices have traceable causes and can be corrected before impact.

Workarounds reopen after 11 seconds with their original SLA; boss stages also share one deadline. A successful bluff explicitly adds ten seconds. All timers freeze on pause/background. Pending risks and outstanding project decisions keep the shift open. Major incidents do not count toward routine-case progression. Prevention is worth more than deliberately causing incidents.

## Compact desk

The active shift fits the viewport with a pinned HUD, five workstream tabs, and contained case-list/detail scrolling. INC contains incidents and bosses; REQ groups the three existing settings requests. Projects holds change work, KTLO exposes active prevention tasks and their history, and Training is a playable field guide. Active/Hold/Resolved filters organize tickets and projects. **Hold never pauses or resets a running SLA**; use the global Pause control to freeze the game. Closed history retains evidence and clearly labels missed deadlines. New reports pulse their tab briefly and leave a numeric new-item badge; reduced-motion users receive the badge without animation. Tabs and Q/E shortcuts stay scoped to the visible list.

The scenarios and characters are fiction, simplified for gameplay. This is not a real service desk or a production troubleshooting runbook.

## Run locally

```sh
python3 -m http.server 4176
```

Open http://localhost:4176. The game has no runtime dependencies, API credentials, paid services, analytics, or login. Modern browsers with JavaScript modules are required. `P` or Escape pauses all game SLA clocks; `A` acknowledges; `1`–`3` choose a response; `Q`/`E` switch tickets. Changing tabs pauses all game clocks automatically. Early unacknowledged Sev 3 tickets can be read indefinitely; reports arrive on a seeded 30–120 second clock. The quiet-time skip is disabled while a risk is developing.

## Verify

Node.js 22+:

```sh
npm run check
npm test
npm ci
npx playwright install chromium
npm run test:browser
```

Unit tests exercise deterministic timing, scoring, queue limits, bosses, class mechanics, failures, and replays. Browser tests cover complete desktop/mobile rounds, pause, achievements, class bluffs, keyboard controls, save isolation, restricted storage, and preview feedback safety. Browser tests block all non-local network requests. GitHub Actions retains screenshots and failure traces as `game-playtest-evidence`.

## Saves and feedback

Career retains `sdh_save_v2`; First Shift uses the separate `sdh_contact_v3` key for device-local best scores and sound preference. No migration or deletion of existing career saves occurs. Earlier Rush Hour scores remain untouched in their separate key. First Shift best scores are separated by class and are not a trusted online leaderboard.

The legacy Career feedback form still targets the project's production feedback service on `servicedeskhero.com` and `www.servicedeskhero.com`. It is **disabled on localhost and preview domains**. Do not submit test feedback on production; submissions include the message, optional email, page, version, and user agent.

## Deployment

Pull requests and pushes to `main` run the game checks automatically. **Merging code does not deploy it.** Publication is a separate, explicit action through the authorized AWS connection. A manual-only `workflow_dispatch` S3/CloudFront workflow is retained for maintainers who have configured valid repository deployment credentials; its checks must pass before any upload. Both entry points receive a build stamp when that workflow is used. See `PLAYTEST.md` for the release checklist and rollback baseline.
