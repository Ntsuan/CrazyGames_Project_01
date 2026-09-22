
"use strict";
// ============ 数值模型（设计文档 v1.0 锁定参数） ============
const ATK0=8, HP0=100, GROWTH=1.10, COST0=6, COST_G=1.25;   // v2.14：1.22→1.25 首卡再提前（真人预计 20~25 层/12~15min）
const ASPD0=1.3;   // v0.11：开局手感提速（T1 实测前 10 层 28~38s/层偏慢）
const MOB_HP0=20, MOB_G=1.15, MOB_ATK0=1.5, MOB_ATK_G=1.15, GOLD_R=0.10;   // v2.14：怪攻 1.14→1.15
const BOSS={hp:6, atk:1.8, gold:5};
// v2.25：品质阶梯 10 档——报废/破损垫底，数值整体前移 2 档（前期曲线不变），不朽=虹彩封顶
const QUALITY=["报废","破损","民用","改装","军用","原型","传说","神话","永恒","不朽"];
function qualityName(q){ return QUALITY[Math.min(q,9)]||"不朽"; }   // v2.25：合成封顶不朽，取消无上限
function qClass(q){ return "q"+Math.min(q,9); }
const QCOL=["#3a3f46","#b8c0cc","#3ddc84","#4aa8ff","#c07bff","#ff6b6b","#ffb020","#ff2a6d","#d9fbff","IRIS"];
function multOf(slot,q){ const b=MULT[slot]; return q<=4?b[q]:Math.round(b[4]*Math.pow(1.35,q-4)); }   // v2.0 回调：橙后 1.45→1.35/阶
const SLOT_ICON={weapon:"weapon",implant:"neural",armor:"armor",chip:"chip"};
const SLOT_BUFF={weapon:"攻击",implant:"攻速",armor:"生命",chip:"信用点"};
// v2.3：固定词条（取消随机），同部位同品质完全同构
const FIXED_AFFIX={weapon:"crit",implant:"aspd",armor:"ls",chip:null};
const AFFIX_BASE={crit:5,aspd:10,ls:3}, AFFIX_STEP={crit:1,aspd:2,ls:1};   // v2.25：词条随品质递增（传说 q6 起）
const affixOf=(slot,q)=>{ const t=FIXED_AFFIX[slot]; return (t&&q>=6)?{t,v:AFFIX_BASE[t]+AFFIX_STEP[t]*(q-6)}:null; };
const SLOTS={weapon:"义体武器",implant:"神经插件",armor:"皮下装甲",chip:"芯片"};
const MULT={weapon:[10,25,45,70,100], implant:[5,10,18,28,40],
            armor:[10,25,45,70,100], chip:[10,20,35,55,80]};
// （DROPS 旧掉落表已于 v1.8 移除，改 dropBand 楼层区间制）
// v2.19：技能体系重构——10层=常驻属性池 / 5层=条件触发器池；全部单循环生效重塑清空
const SKILLS={
  // —— 10 层常驻属性（棱镜核心） ——
  overclock:{n:"战斗超频",d:"暴击率 +10%（可叠加）"},
  fatal:{n:"致命固件",d:"暴击伤害 +50%"},
  neuro:{n:"神经加速",d:"攻速 +15%"},
  fire:{n:"火力协议",d:"攻击 +25%"},
  subdermal:{n:"皮下加固",d:"生命 +30%"},
  nano:{n:"纳米修复",d:"吸血 +5%"},
  shield:{n:"应急护盾",d:"战斗开始获得 10% 最大生命护盾（每场刷新）"},
  blackmarket:{n:"黑市渠道",d:"信用点 +30%"},
  resonance:{n:"碎片共鸣",d:"Boss 碎片掉落 +10%"},
  // —— 5 层条件触发器（中庭） ——
  killcycle:{n:"杀戮循环",d:"暴击后攻速 +20%，持续 3 秒"},
  adrenaline:{n:"肾上腺素",d:"生命低于 50% 时攻速 +30%"},
  critsurge:{n:"狂暴节奏",d:"暴击后攻速 +30%，持续 5 秒"},
  ghoststep:{n:"光学迷彩",d:"击杀后无敌 2 秒"},
  lowhp:{n:"困兽协议",d:"生命低于 30% 时伤害 +40%"},
  soulrush:{n:"猎手直觉",d:"破盾后攻速 +25%，持续 4 秒"},
};
const POOL_10=["overclock","fatal","neuro","fire","subdermal","nano","shield","blackmarket","resonance"];
const POOL_5=["killcycle","adrenaline","critsurge","ghoststep","lowhp","soulrush"];
const TRIGGER_KEYS=new Set(POOL_5);   // 触发型标记（面板 ⚡ 标注）
const TREE={
  dmg:{n:"伤害增幅",per:"+5% 伤害/级"},
  gold:{n:"信用点优化",per:"+10% 信用点/级"},
  soul:{n:"灵魂共鸣",per:"+10% 重塑碎片/级"},   // v2.0：碎片提升碎片获得
};   // v2.0：全部无上限，成本=等级+1 线性（多项式收入追指数怪血，不失控）
const TREE_PCT={dmg:5,gold:10,soul:10};   // v2.21：离线协议分支删除

// ============ 状态 ============
let S;
function freshState(){ return {
  gold:0, atkLv:0, hpLv:0, floor:1, maxFloor:1, mobIdx:0,
  v:1, souls:0, runSouls:0, tree:{dmg:0,gold:0,soul:0}, prestiges:0, bestEver:0, speed2:false, sfxOn:true, cratesRun:0,
  equip:{weapon:null,implant:null,armor:null,chip:null},
  inv:[], skills:[], pity:0, crateReady:Date.now(), lastSave:Date.now(),
};}
let barsHidden=false;   // v2.31.4：血条组隐藏状态（护盾条显隐与血条一致，renderCombat 不再每帧强写）
function save(){
  S.lastSave=Date.now();   // v2.32：血量快照退役（读档=新层起点）
  try{ localStorage.setItem("neonHunter", JSON.stringify(S)); saveLogs(false); }
  catch(e){ toast("存档写入失败（存储空间不足）"); }   // v2.29：存储异常隔离，不中断主循环
}
const SAVE_V=1;   // v2.29：存档版本标记——历史迁移只在旧档执行一次（修每次读档 q+2）
function load(){
  try{ const d=JSON.parse(localStorage.getItem("neonHunter")); if(d&&d.floor) {
    S=Object.assign(freshState(),d);
    S.tree=Object.assign({dmg:0,gold:0,soul:0},S.tree); delete S.tree.offline;   // v2.21：旧档 offline 字段清除
    S.skills=(S.skills||[]).filter(k=>SKILLS[k]);   // v2.24.14：已删技能静默剔除
    [...S.inv,...Object.values(S.equip).filter(Boolean)].forEach(it=>{
      if(!d.v) it.q=Math.min((it.q||0)+2,9);   // v2.29：品质 +2 迁移仅限未标记旧档（幂等）
      it.affix=affixOf(it.slot,it.q);
    });
    S.v=SAVE_V;
    S.mobIdx=0; S.playerHp=null;   // v2.32：读档=回本层起点（收益不回退）
    return true; } }catch(e){}
  S=freshState(); return false;
}

// ============ 派生属性 ============
function count(id){ return S.skills.filter(s=>s===id).length; }
function affix(slot,type){ const it=S.equip[slot]; return (it&&it.affix&&it.affix.t===type)?it.affix.v:0; }
function allAffix(type){ return ["weapon","implant","armor","chip"].reduce((s,k)=>s+affix(k,type),0); }
function equipMult(slot){ const it=S.equip[slot]; return it?1+multOf(slot,it.q)/100:1; }
function calcStats(){
  let atkMult = equipMult("weapon")*(1+0.05*S.tree.dmg)*(1+0.25*count("fire"));
  const hpMult  = equipMult("armor")*(1+0.30*count("subdermal"));
  const hpMax=HP0*Math.pow(GROWTH,S.hpLv)*hpMult;
  // v2.19：条件触发型乘区——肾上腺素（低血50%攻速）/困兽协议（低血30%伤害）/猎手直觉（破盾攻速）
  let aspd = ASPD0*equipMult("implant")*(1+0.15*count("neuro"))*(1+allAffix("aspd")/100);
  const now=Date.now();
  if(player.hp<hpMax*0.5) aspd*=1+0.3*count("adrenaline");
  if(player.hp<hpMax*0.3) atkMult*=1+0.4*count("lowhp");
  if(buff.soulrush>now) aspd*=1+0.25*count("soulrush");
  if(buff.killcycle>now) aspd*=1+0.2*count("killcycle");
  if(buff.critsurge>now) aspd*=1+0.3*count("critsurge");
  return {
    atk: ATK0*Math.pow(GROWTH,S.atkLv)*atkMult,
    hp:  HP0*Math.pow(GROWTH,S.hpLv)*hpMult,
    aspd,
    crit: 0.05+0.10*count("overclock")+allAffix("crit")/100,
    critDmg: 1.5+0.5*count("fatal"),
    lifesteal: 0.05*count("nano")+allAffix("ls")/100,
    shieldPct: 0.10*count("shield"),
    goldMult: equipMult("chip")*(1+0.10*S.tree.gold)*(1+0.30*count("blackmarket")),
  };
}
const mobHp   = f => MOB_HP0*Math.pow(MOB_G,f);
const mobAtk  = f => MOB_ATK0*Math.pow(MOB_ATK_G,f);
const mobGold = f => GOLD_R*mobHp(f);
const isBoss  = () => S.mobIdx===5;
const isPrism = () => isBoss() && S.floor%10===0 && S.floor%100!==0;   // v2.9：里程碑层（10/20/30…）Boss=监察官·棱镜；v2.23 百层让位天枢
const isTianshu = () => isBoss() && S.floor%100===0;   // v2.23：每 100 层主 Boss 天枢·零号主机
const cost    = n => COST0*Math.pow(COST_G,n);
const fmt = n => {
  if(n<1000) return Math.floor(n).toString();
  const u=["K","M","B","T","Q"]; let i=-1;
  do{ n/=1000; i++; }while(n>=1000&&i<u.length-1);
  return n.toFixed(n<10?2:n<100?1:0)+u[i];
};
const fmtUp = n => n<100 ? (Math.round(n*10)/10).toString() : fmt(n);   // v2.12.1：小数值保留 1 位小数（升级预览 Lv.0 不再显示 8→8）

// v2.6：技能面板显示叠加后总值（触发型标注）
const SKILL_TOTAL={
  overclock:v=>`暴击率 +${10*v}%`, fatal:v=>`暴击伤害 +${50*v}%`,
  killcycle:v=>`暴击后攻速 +${20*v}% · 3 秒`, adrenaline:v=>`低血 50% 攻速 +${30*v}%`,
  critsurge:v=>`暴击后攻速 +${30*v}% · 5 秒`, ghoststep:v=>`击杀后无敌 ${(2+0.5*(v-1)).toFixed(1)} 秒`,
  lowhp:v=>`低血 30% 伤害 +${40*v}%`, soulrush:v=>`破盾后攻速 +${25*v}% · 4 秒`,   // v2.24.19：计时型补持续秒数
  neuro:v=>`攻速 +${15*v}%`, fire:v=>`攻击 +${25*v}%`,
  subdermal:v=>`生命 +${30*v}%`, nano:v=>`吸血 +${5*v}%`, shield:v=>`护盾 ${10*v}% 生命`,
  blackmarket:v=>`信用点 +${30*v}%`, resonance:v=>`碎片掉落 +${10*v}%`,
};

