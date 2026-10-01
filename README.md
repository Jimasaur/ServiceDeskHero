# Service Desk Hero

A fictional IT game, currently in **live development playtest**. Rush Hour is a 90-second technical challenge with a theatrical, deeply unhelpful AI supervisor. The original incremental Career mode remains available with its existing local saves.

## Play

- `index.html`: Rush Hour. Read diagnostic evidence, choose a specific fix, manage deadlines, and fight two-stage printer and change-request bosses.
- `career.html`: the original recruit, upgrade, incident, and promotion game.

Rush Hour has two classes: **Root Cause Ranger** earns an extra 25 points per correct technical action; **Fake It Till You Make It** can bluff a low-tech boss to buy time. Bluffing never fixes the underlying fault, and knowledgeable bosses penalize it. Lasting fixes build streaks. Workarounds reopen after 11 seconds. There are five earned achievements and a deterministic daily queue (UTC).

The scenarios and characters are fiction, simplified for gameplay. This is not a real service desk or a production troubleshooting runbook.

## Run locally

```sh
python3 -m http.server 4176
```

Open http://localhost:4176. The game has no runtime dependencies, API credentials, paid services, analytics, or login. Modern browsers with JavaScript modules are required. `P` or Escape pauses; `1`–`3` choose a response; `Q`/`E` switch tickets. Changing tabs pauses Rush Hour automatically. Easy Shift slows arrivals and extends ticket deadlines.

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

Career retains `sdh_save_v2`; Rush uses the separate `sdh_rush_v1` key for device-local best scores and sound preference. No migration or deletion of existing career saves occurs. Rush best scores are separated by class and pace and are not a trusted online leaderboard.

The legacy Career feedback form still targets the project's production feedback service on `servicedeskhero.com` and `www.servicedeskhero.com`. It is **disabled on localhost and preview domains**. Do not submit test feedback on production; submissions include the message, optional email, page, version, and user agent.

## Deployment

Pull requests and pushes to `main` run the game checks automatically. **Merging code does not deploy it.** Publication is a separate, explicit action through the authorized AWS connection. A manual-only `workflow_dispatch` S3/CloudFront workflow is retained for maintainers who have configured valid repository deployment credentials; its checks must pass before any upload. Both entry points receive a build stamp when that workflow is used. See `PLAYTEST.md` for the release checklist and rollback baseline.
