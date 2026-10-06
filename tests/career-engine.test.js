import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startProject,advance,actionSeconds,projectSeconds,acknowledgeTicket,takeAction} from '../js/rush-engine.js';
import {createLife} from '../js/rush-life.js';
import {createCareer,careerFavor,chooseCareerPath,settleCareer,designProbability} from '../js/rush-career.js';
import {CAMPAIGN_KEY,readCheckpoint,writeCheckpoint,validateCheckpoint} from '../js/rush-campaign-save.js';
const make=(seed='campaign')=>createGame(seed,false,'engineer',{career:true,stats:{technical:2},aptitude:'platform'});
function project(g,action){assert.equal(startProject(g,'portal-rollout',action),true);advance(g,g.work.ends-g.time);}
test('three different finales, isolated from legacy engine fixtures',()=>{
  assert.equal(make().bosses.length,3);assert.equal(createGame().bosses.length,2);
  assert.deepEqual(make().bosses.map(b=>b.afterNormal),[4,8,12]);
});
test('matching aptitude lowers initial odds; testing cannot reroll an existing defect',()=>{
  const g=make(),p=g.projects[0],network=g.projects[1];
  assert.ok(Math.abs(designProbability(g,p)-.3)<1e-9);assert.equal(designProbability(g,network),.55);
  const before=p.latentDefect;project(g,'test');assert.equal(p.defectDetected,before);assert.equal(p.latentDefect,before);
  assert.equal(startProject(g,p.id,'test'),false);
});
test('clean shortcuts stay wins; defective shortcuts create causal risk',()=>{
  let clean,defective;
  for(let i=0;i<40;i++){const g=make(`design-${i}`);if(g.projects[0].latentDefect)defective??=g;else clean??=g;}
  assert.ok(clean&&defective);project(clean,'unsafeRelease');project(defective,'unsafeRelease');
  assert.equal(clean.projects[0].releaseMethod,'shortcut');assert.equal(clean.projectPoints,350);assert.equal(clean.risks.length,0);
  assert.equal(defective.risks.length,1);assert.equal(defective.projectPoints,0);
});
test('favor counts unique outcomes, caps and requires cleared finale; awards once per day',()=>{
  const g=make();g.normalFixes=12;g.history=Array.from({length:8},()=>({resolution:'fix',evidence:[{}]}));
  g.projects.forEach(p=>p.releaseMethod='tested');g.successfulBluffs=4;
  assert.equal(careerFavor(g,0),4);assert.equal(settleCareer(g).gained,0);
  assert.equal(settleCareer(g),null);assert.equal(g.career.endorsements,0);
  const next=make();next.normalFixes=12;next.history=g.history;next.projects=g.projects;next.successfulBluffs=4;
  for(const key of Object.keys(next.bossStatus))next.bossStatus[key]='defeated';
  assert.equal(settleCareer(next).gained,3);assert.equal(next.career.endorsements,12);assert.equal(settleCareer(next),null);
});
test('path unlocks change actual work only after promotion and cannot be switched',()=>{
  const g=make();assert.equal(chooseCareerPath(g,'incident'),true);assert.equal(chooseCareerPath(g,'people'),false);
  g.queue[0].incident=true;const duration=actionSeconds(g,'fix');g.career.promotions=1;
  assert.equal(actionSeconds(g,'fix'),Math.round(duration*.8*1000)/1000);assert.equal(actionSeconds(g,'wrong'),actionSeconds(g,'fix'));
  assert.equal(projectSeconds(g,'remediate'),10.32);
});
function checkpoint(){const life=createLife('local');life.day=2;const g=make();return {schema:1,content:'dungeon-career-1',identity:'career-a',revision:1,classId:'engineer',aptitude:'platform',life,carry:{day:2,morale:95,assists:3,briefing:['A new morning'],dungeonCarry:g.dungeon,careerCarry:createCareer()}};}
function storage(){const s=new Map();return {getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,v)};}
test('malformed checkpoint is quarantined without deleting original data',()=>{
  const s=storage();s.setItem(CAMPAIGN_KEY,'{"schema":99}');const result=readCheckpoint(s);assert.ok(result.error);assert.equal(s.getItem(CAMPAIGN_KEY),result.raw);
  const bad=checkpoint();bad.life.relationships.mira=Infinity;assert.throws(()=>validateCheckpoint(bad));
  const repeat=checkpoint();repeat.carry.careerCarry.days=[2];assert.throws(()=>validateCheckpoint(repeat));
});
test('locked compare-and-swap rejects stale tabs and preserves the winner',async()=>{
  const s=storage();let chain=Promise.resolve();const locks={request:(key,fn)=>{const result=chain.then(fn);chain=result.catch(()=>{});return result;}};
  const a=checkpoint(),b=checkpoint();b.identity='career-b';const results=await Promise.allSettled([writeCheckpoint(s,locks,null,a),writeCheckpoint(s,locks,null,b)]);
  assert.deepEqual(results.map(r=>r.status),['fulfilled','rejected']);assert.equal(readCheckpoint(s).value.identity,'career-a');
  assert.deepEqual(readCheckpoint(s).value.life,a.life);
});
test('queued save captures immutable input; unsupported locks and quota failure retain data',async()=>{
  const s=storage(),v=checkpoint();let release;const gate=new Promise(r=>release=r);const locks={request:async(k,fn)=>{await gate;return fn();}};
  const pending=writeCheckpoint(s,locks,null,v);v.life.relationships.mira=1;v.revision=99;release();await pending;
  assert.equal(readCheckpoint(s).value.life.relationships.mira,50);const raw=s.getItem(CAMPAIGN_KEY);
  await assert.rejects(writeCheckpoint(s,null,raw,checkpoint()));
  await assert.rejects(writeCheckpoint(s,{request:(k,fn)=>fn()},raw,checkpoint()),/revision/);
  const next=checkpoint();next.revision=2;const broken={getItem:s.getItem,setItem:()=>{throw new Error('quota');}};await assert.rejects(writeCheckpoint(broken,{request:(k,fn)=>fn()},raw,next),/quota/);assert.equal(s.getItem(CAMPAIGN_KEY),raw);
});
test('workaround awaiting its eleven-second return retains handoff title without a new reward',()=>{
  const g=make(),ticket=g.queue[0],patch=ticket.actions.findIndex(a=>a.kind==='patch');assert.ok(patch>=0);
  acknowledgeTicket(g,ticket.id);assert.ok(takeAction(g,patch,ticket.id));advance(g,g.work.ends-g.time);
  assert.equal(g.returns.length,1);assert.equal(g.queue.length,0);const score=g.score;
  const report=settleCareer(g);assert.equal(report.gained,0);assert.equal(g.score,score);
  assert.equal(g.career.consequences.filter(c=>c.text.includes(ticket.source.title)).length,1);
  const resumed=createCareer(g.career);assert.deepEqual(resumed.consequences,g.career.consequences);assert.equal(settleCareer(g),null);
});