// ============ 战斗 ============
let cur={hp:1,max:1,atk:0,fightT:0,shield:0,maxShield:0}, player={hp:1,shield:0}, buff={adrenaline:0,killcycle:0,critsurge:0,soulrush:0};   // v2.18：Boss 护盾；v2.19：触发器 buff

// ============ 音效（v2.26：激光枪声，池化 3 并发 + 70ms 节流） ============
const SFX_SRC="assets/sfx/laser-shot-01.wav";
const sfxPool=[0,1,2].map(()=>{ const a=new Audio(SFX_SRC); a.volume=0.32; a.preload="auto"; return a; });
let sfxIdx=0, sfxLastT=0;
function playShot(){
  if(!S.sfxOn||paused||document.hidden) return;   // 开关/暂停/切后台不播
  const now=performance.now();
  if(now-sfxLastT<70) return;                     // 高频节流
  sfxLastT=now;
  try{ const a=sfxPool[sfxIdx=(sfxIdx+1)%3]; a.currentTime=0; a.play().catch(()=>{}); }catch(e){}
}
function toggleSfx(){ S.sfxOn=!S.sfxOn; save(); renderSfxRow(); toast(S.sfxOn?"音效：开":"音效：关"); }
function renderSfxRow(){ const el=$("sfxVal"); if(el) el.textContent=S.sfxOn?"开":"关"; }
let atkTimer=0, paused=false, wall=false;

