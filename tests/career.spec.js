import {test,expect} from '@playwright/test';
async function boot(page,width=390){await page.setViewportSize({width,height:844});await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await page.clock.install({time:new Date('2026-10-10T12:00:00Z')});await page.goto('/');await page.clock.pauseAt(new Date('2026-10-10T12:00:02Z'));}
async function ready(page){await page.locator('#start-button').click();await page.locator('#character-button').click();await page.locator('[data-career-path="technical"]').click();await page.locator('#close-character-button').click();await page.locator('#inbox-button').click();await page.locator('[data-message-choice="check-facts"]').click();await page.locator('#close-inbox-button').click();await page.locator('#pause-button').click();await page.locator('#quit-button').click();await page.locator('#go-home-button').click();await page.locator('[data-evening="rest"]').click();await page.locator('[data-conversation="remember"]').click();}
for(const width of [1440,390])test(`${width}px managers, lasting path and morning save resume`,async({page})=>{
  await boot(page,width);await ready(page);await page.locator('#save-campaign').click();await expect(page.locator('#campaign-save-status')).toContainText('Day 2 morning saved');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sdh_dungeon_campaign_v1')));
  expect(saved.carry.careerCarry.days).toEqual([1]);expect(saved.carry.careerCarry.path).toBe('technical');expect(saved.life.relationships.mira).toBeGreaterThan(50);
  await page.reload();await expect(page.locator('#resume-campaign')).toBeVisible();await page.locator('#resume-campaign').click();await expect(page.locator('#time')).toHaveText('0 / 15');await page.locator('#character-button').click();
  for(const manager of ['Pam Papertrail','Dash Dashboard','Vera Visibility'])await expect(page.locator('#career-panel')).toContainText(manager);
  await expect(page.locator('[data-career-path="technical"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-career-path="people"]')).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:`test-results/career-${width}.png`,fullPage:true});await page.locator('#close-character-button').click();await page.locator('#inbox-button').click();await expect(page.locator('#inbox-messages')).toContainText('Reply-all');
});
test('two tabs cannot overwrite a newer saved morning',async({context,page})=>{
  const other=await context.newPage();await boot(page);await boot(other);await ready(page);await ready(other);await page.locator('#save-campaign').click();await expect(page.locator('#campaign-save-status')).toContainText('morning saved');
  const original=await page.evaluate(()=>localStorage.getItem('sdh_dungeon_campaign_v1'));await other.locator('#save-campaign').click();await expect(other.locator('#campaign-save-status')).toContainText('Another tab changed');expect(await page.evaluate(()=>localStorage.getItem('sdh_dungeon_campaign_v1'))).toBe(original);await other.close();
});
test('damaged campaign retained without enabling resume',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sdh_dungeon_campaign_v1','{"schema":99}'));await boot(page);await expect(page.locator('#campaign-status')).toContainText('damaged');await expect(page.locator('#resume-campaign')).toBeHidden();expect(await page.evaluate(()=>localStorage.getItem('sdh_dungeon_campaign_v1'))).toBe('{"schema":99}');
});
