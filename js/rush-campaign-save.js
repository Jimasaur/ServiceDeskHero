import {validateCareer} from './rush-career.js';
import {createDungeon} from './rush-dungeon.js';
export const CAMPAIGN_KEY='sdh_dungeon_campaign_v1';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
/** Schema 1 always writes a full dungeon snapshot. This is validation, not migration. */
export function validateSavedBuild(carry,classId,nextDay) {
  const fail=()=>{throw new Error('Damaged saved build; original data retained.');};
  if(!carry||typeof carry!=='object'||Array.isArray(carry))fail();
  const retained=['stats','skills','gear','gearFloors','checkpointsEarned','level','statPoints','skillPoints','gearChoices','initialStatBudget','xp','configured'];
  for(const key of retained)if(!Object.hasOwn(carry,key))fail();
  if(!carry.stats||Object.keys(carry.stats).length!==4||['technical','insight','composure','bullshit'].some(key=>!Object.hasOwn(carry.stats,key)))fail();
  for(const key of ['skills','gear','gearFloors','checkpointsEarned','previousDays','journal','projectLog','bossReactions','xpKeys'])if(!Array.isArray(carry[key]))fail();
  const text=value=>typeof value==='string'&&value.length>0&&value.length<=5000;
  const daySummary=entry=>object(entry)&&Number.isSafeInteger(entry.day)&&entry.day>=1&&entry.day<=carry.day&&text(entry.text);
  if(carry.previousDays.length>7||carry.previousDays.some(entry=>!daySummary(entry))||(carry.recap!==null&&!daySummary(carry.recap)))fail();
  if(carry.journal.some(entry=>!(text(entry)||(object(entry)&&text(entry.text||entry.description||entry.title))))||carry.bossReactions.some(entry=>!(text(entry)||(object(entry)&&text(entry.text||entry.description))))||carry.projectLog.some(entry=>!object(entry)||!text(entry.text)))fail();
  for(const key of ['level','statPoints','skillPoints','gearChoices','initialStatBudget','xp'])if(!Number.isSafeInteger(carry[key])||carry[key]<0)fail();
  if(typeof carry.configured!=='boolean'||!Number.isInteger(carry.floor)||carry.floor<1||carry.floor>3||carry.day!==nextDay-1)fail();
  const normalized=createDungeon({day:nextDay,dungeonCarry:carry},classId);
  // The carry constructor is intentionally tolerant for existing engine callers.
  // A persisted snapshot must not silently lose, replace or gain retained build data.
  for(const key of retained)if(JSON.stringify(carry[key])!==JSON.stringify(normalized[key]))fail();
  const allocated=Object.values(carry.stats).reduce((a,b)=>a+b,0);
  if(carry.statPoints!==carry.initialStatBudget+carry.checkpointsEarned.length-allocated)fail();
  return carry;
}
export function validateCheckpoint(v) {
  if(!v||v.schema!==1||v.content!=='dungeon-career-1'||typeof v.identity!=='string'||!v.identity||!Number.isInteger(v.revision)||v.revision<1||!['engineer','faker'].includes(v.classId)||!['network','platform'].includes(v.aptitude)||!v.life||v.life.stage!=='work'||!Number.isInteger(v.life.day)||v.life.day<2||v.life.day>1000||!v.carry||v.carry.day!==v.life.day||!Array.isArray(v.carry.briefing)||v.carry.briefing.some(x=>typeof x!=='string')||!Number.isFinite(v.carry.morale)||v.carry.morale<90||v.carry.morale>100||!Number.isInteger(v.carry.assists)||v.carry.assists<2||v.carry.assists>4)throw new Error('Incompatible or damaged campaign save; original data retained.');
  validateCareer(v.carry.careerCarry);validateSavedBuild(v.carry.dungeonCarry,v.classId,v.life.day);
  if(v.carry.careerCarry.days.some(d=>d>=v.life.day))throw new Error('Checkpoint contains a repeated or future award.');
  if(typeof v.life.seed!=='string'||!v.life.seed.trim()||!object(v.life.choices)||!object(v.life.choices.inbox)||Object.keys(v.life.choices.inbox).length||v.life.choices.evening!==null||v.life.choices.conversation!==null)throw new Error('Damaged morning choices or seed; original data retained.');
  const memories={mira:['heard','boundary','backed','rumour','confirmed','contradicted'],rowan:['heard','repaired','missed'],packet:['played']};
  if(!object(v.life.memory)||Object.entries(memories).some(([key,values])=>!Object.hasOwn(v.life.memory,key)||(v.life.memory[key]!==null&&!values.includes(v.life.memory[key])))||!object(v.life.preferences)||['rowan','packet'].some(key=>typeof v.life.preferences[key]!=='string'))throw new Error('Damaged relationship memory; original data retained.');
  for(const key of ['energy','stress'])if(!Number.isFinite(v.life[key])||v.life[key]<0||v.life[key]>100)throw new Error('Invalid life state.');
  for(const key of ['mira','rowan','packet'])if(!Number.isFinite(v.life.relationships?.[key])||v.life.relationships[key]<0||v.life.relationships[key]>100)throw new Error('Invalid relationship state.');
  if(!v.life.choices||!v.life.choices.inbox||!v.life.memory||!Array.isArray(v.life.history)||!Array.isArray(v.life.pending)||v.life.pending.length||v.life.promise!==null)throw new Error('Invalid morning state.');
  if(v.life.studyBonus!==0||v.life.workSummary!==null||v.life.homeConversation!==null||v.life.activityResult!==''||v.life.conversationResult!==''||v.life.history.some(h=>!object(h)||!Number.isInteger(h.day)||h.day<1||h.day>v.life.day||['type','id','text'].some(key=>typeof h[key]!=='string')))throw new Error('Damaged morning history; original data retained.');
  return v;
}
export function readCheckpoint(storage) {
  const raw=storage.getItem(CAMPAIGN_KEY);
  if(raw===null)return {raw:null,value:null};
  try{return {raw,value:validateCheckpoint(JSON.parse(raw))};}catch(error){return {raw,value:null,error:error.message};}
}
/** Compare the exact captured predecessor under one exclusive, origin-scoped lock. */
export async function writeCheckpoint(storage,locks,expectedRaw,value) {
  const captured=validateCheckpoint(structuredClone(value)),encoded=JSON.stringify(captured);
  if(!locks?.request)throw new Error('Safe saving requires HTTPS or localhost with Web Locks.');
  return locks.request(CAMPAIGN_KEY,async()=>{
    if(storage.getItem(CAMPAIGN_KEY)!==expectedRaw)throw new Error('Another tab changed this campaign. Reload before saving; its progress was preserved.');
    let prior=null;try{prior=validateCheckpoint(JSON.parse(expectedRaw));}catch{/* Quarantined data may be replaced only through the UI confirmation. */}
    if(captured.revision!==(prior?.revision||0)+1)throw new Error('Save revision must advance exactly once.');
    if(prior?.identity===captured.identity&&captured.life.day<prior.life.day)throw new Error('A retained campaign cannot rewind to an earlier morning.');
    storage.setItem(CAMPAIGN_KEY,encoded);return encoded;
  });
}