function spawnMob(){
  cancelDeathWait();
  const boss=isBoss();
  const now=Date.now();
  if(S.mobIdx===0) floorEnterT=now;
  if(boss) bossEnterT=now;
  const tianshu=boss&&S.floor%100===0;
  cur.max=mobHp(S.floor)*(boss?(tianshu?10:BOSS.hp):1);   // v2.23：天枢血×10
  cur.hp=cur.max;
  cur.atk=mobAtk(S.floor)*(boss?(tianshu?3:BOSS.atk):1);   // v2.23：天枢攻×3
  // v2.18：Boss 护盾——典狱长 50% 血量、棱镜 80%、天枢 100%（终极破盾战）
  cur.maxShield = boss ? Math.round(cur.max*(tianshu?1.0:(isPrism()?0.8:0.5))) : 0;
  cur.shield = cur.maxShield;
  cur.fightT=0; cur.phase=0; cur.phaseT=8;   // v2.23：天枢主炮相位（0=机枪常态,1=蓄力,2=发射）
  const st=calcStats();
  // v2.17：层内不回血——仅进层（mobIdx=0）回满；护盾仍每场刷新（应急护盾卖点保留）
  $("playerSpr").classList.remove("death");   // v2.38：新局/新层清死亡态
  // v2.32：血量语义简化——进层回满 / 层内保持（读档=mobIdx 归零走新层满血；快照机制退役）
  if(S.mobIdx===0) player.hp=st.hp;
  else player.hp=Math.min(player.hp,st.hp);
  player.shield=st.hp*st.shieldPct;
  if(player.pendingInvuln){ player.invulnUntil=Date.now()+player.pendingInvuln; player.pendingInvuln=0; }   // v2.19.3
  atkTimer=0;
  const eEl=document.getElementById("enemy");
  eEl.classList.toggle("boss",boss);
  eEl.classList.toggle("prism",boss&&S.floor%10===0&&S.floor%100!==0);   // v2.9：里程碑层棱镜（百层让位天枢）
  eEl.classList.toggle("tianshu",tianshu);   // v2.23
  eEl.classList.toggle("hound",!boss&&mobKind==="hound");   // v2.15：机械犬小怪
  eEl.style.transition=""; eEl.style.opacity="";   // v2.24.7：不再清内联 right（跑入目标位即站位，消除回跳）
  const es=document.getElementById("enemySpr");
  if(es) es.classList.remove("die","shoot","hurt","run","slash","bite","charge","cannon");
  syncPresentationSpeed();   // v2.5：新怪重置动画
}
function calcGold(f,boss){
  return mobGold(f)*(boss?BOSS.gold:1)*calcStats().goldMult;
}
function dealPlayerHit(){ playShot();   // v2.26：枪声
  const st=calcStats();
  let dmg=st.atk;
  const isCrit=Math.random()<st.crit;
  if(isCrit){ dmg*=st.critDmg;
    if(count("killcycle")) buff.killcycle=Date.now()+3000;
    if(count("critsurge")) buff.critsurge=Date.now()+5000; }   // v2.19：触发器池（暴击系）
  // v2.18：护盾优先承伤，破盾瞬间飘字
  if(cur.shield>0){
    const s=Math.min(cur.shield,dmg); cur.shield-=s; dmg-=s;
    if(cur.shield<=0){ floatDmg("enemy","破盾！","#FF2A6D",true);
      if(count("soulrush")) buff.soulrush=Date.now()+4000; }   // v2.19：猎手直觉（破盾→攻速）
    if(dmg<=0){ floatDmg("enemy",fmt(s),"#7fd4ff",false); lunge("player"); enemyAnim("hurt",200); return; }
    floatDmg("enemy",fmt(s), "#7fd4ff", false);
  }
  cur.hp-=dmg;
  if(st.lifesteal>0) player.hp=Math.min(st.hp, player.hp+dmg*st.lifesteal);
  floatDmg("enemy", fmt(dmg), isCrit?"#FFD166":"#00F0FF", isCrit);
  lunge("player");
  enemyAnim("hurt",200);   // v2.5：敌人受击帧
  if(cur.hp<=0) onKill();
}
// v2.5：敌人动画控制（优先级 die > hurt/shoot > idle）
// v2.40：演出以 1× 时间计量，切速只改变剩余时间与播放速率，保留当前进度。
const presentationTasks=new Set(), presentationTweens=new Set(), sceneLayers=new Set();
let presentationRate=1, deathWait=null;
function cancelPresentation(task){
  if(!task) return;
  clearTimeout(task.timer); presentationTasks.delete(task);
}
function armPresentation(task){
  task.started=performance.now(); task.rate=presentationRate;
  task.timer=setTimeout(()=>{
    presentationTasks.delete(task);
    if(task.seq===runSeq) task.fn();
  },Math.max(0,task.remaining/task.rate));
}
function afterPresentation(ms,fn,seq=runSeq){
  syncPresentationSpeed();
  const task={remaining:ms,fn,seq}; presentationTasks.add(task); armPresentation(task); return task;
}
function syncPresentationSpeed(){
  const rate=effSpeed(), now=performance.now();
  if(rate!==presentationRate){
    presentationRate=rate;
    for(const task of presentationTasks){
      clearTimeout(task.timer);
      if(task.seq!==runSeq){ presentationTasks.delete(task); continue; }
      task.remaining=Math.max(0,task.remaining-(now-task.started)*task.rate);
      armPresentation(task);
    }
  }
  for(const id of ["playerSpr","enemySpr"]){
    const el=$(id);
    if(el&&el.getAnimations) for(const anim of el.getAnimations()){
      if(anim.playbackRate!==rate) anim.playbackRate=rate;
    }
  }
  for(const item of presentationTweens){
    if(item.seq!==runSeq){ item.anim.cancel(); presentationTweens.delete(item); }
    else if(item.anim.playbackRate!==rate) item.anim.playbackRate=rate;
  }
}
function presentationTween(el,prop,to,ms,seq=runSeq,easing="linear"){
  const from=getComputedStyle(el)[prop]||el.style[prop];
  for(const item of presentationTweens) if(item.el===el&&item.prop===prop){
    item.anim.cancel(); cancelPresentation(item.task); presentationTweens.delete(item);
  }
  el.style.transition="none"; el.style[prop]=to;
  if(!el.animate) return;   // 无动画 API 的环境仍按演出时钟推进逻辑
  const anim=el.animate([{[prop]:from},{[prop]:to}],{duration:ms,easing,fill:"both"});
  anim.playbackRate=effSpeed();
  const item={el,prop,anim,seq}; presentationTweens.add(item);
  item.task=afterPresentation(ms,()=>{ anim.cancel(); presentationTweens.delete(item); },seq);
}
function cancelDeathWait(){
  if(!deathWait) return;
  const d=deathWait; deathWait=null; cancelPresentation(d.task);
  if(d.spr.removeEventListener) d.spr.removeEventListener("animationend",d.listener);
}
function beginPresentationRun(){
  ++runSeq; cancelDeathWait();
  for(const task of presentationTasks) clearTimeout(task.timer);
  presentationTasks.clear();
  for(const item of presentationTweens) item.anim.cancel();
  presentationTweens.clear();
  for(const el of sceneLayers) el.remove(); sceneLayers.clear();
  return runSeq;
}
function enemyAnim(cls,ms){
  const sp=$("enemySpr"); if(!sp||sp.classList.contains("die")) return;
  if(cls==="shoot"&&isBoss()) ms=400;   // 典狱长/棱镜射击均 0.4s（小兵 333ms 由调用方传入）
  if(cls==="slash") ms=500;                            // v2.9：棱镜能量斩击 6f@12fps
  sp.classList.remove("shoot","hurt","slash","bite","charge","cannon"); void sp.offsetWidth;
  sp.classList.add(cls);
  cancelPresentation(sp._t); syncPresentationSpeed();
  sp._t=afterPresentation(ms,()=>{ sp.classList.remove(cls); syncPresentationSpeed(); });
}
function enemyDie(){
  const sp=$("enemySpr");
  cancelPresentation(sp._t); sp.classList.remove("shoot","hurt","slash","bite","charge","cannon","run"); sp.classList.add("die");
  syncPresentationSpeed();
}
function onKill(){
  cur.hp=1e18;   // v2.5：尸体无敌，死亡动画期间防重复触发
  $("enemyHp").style.display="none"; $("enemyHpT").style.display="none"; $("enemySh").style.display="none"; $("enemyShT").style.display="none";   // v2.24.18：死亡即藏血条
  const boss=isBoss(), prismKill=boss&&S.floor%10===0, st=calcStats();
  const gained=calcGold(S.floor,boss);
  S.gold+=gained; floorGoldEarned+=gained;
  floatDmg("enemy","+"+fmt(gained)+" "+IC("credits",1),"#FFD166",false);   // v2.9：击杀信用点飘字（v2.18 图标化）
  if(count("ghoststep")) player.pendingInvuln=2000+500*(count("ghoststep")-1);   // v2.19.3：击杀触发计时起点改为新敌人就位（过场不烧 buff）
  dropRoll(boss);
  enemyDie();
  if(boss){
    // v2.14：Boss 必掉碎片——普通 1、棱镜 2~3 随机，每 25 层 +1，灵魂共鸣加成
    const tier=Math.floor(S.floor/25);
    const base=(prismKill?2+Math.floor(Math.random()*2):1)+tier;
    const drop=Math.ceil(base*(1+0.1*(S.tree.soul||0))*(1+0.1*count("resonance")));   // v2.19：碎片共鸣技能改造为掉落增益
    S.runSouls+=drop;   // v2.16：掉落进本循环累计（重塑后才转可用）
    floatDmg("enemy",`+${drop} ${IC("soul-shard",1)}`,"#c07bff",true);
    logEvent("souldrop",{count:drop,floor:S.floor,prism:prismKill});
    if(S.floor>=S.maxFloor) S.maxFloor=S.floor;
    if(S.floor>S.bestEver) S.bestEver=S.floor;   // v2.19：历史最高层（跨重塑保留，倍速判定）
    pushFloorSummary();
    const willSkill = S.floor%10===0;   // v1.7 起：每 10 层一次三选一，无上限
    const willTemp  = S.floor%10===5;   // 5/15/25… 中庭层触发器池（v2.19：双池）
    if(willSkill||willTemp) S.pendingOffer={pool:willSkill?"p10":"p5",picks:null,floor:S.floor};   // v2.31：楼层随意图入档（N04）   // v2.24.15：推进即存意图
    S.floor++; S.mobIdx=0; syncPresentationSpeed();
    const seqK=runSeq;   // v2.29：复位后丢弃旧 Boss 转场/弹窗回调
    afterPresentation(prismKill?1100:900,()=>{
      if(seqK!==runSeq) return;   // v2.29
      if(willSkill){ offerSkills("p10",null,S.floor-1); pendingTransit=true; }   // v2.29：文案用刚完成的层
      else if(willTemp){ offerSkills("p5"); pendingTransit=true; }
      else startFloorTransit();
    },seqK);
  } else {
    S.mobIdx++;
    // v2.5：顺序式刷新——尸体停留→淡出→新敌人跑入→刷怪
    const seq=runSeq;   // v2.14.4：复位/重塑期间作废旧定时器
    afterPresentation(1300,()=>presentationTween($("enemy"),"opacity","0",300,seq),seq);
    afterPresentation(1650,()=>enemyRunIn(seq),seq);
  }
  save();
}
// v2.5：敌人从右侧屏幕外跑入战斗位
const fightPos=()=>window.innerWidth<=640?"8%":"22%";   // v2.24.4：跑入目标位跟随媒体查询（修复跑近再瞬移）
// v2.24.8：端侧隔离——跑入速度双档（手机快/桌面原速），CSS 过渡与 JS 定时器同源
// v2.24.16：手机端速度恒定——跑入时长=距离(23%)÷跑出基准速度(78%/1.2s)≈360ms；桌面端保持原节奏不动
const runCfg=()=>window.innerWidth<=640?{e:360,p:360,settle:650,t:360}:{e:900,p:1400,settle:1000,t:1400};
let mobKind="trooper";   // v2.15：当前小怪种类（trooper/hound），Boss 恒为 trooper 槽位外观体系
function enemyRunIn(seq=runSeq){
  if(seq!==runSeq) return;
  const e=$("enemy"), sp=$("enemySpr");
  mobKind = isBoss() ? "trooper" : (Math.random()<0.5 ? "hound" : "trooper");   // v2.15：小怪种类随机
  e.classList.toggle("boss",isBoss());   // v2.7.1：跑入前就切好 Boss 外观（否则小兵/Boss 互相串皮）
  e.classList.toggle("prism",isPrism()); // v2.9：里程碑层棱镜外观同理
  e.classList.toggle("tianshu",isTianshu());   // v2.23
  e.classList.toggle("hound",mobKind==="hound");
  $("enemyHp").style.display="none"; $("enemyHpT").style.display="none"; $("enemySh").style.display="none"; $("enemyShT").style.display="none";
  cancelPresentation(sp._t);
  sp.classList.remove("die","shoot","hurt","slash","bite","charge","cannon"); sp.classList.add("run");
  e.style.transition="none"; e.style.right="-15%"; e.style.opacity="1"; void e.offsetWidth;
  const rc=runCfg(); presentationTween(e,"right",fightPos(),rc.e,seq); syncPresentationSpeed();
  afterPresentation(rc.e+50,()=>{
    if(seq!==undefined&&seq!==runSeq) return;   // v2.14.4：代次过期则丢弃
    e.style.transition=""; sp.classList.remove("run");
    $("enemyHp").style.display=""; $("enemyHpT").style.display="";
    spawnMob();
  },seq);
}
// v2.14：开局双方跑入（新开局/重塑/复位/读档统一演出）
let runSeq=0;   // v2.14.4：流程代次令牌——复位/重塑递增，旧定时器全部作废
function openingRunIn(){
  $("arena").style.backgroundImage=`url('${bgForFloor(S.floor)}')`;   // v2.29：读档/开局统一初始化场景
  const seq=beginPresentationRun();
  transit=true; paused=true;
  // v2.14.2：先清场——旧敌人与血条立即隐藏（复位/重开时不残留）
  const e=$("enemy"), es=$("enemySpr");
  es.classList.remove("die","shoot","hurt","run","slash","bite","charge","cannon");
  e.style.transition="none"; e.style.opacity="0"; e.style.right="-15%";
  $("enemyHp").style.display="none"; $("enemyHpT").style.display="none"; $("enemySh").style.display="none"; $("enemyShT").style.display="none";
  const p=$("player"), sp=$("playerSpr");
  sp.classList.remove("atk","death"); sp.classList.add("run");
  p.style.transition="none"; p.style.left="-15%"; p.style.opacity="1"; void p.offsetWidth;
  barsHidden=true; $("playerHp").style.display="none"; $("playerHpT").style.display="none"; $("playerSh").style.display="none"; $("playerShT").style.display="none";   // v2.24.9：跑入过程不显示血条
  const rc=runCfg(); presentationTween(p,"left",fightPos(),rc.p,seq); syncPresentationSpeed();
  afterPresentation(rc.p+50,()=>{
    if(seq!==runSeq) return;   // v2.14.4：期间发生复位/重塑则作废
    p.style.transition=""; sp.classList.remove("run");
    barsHidden=false; $("playerHp").style.display=""; $("playerHpT").style.display=""; $("playerSh").style.display=""; $("playerShT").style.display="";   // v2.24.9：就位显示
    dispFloor=S.floor;   // v2.28.8
    transit=false;
    enemyRunIn(seq);
    afterPresentation(rc.settle,()=>{ if(!wall) paused=false; save(); renderPanels();
      if(S.pendingOffer){ const po=S.pendingOffer; offerSkills(po.pool,po.picks,po.floor??S.floor-1); }   // v2.31.1：旧档无楼层按推进语义回填（C60）
    },seq);
  },seq);
}
// ============ 楼层转场（v2.1：跑出→场景左滑→跑入） ============
let transit=false, pendingTransit=false, prismAlt=false, dispFloor=1;   // v2.28.8：楼层文本显示层（转场完成才更新）
const ARENA_BGS=["assets/arena-bg.webp","assets/arena-bg2.webp","assets/arena-bg5.webp","assets/arena-bg6.webp"];
// v2.11：场景调度——f%10=0 棱镜核心、f%10=5 高空中庭、日常层 工业→机房→维修→货运 四场轮换
function bgForFloor(f){ if(f%10===0) return "assets/arena-bg4.webp"; if(f%10===5) return "assets/arena-bg3.webp"; return ARENA_BGS[f%4]; }
function startFloorTransit(){
  const seq=beginPresentationRun();   // v2.14.4：转场同样纳入代次管理
  transit=true; paused=true;
  player.hp=calcStats().hp;   // v2.24.20：进层回血（转场开始）
  barsHidden=true; $("playerHp").style.display="none"; $("playerHpT").style.display="none"; $("playerSh").style.display="none"; $("playerShT").style.display="none";   // v2.24.18：跑出旧层藏血条（防跟随拖尾）
  const p=document.getElementById("player"), sp=document.getElementById("playerSpr");
  sp.classList.remove("atk","death"); sp.classList.add("run");
  presentationTween(p,"left","86%",1200,seq); syncPresentationSpeed();
  afterPresentation(1200,()=>presentationTween(p,"opacity","0",200,seq),seq);
  afterPresentation(1400,()=>sceneSwap(seq),seq);
}
function sceneSwap(seq){
  if(seq!==runSeq) return;
  const arena=document.getElementById("arena");
  const nextBg=bgForFloor(S.floor);   // v2.8：按层选景（里程碑中庭/奇偶轮换）
  const mk=left=>{ const d=document.createElement("div"); d.className="bgSlide"; d.style.left=left; return d; };
  const oldBg=mk("0"); oldBg.style.backgroundImage=getComputedStyle(arena).backgroundImage;
  const newBg=mk("100%"); newBg.style.backgroundImage=`url('${nextBg}')`;
  arena.appendChild(oldBg); arena.appendChild(newBg);
  sceneLayers.add(oldBg); sceneLayers.add(newBg);
  presentationTween(oldBg,"left","-100%",450,seq,"ease-in-out");
  presentationTween(newBg,"left","0%",450,seq,"ease-in-out");
  afterPresentation(480,()=>{
    arena.style.backgroundImage=`url('${nextBg}')`;
    oldBg.remove(); newBg.remove(); sceneLayers.delete(oldBg); sceneLayers.delete(newBg); runIn(seq);
  },seq);
}
function runIn(seq){
  if(seq!==runSeq) return;
  const p=document.getElementById("player"), sp=document.getElementById("playerSpr");
  p.style.transition="none"; p.style.left="-15%"; p.style.opacity="1"; void p.offsetWidth;
  barsHidden=true; $("playerHp").style.display="none"; $("playerHpT").style.display="none"; $("playerSh").style.display="none"; $("playerShT").style.display="none";   // v2.24.11：跑动不显示血条
  const rc=runCfg(); presentationTween(p,"left",fightPos(),rc.t,seq); syncPresentationSpeed();
  afterPresentation(rc.t+50,()=>{
    if(seq!==runSeq) return;   // v2.14.4
    p.style.transition=""; sp.classList.remove("run");
    barsHidden=false; $("playerHp").style.display=""; $("playerHpT").style.display=""; $("playerSh").style.display=""; $("playerShT").style.display="";   // v2.24.11
    dispFloor=S.floor;   // v2.28.8：新楼层就位才更新楼层文本
    transit=false;
    enemyRunIn(seq);   // v2.5：玩家到位后敌人再跑入
    afterPresentation(rc.settle,()=>{ if(!wall) paused=false; save(); renderPanels(); },seq);
  },seq);
}
function checkWall(dt){
  cur.fightT+=dt;
  const tLimit=90*(cur.maxShield>0?1+cur.maxShield/cur.max:1);   // v2.18：有盾 Boss 按盾量放宽超时
  if(player.hp<=0 || cur.fightT>tLimit){
    const reason=player.hp<=0?"hp_zero":"timeout_90s";
    logEvent("wall",{reason});
    wall=true; paused=true;
    // v2.38：死亡动画播完再弹受阻（超时受阻直接弹，只有真死亡有动画）
    if(reason==="hp_zero"){
      confirmOpen=false; pendingSkillOffer=null;   // v2.38：死亡立即作废复位确认（不等动画）
      const spr=$("playerSpr");
      cancelDeathWait(); cancelPresentation(spr._t);
      spr.classList.remove("run","atk"); spr.classList.add("death"); syncPresentationSpeed();
      const seq=runSeq;
      const show=()=>{
        if(seq!==runSeq||!deathWait||!wall) return;
        cancelDeathWait(); showWallModal();
      };
      const listener=e=>{ if(e.target===spr&&e.animationName==="gunnerDeath") show(); };
      deathWait={spr,listener,task:afterPresentation(1200,show,seq)};
      if(spr.addEventListener) spr.addEventListener("animationend",listener);
      return;
    }
    showWallModal();
  }
}
function showWallModal(){
    showModal(`<img class="ic" style="width:32px;height:32px;vertical-align:-8px;margin-right:12px" src="assets/icons/movement-blocked.svg" alt="">行动受阻`,
      `猎手在第 <b>${S.floor}</b> 层被压制了。<br>「重塑」换一具更强的克隆体（本循环已掉落 <b style="color:#c07bff">${S.runSouls}</b> 碎片将转为可用，装备回收为信用点带入新局）。`,
      `<button class="nh-button nh-button--violet" onclick="closeModal();doPrestige()"><img class="nh-button__icon" src="assets/icons/reshape.svg" alt=""><span class="nh-button__body"><span class="nh-button__title">重塑 · 结算本循环</span></span></button>`);
}
// v2.21：死亡只能重塑，继续硬磨已取消（retryFight 废弃，无入口）

