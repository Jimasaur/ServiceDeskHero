/** Local, fictional career rules. No accounts, network or competitive provenance. */
export const MANAGERS = Object.freeze([
  {name:'Pam Papertrail', preference:'process', finale:'PrinterThatCannotBeFound', target:3, motto:'If it is not documented, it happened to another department.'},
  {name:'Dash Dashboard', preference:'results', finale:'SpreadsheetHydra', target:3, motto:'Green charts are nice. Working services are annoyingly persuasive.'},
  {name:'Vera Visibility', preference:'optics', finale:'Friday4:59ChangeRequest', target:3, motto:'Tell the room what is happening, then make the story true.'},
]);
export const CAREER_PATHS = Object.freeze([
  {id:'technical', name:'Technical specialist', description:'After one promotion: project steps 10% faster; matching project design defect odds fall by 15 percentage points.'},
  {id:'incident', name:'Incident lead', description:'After one promotion: incident repair 20% faster. Rollback work on project risks takes 12 seconds instead of 18.'},
  {id:'people', name:'People lead', description:'After one promotion: one extra morning assist (maximum four), and correct repairs restore one morale.'},
]);
export function createCareer(carry) {
  if(carry) { validateCareer(carry); return structuredClone(carry); }
  return {version:1,path:null,promotions:0,endorsements:0,days:[],relationships:[0,0,0],history:[],consequences:[]};
}
export function validateCareer(c) {
  if(!c||c.version!==1||!(c.path===null||CAREER_PATHS.some(p=>p.id===c.path))||!Number.isInteger(c.promotions)||c.promotions<0||c.promotions>3||!Number.isInteger(c.endorsements)||c.endorsements<0||!Array.isArray(c.days)||c.days.length>1000||c.days.some(d=>!Number.isInteger(d)||d<1)||new Set(c.days).size!==c.days.length||!Array.isArray(c.relationships)||c.relationships.length!==3||c.relationships.some(n=>!Number.isInteger(n)||n<0)||!Array.isArray(c.history)||c.history.length>30) throw new RangeError('Invalid career checkpoint.');
  if(c.endorsements!==c.relationships.reduce((a,b)=>a+b,0)||!Array.isArray(c.consequences)||c.consequences.length>30||c.consequences.some(x=>!x||typeof x.text!=='string'||x.text.length>1000||!Number.isInteger(x.day)||x.day<1))throw new RangeError('Invalid retained career consequences.');
  for(const h of c.history)if(!h||!c.days.includes(h.day)||!Array.isArray(h.reviews)||h.reviews.length!==3||h.reviews.some((r,i)=>r.manager!==MANAGERS[i].name||!Number.isInteger(r.favor)||r.favor<0||r.favor>4||typeof r.cleared!=='boolean'||r.awarded!==(r.cleared?r.favor:0)))throw new RangeError('Invalid career review history.');
  return c;
}
export function chooseCareerPath(g,id) {
  if(!g.career||g.career.path||!CAREER_PATHS.some(p=>p.id===id)||!['playing','paused'].includes(g.status)) return false;
  g.career.path=id; return true;
}
export function careerEffects(g) {
  const path=g.career?.promotions>0?g.career.path:null;
  return {projectTime:path==='technical'?-.1:0,incidentTime:path==='incident'?.8:1,rollbackSeconds:path==='incident'?12:18,recovery:path==='people'?1:0,assist:path==='people'?1:0};
}
/** Preference credit is derived from unique outcomes, never button presses. */
export function careerFavor(g,index) {
  const preference=MANAGERS[index].preference;
  const tested=g.projects.filter(p=>p.releaseMethod==='tested').length;
  const evidence=g.history.filter(t=>t.resolution==='fix'&&t.evidence?.length).length;
  const clean=g.projects.filter(p=>p.releaseMethod==='shortcut'&&!p.latentDefect).length;
  return Math.min(4,preference==='process'?tested+Math.min(2,evidence):preference==='results'?Math.floor(g.normalFixes/3)+clean:Math.min(2,g.successfulBluffs)+tested+Math.min(2,evidence));
}
export function settleCareer(g) {
  const c=g.career;if(!c||c.days.includes(g.dungeon.day))return null;
  const reviews=MANAGERS.map((m,i)=>{
    const favor=careerFavor(g,i),cleared=g.bossStatus[m.finale]==='defeated';
    const awarded=cleared?favor:0;c.relationships[i]+=awarded;c.endorsements+=awarded;
    return {manager:m.name,favor,cleared,awarded};
  });
  const before=c.promotions;
  // Promotion requires an actual finale and its manager's retained preference credit.
  while(c.promotions<3&&c.relationships[c.promotions]>=MANAGERS[c.promotions].target)c.promotions++;
  c.days.push(g.dungeon.day);const report={day:g.dungeon.day,reviews,promotions:c.promotions,gained:c.promotions-before};
  const unresolved=[...g.queue.map(t=>t.source.title),...g.returns.map(r=>r.ticket.source.title),...g.history.filter(t=>t.handoff).map(t=>t.source.title),...g.risks.filter(r=>r.status==='pending').map(r=>r.incidentTitle)];
  for(const title of new Set(unresolved))c.consequences.push({day:g.dungeon.day,text:`Day ${g.dungeon.day}: ${title} remains owned by the recovery shift; restoration is not credited. Prior bounded handoff costs still apply; this record is not an extra penalty.`});
  c.consequences=c.consequences.slice(-30);
  c.history.push(report);c.history=c.history.slice(-30);return report;
}
export function designProbability(g,project) {
  const aptitude=g.dungeon.stats.technical>=2&&g.aptitude===project.domain;
  return Math.max(.05,project.baseRisk-(aptitude?.15:0)-(g.career?.path==='technical'&&g.career.promotions>0&&g.aptitude===project.domain?.15:0));
}
