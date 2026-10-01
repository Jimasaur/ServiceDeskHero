import { test, expect } from '@playwright/test';
import { TICKETS } from '../js/rush-tickets.js';
import { BOSSES } from '../js/rush-bosses.js';

// Only the local static server is reachable. Test play must never send production feedback.
async function boot(page) {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.clock.install({time: new Date('2026-10-01T12:00:00Z')});
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-01T12:00:02Z'));
}
const sources = [...TICKETS, ...BOSSES.flatMap(boss => boss.stages)];
async function currentSource(page) {
  const title = await page.locator('#ticket-title').innerText();
  const source = sources.find(ticket => ticket.title === title);
  expect(source, `authored ticket exists for ${title}`).toBeTruthy();
  return source;
}
async function acknowledge(page) {
  const ack = page.locator('#acknowledge-button');
  if (await ack.isVisible()) await ack.click();
  await expect(page.locator('#action-area')).toBeVisible();
}
async function clickAction(page, kind = 'fix') {
  const source = await currentSource(page), action = source.actions.find(a => a.kind === kind);
  expect(action, `${source.id} has a ${kind} response`).toBeTruthy();
  const button = page.locator('#actions button').filter({hasText: action.label});
  await expect(button).toHaveCount(1); await expect(button).toBeEnabled(); await button.click();
  return action;
}
async function fix(page) {
  await acknowledge(page); await clickAction(page); await page.clock.runFor(2500);
}
async function slaSeconds(page) {
  const text = await page.locator('#sla-time').innerText();
  expect(text).toMatch(/^\d+:\d{2}$/);
  const [minutes, seconds] = text.split(':').map(Number);
  return minutes * 60 + seconds;
}
async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
}
async function hidePage(page) {
  // Exercise the real listener deterministically in headless CI.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#pause-dialog')).toBeVisible();
}
async function revealPage(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Returning to a tab does not silently resume the SLA clock.
  await expect(page.locator('#pause-dialog')).toBeVisible();
  await page.locator('#resume-button').click();
}

test('desktop finite shift: ACK, all twelve normal fixes, both bosses, earned Sev 1, report and replay', async ({page}, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('sdh_save_v2', JSON.stringify({tickets:420, lifetimeTickets:9001, level:7, gameStarted:1}));
    localStorage.setItem('sdh_rush_v1', JSON.stringify({'rush-engineer':99999}));
  });
  await boot(page); await assertNoOverflow(page);
  await expect(page.locator('#best-label')).not.toContainText('99,999');
  await page.screenshot({path:testInfo.outputPath('01-desktop-lobby.png'), fullPage:true});
  await page.locator('#start-button').click(); await expect(page.locator('#time')).toHaveText('0 / 14');
  const normals = new Set(), stages = new Set(); let sawSev1 = false;
  for (let step = 0; step < 20 && await page.locator('#game').isVisible(); step++) {
    const source = await currentSource(page), normal = TICKETS.some(t => t.id === source.id);
    if (normal) { expect(normals.has(source.id)).toBe(false); normals.add(source.id); }
    else {
      stages.add(source.id);
      if (stages.size === 1) {
        await expect(page.locator('#time')).toHaveText('4 / 14');
        await expect(page.locator('#sla-time')).toHaveText('Not started');
        await page.screenshot({path:testInfo.outputPath('02-desktop-printer.png'), fullPage:true});
      }
    }
    if ((await page.locator('#sla-rule').innerText()).startsWith('Sev 1') && !sawSev1) {
      sawSev1 = true;
      expect(normals.size).toBe(9); expect(stages.size).toBe(2);
      await expect(page.locator('#time')).toHaveText('9 / 14');
      await expect(page.locator('#acknowledge-button')).toBeVisible();
      await expect(page.locator('#action-area')).toBeHidden();
      const before = await slaSeconds(page); expect(before).toBe(60);
      await page.clock.runFor(20000);
      const waiting = await slaSeconds(page); expect(waiting).toBeGreaterThanOrEqual(39); expect(waiting).toBeLessThanOrEqual(40);
      await acknowledge(page); expect(await slaSeconds(page)).toBe(waiting);
      await expect(page.locator('#sla-rule')).toHaveText('Sev 1 · started when reported');
    }
    await fix(page);
  }
  expect(normals.size).toBe(12); expect(stages.size).toBe(4); expect(sawSev1).toBe(true);
  await expect(page.locator('#results')).toBeVisible(); await expect(page.locator('#game')).toBeHidden();
  await expect(page.locator('#result-status')).toHaveText('SHIFT COMPLETE');
  await expect(page.locator('#result-fixed')).toHaveText('14');
  await expect(page.locator('#result-breakdown')).toContainText('0 missed · 0 wrong moves');
  await expect(page.locator('#result-breakdown')).toContainText('Bosses defeated: 2/2');
  await expect(page.locator('#result-achievements')).toContainText('The Pager Sleeps Tonight');
  expect(await page.locator('#result-achievements > div').count()).toBe(4);
  expect(Number((await page.locator('#final-score').innerText()).replaceAll(',', ''))).toBeGreaterThan(3000);
  await page.screenshot({path:testInfo.outputPath('03-desktop-report.png'), fullPage:true});
  const saves = await page.evaluate(() => ({career:JSON.parse(localStorage.getItem('sdh_save_v2')), oldRush:JSON.parse(localStorage.getItem('sdh_rush_v1')), shift:JSON.parse(localStorage.getItem('sdh_shift_v2'))}));
  expect(saves.career.tickets).toBe(420); expect(saves.career.lifetimeTickets).toBe(9001);
  expect(saves.oldRush['rush-engineer']).toBe(99999); expect(saves.shift).toBeTruthy();
  await page.locator('#share-button').click(); await expect(page.locator('#share-status')).not.toBeEmpty();
  await page.locator('#replay-button').click();
  await expect(page.locator('#score')).toHaveText('0'); await expect(page.locator('#time')).toHaveText('0 / 14');
  await expect(page.locator('#sla-time')).toHaveText('Not started');
  await expect(page.locator('#acknowledge-button')).toBeVisible(); expect(errors).toEqual([]);
});