// ============ 装备 ============
// v1.8：掉落区间随楼层上移——高层不掉无效低品质，保证永远能进 3 合 1 链
function dropBand(f){ return f<25?[0,2]:f<50?[1,3]:f<75?[2,4]:[3,5]; }   // v2.25.1：f75+ 加入原型 q5
function rollQuality(f){
  const [lo,hi]=dropBand(f);
  if(S.pity>=10){ S.pity=0; return hi; }   // 保底：连续 10 次未出区间最高档 → 必出
  // v2.0 数值回调：最高档降权（紫 13→8 / 橙 13→6 / f75+ 橙 35→20），合成链才是主通道
  const w=hi-lo===2?({2:[60,30,10],3:[60,32,8],4:[60,34,6],5:[58,36,6]}[hi]):[80,20];   // v2.25.1：q5 档权重
  return lo+weighted(w);
}
function weighted(ws){ const s=ws.reduce((a,b)=>a+b,0); let r=Math.random()*s;
  for(let i=0;i<ws.length;i++){ r-=ws[i]; if(r<0) return i; } return 0; }
function dropRoll(boss){
  if(!boss && Math.random()>0.25) return;
  const q=rollQuality(S.floor);
  if(q>=dropBand(S.floor)[1]) S.pity=0; else S.pity++;
  const slot=["weapon","implant","armor","chip"][Math.floor(Math.random()*4)];
  // v2.25：部位已到顶级（不朽）→ 掉落自动转信用点
  const eqTop=S.equip[slot];
  if(eqTop&&eqTop.q>=9){
    const v=Math.round(2*Math.pow(q+1,2)*Math.pow(MOB_G,S.floor));
    S.gold+=v; logEvent("drop_convert",{slot,q,value:v});
    toast(`${qualityName(q)}·${SLOTS[slot]} 已满级 → +${fmt(v)} 信用点`); return;
  }
  const item={slot,q};
  item.affix=affixOf(slot,q);   // v2.25：词条 q6 起、随品质递增
  logEvent("drop",{slot,q,affix:item.affix?item.affix.t:null,boss});
  // v2.3：全自动装备——更高品质直接换上，换下回背包当合成材料
  const eq=S.equip[slot];
  if(!eq||item.q>eq.q){
    if(eq) S.inv.push(eq);
    S.equip[slot]=item;
    logEvent("autoequip",{desc:itemDesc(item)});
    toast(`自动装备 ${qualityName(q)}·${SLOTS[slot]}`);
  } else {
    S.inv.push(item);   // v1.8：背包无上限
    toast(`获得 ${qualityName(q)}·${SLOTS[slot]}`);
  }
}
function itemDesc(it){
  let s=`${qualityName(it.q)}·${SLOTS[it.slot]} +${multOf(it.slot,it.q)}%`;
  if(it.affix) s+= ` (${{crit:"暴击",aspd:"攻速",ls:"吸血"}[it.affix.t]}+${it.affix.v}%)`;
  return s;
}
function sell(i){
  const it=S.inv.splice(i,1)[0];
  const v=Math.round(2*Math.pow(it.q+1,2)*Math.pow(MOB_G,S.floor));
  S.gold+=v; logEvent("sell",{desc:itemDesc(it),value:v});
  toast(`出售 +${fmt(v)} 信用点`); save(); renderPanels();
}
// ============ 合成与拆解（v1.8：按部位，已装备参与，产物直装） ============
function fuseInfo(slot){
  // 返回该部位可合成组 {q, invN, useEquip} 或 null
  const eq=S.equip[slot], groups={};
  S.inv.forEach(it=>{ if(it.slot===slot&&it.q<9) groups[it.q]=(groups[it.q]||0)+1; });   // v2.25：合成封顶不朽
  for(const qStr of Object.keys(groups).sort((a,b)=>a-b)){   // v2.30：低品质优先
    const q=+qStr, need=3-groups[qStr];
    if(need<=0) return {q, useEquip:false};
    if(eq&&eq.q===q&&need===1) return {q, useEquip:true};
  }
  return null;
}
function fuseSlot(slot){
  // v2.30：按一次只合成一件（取消连烧循环）；v2.31：低品质优先+提示按产物去向
  const info=fuseInfo(slot);
  if(!info) return;
  const q=info.q, idx=[];
  S.inv.forEach((it,i)=>{ if(it.slot===slot&&it.q===q&&idx.length<3) idx.push(i); });
  idx.sort((a,b)=>b-a).forEach(i=>S.inv.splice(i,1));
  if(info.useEquip) S.equip[slot]=null;   // 已装备作为第 3 件材料
  const ni={slot,q:q+1};
  ni.affix=affixOf(slot,ni.q);
  const cur=S.equip[slot];
  let equipped=false;
  if(!cur||ni.q>=cur.q){ if(cur) S.inv.push(cur); S.equip[slot]=ni; equipped=true; }   // 产物直装
  else S.inv.push(ni);
  logEvent("fuse",{slot,from:q,to:ni.q,usedEquip:info.useEquip});
  toast(equipped?`合成完成：${qualityName(ni.q)}·${SLOTS[slot]} 已装备升阶`
                :`合成完成：${qualityName(ni.q)}·${SLOTS[slot]} 已存入背包`);
  save(); renderPanels();
}
function salvageInfo(slot){
  const lo=dropBand(S.floor)[0];   // v2.0：掉落区间驱动——楼层不再掉落的品质=过时
  if(lo<=0) return {n:0,v:0};
  let n=0,v=0;
  S.inv.forEach(it=>{ if(it.slot===slot&&it.q<lo&&it.q<4){ n++; v+=Math.round(2*Math.pow(it.q+1,2)*Math.pow(MOB_G,S.floor)); } });
  return {n,v};
}
function salvage(slot){
  const lo=dropBand(S.floor)[0], info=salvageInfo(slot);
  if(!info.n) return;
  for(let i=S.inv.length-1;i>=0;i--){
    const it=S.inv[i];
    if(it.slot===slot&&it.q<lo&&it.q<4) S.inv.splice(i,1);
  }
  S.gold+=info.v; logEvent("salvage",{slot,count:info.n,value:info.v,reason:"outdated"});
  toast(`拆解低品质装备 ${info.n} 件 → +${fmt(info.v)} 信用点`);
  save(); renderPanels();   // v2.29：从注释尾恢复（v2.24.17 误吞）
}

// ============ 技能（v2.19：双池——10层常驻属性 / 5层条件触发器） ============
let curOffer=[], skillOfferOpen=false;
let lastOfferPool=null, lastOfferFloor=null;   // v2.31.5：R02——当前技能弹窗的池/楼层（复位挂起恢复用）
function offerSkills(poolKey,preset,forFloor){ forFloor=forFloor??(S.pendingOffer&&S.pendingOffer.floor)??S.floor;   // v2.31.2：缺省从待选意图读楼层（C60）
  lastOfferPool=poolKey; lastOfferFloor=forFloor;
  if(confirmOpen){ pendingSkillOffer={pool:poolKey,picks:preset||null,floor:forFloor||null}; return; }   // v2.31：确认框优先，不覆盖
  skillOfferOpen=true;
  paused=true;
  const pool=poolKey==="p5"?POOL_5:POOL_10;
  const picks=(preset||[]).filter(k=>pool.includes(k));
  while(picks.length<3){ const k=pool[Math.floor(Math.random()*pool.length)]; if(!picks.includes(k)) picks.push(k); }
  curOffer=picks;
  S.pendingOffer={pool:poolKey,picks:curOffer.slice(),floor:forFloor}; save();   // v2.24.14：弹窗持久化（v2.31.2：保留楼层，重写不丢）
  const trig=poolKey==="p5";
  showModal(`<img class="ic" style="width:26px;height:26px;vertical-align:-6px;margin-right:9px" src="assets/icons/skill-choice.svg" alt="">神经技能 · 三选一`,   // v2.30：⚡/🎯 → skill-choice.svg
    trig?`中继站接入完成！选择一项技能强化`
        :`突破第 ${forFloor||S.floor} 层！选择一项属性强化`,
    picks.map(k=>`<button class="nh-button nh-button--upgrade" onclick="pickSkill('${k}')"><span class="nh-button__body"><span class="nh-button__title">${SKILLS[k].n}</span><span class="nh-button__detail">${SKILLS[k].d}</span></span></button>`).join(""));
}
function pickSkill(k){
  if(!skillOfferOpen || !curOffer.includes(k)) return;   // v0.7：防脚本/连点绕过弹窗刷技能
  skillOfferOpen=false;
  S.pendingOffer=null;   // v2.24.14
  S.skills.push(k);
  logEvent("skill",{picked:k,rejected:curOffer.filter(x=>x!==k)});
  closeModal(); save(); renderPanels();
  toast(`习得技能：${SKILLS[k].n}`);
  if(pendingTransit){ pendingTransit=false; startFloorTransit(); }   // v2.1：技能选完进入转场
  else paused=false;
}

// v2.28.6：广告点位防连点锁——按下即锁，流程完成才释放（测试版占位广告也要防穿透）
let adLock=false;
function adGuard(){ if(adLock) return false; adLock=true; return true; }
function adRelease(){ adLock=false; }

