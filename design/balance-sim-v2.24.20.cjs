#!/usr/bin/env node
// Run the actual game's numerical functions and timers without a browser.
// No writes to game/, browser storage, or historical logs.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'game/index.html'), 'utf8');
const original = html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// ============ 启动 ============')[0];
const sourceHash = crypto.createHash('sha256').update(html).digest('hex');

const scenarios = {
  baseline: {},
  desktop: {width:960},
  casual: {actionSec:10,skillPolicy:'random'},
  balanced: {attackWeight:1},
  attack_heavy: {attackWeight:3},
  no_fusion: {fuse:false},
  sustain: {skillPolicy:'sustain'},
  soul_first: {treePolicy:'soul_first'},
  ads: {adMult:2,crateFloor:15},
  cost_124: {patches:[['COST_G=1.25','COST_G=1.24']]},
  mob_atk_114: {patches:[['MOB_ATK_G=1.15','MOB_ATK_G=1.14']]},
  shield_soft: {patches:[['(isPrism()?0.8:0.5)','(isPrism()?0.6:0.35)']]},
  start_atk_10: {patches:[['ATK0=8','ATK0=10']]},
  tree_75: {patches:[['0.05*S.tree.dmg','0.075*S.tree.dmg']]},
  tree_10: {patches:[['0.05*S.tree.dmg','0.10*S.tree.dmg']]},
  replay_fast: {replayAnimScale:0.4},
  combo: {replayAnimScale:0.4, patches:[['0.05*S.tree.dmg','0.075*S.tree.dmg']]},
  soul_floor: {treePolicy:'soul_first',patches:[['Math.ceil(base*(1+0.1*(S.tree.soul||0))*(1+0.1*count("resonance")))','Math.floor(base*(1+0.1*(S.tree.soul||0))*(1+0.1*count("resonance")))']]},
  fps60: {fps:60},
  economy_tree: {treePolicy:'economy'},
  soul_economy: {treePolicy:'soul_economy'},
  soul_carry: {treePolicy:'soul_first',patches:[['const drop=Math.ceil(base*(1+0.1*(S.tree.soul||0))*(1+0.1*count("resonance")));','const exact=base*(1+0.1*(S.tree.soul||0))*(1+0.1*count("resonance"))+(S.dropRemainder||0); const drop=Math.floor(exact+1e-9); S.dropRemainder=exact-drop;']]},
  shield_combo: {replayAnimScale:0.4,patches:[['(isPrism()?0.8:0.5)','(isPrism()?0.6:0.35)'],['0.05*S.tree.dmg','0.075*S.tree.dmg']]},
  prism_60: {patches:[['(isPrism()?0.8:0.5)','(isPrism()?0.6:0.5)']]},
  prism_combo: {replayAnimScale:0.4,patches:[['(isPrism()?0.8:0.5)','(isPrism()?0.6:0.5)'],['0.05*S.tree.dmg','0.075*S.tree.dmg']]},
  growth_combo: {replayAnimScale:0.4,patches:[['0.05*S.tree.dmg','0.10*S.tree.dmg']]},
  economy_fast: {treePolicy:'economy',replayAnimScale:0.4},
  soul_economy_fast: {treePolicy:'soul_economy',replayAnimScale:0.4},
  economy_growth_fast: {treePolicy:'economy',replayAnimScale:0.4,patches:[['0.05*S.tree.dmg','0.10*S.tree.dmg']]},
};