test('Sev 3 waits more than fifteen minutes; ACK starts its full clock and pause never catches up', async ({page}) => {
  await boot(page); await page.locator('#start-button').click();
  const title = await page.locator('#ticket-title').innerText();
  await expect(page.locator('#sla-time')).toHaveText('Not started');
  await expect(page.locator('#sla-rule')).toHaveText('Sev 3 · starts when you acknowledge');
  await expect(page.locator('#action-area')).toBeHidden();
  await page.keyboard.press('1'); await page.keyboard.press('2'); await page.keyboard.press('3');
  // Fast-forward fires each timer once; the engine receives the full elapsed interval without 56,000 frames.
  await page.clock.fastForward(901000);
  await expect(page.locator('#ticket-title')).toHaveText(title); await expect(page.locator('#queue button')).toHaveCount(1);
  await expect(page.locator('#game')).toBeVisible(); await expect(page.locator('#results')).toBeHidden();
  await expect(page.locator('#score')).toHaveText('0'); await expect(page.locator('#time')).toHaveText('0 / 14');
  await expect(page.locator('#morale-number')).toHaveText('100%'); await expect(page.locator('#sla-time')).toHaveText('Not started');
  await acknowledge(page); await expect(page.locator('#sla-time')).toHaveText('15:00');
  await page.clock.runFor(1100); expect(await slaSeconds(page)).toBe(899);
  await page.keyboard.press('a'); expect(await slaSeconds(page)).toBe(899);
  await page.locator('#pause-button').click();
  const paused = await page.locator('#sla-time').innerText();
  await page.clock.fastForward(1800000); await expect(page.locator('#sla-time')).toHaveText(paused);
  await page.locator('#resume-button').click(); await expect(page.locator('#sla-time')).toHaveText(paused);
  await page.clock.runFor(1100); expect(await slaSeconds(page)).toBe(898);
  await expect(page.locator('#ticket-title')).toHaveText(title); await expect(page.locator('#time')).toHaveText('0 / 14');
});