// ============ 重塑（v2.16：掉落累计制 + 装备回收 + 仅死亡可选） ============
const PRESTIGE_SALVAGE_RATE=0.15;   // v2.16.1：回收率 15%（S59 实测全额回收 18K 带入二轮，前期金币经济作废）
function salvageAllGold(){   // 身上+背包全量回收估值（沿用拆解公式 ×15% 回收率）
  const v=it=>Math.floor(2*Math.pow(it.q+1,2)*Math.pow(1.15,S.floor)*PRESTIGE_SALVAGE_RATE);
  let g=0, n=0;
  Object.values(S.equip).forEach(it=>{ if(it){ g+=v(it); n++; } });
  S.inv.forEach(it=>{ g+=v(it); n++; });
  return {g,n};
}
function doPrestige(){
  const rs=S.runSouls, sv=salvageAllGold();
  paused=true;
  showModal(`<img class="ic" style="width:28px;height:28px;vertical-align:-6px;margin-right:10px" src="assets/icons/reshape.svg" alt="">重塑完成`,
    `人格已备份，克隆体上线。本循环战果结算：
     <div style="text-align:left;background:#0d1420;border:1px solid #1e2a44;border-radius:10px;padding:10px 14px;margin:10px 0;font-size:13px;line-height:2">
       <img class="ic sm" src="assets/icons/soul-shard.svg" alt=""> 掉落碎片转换（Boss 掉落）<b style="float:right;color:#c07bff">+${rs}</b><br>
       <img class="ic sm" src="assets/icons/equipment-recycle.svg" alt=""> 装备回收（身上+背包 ${sv.n} 件 · 15% 回收率）<b style="float:right;color:var(--gold)">+${fmt(sv.g)} <img class="ic sm" src="assets/icons/credits.svg" alt=""></b><br>
       <span style="border-top:1px dashed #1e2a44;display:block;padding-top:5px;margin-top:5px">新开局携带 <b style="float:right;color:var(--gold)">${fmt(sv.g)} <img class="ic sm" src="assets/icons/credits.svg" alt=""></b></span>
     </div>`,
    `<button class="nh-button nh-button--gold" onclick="applyPrestige(2)"><img class="nh-button__icon" src="assets/icons/watch-ad.svg" alt=""><span class="nh-button__body"><span class="nh-button__title">看广告：碎片 ×2</span><span class="nh-button__detail">+${rs*2} 碎片</span></span></button>
     <button class="nh-button nh-button--neutral" onclick="applyPrestige(1)"><span class="nh-button__body"><span class="nh-button__title">收下，进入新开局</span></span></button>   <!-- v2.31.8 -->`);
}
function applyPrestige(mult){
  if(mult>1&&!adGuard()) return;   // v2.28.6：广告按钮防连点
  const rs=S.runSouls, sg=salvageAllGold().g;
  logEvent("prestige",{souls:rs, salvage:sg, mult, fromFloor:S.maxFloor});
  S.prestiges=(S.prestiges||0)+1;
  S.souls+=rs*mult;                // v2.21：广告 ×2 改乘碎片（信用点回收单倍）
  S.floor=1; S.mobIdx=0; S.gold=sg; S.atkLv=0; S.hpLv=0;
  S.maxFloor=1; S.runSouls=0;
  S.equip={weapon:null,implant:null,armor:null,chip:null};
  S.inv=[]; S.skills=[]; S.pity=0; S.cratesRun=0;   // v2.39：开箱计数循环内
  floorGoldEarned=0;
  player.hp=calcStats().hp;   // v2.31：新开局显式满血再保存
  save();   // v2.29：结算结果立即持久化，动画仅为后续表现
  closeModal(); wall=false;
  spawnMob(); openingRunIn();
  setTimeout(adRelease,1500);
}
function treeCost(k){ return S.tree[k]+1; }   // 成本=当前等级+1（v2.0 起无上限）
function buyTree(k){
  if(!S.prestiges){ toast("加成树在首次重塑后解锁"); return; }   // v2.14.3：防止未重塑就用掉落碎片点树
  const c=treeCost(k);
  if(S.souls<c) return;
  S.souls-=c; S.tree[k]++;
  logEvent("tree",{key:k,level:S.tree[k],cost:c});
  save(); renderPanels();
}

// ============ 补给箱（广告原型位） ============
function openCrate(){
  if(!adGuard()) return;   // v2.28.6
  // v2.39：收益随开箱次数增长——对数曲线 + 每 10 箱 ×2 里程碑（永续无上限，增速自然衰减）
  const n=S.cratesRun||0;
  const mult=1+0.25*n+0.02*n*n;   // v2.39.1：凸曲线——每次增长都比前一次多
  const milestone=(n+1)%10===0?2:1;
  const g=Math.round(mobGold(S.floor)*60*calcStats().goldMult*mult*milestone);
  S.gold+=g; S.crateReady=Date.now(); S.cratesRun=n+1;
  logEvent("crate",{gold:g,n:n+1,mult:+mult.toFixed(2),milestone});
  toast(`补给箱：+${fmt(g)} 信用点`);
  save(); renderPanels();
  adRelease();
}

// v2.21：离线收益系统已取消（纯在线循环驱动）

