# First Shift playtest checklist

This release is a development playtest, not a marketing launch. No advertising, analytics, payment flow, new backend, or account/security changes are included.

## Before release

- Pass `npm run check` and `npm test`
- Pass the draft PR's **Game playtest** workflow
- Inspect desktop and mobile screenshots in `game-playtest-evidence`
- Check acknowledgement-before-SLA, 900-second Sev 3 and report-time 60-second Sev 1 clocks, technical fixes, two-stage bosses, Faker success/failure, pause/replay, and storage isolation
- Retain the existing career entry point and `sdh_save_v2`

## After release

- Confirm `version.json` reports the merged commit
- Open the actual HTTPS site and play a round
- Confirm the root shows DEV PLAYTEST and Career mode loads
- Do not submit production feedback during QA
- Confirm no unexpected console errors or missing assets

## Rollback

The pre-Rush main baseline is `f01fdfa90a0d1fb10e740b6f9a96d0aa985b905b` (tree `728ed675516c52b37b0a6a4efdaddc5e4dfd8e24`). Revert the gameplay merge with a new reviewed commit and allow the existing main deployment to publish it. Do not force-push main. The old version already uses `sdh_save_v2`, so the same saved careers remain compatible. Rush uses a separate key and can safely remain in storage.

## Known playtest boundaries

- No online leaderboard or anti-cheat; scores are local and shareable as text
- A round is not saved across a page refresh; best scores are saved when storage is available
- Five achievements, twelve normal tickets, and two two-stage bosses form the first playable content set
- Career mode is preserved rather than rebalanced in this pass