test('390px Faker earns both bosses: high-tech catches a bluff; low-tech extends SLA without fixing', async ({page}, testInfo) => {
  await page.setViewportSize({width:390, height:844}); await boot(page);
  await page.locator('#faker-class').click(); await assertNoOverflow(page);
  await page.screenshot({path:testInfo.outputPath('04-mobile-lobby.png'), fullPage:true});
  await page.locator('#start-button').click();
  let caught = false, fooled = false;
  for (let step = 0; step < 20 && await page.locator('#game').isVisible(); step++) {
    await acknowledge(page);
    const bluff = page.locator('#bluff-button');
    if (await bluff.isVisible() && await bluff.isEnabled()) {
      const title = await page.locator('#ticket-title').innerText(), stage = await page.locator('#boss-status').innerText();
      const progress = await page.locator('#time').innerText(), deadline = await slaSeconds(page);
      const score = Number((await page.locator('#score').innerText()).replaceAll(',', ''));
      const morale = Number((await page.locator('#morale-number').innerText()).replace('%', ''));
      await bluff.click(); await page.clock.runFor(900);
      await expect(page.locator('#ticket-title')).toHaveText(title); await expect(page.locator('#boss-status')).toHaveText(stage);
      await expect(page.locator('#time')).toHaveText(progress); await expect(bluff).toBeDisabled();
      if (stage.includes('8/10')) {
        caught = true; expect(progress).toBe('4 / 14');
        await expect(page.locator('#outcome')).toContainText('Bluff detected');
        await expect(page.locator('#morale-number')).toHaveText(`${morale - 10}%`);
        expect(Number((await page.locator('#score').innerText()).replaceAll(',', ''))).toBe(score);
        expect(await slaSeconds(page)).toBeLessThanOrEqual(deadline);
      } else {
        fooled = true; expect(progress).toBe('13 / 14');
        await expect(page.locator('#outcome')).toContainText('+10s');
        await expect(page.locator('#morale-number')).toHaveText(`${Math.min(100, morale + 10)}%`);
        expect(Number((await page.locator('#score').innerText()).replaceAll(',', ''))).toBe(score + 175);
        expect(await slaSeconds(page)).toBeGreaterThanOrEqual(deadline + 9);
        await page.screenshot({path:testInfo.outputPath('05-mobile-friday.png'), fullPage:true});
      }
      await assertNoOverflow(page);
    }
    await clickAction(page); await page.clock.runFor(2500);
  }
  expect(caught).toBe(true); expect(fooled).toBe(true);
  await expect(page.locator('#results')).toBeVisible(); await expect(page.locator('#result-fixed')).toHaveText('14');
  await expect(page.locator('#result-breakdown')).toContainText('Bosses defeated: 2/2'); await assertNoOverflow(page);
  await page.screenshot({path:testInfo.outputPath('06-mobile-report.png'), fullPage:true});
});

test('320px keyboard ACK, wrong response, single-patch return and duplicate action guard', async ({page}) => {
  await page.setViewportSize({width:320, height:740}); await boot(page); await assertNoOverflow(page);
  await page.locator('#start-button').click(); await assertNoOverflow(page);
  const title = await page.locator('#ticket-title').innerText();
  await page.keyboard.press('1'); await expect(page.locator('#score')).toHaveText('0');
  await page.keyboard.press('a'); await expect(page.locator('#action-area')).toBeVisible();
  const wrong = await clickAction(page, 'wrong'); await page.clock.runFor(2500);
  await expect(page.locator('#outcome')).toContainText(wrong.outcome); await expect(page.locator('#morale-number')).toHaveText('90%');
  await expect(page.locator('#actions button').filter({hasText:wrong.label})).toBeDisabled();
  await expect(page.locator('#time')).toHaveText('0 / 14');
  await page.keyboard.press('p'); await expect(page.locator('#pause-dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#pause-dialog')).not.toBeVisible();
  const patch = await clickAction(page, 'patch'); await page.clock.runFor(900);
  await expect(page.locator('#empty-ticket')).toBeVisible(); await expect(page.locator('#queue button')).toHaveCount(0);
  await expect(page.locator('#time')).toHaveText('0 / 14'); await expect(page.locator('#resolved-label')).toHaveText('0 tickets closed');
  await page.clock.runFor(11000); await expect(page.locator('#ticket-title')).toHaveText(title);
  await expect(page.locator('#acknowledge-button')).toBeHidden();
  await expect(page.locator('#actions button').filter({hasText:patch.label})).toBeDisabled();
  expect(await slaSeconds(page)).toBeLessThan(890);
  await clickAction(page); await page.keyboard.press('1'); await page.keyboard.press('2'); await page.keyboard.press('3');
  await page.clock.runFor(2500);
  await expect(page.locator('#resolved-label')).toHaveText('1 ticket closed'); await expect(page.locator('#time')).toHaveText('1 / 14');
  await expect(page.locator('#acknowledge-button')).toBeVisible(); await assertNoOverflow(page);
});