// ============ UI ============
const $=id=>document.getElementById(id);
const IC=(n,sm)=>`<img class="ic${sm?" sm":""}" src="assets/icons/${n}.svg" alt="">`;   // v2.18：图标辅助
// v2.28.4：飘字泳道分层——并发飘字竖向错开不重叠
const floatLane={enemy:0,player:0};
function floatDmg(who,text,color,big){
  const d=document.createElement("div");
  d.className="dmg"; d.innerHTML=(big?"暴击 ":"")+text;   // v2.18：innerHTML 支持飘字内嵌货币图标
  d.style.color=color; if(big) d.style.fontSize="19px";
  const f=$(who==="enemy"?"enemy":"player");
  const lane=Math.min(floatLane[who],3); floatLane[who]++;
  d.style.left=(f.offsetLeft+6+Math.random()*56)+"px";
  d.style.top=(f.offsetTop-6-lane*19+Math.random()*6)+"px";   // 每条泳道抬高 19px
  $("arena").appendChild(d);
  setTimeout(()=>{ d.remove(); floatLane[who]=Math.max(0,floatLane[who]-1); },900);
}
function lunge(who){
  if(who==="player"){
    // v1.9.1：玩家原地播放射击动画，不再前后位移
    const sp=$("playerSpr");
    sp.classList.remove("atk"); void sp.offsetWidth; sp.classList.add("atk");
    cancelPresentation(sp._t); syncPresentationSpeed();
    sp._t=afterPresentation(330,()=>{ sp.classList.remove("atk"); syncPresentationSpeed(); });
    return;
  }
  const el=$(who); el.classList.add("lunge-e");
  setTimeout(()=>el.classList.remove("lunge-e"),120);
}
function showModal(title,html,btns){
  if(!String(title).includes("确认复位")&&!String(title).includes("清除存档")){ confirmOpen=false; pendingSkillOffer=null; }   // v2.34：F02——其他弹窗顶替时清确认态
  $("modalBox").innerHTML=`<h2>${title}</h2><p>${html}</p>${btns}`;
  $("overlay").classList.add("show");
}
let pendingSkillOffer=null;   // v2.31：确认弹窗期间挂起的技能三选一（N03）
function closeModal(){
  $("overlay").classList.remove("show");
  if(pendingSkillOffer){ const x=pendingSkillOffer; pendingSkillOffer=null;
    setTimeout(()=>offerSkills(x.pool,x.picks,x.floor),60); }   // 确认框关闭后补弹
}
let toastTimer;
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.style.display="block";
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.style.display="none",2200);
}
function renderPanels(){
  const st=calcStats();
  // v2.21：触发增益生效属性实时高亮（金色+↑）
  const _now=Date.now();
  const atkTrig=player.hp<st.hp*0.3&&count("lowhp")>0;
  const aspdTrig=(player.hp<st.hp*0.5&&count("adrenaline")>0)||buff.killcycle>_now||buff.critsurge>_now||buff.soulrush>_now;
  const hl=(on,txt)=>on?`<b style="color:var(--gold)">${txt} ↑</b>`:`<b>${txt}</b>`;
  $("statBox").innerHTML=
    `攻击 ${hl(atkTrig,fmt(st.atk))} · 生命 <b>${fmt(st.hp)}</b> · 攻速 ${hl(aspdTrig,st.aspd.toFixed(2))}/秒<br>`+
    `暴击 <b>${(st.crit*100).toFixed(0)}%</b> × ${st.critDmg.toFixed(1)} · 吸血 <b>${(st.lifesteal*100).toFixed(0)}%</b>`;   // v2.16：信用点移入 HUD
  $("resHud").innerHTML=`${IC("credits")} <span class="rg">${fmt(S.gold)}</span> · ${IC("soul-shard")} <span class="rs">${S.souls}</span>`;   // v2.16：资源 HUD（v2.18 图标化）
  // v2.12：升级按钮改版——两行竖排、Lv.x→Lv.x+1、提升数值、费用右置（v2.18：图标化）
  // v2.35：DOM 稳定化——结构只建一次，此后只更新叶子文本（按住期间不再被重建，INPUT-01）
  const buildUpg=(id,icon)=>{ const b=$(id); if(b._built) return;
    b.innerHTML=`<img class="nh-button__icon" src="assets/icons/${icon}.svg" alt=""><span class="nh-button__body"><span class="nh-button__title"></span><span class="nh-button__detail"></span></span><span class="nh-button__cost"><span class="nh-button__price"><img src="assets/icons/credits.svg" alt=""><span class="p"></span></span><span class="nh-button__hint">点击升级</span></span>`;
    b._built=1; };
  const updUpg=(id,title,detail,price,disabled)=>{ const b=$(id);
    if(b.querySelector){   // 测试桩无 querySelector：跳过 DOM 文本更新
      b.querySelector(".nh-button__title").textContent=title;
      b.querySelector(".nh-button__detail").textContent=detail;
      b.querySelector(".nh-button__price .p").textContent=fmt(price);
    }
    b.disabled=disabled; };
  buildUpg("btnAtk","attack"); buildUpg("btnHp","health");
  updUpg("btnAtk",`攻击 Lv.${S.atkLv} → Lv.${S.atkLv+1}`,`攻击 ${fmtUp(st.atk)} → ${fmtUp(st.atk*GROWTH)}`,cost(S.atkLv),S.gold<cost(S.atkLv));
  updUpg("btnHp",`生命 Lv.${S.hpLv} → Lv.${S.hpLv+1}`,`生命 ${fmtUp(st.hp)} → ${fmtUp(st.hp*GROWTH)}`,cost(S.hpLv),S.gold<cost(S.hpLv));
  // v2.3：装备图标化四分栏（堆叠+数量角标+品质降序+全自动装备）
  const qs=q=>["白","绿","蓝","紫","红","神","永","朽"][q]||`朽+${q-7}`;
  // v2.36.1：装备区稳定 DOM——列结构与合成/拆解按钮常驻，只增量更新内容（F02）
  const gb=$("gearBox");
  if(!gb._built){
    gb._built=1;
    gb.innerHTML=Object.keys(SLOTS).map(k=>{
      return '<div class="gearcol">'
        +'<div class="gc-title">'+SLOTS[k]+'</div>'
        +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:5px;min-height:52px">'
        +'<span class="ib big" id="gs-eq-'+k+'"></span>'
        +'<div style="font-size:11px;line-height:1.55" id="gs-info-'+k+'"></div></div>'
        +'<div id="gs-chips-'+k+'"></div>'
        +'<button class="nh-button nh-button--magenta nh-button--fuse" id="gs-fuse-'+k+'" onclick="fuseSlot(\''+k+'\')" style="display:none"><img class="nh-button__icon" src="assets/icons/synthesis.svg" alt=""><span class="nh-button__title" id="gs-fuset-'+k+'">合成 3×<span id="gs-fq1-'+k+'" style="border:none;box-shadow:none"></span> → 1×<span id="gs-fq2-'+k+'" style="border:none;box-shadow:none"></span></span></button>'
        +'<button class="nh-button nh-button--neutral nh-button--fuse" id="gs-salv-'+k+'" onclick="salvage(\''+k+'\')" style="display:none"><img class="nh-button__icon" src="assets/icons/equipment-recycle.svg" alt=""><span class="nh-button__title" id="gs-salvt-'+k+'"></span></button>'
        +'</div>';
    }).join("");
  }
  Object.keys(SLOTS).forEach(k=>{
    const eq=S.equip[k], fi=fuseInfo(k), si=salvageInfo(k);
    const icon="assets/icons/"+SLOT_ICON[k]+".png";
    const eqEl=$("gs-eq-"+k);
    eqEl.className="ib big"+(eq?" "+qClass(eq.q):""); eqEl.style.borderColor=eq?"":"#2b3a55";
    eqEl.innerHTML=eq?'<img src="'+icon+'">':"";
    const affN={crit:"暴击",aspd:"攻速",ls:"吸血"};
    $("gs-info-"+k).innerHTML=eq?
      '<span class="'+qClass(eq.q)+'" style="border:none;box-shadow:none">'+qualityName(eq.q)+'</span><br><b>'+SLOT_BUFF[k]+' +'+multOf(k,eq.q)+'%</b>'+(eq.affix?'<br><small style="color:var(--dim)">词条 '+affN[eq.affix.t]+'+'+eq.affix.v+'%</small>':"")
      :'<span style="color:#3a4556">空</span>';
    const groups={};
    S.inv.forEach(it=>{ if(it.slot===k) (groups[it.q]=groups[it.q]||[]).push(it); });
    $("gs-chips-"+k).innerHTML=Object.keys(groups).map(Number).sort((a,b)=>b-a).map(q=>{
      const n=groups[q].length;
      const hot=n+((eq&&eq.q===q)?1:0)>=3;
      return '<span class="ib '+qClass(q)+'" title="'+qualityName(q)+'·'+SLOTS[k]+' '+SLOT_BUFF[k]+' +'+multOf(k,q)+'%"><img src="'+icon+'"><span class="cnt'+(hot?" hot":"")+'">'+n+'</span></span>';
    }).join("")||'<span class="gc-hint">无</span>';
    const fb=$("gs-fuse-"+k);
    if(fi){ fb.style.display="";
      if(fb._q!==fi.q){ fb._q=fi.q;   // v2.37.2：品质文字节点常驻，值变才更新（F02 收尾）
        const q1=$("gs-fq1-"+k), q2=$("gs-fq2-"+k);
        q1.className=qClass(fi.q); q1.textContent=qualityName(fi.q);
        q2.className=qClass(fi.q+1); q2.textContent=qualityName(fi.q+1);
      }
    }
    else fb.style.display="none";
    const sb=$("gs-salv-"+k);
    if(si.n){ sb.style.display=""; $("gs-salvt-"+k).textContent="拆解低品质 ×"+si.n+" → +"+fmt(si.v); }
    else sb.style.display="none";
  });
  // v2.16：掉落累计制——面板只显示本循环已掉落；可用存款在 HUD
  $("soulBox").innerHTML=`本循环已掉落碎片：<b style="color:#c07bff">${S.runSouls}</b> ${IC("soul-shard",1)}<br>
    <small style="color:var(--dim)">死亡受阻时选「重塑」→ 掉落转为可用 · 装备回收为信用点</small>`;
  // v2.12：加成树按钮同款版式（含下级收益预览，解决灵魂共鸣零购买）
  // v2.14.3：首次重塑前锁定（碎片掉落改为 Boss 必掉后，防止绕过"卡关→重塑"循环）
  // v2.17：树按钮带效果说明词
  const TREE_DESC={dmg:"攻击力增加",gold:"信用点增加",soul:"碎片掉落增加"};
  const treeLocked=!S.prestiges;
  // v2.35：树签名缓存
  const treeSig=treeLocked+"|"+Object.keys(TREE).map(k=>S.tree[k]+(S.souls>=treeCost(k)?"+":"-")).join(",")+"|"+S.souls;   // v2.37.1：纳入各分支可购买位+余额
  if(treeSig!==window._treeSig){ window._treeSig=treeSig;
  $("treeBox").innerHTML=(treeLocked?`<div style="font-size:11px;color:var(--dim);margin-bottom:5px"><img class="ic sm" src="assets/icons/locked.svg" alt=""> 首次重塑后解锁</div>`:"")
    +Object.keys(TREE).map(k=>{
    const c=treeCost(k), lv=S.tree[k], p=TREE_PCT[k];
    return `<button class="nh-button nh-button--violet nh-button--upgrade" onclick="buyTree('${k}')" ${treeLocked||S.souls<c?"disabled":""}>
      <span class="nh-button__body"><span class="nh-button__title">${TREE[k].n} Lv.${lv} → Lv.${lv+1}</span>
      <span class="nh-button__detail">${TREE_DESC[k]} +${lv*p}% → +${(lv+1)*p}%</span></span>
      <span class="nh-button__cost"><span class="nh-button__price"><img src="assets/icons/soul-shard.svg" alt="">${c}</span><span class="nh-button__hint">${treeLocked?"未解锁":S.souls<c?"碎片不足":"点击升级"}</span></span></button>`;
  }).join("");
  }
  // v2.19：触发型技能 ⚡ 前缀标注
  $("skillBox").innerHTML=S.skills.length?
    Object.entries(S.skills.reduce((m,s)=>(m[s]=(m[s]||0)+1,m),{}))
      .map(([k,n])=>`• ${SKILLS[k].n} <b style="color:var(--gold)">Lv.${n}</b> <small style="color:var(--dim)">· ${SKILL_TOTAL[k](n)}</small>`).join("<br>")
    :"尚未获得";
  $("crateBox").textContent="补给箱已就绪！";   // v2.39.1：文本回退（曲线保留）
  $("btnCrate").disabled=false;
  renderSpeedBtn();   // v2.19：倍速按钮状态
}
function renderCombat(){
  const st=calcStats();
  // v2.16：楼层数醒目化 + 场景预告副行
  const SCENE_NAME={"assets/arena-bg.webp":"工业层","assets/arena-bg2.webp":"数据机房","assets/arena-bg5.webp":"维修层","assets/arena-bg6.webp":"货运层","assets/arena-bg3.webp":"高空中庭","assets/arena-bg4.webp":"棱镜核心"};
  const bossTag=isBoss()?(isTianshu()?' · <span style="color:#c07bff">天枢·零号主机</span>':isPrism()?' · <span style="color:#c07bff">监察官·棱镜</span>':' · <span style="color:var(--magenta)">区域头目</span>'):'';
  $("floorLabel").style.display=transit?"none":"";   // v2.28.8：转场移动中隐藏
  $("floorLabel").innerHTML=`<div class="fl-big">第 <b>${dispFloor}</b> 层${bossTag}</div>
    <div class="fl-sub">${SCENE_NAME[bgForFloor(dispFloor)]}</div>`;
  $("mobProgress").textContent=`敌人 ${S.mobIdx+1}/6 ${wall?"· ⚠️ 受阻":""}`;
  // v2.24.13：血条组按角色容器中心实时对齐（各体型通吃，端侧自适配）
  ["player","enemy"].forEach(id=>{
    const f=$(id), cx=f.offsetLeft+f.offsetWidth/2;
    [id+"Hp",id+"Sh",id+"HpT",id+"ShT"].forEach(bid=>{
      const el=$(bid); if(el){ el.style.right="auto"; el.style.left=(cx-el.offsetWidth/2)+"px"; }
    });
  });
  $("playerHp").firstElementChild.style.width=Math.max(0,player.hp/st.hp*100)+"%";
  $("playerHpT").textContent=`${fmt(Math.max(0,player.hp))} / ${fmt(st.hp)}`;
  // v2.18：护盾独立横条（带数值，无盾隐藏；v2.18.2 去掉"未破防"字样）
  const pshMax=st.hp*st.shieldPct;
  $("player").classList.toggle("shielded",player.shield>0.5);   // v2.19：护盾轮扩包边
  $("player").classList.toggle("cloaked",player.invulnUntil>Date.now());   // v2.37：光学迷彩（无敌期掠食者微光）
  $("enemy").classList.toggle("shielded",cur.shield>0.5&&cur.hp<=1e17);
  if(!barsHidden){   // v2.31.4：隐藏期间（跑动/转场）护盾条显隐不抢戏
    $("playerSh").style.display=pshMax>0?"block":"none";
    $("playerShT").style.display=pshMax>0?"block":"none";
  }
  if(pshMax>0){ $("playerSh").firstElementChild.style.width=Math.max(0,player.shield/pshMax*100)+"%";
    $("playerShT").textContent=fmt(Math.max(0,player.shield)); }
  const ehp=cur.hp>1e17?0:Math.max(0,Math.min(cur.hp,cur.max));   // v2.5.1：尸体/间隔期显示 0，不再残留满血条
  $("enemyHp").firstElementChild.style.width=(ehp/cur.max*100)+"%";
  $("enemyHpT").textContent=`${fmt(ehp)} / ${fmt(cur.max)}`;
  const eshOn=cur.maxShield>0&&cur.hp<=1e17;
  $("enemySh").style.display=eshOn?"block":"none";
  $("enemyShT").style.display=eshOn?"block":"none";
  if(eshOn){ $("enemySh").firstElementChild.style.width=Math.max(0,cur.shield/cur.maxShield*100)+"%";
    $("enemyShT").textContent=fmt(Math.max(0,cur.shield)); }
  // v2.23：Boss 预估文本已删除（需求⑬，Boss 战信息做减法）
}