function seeded(seed) { return () => { let t=seed+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
function simulate(config, seed) {
  const cfg = {width:390,fps:30,actionSec:2,attackWeight:1.5,skillPolicy:'mixed',fuse:true,treePolicy:'damage',adMult:1,crateFloor:null,runs:5,replayAnimScale:1,...config};
  let source=original;
  for(const [a,b] of cfg.patches||[]) { if(!source.includes(a)) throw Error('Patch not found: '+a); source=source.replace(a,b); }
  let clock=100000, timerId=0, timers=[];
  const random=seeded(seed), math=Object.create(Math); math.random=random;
  const node=()=>({style:{},classList:{add(){},remove(){},toggle(){}},offsetWidth:110,offsetLeft:0,offsetTop:0,appendChild(){},remove(){},addEventListener(){}});
  const nodes=new Map();
  const document={getElementById(id){if(!nodes.has(id)) nodes.set(id,node()); return nodes.get(id);},createElement:node,addEventListener(){},hidden:false};
  const environment={cfg,advance(ms){clock+=ms;},now:()=>clock,
    schedule(fn,ms){timers.push({id:++timerId,at:clock+ms,fn});return timerId;},
    cancel(id){timers=timers.filter(t=>t.id!==id);},
    flush(){let guard=0; while(true){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>clock+1e-5)break;timers.shift().fn();if(++guard>1000)throw Error('timer loop');}},
    document,Math:math,Date:{now:()=>clock},performance:{now:()=>clock},window:{innerWidth:cfg.width,addEventListener(){}},
    Image:function(){},localStorage:{setItem(){},getItem(){return null;},removeItem(){}},requestAnimationFrame(){},getComputedStyle(){return {backgroundImage:''};}
  };
  const harness = `
  const cfg=env.cfg;
  // UI-only callbacks are suppressed; numerical functions, combat loop, transitions,
  // upgrades, equipment, skills, prestige and tree purchase remain original code.
  renderPanels=renderCombat=renderDrawer=renderSpeedBtn=toast=floatDmg=lunge=enemyAnim=enemyDie=showModal=closeModal=saveLogs=()=>{};
  save=()=>{S.lastSave=Date.now();S.playerHp=player.hp;};
  let rows=[], floorRows=[], events=[], roundStart=Date.now(), combatMs=0, transitMs=0, choiceMs=0;
  let prevBest=0, frontierAt=null, firstClear=null, nextAction=Date.now(), choiceScheduled=false;
  let crateUsed=0;
  logEvent=(type,data)=>{if(['wall','skill','crate','prestige'].includes(type))events.push({type,t:(Date.now()-roundStart)/1000,floor:S.floor,...data});};
  pushFloorSummary=()=>{floorRows.push({run:rows.length+1,floor:S.floor,seconds:(Date.now()-roundStart)/1000,bossSeconds:(Date.now()-bossEnterT)/1000,atkLv:S.atkLv,hpLv:S.hpLv});if(firstClear===null)firstClear=(Date.now()-roundStart)/1000;};
  const rank={mixed:['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'],sustain:['nano','shield','subdermal','fire','neuro','blackmarket','overclock','fatal','resonance','ghoststep','adrenaline','lowhp','critsurge','killcycle','soulrush']};
  function act(){
    if(cfg.fuse)for(const slot of Object.keys(SLOTS))fuseSlot(slot);
    for(const slot of Object.keys(SLOTS))salvage(slot);
    if(cfg.crateFloor&&S.floor>=cfg.crateFloor&&Date.now()>=S.crateReady){openCrate();crateUsed++;}
    for(let i=0;i<200;i++){
      const atk=cost(S.atkLv)/cfg.attackWeight<=cost(S.hpLv);
      if(S.gold<cost(atk?S.atkLv:S.hpLv))break;
      $(atk?'btnAtk':'btnHp').onclick();
    }
  }
  function invest(){
    if(['soul_first','soul_economy'].includes(cfg.treePolicy)&&!S.tree.soul&&S.souls>=1)buyTree('soul');
    if(['economy','soul_economy'].includes(cfg.treePolicy)){
      for(let i=0;i<1000;i++){
        const a=.05/(1+.05*S.tree.dmg)/treeCost('dmg');
        const g=.5*.1/(1+.1*S.tree.gold)/treeCost('gold');
        const key=a>=g?'dmg':'gold';if(S.souls<treeCost(key))break;buyTree(key);
      }
    }else while(S.souls>=treeCost('dmg'))buyTree('dmg');
  }
  S=freshState();S.speed2=true;spawnMob();
  if(cfg.verify){
    const probes={firstMob:{hp:cur.max,atk:cur.atk,playerHp:player.hp},costLv10:cost(10)};
    S.floor=20;S.mobIdx=5;spawnMob();probes.prism={hp:cur.max,shield:cur.maxShield,atk:cur.atk};
    S.skills=['nano'];S.playerHp=null;player.hp=50;cur.shield=100;cur.hp=1000;Math.random=()=>1;dealPlayerHit();probes.shieldHitHp=player.hp;
    cur.shield=0;dealPlayerHit();probes.fleshHitHp=player.hp;
    S.gold=100;S.hpLv=0;player.hp=50;$('btnHp').onclick();probes.hpUpgrade=player.hp;
    S.equip.weapon={slot:'weapon',q:2};S.inv=[{slot:'weapon',q:2},{slot:'weapon',q:2}];fuseSlot('weapon');probes.fusion={quality:S.equip.weapon.q,inventory:S.inv.length};
    S.tree.soul=1;probes.firstSoulDrop=Math.ceil(1*(1+.1*S.tree.soul));
    return probes;
  }
  openingRunIn();
  const frameMs=1000/cfg.fps;
  while(rows.length<cfg.runs){
    env.advance(frameMs);env.flush();
    if(skillOfferOpen&&!choiceScheduled){
      choiceScheduled=true;
      env.schedule(()=>{let picks=curOffer.slice();if(cfg.skillPolicy!=='random')picks.sort((a,b)=>rank[cfg.skillPolicy].indexOf(a)-rank[cfg.skillPolicy].indexOf(b));pickSkill(picks[0]);choiceScheduled=false;},6000);
    }
    if(Date.now()>=nextAction&&!wall&&!skillOfferOpen){act();nextAction=Date.now()+cfg.actionSec*1000;}
    if(S.floor>prevBest&&frontierAt===null)frontierAt=(Date.now()-roundStart)/1000;
    if(!paused&&cur.hp<1e17)combatMs+=frameMs;
    else if(skillOfferOpen)choiceMs+=frameMs;
    else transitMs+=frameMs;
    loop(Date.now());
    const censored=(Date.now()-roundStart)>5400000||S.floor>250;
    if(wall||censored){
      rows.push({run:rows.length+1,seed,floor:S.floor,mob:S.mobIdx+1,minutes:(Date.now()-roundStart)/60000,combatMinutes:combatMs/60000,transitionMinutes:transitMs/60000,choiceMinutes:choiceMs/60000,replayMinutes:frontierAt===null?(Date.now()-roundStart)/60000:frontierAt/60,firstClearSeconds:firstClear,souls:S.runSouls,carryGold:salvageAllGold().g,atkLv:S.atkLv,hpLv:S.hpLv,tree:{...S.tree},skills:S.skills.slice(),gear:Object.fromEntries(Object.entries(S.equip).map(([k,v])=>[k,v?v.q:null])),reason:wall?events.filter(e=>e.type==='wall').at(-1).reason:'censored',crateUsed,events});
      if(rows.length>=cfg.runs||censored)break;
      prevBest=S.bestEver;roundStart=Date.now();combatMs=transitMs=choiceMs=0;frontierAt=firstClear=null;events=[];crateUsed=0;
      applyPrestige(cfg.adMult);invest();act();
    }
  }
  return {rows,floors:floorRows};
  `;
  // Scale only game animation timers, only on previously cleared floors.
  const timerPrelude=`const setTimeout=(fn,ms)=>env.schedule(fn,ms*((typeof S!=='undefined'&&S&&S.prestiges&&S.floor<=S.bestEver)?env.cfg.replayAnimScale:1));const clearTimeout=env.cancel;`;
  return new Function('env','seed', 'const {document,Math,Date,performance,window,Image,localStorage,requestAnimationFrame,getComputedStyle}=env;'+timerPrelude+source+harness)(environment,seed);
}

function percentile(a,p){const s=a.slice().sort((a,b)=>a-b),i=(s.length-1)*p,lo=Math.floor(i);return s[lo]+(s[Math.ceil(i)]-s[lo])*(i-lo);}
function summarize(rows){const result={};for(const run of [...new Set(rows.map(r=>r.run))]){const rs=rows.filter(r=>r.run===run);const metrics={};for(const key of ['floor','minutes','combatMinutes','transitionMinutes','replayMinutes','firstClearSeconds','souls','carryGold']){const a=rs.map(r=>r[key]).filter(x=>x!==null);metrics[key]={p10:percentile(a,.1),p50:percentile(a,.5),p90:percentile(a,.9)};}result[run]={n:rs.length,...metrics,censored:rs.filter(r=>r.reason==='censored').length};}return result;}

if(require.main===module){
  const names=(process.env.SCENARIOS||Object.keys(scenarios).join(',')).split(',');
  const n=Number(process.env.SEEDS||100),runs=Number(process.env.RUNS||5);
  const out=path.resolve(process.env.OUT||path.join(__dirname,'balance-results-v2.24.20'));
  fs.mkdirSync(out,{recursive:true});
  const report={version:html.match(/const VERSION="([^"]+)"/)[1],sourceHash,seeds:n,runs,results:{}};
  for(const name of names){if(!scenarios[name])throw Error('Unknown scenario: '+name);const rows=[],floors=[];for(let seed=1;seed<=n;seed++){const r=simulate({...scenarios[name],runs},seed);rows.push(...r.rows);floors.push(...r.floors.map(f=>({...f,seed})));}
    const summary=summarize(rows);report.results[name]={config:scenarios[name],summary};fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({sourceHash,config:scenarios[name],rows,floors}));
    console.log(name,JSON.stringify(Object.fromEntries(Object.entries(summary).map(([k,v])=>[k,{floor:v.floor.p50,min:+v.minutes.p50.toFixed(2),replay:+v.replayMinutes.p50.toFixed(2)}]))));
    fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2));
  }
}
module.exports={simulate,summarize,scenarios,sourceHash};