test('career fresh-save picker and preview feedback remain safe', async ({page}) => {
  await boot(page); await page.getByRole('link', {name:/Career mode/}).click();
  await expect(page.locator('#difficulty-modal')).toBeVisible(); await page.locator('[data-difficulty="easy"]').click();
  await expect(page.locator('#main-clicker')).toBeVisible(); await page.locator('#btn-close-help').click();
  await page.locator('#main-clicker').click(); await expect(page.locator('#tickets-display')).not.toHaveText('0');
  await page.locator('#btn-feedback').click(); await expect(page.locator('#feedback-status')).toContainText('disabled in previews');
  await expect(page.locator('#btn-submit-feedback')).toBeDisabled();
});

test('First Shift stays playable with blocked storage and reduced motion', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
  });
  await page.emulateMedia({reducedMotion:'reduce'}); await boot(page); await page.locator('#start-button').click();
  await fix(page); await expect(page.locator('#resolved-label')).toHaveText('1 ticket closed');
  await expect(page.locator('#time')).toHaveText('1 / 14'); await expect(page.locator('#sla-time')).toHaveText('Not started');
  expect(errors).toEqual([]);
});

test('existing career resumes without a difficulty reset and remains separate from First Shift', async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdh_save_v2', JSON.stringify({tickets:420, lifetimeTickets:9001, level:7, lastSave:Date.now(), lastTick:Date.now(), difficultyId:'medium'}));
    localStorage.setItem('sdh_seen_help', '1');
  });
  await boot(page); await page.getByRole('link', {name:/Career mode/}).click();
  await expect(page.locator('#difficulty-modal')).not.toBeVisible();
  await expect(page.locator('#hero-level')).toHaveText('7'); await expect(page.locator('#tickets-display')).toHaveText('420');
  await page.getByRole('link', {name:/Back to (Rush Hour|First Shift)/}).click();
  await expect(page.locator('#lobby')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sdh_save_v2')).lifetimeTickets)).toBe(9001);
});

test('backgrounding freezes work, SLA and pending returns; next-day replay updates the daily seed', async ({page}) => {
  await boot(page); await page.locator('#start-button').click(); await acknowledge(page); await clickAction(page);
  await page.clock.runFor(500); await hidePage(page);
  const sla = await page.locator('#sla-time').innerText(), work = await page.locator('#work-seconds').innerText();
  await page.clock.fastForward(60000);
  await expect(page.locator('#sla-time')).toHaveText(sla); await expect(page.locator('#work-seconds')).toHaveText(work);
  await expect(page.locator('#time')).toHaveText('0 / 14');
  await revealPage(page); await page.clock.runFor(2000); await expect(page.locator('#time')).toHaveText('1 / 14');
  await acknowledge(page); const title = await page.locator('#ticket-title').innerText();
  await clickAction(page, 'patch'); await page.clock.runFor(900); await expect(page.locator('#empty-ticket')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('#pause-dialog')).toBeVisible(); await page.clock.fastForward(60000);
  await expect(page.locator('#queue button')).toHaveCount(0); await expect(page.locator('#time')).toHaveText('1 / 14');
  await page.locator('#resume-button').click(); await page.clock.runFor(11000);
  await expect(page.locator('#ticket-title')).toHaveText(title); await expect(page.locator('#acknowledge-button')).toBeHidden();
  expect(await slaSeconds(page)).toBeGreaterThanOrEqual(888); expect(await slaSeconds(page)).toBeLessThanOrEqual(889);
  await page.locator('#pause-button').click(); await page.locator('#quit-button').click();
  await expect(page.locator('#result-status')).toHaveText('SHIFT ENDED EARLY');
  await expect(page.locator('#result-achievements')).not.toContainText('The Pager Sleeps Tonight');
  await page.clock.setSystemTime(new Date('2026-10-02T00:00:01Z'));
  await page.locator('#replay-button').click(); await page.locator('#pause-button').click(); await page.locator('#quit-button').click();
  await page.locator('#menu-button').click(); await expect(page.locator('#daily-label')).toContainText('10/02');
});