// ============ 主循环 ============
let lastT=performance.now(), saveTimer=0;
function loop(now){
  const realDt=Math.min((now-lastT)/1000,0.1); lastT=now;
  let dt=realDt*effSpeed();   // v2.19：2 倍速（已通过楼层）
  syncPresentationSpeed();
  if(S.speed2&&S.floor>S.bestEver&&!speedDropNotified){ speedDropNotified=true; toast("已进入未探索楼层，恢复常速"); }
  if(S.floor<=S.bestEver) speedDropNotified=false;
  if(!paused && cur.hp<1e17){   // v2.5：尸体/跑入间隔期不结算战斗
    const st=calcStats();
    // 玩家攻击
    atkTimer+=dt*st.aspd;
    if(atkTimer>=1){ atkTimer-=1; dealPlayerHit(); }
    // 敌人反击（持续伤害）
    if(cur.hp<1e17&&!wall&&!(player.invulnUntil>Date.now())){   // v2.29：击杀当帧敌人不反击；v2.18：光学迷彩无敌期
      const dmg=cur.atk*dt;
      if(player.shield>0){ const s=Math.min(player.shield,dmg); player.shield-=s; player.hp-=(dmg-s); }
      else player.hp-=dmg;
      if(isTianshu()){   // v2.23：天枢双武器相位机
        cur.phaseT-=dt;
        if(cur.phase===0&&cur.phaseT<=0){ cur.phase=1; cur.phaseT=0.5; enemyAnim("charge",500); }   // 蓄力预警
        else if(cur.phase===1&&cur.phaseT<=0){
          cur.phase=2; cur.phaseT=0.5; enemyAnim("cannon",500);
          const burst=cur.atk*2.5;   // 主炮重击（单发）
          if(player.shield>0){ const sh=Math.min(player.shield,burst); player.shield-=sh; player.hp-=(burst-sh); }
          else player.hp-=burst;
          floatDmg("player",fmt(burst),"#FF2A6D",true);
        }
        else if(cur.phase===2&&cur.phaseT<=0){ cur.phase=0; cur.phaseT=8; }
        else if(cur.phase===0&&Math.random()<dt*1.2){ floatDmg("player",fmt(cur.atk),"#FF2A6D",false); enemyAnim("shoot",400); }   // 机枪常态
      }
      else if(Math.random()<dt*1.2){
        floatDmg("player",fmt(cur.atk),"#FF2A6D",false);
        if(isPrism()){ prismAlt=!prismAlt; enemyAnim(prismAlt?"shoot":"slash"); }   // v2.9：棱镜翼炮/斩击交替演出
        else if(mobKind==="hound") enemyAnim("bite",500);   // v2.15：机械犬扑咬
        else enemyAnim("shoot",333);
      }
      checkWall(dt);
    }
  }
  saveTimer+=realDt;   // v2.35：界面刷新用真实时间（2× 不再加倍刷新）
  if(saveTimer>0.5){ saveTimer=0; try{ renderPanels(); if(drawerOpen) renderDrawer(); }catch(e){} }   // v2.29：渲染异常不中断循环
  if(Math.floor(now/5000)!==Math.floor((now-dt*1000)/5000)) save();
  renderCombat();
  requestAnimationFrame(loop);
}

// ============ 测试日志系统 ============
// 版本管理：每次修改递增 VERSION，并同步维护 game/CHANGELOG.md 与 game/versions/ 快照
const VERSION="v2.40";   // Codex：演出保进度切速、死亡回调清理；保留 WorkBuddy B01/A01 修复
new Image().src="assets/gunner_shoot.png";   // 预加载攻击帧条防首击闪烁
new Image().src="assets/gunner_run.png";
new Image().src="assets/arena-bg2.webp";
new Image().src="assets/arena-bg3.webp";
new Image().src="assets/arena-bg4.webp";
new Image().src="assets/arena-bg5.webp";
new Image().src="assets/arena-bg6.webp";
["security_idle","security_shoot","security_hurt","security_death","security_run",
 "warden_idle","warden_shoot","warden_run","warden_death",
 "prism_idle","prism_shoot","prism_slash","prism_move","prism_death",
 "hound_idle","hound_run","hound_bite","hound_hurt","hound_death",
 "tianshu_idle","tianshu_move","tianshu_machinegun","tianshu_charge","tianshu_cannon","tianshu_death"].forEach(n=>{ new Image().src=`assets/${n}.png`; });
new Image().src="assets/stage01-death.png";   // v2.38.2：死亡素材预加载
let sessions=[], curSession=null, seqCounter=1;
let floorEnterT=0, bossEnterT=0, floorGoldEarned=0, lastLogSave=0;
let drawerOpen=false;

function newSession(){
  curSession={id:"S"+String(seqCounter++).padStart(2,"0"), build:VERSION,
    startedAt:Date.now(), endedAt:null, events:[], floors:[]};
  logEvent("session_start",{fromFloor:S.floor});
}
function saveLogs(force){
  const now=Date.now();
  if(!force && now-lastLogSave<3000) return;
  lastLogSave=now;
  try{ localStorage.setItem("neonHunterLogs", JSON.stringify({sessions, current:curSession, seq:seqCounter})); }
  catch(e){ toast("日志存储空间已满，本次记录仅在内存中"); }   // v2.34：F01——日志写失败降级内存态，不打断启动/战斗
}
function loadLogs(){
  try{
    const d=JSON.parse(localStorage.getItem("neonHunterLogs"));
    if(d){ sessions=d.sessions||[]; seqCounter=d.seq||(sessions.length+1);
      if(d.current && !d.current.endedAt){
        if(d.current.build!==VERSION){   // v2.34：F05——跨版本封存旧段，开当前版本新段（防数据混版本）
          d.current.endedAt=Date.now(); sessions.push(d.current); return false;
        }
        curSession=d.current; return true; } }
  }catch(e){}
  return false;
}
// v2.19：2 倍速——已通过楼层（floor<=bestEver）生效，新边境自动降 1 倍
function toggleSpeed(){ S.speed2=!S.speed2; syncPresentationSpeed(); save(); renderSpeedBtn(); toast(S.speed2?"2 倍速开启（仅限已通过楼层）":"恢复常速"); }
function effSpeed(){ return S.speed2 && S.floor<=S.bestEver ? 2 : 1; }
let speedDropNotified=false;
function renderSpeedBtn(){
  const b=$("btnSpeed");
  // v2.20.1：仅在可倍速场景显示（重塑后且处于已通过楼层）；新边境/首轮隐藏
  if(!S.prestiges||S.floor>S.bestEver){ b.style.display="none"; return; }
  b.style.display="block";
  if(!b._built){   // v2.38.4：B01——图标/文字节点只建一次，此后只更新文本（按住不掉节点）
    b.innerHTML=`<img src="assets/icons/fast-play.svg" alt="" style="width:15px;height:15px;vertical-align:-2px;margin-right:4px"><span class="spd-t"></span>`;
    b._built=1;
  }
  const t=b.querySelector(".spd-t"); if(t) t.textContent=S.speed2?"2×":"1×";
  b.classList.toggle("on",S.speed2);
}
function logEvent(type,data){
  if(!curSession) return;
  const st=calcStats();
  curSession.events.push(Object.assign({
    t:Date.now()-curSession.startedAt, type,
    snap:{floor:S.floor, gold:Math.round(S.gold), atkLv:S.atkLv, hpLv:S.hpLv,
          atk:Math.round(st.atk), hp:Math.round(st.hp), aspd:+st.aspd.toFixed(2)}
  }, data||{}));
  saveLogs(false);
}
function pushFloorSummary(){
  if(!curSession) return;
  const now=Date.now();
  curSession.floors.push({
    floor:S.floor,
    enterT:floorEnterT-curSession.startedAt,
    clearDur:now-floorEnterT,
    bossDur:now-bossEnterT,
    atkLv:S.atkLv, hpLv:S.hpLv, gold:Math.round(floorGoldEarned)
  });
  floorGoldEarned=0;
  saveLogs(true);
}

