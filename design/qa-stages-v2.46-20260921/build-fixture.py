from pathlib import Path
root=Path(__file__).resolve().parents[2];out=Path(__file__).parent/'site';out.mkdir(exist_ok=True)
assets=out/'assets'
if not assets.exists():assets.symlink_to(root/'game/assets',target_is_directory=True)
s=(root/'game/index.html').read_text();(out/'index.html').write_text(s)
fixture=r'''
// QA-only visible controls. Not included in game/index.html.
let qaAssetFailureCount=0,qaErrors=[],qaWriteFail=false,qaAssetFail=new URLSearchParams(location.search).get('fail')==='1',qaFrameStart=0;
window.addEventListener('error',e=>qaErrors.push(e.message));window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));
const qaOriginalLoad=loadBootAsset;loadBootAsset=async asset=>{if(qaAssetFail&&asset.url==='assets/upgrades/1-2.js'&&qaAssetFailureCount++<2){throw Error('QA renderer download failure');}return qaOriginalLoad(asset);};
const qaOriginalWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(qaWriteFail&&k==='neonHunter')throw Error('QA quota');return qaOriginalWrite.call(this,k,v)};
function qaBoss(){
 if(S.stageUpgrade)return;
 beginPresentationRun();closeModal();S.prestigeOffer=null;S.pendingOffer=null;skillOfferOpen=false;wall=false;paused=false;
 S.floor=100;S.mobIdx=5;S.gold=777;S.souls=33;S.atkLv=8;S.hpLv=8;S.tree={dmg:3,gold:4,soul:2};S.skills=['ghoststep'];
 spawnMob();onKill();
}
function qaNew(){S=freshState();localStorage.setItem('neonHunter',JSON.stringify(S));location.href='qa.html';}
function qaAct(a){if(S.stageUpgrade)return;paused=true;const sp=$('playerSpr');sp.classList.remove('atk','run','death');if(a)sp.classList.add(a);syncPresentationSpeed();}
function qaForm(n){if(S.stageUpgrade)return;S.stage=n;S.stageUpgrade=null;S.prestigeOffer=null;S.pendingOffer=null;S.floor=1;S.bestEver=0;S.gold=0;S.skills=[];S.tree={dmg:0,gold:0,soul:0};S.atkLv=S.hpLv=0;spawnMob();openingRunIn();save();}
function qaLegacy(){let d=freshState();delete d.stage;delete d.stageSchema;d.floor=101;d.gold=12345;d.souls=88;d.pendingOffer={pool:'p10',picks:['nano','fire','fatal'],floor:100};S=d;localStorage.setItem('neonHunter',JSON.stringify(d));location.href='qa.html?legacy=1';}
function qaDouble(){commitStageUpgrade();commitStageUpgrade();enterNextStage();}
setInterval(()=>{
 const n=$('qaState');if(!n)return;
 n.textContent=JSON.stringify({boot:boot.phase,ready:boot.assets.filter(a=>a.state==='ready').length,total:boot.assets.length,failed:boot.assets.filter(a=>a.state==='failed').map(a=>a.url),stage:S.stage,name:stageConfig().name,floor:S.floor,gold:S.gold,souls:S.souls,atk:calcStats().atk,hp:calcStats().hp,paused,transit,upgrade:S.stageUpgrade,status:S.stageUpgrade?.status||null,elapsed:stageClock.elapsed,history:S.stageHistory.length,skill:skillOfferOpen,prestige:S.prestigeOffer?.stage||null,errors:qaErrors,writeFail:qaWriteFail,rate:effSpeed(),tier:UPGRADE_TIER,skin:$('player').getAttribute('data-stage')});
},100);
'''
controls='''<style>#qaTools button{padding:2px 3px;font-size:8px;min-height:18px;line-height:1.2;margin:0;display:inline-block}#qaState{font-size:7px;max-height:30px;overflow:auto}</style><aside id="qaTools" style="position:fixed;z-index:2000;bottom:0;left:0;font-size:10px;background:#101820;color:white;padding:4px;max-width:550px;opacity:.96">
<button onclick="qaBoss()">QA 百层击败</button><button onclick="qaDouble()">QA 连点改装</button><button onclick="location.reload()">QA 刷新</button><button onclick="qaNew()">QA 新档</button><button onclick="qaWriteFail=!qaWriteFail">QA 写失败</button><button onclick="qaLegacy()">QA 旧档</button><button onclick="S.speed2=true;S.bestEver=100">QA 倍速</button><button onclick="this.parentElement.style.opacity='0';this.parentElement.style.pointerEvents='none'">QA 隐藏工具</button>
<div>形态：<button onclick="qaForm(1)">QA 形态1</button><button onclick="qaForm(2)">QA 形态2</button><button onclick="qaForm(3)">QA 形态3</button><button onclick="qaForm(4)">QA 形态4</button><button onclick="qaForm(5)">QA 形态5</button>动作：<button onclick="qaAct('')">QA 待机</button><button onclick="qaAct('run')">QA 跑步</button><button onclick="qaAct('atk')">QA 射击</button><button onclick="qaAct('death')">QA 死亡</button></div>
<output id="qaState" style="display:block;word-break:break-all"></output></aside>'''
s=s.replace('// ============ 启动 ============',fixture+'\n// ============ 启动 ============');s=s.replace('</body>',controls+'</body>');(out/'qa.html').write_text(s)
