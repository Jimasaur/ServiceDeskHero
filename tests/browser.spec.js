import { test, expect } from '@playwright/test';
import { TICKETS } from '../js/rush-tickets.js';
import { BOSSES } from '../js/rush-bosses.js';

// Only local static requests are permitted: these tests cannot send production feedback.
async function boot(page) {
  await page.route('**/*',route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.clock.install({time: new Date('2026-10-01T12:00:00Z')});
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-01T12:00:02Z'));
}
function allActions() {
  // Collect authored actions independently of how boss definitions group their stages.
  const found = [];
  const visit = v => { if (!v || typeof v !== 'object') return; if (Array.isArray(v)) {v.forEach(visit);return;} if (v.kind && v.label) found.push(v); Object.values(v).forEach(visit); };
  visit(TICKETS); visit(BOSSES); return found;
}
const fixes = allActions().filter(a=>a.kind==='fix').map(a=>a.label);
async function clickFix(page) {
  const buttons=page.locator('#actions button');
  for (let i=0; i<await buttons.count(); i++) {
    const b=buttons.nth(i), text=await b.innerText();
    if (fixes.some(label=>text.includes(label)) && await b.isEnabled()) {await b.click();return true;}
  }
  return false;
}
async function assertNoOverflow(page) {
  const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
}
test('desktop round: pause, technical fixes, bosses, achievements, report, replay, and save isolation',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('sdh_save_v2',JSON.stringify({tickets:420,lifetimeTickets:9001,level:7,gameStarted:1})));
  await boot(page); await assertNoOverflow(page);
  await page.screenshot({path:testInfo.outputPath('01-desktop-lobby.png'),fullPage:true});
  await page.getByRole('button',{name:'Clock in'}).click();
  expect(await page.locator('#time').innerText()).toBe('1:30');
  await page.getByRole('button',{name:'Pause P',exact:true}).click();
  const paused=await page.locator('#time').innerText();
  await page.clock.runFor(60000);expect(await page.locator('#time').innerText()).toBe(paused);
  await page.getByRole('button',{name:'Back to the chaos'}).click();
  let sawBoss=false;
  for(let i=0;i<110 && await page.locator('#game').isVisible();i++) {
    const boss=page.locator('#queue button').filter({hasText:'BOSS'});
    if(await boss.count()) {await boss.first().click(); if(!sawBoss){sawBoss=true;await page.screenshot({path:testInfo.outputPath('02-desktop-boss.png'),fullPage:true});}}
    if(await page.locator('#actions button:enabled').count()) await clickFix(page);
    await page.clock.runFor(1000);
  }
  expect(sawBoss).toBe(true);await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-breakdown')).toContainText('Bosses defeated: 2/2');
  expect(await page.locator('#result-achievements > div').count()).toBeGreaterThan(0);
  const score=Number((await page.locator('#final-score').innerText()).replaceAll(',',''));expect(score).toBeGreaterThan(3000);
  await page.screenshot({path:testInfo.outputPath('03-desktop-report.png'),fullPage:true});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sdh_save_v2')).tickets)).toBe(420);
  await page.getByRole('button',{name:'Copy challenge'}).click();
  await expect(page.locator('#share-status')).not.toBeEmpty();
  await page.getByRole('button',{name:'One more shift'}).click();
  await expect(page.locator('#score')).toHaveText('0');await expect(page.locator('#time')).toHaveText('1:30');
  expect(errors).toEqual([]);
});
test('mobile Faker can bluff low-tech boss without resolving it; high-tech boss catches bluff',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await boot(page);
  await page.getByRole('button',{name:/Fake It Till You Make It/}).click();
  await page.screenshot({path:testInfo.outputPath('04-mobile-lobby.png'),fullPage:true});await assertNoOverflow(page);
  await page.getByRole('button',{name:'Clock in'}).click();
  let caught=false, fooled=false, tookMobileShot=false;
  for(let i=0;i<110 && await page.locator('#game').isVisible();i++) {
    const boss=page.locator('#queue button').filter({hasText:'BOSS'});
    if(await boss.count()){
      await boss.first().click();
      const bluff=page.locator('#bluff-button');
      if(await bluff.isVisible() && await bluff.isEnabled()) {
        const title=await page.locator('#ticket-title').innerText();
        const moraleBefore=Number((await page.locator('#morale-number').innerText()).replace('%',''));
        const scoreBefore=Number((await page.locator('#score').innerText()).replaceAll(',',''));
        const stageBefore=await page.locator('#boss-status').innerText();
        await bluff.click();await page.clock.runFor(900);
        expect(await page.locator('#ticket-title').innerText()).toBe(title);
        expect(await page.locator('#boss-status').innerText()).toBe(stageBefore);
        await expect(bluff).toBeDisabled();
        if(stageBefore.includes('8/10')) {
          caught=true;await expect(page.locator('#outcome')).toContainText('Bluff detected');
          await expect(page.locator('#morale-number')).toHaveText(`${moraleBefore-10}%`);
          await expect(page.locator('#score')).toHaveText(scoreBefore.toLocaleString());
        } else {
          fooled=true;await expect(page.locator('#outcome')).toContainText('+10s patience');
          await expect(page.locator('#morale-number')).toHaveText(`${Math.min(100,moraleBefore+10)}%`);
          await expect(page.locator('#score')).toHaveText((scoreBefore+175).toLocaleString());
        }
      }
      if(!tookMobileShot){tookMobileShot=true;await page.screenshot({path:testInfo.outputPath('05-mobile-boss.png'),fullPage:true});await assertNoOverflow(page);}
    }
    if(await page.locator('#actions button:enabled').count())await clickFix(page);
    await page.clock.runFor(1000);
  }
  expect(caught).toBe(true);expect(fooled).toBe(true);
  await expect(page.locator('#results')).toBeVisible();await assertNoOverflow(page);
  await page.screenshot({path:testInfo.outputPath('06-mobile-report.png'),fullPage:true});
});
test('keyboard controls, wrong answer explanation, double click guard and narrow layout',async({page})=>{
  await page.setViewportSize({width:320,height:740});await boot(page);await assertNoOverflow(page);
  await page.getByRole('button',{name:'Clock in'}).click();
  const title=await page.locator('#ticket-title').innerText(),ticket=TICKETS.find(t=>t.title===title);
  const wrong=ticket.actions.find(a=>a.kind==='wrong');
  await page.getByRole('button',{name:new RegExp(wrong.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
  await page.clock.runFor(2500);await expect(page.locator('#outcome')).toContainText(wrong.outcome);
  await expect(page.locator('#morale-number')).toHaveText('90%');
  await expect(page.locator('#actions button').filter({hasText:wrong.label})).toBeDisabled();
  await page.keyboard.press('p');await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
  await clickFix(page);await page.keyboard.press('1');await page.keyboard.press('2');await page.keyboard.press('3');
  await page.clock.runFor(2500);await expect(page.locator('#resolved-label')).toHaveText('1 ticket closed');await assertNoOverflow(page);
});
test('career fresh save picker and preview feedback safety',async({page})=>{
  await boot(page);await page.getByRole('link',{name:/Career mode/}).click();
  await expect(page.locator('#difficulty-modal')).toBeVisible();
  await page.locator('[data-difficulty="easy"]').click();
  await expect(page.locator('#main-clicker')).toBeVisible();
  await page.locator('#btn-close-help').click();
  await page.locator('#main-clicker').click();
  await expect(page.locator('#tickets-display')).not.toHaveText('0');
  await page.locator('#btn-feedback').click();
  await expect(page.locator('#feedback-status')).toContainText('disabled in previews');
  await expect(page.locator('#btn-submit-feedback')).toBeDisabled();
});
test('Rush remains playable when storage throws and under reduced motion',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')};});
  await page.emulateMedia({reducedMotion:'reduce'});await boot(page);
  await page.getByRole('button',{name:'Clock in'}).click();await clickFix(page);await page.clock.runFor(2500);
  await expect(page.locator('#resolved-label')).toHaveText('1 ticket closed');
});