// ---- 日志自动落盘（File System Access API，首次需授权一次文件夹） ----
let logDirHandle=null;
function idbOpen(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open("neonHunterFS",1);
    r.onupgradeneeded=()=>r.result.createObjectStore("kv");
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
async function idbGet(k){
  try{ const db=await idbOpen();
    return new Promise(res=>{ const q=db.transaction("kv").objectStore("kv").get(k);
      q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); });
  }catch(e){ return null; }
}
async function idbSet(k,v){
  try{ const db=await idbOpen();
    return new Promise(res=>{ const q=db.transaction("kv","readwrite").objectStore("kv").put(v,k);
      q.onsuccess=()=>res(); q.onerror=()=>res(); });
  }catch(e){}
}
async function ensureLogDir(){
  if(!window.showDirectoryPicker) return null;
  if(!logDirHandle) logDirHandle=await idbGet("logDir");
  if(logDirHandle){
    if(await logDirHandle.queryPermission({mode:"readwrite"})==="granted") return logDirHandle;
    if(await logDirHandle.requestPermission({mode:"readwrite"})==="granted") return logDirHandle;
  }
  return null;
}
async function pickLogDir(){
  try{
    logDirHandle=await window.showDirectoryPicker({id:"neonHunterLogs"});
    await idbSet("logDir",logDirHandle);
    toast("已绑定日志文件夹，之后自动保存");
    return logDirHandle;
  }catch(e){ return null; }
}
function tsName(d){
  const p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
// 统一命名规则：neonhunter_<版本>_<测试段>_<时间戳>.<json|csv>
function sessionBaseName(s){
  return `neonhunter_${s.build}_${s.id}_${tsName(new Date(s.endedAt||Date.now()))}`;
}
async function writeToFolder(name,content,mime){
  let dir=await ensureLogDir();
  if(!dir) dir=await pickLogDir();   // 首次：弹系统选择器，请选项目下的 logs 文件夹
  if(dir){
    try{
      const fh=await dir.getFileHandle(name,{create:true});
      const w=await fh.createWritable();
      await w.write(content); await w.close();
      toast("已存入文件夹："+name);
      return true;
    }catch(e){}
  }
  download(name,content,mime);   // 降级：浏览器下载
  toast("未授权文件夹，已改为浏览器下载："+name);
  return false;
}
function saveSessionToFolder(s){
  return writeToFolder(sessionBaseName(s)+".json", JSON.stringify(s,null,2), "application/json");
}
function csvContent(s){
  const rows=[["floor","enter_t_s","clear_dur_s","boss_dur_s","atk_lv","hp_lv","gold_earned"]];
  s.floors.forEach(f=>rows.push([f.floor,(f.enterT/1000).toFixed(1),(f.clearDur/1000).toFixed(1),
    (f.bossDur/1000).toFixed(1),f.atkLv,f.hpLv,f.gold]));
  return "﻿"+rows.map(r=>r.join(",")).join("\n");
}
function saveCsvToFolder(s){
  return writeToFolder(sessionBaseName(s)+".csv", csvContent(s), "text/csv");
}

// ---- 复位 / 结束测试 ----
let confirmOpen=false;   // v2.31
function askReset(){
  if(skillOfferOpen){   // v2.31.5：R02——技能弹窗被确认框顶替前先挂起，取消复位后恢复
    pendingSkillOffer={pool:lastOfferPool,picks:curOffer.slice(),floor:lastOfferFloor};
    skillOfferOpen=false;
  }
  confirmOpen=true;
  showModal("🔄 确认复位？",
    "将<b>清空存档</b>并作废当前未封存的日志段，回到全新开局。<br>已封存的历史测试段会保留。",
    `<button class="nh-button nh-button--danger nh-button--compact" onclick="doReset()">确认复位</button>
     <button onclick="confirmOpen=false;closeModal()">取消</button>`);
}
function doReset(){
  confirmOpen=false; pendingSkillOffer=null;   // v2.31：确认复位则丢弃挂起的技能请求
  skillOfferOpen=false; curOffer=[]; S.pendingOffer=null; closeModal();   // v2.29：复位清理技能弹窗流程态
  // v2.31.5：R01——复位清理恢复标记+战斗临时态，显式满血满盾清零
  player.hp=100; player.shield=0;   // 基础血量（新档升级清零，spawnMob 进层按 calcStats 回满） buff={adrenaline:0,killcycle:0,critsurge:0,soulrush:0};
  localStorage.removeItem("neonHunter");
  S=freshState();
  wall=false; paused=false;
  buff={adrenaline:0,killcycle:0,critsurge:0,soulrush:0};
  floorGoldEarned=0;
  newSession();
  spawnMob(); closeModal(); openingRunIn();   // v2.14：复位后双方跑入
  renderPanels(); renderDrawer();
  saveLogs(true); save();
  toast("已完全复位，新测试段 "+curSession.id+" 开始");
}
function endTest(){
  if(!curSession) return;
  curSession.endedAt=Date.now();
  logEvent("session_end",{maxFloor:S.maxFloor});
  sessions.push(curSession);
  if(sessions.length>3) sessions=sessions.slice(-3);   // v2.6：浏览器端只保留最新 3 段（磁盘 logs/ 文件不受影响）
  const sealed=curSession;
  newSession();           // 静默开启新段，游戏继续
  const html=summarize(sealed);
  saveLogs(true);
  saveSessionToFolder(sealed);   // 自动落盘 JSON + CSV 到 logs/ 文件夹（首次弹授权）
  saveCsvToFolder(sealed);
  showModal("⏹️ 测试段 "+sealed.id+" 已封存", html,
    `<button class="gold" onclick="closeModal();saveSessionToFolder(findSession('${sealed.id}'))">存入 logs 文件夹</button>
     <button class="gold" onclick="closeModal();exportCSV('${sealed.id}')">导出楼层 CSV</button>
     <button onclick="closeModal()">继续游戏</button>`);
  renderDrawer();
}
function summarize(s){
  const durMin=((s.endedAt-s.startedAt)/60000);
  const maxF=s.floors.length?s.floors[s.floors.length-1].floor:0;
  const walls=s.events.filter(e=>e.type==="wall");
  const ups=s.events.filter(e=>e.type==="upgrade");
  const upsAtk=ups.filter(e=>e.kind==="atk").length, upsHp=ups.filter(e=>e.kind==="hp").length;
  const sk=s.events.filter(e=>e.type==="skill");
  const pr=s.events.filter(e=>e.type==="prestige");
  const ads=s.events.filter(e=>e.type==="prestige"&&e.mult===2).length;
  const crates=s.events.filter(e=>e.type==="crate").length;
  const drops=s.events.filter(e=>e.type==="drop");
  let wallLine="本次未卡关";
  if(walls.length){
    const w=walls[0], inTarget=w.snap.floor>=25&&w.snap.floor<=40;
    wallLine=`首卡：第 ${w.snap.floor} 层 / ${(w.t/60000).toFixed(1)} 分钟
      （设计目标 25~40 层 ${inTarget?"✅":"⚠️ 偏离"}，原因：${w.reason==="hp_zero"?"站不住":"击杀超时"}）`;
  }
  return `时长 <b>${durMin.toFixed(1)}</b> 分钟 · 通过 <b>${maxF}</b> 层 · 事件 <b>${s.events.length}</b> 条<br>
    ${wallLine}<br>
    强化 <b>${ups.length}</b> 次（攻 ${upsAtk} / 血 ${upsHp}）· 爆装 <b>${drops.length}</b> 件 ·
    技能 <b>${sk.length}</b> 次<br>
    重塑 <b>${pr.length}</b> 次 · 广告按钮点击 <b>${ads}</b> 次 · 补给箱 <b>${crates}</b> 次<br>
    <small>新测试段 ${curSession.id} 已静默开启</small>`;
}

// ---- 导出 ----
function findSession(id){ return id===curSession.id?curSession:sessions.find(x=>x.id===id); }
function download(name,content,mime){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([content],{type:mime}));
  a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportJSON(id){
  const s=findSession(id); if(!s) return;
  saveSessionToFolder(s);
}
function exportCSV(id){
  const s=findSession(id); if(!s) return;
  saveCsvToFolder(s);
}

// ---- 日志抽屉 ----
function toggleDrawer(){
  drawerOpen=!drawerOpen;
  document.getElementById("drawer").classList.toggle("show",drawerOpen);
  if(drawerOpen) renderDrawer();
}
function renderDrawer(){
  const body=document.getElementById("drawerBody");
  if(!body) return;
  let html="";
  if(curSession){
    const dur=((Date.now()-curSession.startedAt)/60000).toFixed(1);
    html+=`<div class="sess current"><b>▶ 当前段 ${curSession.id}</b> <span style="color:#5a6472">${curSession.build}</span>
      <div class="meta">时长 ${dur} 分钟 · 事件 ${curSession.events.length} 条 · 已过 ${curSession.floors.length} 层</div>
      <button class="gold" onclick="saveSessionToFolder(curSession)">💾 存到文件夹</button>
      <button class="gold" onclick="exportCSV('${curSession.id}')">CSV</button></div>`;
  }
  html+=[...sessions].slice(-3).reverse().map(s=>{   // v2.6：界面也只显示最新 3 段
    const dur=((s.endedAt-s.startedAt)/60000).toFixed(1);
    const maxF=s.floors.length?s.floors[s.floors.length-1].floor:0;
    const w=s.events.find(e=>e.type==="wall");
    return `<div class="sess"><b>${s.id}</b> <span style="color:#5a6472">${s.build}</span>
      <div class="meta">${dur} 分钟 · 过 ${maxF} 层 · ${s.events.length} 事件${w?` · 首卡 ${w.snap.floor} 层`:""}</div>
      <button class="gold" onclick="saveSessionToFolder(findSession('${s.id}'))">💾 存到文件夹</button>
      <button class="gold" onclick="exportCSV('${s.id}')">CSV</button></div>`;
  }).join("");
  body.innerHTML=html||'<div class="meta" style="color:var(--dim)">暂无测试段</div>';
}

// ============ 事件 ============
$("btnAtk").onclick=()=>{ if(S.gold>=cost(S.atkLv)){ const c=cost(S.atkLv); S.gold-=c; S.atkLv++; logEvent("upgrade",{kind:"atk",level:S.atkLv,cost:Math.round(c)}); renderPanels(); } };
$("btnHp").onclick=()=>{ if(S.gold>=cost(S.hpLv)){ const before=calcStats().hp; const c=cost(S.hpLv); S.gold-=c; S.hpLv++;
  player.hp=Math.min(calcStats().hp,player.hp+(calcStats().hp-before));   // v2.17：买血加增量（层内不回血下避免"买了不加血"）
  logEvent("upgrade",{kind:"hp",level:S.hpLv,cost:Math.round(c)}); renderPanels(); } };
// v2.3：装备全自动（掉落/合成时更高品质直接换上），无手动换装按钮
// v2.16：主动重塑按钮已移除，重塑仅在「行动受阻」弹窗可选
$("btnCrate").onclick=openCrate;
window.addEventListener("beforeunload",save);
// v0.8：记录切后台/回前台，区分"打不过"与"人走了"
document.addEventListener("visibilitychange",()=>{
  logEvent(document.hidden?"tab_hidden":"tab_visible");
  if(!document.hidden) lastT=performance.now();   // 回前台重置计时，防 dt 跳变
});

// ============ 启动 ============
const hadSave=load();
loadLogs();
if(!curSession) newSession();
spawnMob();
renderPanels();
// v2.6 封面 + v2.14 开局跑入：封面期间战斗暂停；点击开始 → 离线结算（如有）→ 双方跑入
paused=true;
$("covVer").textContent=VERSION+" · CrazyGames 版"; renderSfxRow();
$("topVer").textContent=VERSION.toUpperCase(); document.title="霓虹猎手 "+VERSION;   // v2.29：版本文字统一由 VERSION 生成
const enterIc=`<img src="assets/icons/enter-game.svg" alt="" style="width:22px;height:22px;vertical-align:-5px;margin-right:8px">`;   // v2.33：▶ → enter-game.svg
$("btnStart").innerHTML=hadSave?`${enterIc}进入夜城<small>继续第 ${S.floor} 层 · 自动保存</small>`:`${enterIc}开始游戏<small>新的猎杀 · 自动保存</small>`;
$("btnStart").onclick=()=>{ $("cover").classList.add("hide"); setTimeout(()=>$("cover").remove(),450);
  openingRunIn(); };
function askCoverReset(){
  showModal("⚠️ 清除存档","确定要清空全部进度吗？此操作不可恢复。",
    `<button class="nh-button nh-button--danger nh-button--compact" onclick="doReset();$('cover').classList.add('hide');setTimeout(()=>$('cover').remove(),450)">确认清除并开始新游戏</button>
     <button onclick="closeModal()">取消</button>`);
}
// v2.35：触摸状态机完整化（INPUT-01）——hypot 直线距离、松手坐标复核、目标存活检查、取消守卫
let tapBtn=null, tapId=null, tapX=0, tapY=0, tapCancelled=false, suppressClickFor=null;
function tapReset(){ if(tapBtn) tapBtn.classList.remove("pressing"); tapBtn=null; tapId=null; tapCancelled=false; }
document.addEventListener("touchstart",e=>{
  const b=e.target.closest(".nh-button");
  if(b&&!b.disabled&&!tapBtn){ if(suppressClickFor===b) suppressClickFor=null;   // v2.37.1：新手势取代旧守卫
    b.classList.add("pressing"); tapBtn=b; tapCancelled=false;
    const t=e.changedTouches[0]; tapId=t.identifier; tapX=t.clientX; tapY=t.clientY; }
},{passive:true});
document.addEventListener("touchmove",e=>{
  if(!tapBtn) return;
  for(const t of e.changedTouches){ if(t.identifier!==tapId) continue;
    if(Math.hypot(t.clientX-tapX,t.clientY-tapY)>10){ tapCancelled=true; tapBtn.classList.remove("pressing"); } }   // 直线距离，超阈值即取消不可恢复
},{passive:true});
["touchend","touchcancel"].forEach(ev=>document.addEventListener(ev,e=>{
  if(!tapBtn) return;
  let mine=null;
  for(const t of e.changedTouches){ if(t.identifier===tapId){ mine=t; break; } }
  if(!mine) return;   // 其他手指，与本次手势无关
  if(mine&&Math.hypot(mine.clientX-tapX,mine.clientY-tapY)>10) tapCancelled=true;   // 松手坐标复核
  const b=tapBtn, cancelled=tapCancelled;
  tapReset();
  if(ev==="touchend"&&!cancelled&&b.isConnected&&!b.disabled){ e.preventDefault(); b.click(); }
  else if(ev==="touchend"&&cancelled){ suppressClickFor=b; setTimeout(()=>{ suppressClickFor=null; },350); }   // 取消手势拦截尾随 click
},{passive:false}));
// 拦截已取消手势的尾随兼容 click（不用全局禁 click，不误伤下一次点按）
document.addEventListener("click",e=>{
  if(suppressClickFor&&e.target.closest(".nh-button")===suppressClickFor){ e.preventDefault(); e.stopPropagation(); suppressClickFor=null; }
},true);
// 页面失焦/切后台清理手势残留
document.addEventListener("visibilitychange",()=>{ if(document.hidden) tapReset(); });
requestAnimationFrame(loop);
