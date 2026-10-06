import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,chooseDungeonSkill,chooseDungeonGear} from '../js/rush-engine.js';
import {progressDungeon} from '../js/rush-dungeon.js';
import {createLife} from '../js/rush-life.js';
import {validateCheckpoint,readCheckpoint,CAMPAIGN_KEY} from '../js/rush-campaign-save.js';
function earned(){const g=createGame('earned',false,'engineer',{career:true,stats:{technical:2}});g.completedNormal=8;progressDungeon(g);chooseDungeonSkill(g,'systems-engineer');chooseDungeonSkill(g,'rollback-architect');chooseDungeonGear(g,'rollback-cape');chooseDungeonGear(g,'duct-tape-codex');const life=createLife('earned');life.day=2;return {schema:1,content:'dungeon-career-1',identity:'earned',revision:1,classId:'engineer',aptitude:'platform',life,carry:{day:2,morale:95,assists:3,briefing:[],dungeonCarry:g.dungeon,careerCarry:g.career}};}
test('valid earned build is accepted without mutation, including gear chosen out of floor order',()=>{const v=earned(),before=JSON.stringify(v);assert.equal(validateCheckpoint(v),v);assert.equal(JSON.stringify(v),before);});
test('valid earlier-day text is retained without mutation',()=>{const v=earned();v.carry.dungeonCarry.previousDays=[{day:1,text:'Known earlier-day recap.'}];const before=JSON.stringify(v);assert.equal(validateCheckpoint(v),v);assert.equal(JSON.stringify(v),before);});
const mutations={
  missing:v=>delete v.carry.dungeonCarry,
  null:v=>v.carry.dungeonCarry=null,
  'missing stats':v=>delete v.carry.dungeonCarry.stats,
  'unknown skill':v=>v.carry.dungeonCarry.skills.push('mystery-promotion'),
  'wrong class skill':v=>v.carry.dungeonCarry.skills=['room-reader','cross-examiner'],
  'missing skill prerequisite':v=>v.carry.dungeonCarry.skills=['rollback-architect'],
  'mutually exclusive skills':v=>v.carry.dungeonCarry.skills=['systems-engineer','field-technician'],
  'duplicate gear':v=>v.carry.dungeonCarry.gear.push('rollback-cape'),
  'unknown gear':v=>v.carry.dungeonCarry.gear=['mystery-cape'],
  'invalid checkpoint':v=>v.carry.dungeonCarry.checkpointsEarned.push(99),
  'duplicate checkpoint':v=>v.carry.dungeonCarry.checkpointsEarned.push(3),
  'missing point budget':v=>delete v.carry.dungeonCarry.initialStatBudget,
  'invalid XP':v=>v.carry.dungeonCarry.xp=-1,
  'inconsistent level':v=>v.carry.dungeonCarry.level=1,
  'inconsistent gear floors':v=>v.carry.dungeonCarry.gearFloors=[2,3],
  'inconsistent skill points':v=>v.carry.dungeonCarry.skillPoints=1,
  'missing seed':v=>delete v.life.seed,
  'empty seed':v=>v.life.seed='',
  'primitive memory':v=>v.life.memory='memory',
  'primitive inbox':v=>v.life.choices.inbox='inbox',
  'array inbox':v=>v.life.choices.inbox=[],
  'stale evening choice':v=>v.life.choices.evening='rest',
  'stale conversation choice':v=>v.life.choices.conversation='remember',
  'stale inbox choice':v=>v.life.choices.inbox={'mira-thread':'check-facts'},
  'invalid history':v=>v.life.history.push('history'),
  'null previous day':v=>v.carry.dungeonCarry.previousDays=[null],
  'primitive previous day':v=>v.carry.dungeonCarry.previousDays=['yesterday'],
  'missing previous day text':v=>v.carry.dungeonCarry.previousDays=[{day:1}],
  'nontext previous day':v=>v.carry.dungeonCarry.previousDays=[{day:1,text:{}}],
  'too many previous days':v=>v.carry.dungeonCarry.previousDays=Array.from({length:8},()=>({day:1,text:'Earlier day'})),
  'malformed pending recap':v=>v.carry.dungeonCarry.recap={day:1,text:null},
  'null journal entry':v=>v.carry.dungeonCarry.journal.push(null),
  'null boss reaction':v=>v.carry.dungeonCarry.bossReactions.push(null),
  'malformed project log text':v=>v.carry.dungeonCarry.projectLog.push({text:{}}),
};
for(const [name,mutate]of Object.entries(mutations))test(`quarantine ${name} and preserve original bytes`,()=>{const v=earned();mutate(v);const raw=JSON.stringify(v),storage={getItem:key=>key===CAMPAIGN_KEY?raw:null,setItem:()=>assert.fail('validation cannot write')};const result=readCheckpoint(storage);assert.equal(result.value,null);assert.ok(result.error);assert.equal(result.raw,raw);assert.equal(storage.getItem(CAMPAIGN_KEY),raw);});
