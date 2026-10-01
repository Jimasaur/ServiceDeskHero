# Service Desk Hero

A fictional IT game, currently in **live development playtest**. First Shift is a paced technical challenge with a theatrical, deeply unhelpful scripted supervisor. Read a ticket, acknowledge it, then troubleshoot. There is no global round timer. The original incremental Career mode remains available with its existing local saves.

## Play

- `index.html`: First Shift. Read diagnostic evidence, acknowledge the issue, choose a specific fix, manage its SLA, and fight two-stage printer and change-request bosses.
- `career.html`: the original recruit, upgrade, incident, and promotion game.

First Shift has two classes: **Root Cause Ranger** earns an extra 25 points per correct technical action; **Fake It Till You Make It** can bluff a low-tech boss to buy time. Bluffing never fixes the underlying fault, and knowledgeable bosses penalize it. Lasting fixes build streaks. Each issue allows one workaround; it reopens after 11 seconds with the same SLA. Workarounds do not advance progression. There are five earned achievements and a finite, deterministic daily sequence (UTC): 12 normal tickets and two bosses. Sev 3 starts with a 15-minute SLA only after acknowledgement. After at least eight real normal-ticket fixes and the printer boss defeat, new Sev 1 incidents use a 60-second SLA from reporting, even before acknowledgement. Acknowledgement never resets a Sev 1 deadline. Boss stages share one SLA; a successful bluff explicitly adds ten seconds.

The scenarios and characters are fiction, simplified for gameplay. This is not a real service desk or a production troubleshooting runbook.

## Run locally

```sh
python3 -m http.server 4176
```

Open http://localhost:4176. The game has no runtime dependencies, API credentials, paid services, analytics, or login. Modern browsers with JavaScript modules are required. `P` or Escape pauses all game SLA clocks; `A` acknowledges; `1`–`3` choose a response; `Q`/`E` switch tickets. Changing tabs pauses all game clocks automatically. Early unacknowledged Sev 3 tickets can be read indefinitely; new work is completion-driven rather than arriving in an aggressive timer loop.

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

Career retains `sdh_save_v2`; First Shift uses the separate `sdh_shift_v2` key for device-local best scores and sound preference. No migration or deletion of existing career saves occurs. Earlier Rush Hour scores remain untouched in their separate key. First Shift best scores are separated by class and are not a trusted online leaderboard.

The legacy Career feedback form still targets the project's production feedback service on `servicedeskhero.com` and `www.servicedeskhero.com`. It is **disabled on localhost and preview domains**. Do not submit test feedback on production; submissions include the message, optional email, page, version, and user agent.

## Deployment

Pushes to `main` run the existing S3/CloudFront deployment using existing repository configuration. Feature branches and draft PRs do not deploy. Both entry points get a build stamp. Review the playtest checks before merging; new game source does not need AWS account changes. See `PLAYTEST.md` for the release checklist and rollback baseline.
