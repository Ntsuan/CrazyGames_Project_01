from pathlib import Path
root=Path(__file__).resolve().parents[2];out=Path(__file__).parent/'site';s=(root/'game/index.html').read_text();out.mkdir(exist_ok=True)
if not (out/'assets').exists():(out/'assets').symlink_to(root/'game/assets',target_is_directory=True)
(out/'index.html').write_text(s)
fixture=r'''
// QA only: disposable local fixture, UI-exposed scenarios and diagnostics.
let qaErrors=[],qaHits=0,qaSaves=0,qaFrames=[],qaCosts=[],qaLast=0,qaStarted=0,qaMeasuring=false,qaPerf=null,qaTimer;
window.addEventListener('error',e=>qaErrors.push(e.message));window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));
const qaRealHit=dealPlayerHit;dealPlayerHit=()=>{qaHits++;qaRealHit()};
const qaRealSave=save;save=()=>{qaSaves++;qaRealSave()};
const qaRealLoop=loop;loop=now=>{const begin=performance.now();qaRealLoop(now);if(qaMeasuring){if(qaLast)qaFrames.push(now-qaLast);qaLast=now;qaCosts.push(performance.now()-begin)}};
function qaBase(){
 beginPresentationRun();S.stageUpgrade=null;S.pendingOffer=null;S.prestigeOffer=null;skillOfferOpen=false;confirmOpen=false;wall=false;paused=false;transit=false;pendingTransit=false;curOffer=[];pendingSkillOffer=null;
 $('stageOverlay').hidden=true;document.body.classList.remove('stage-active');setStageInert(false);closeModal();
 buff={adrenaline:0,killcycle:0,critsurge:0,soulrush:0};player.invulnUntil=player.pendingInvuln=0;combatRemainder=0;lastT=performance.now();
}
function qaPressure(){
 qaBase();S.stage=5;S.floor=100;S.mobIdx=5;S.atkLv=5;S.hpLv=40;S.skills=Array(20).fill('neuro').concat(['nano','overclock','fatal','killcycle','critsurge']);
 S.equip.implant={slot:'implant',q:9,affix:affixOf('implant',9)};$('player').setAttribute('data-stage','5');spawnMob();
 player.hp=calcStats().hp;cur.hp=cur.max=1e12;cur.shield=1e10;cur.maxShield=1e12;cur.atk=1;dispFloor=S.floor;
 qaHits=qaSaves=0;qaFrames=[];qaCosts=[];qaLast=0;qaStarted=performance.now();qaMeasuring=true;qaPerf=null;
 const startGame=combatNow(),startRate=effSpeed();clearTimeout(qaTimer);qaTimer=setTimeout(()=>{
 qaMeasuring=false;const sorted=qaFrames.slice().sort((a,b)=>a-b),costs=qaCosts.slice().sort((a,b)=>a-b);
 qaPerf={rate:startRate,wallMs:performance.now()-qaStarted,gameMs:combatNow()-startGame,frames:qaFrames.length,fps:qaFrames.length*1000/qaFrames.reduce((a,b)=>a+b,0),p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),p95LoopMs:costs[Math.floor(costs.length*.95)],maxLoopMs:costs.at(-1),hits:qaHits,saves:qaSaves,paused,errors:qaErrors.slice()};paused=true;
 },20000);
}
function qaBoss(){qaBase();S.stage=Math.min(4,S.stage);S.floor=100;S.mobIdx=5;dispFloor=100;spawnMob();onKill();}
function qaEndless(){qaBase();S.stage=5;S.floor=100;S.mobIdx=5;dispFloor=100;spawnMob();onKill();}
function qaNormal(){qaBase();S=freshState();S.stage=1;S.atkLv=S.hpLv=15;S.gold=1000;spawnMob();openingRunIn();}
function qaPause(){paused=!paused;}
setInterval(()=>{
 $('qaState').textContent=JSON.stringify({phase:boot.phase,rate:effSpeed(),testSpeed,stage:S.stage,floor:S.floor,hits:qaHits,gameMs:combatNow(),paused,transit,wall,skill:skillOfferOpen,prestige:S.prestigeOffer?.stage||null,upgrade:S.stageUpgrade?.status||null,upgradeElapsed:stageClock.elapsed,aspd:calcStats().aspd,liveFloats:document.querySelectorAll('.dmg').length,tasks:presentationTasks.size,errors:qaErrors,perf:qaPerf});
},100);
'''
controls='''<style>#qaTools{position:fixed;z-index:2000;bottom:0;left:0;max-width:600px;background:#07121be8;color:white;font-size:8px;padding:3px}#qaTools button{padding:2px 4px;min-height:18px;font-size:8px;display:inline-block;margin:0}#qaState{display:block;font-size:8px;max-height:35px;overflow:auto;word-break:break-all}</style><aside id="qaTools"><button onclick="qaPressure()">QA 压力20秒</button><button onclick="qaBoss()">QA 百层改装</button><button onclick="qaEndless()">QA 无尽百层</button><button onclick="qaNormal()">QA 普通爬层</button><button onclick="qaPause()">QA 暂停</button><button onclick="location.reload()">QA 刷新</button><button onclick="this.parentElement.style.opacity='0';this.parentElement.style.pointerEvents='none'">QA 隐藏工具</button><output id="qaState"></output></aside>'''
s=s.replace('// ============ 启动 ============',fixture+'\n// ============ 启动 ============').replace('</body>',controls+'</body>');(out/'qa.html').write_text(s)
