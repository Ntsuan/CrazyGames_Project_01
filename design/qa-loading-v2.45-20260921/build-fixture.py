from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = Path(__file__).parent / 'site'
source = (root / 'game/index.html').read_text()
(out / 'index.html').write_text(source)
fixture = r'''
// QA only: explicit UI controls, deterministic readiness/failure injection.
const qaScenario=new URLSearchParams(location.search).get('case')||'slow';
let qaReleased=false,qaWaiters=[],qaCalls=0,qaErrors=[],qaFailed=false;
window.addEventListener('error',e=>qaErrors.push(e.message));
window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));
const qaNativeLoad=loadBootAsset;
loadBootAsset=async asset=>{
  if(asset.url==='assets/tianshu_death.png'){
    if(['slow','reset','prestige','skill'].includes(qaScenario)&&!qaReleased)
      await new Promise(resolve=>qaWaiters.push(resolve));
    if(qaScenario==='retry'&&!qaFailed){qaFailed=true;throw Error('QA simulated asset failure');}
  }
  return qaNativeLoad(asset);
};
const qaOpening=openingRunIn;
openingRunIn=()=>{qaCalls++;qaOpening();};
function qaRelease(){qaReleased=true;qaWaiters.splice(0).forEach(fn=>fn());}
function qaDoubleStart(){startCoverLoad();startCoverLoad();}
function qaRefresh(){location.reload();}
const qaSeed=freshState();
if(['reset','prestige','skill'].includes(qaScenario)){
  qaSeed.floor=11;qaSeed.maxFloor=11;qaSeed.gold=123;qaSeed.souls=7;qaSeed.runSouls=3;
  if(qaScenario==='prestige')qaSeed.prestigeOffer={id:'qa:10',source:'milestone',floor:10,stage:'choice',souls:3,salvage:0,items:0,adRewarded:false};
  if(qaScenario==='skill')qaSeed.pendingOffer={pool:'p10',picks:null,floor:10};
}
localStorage.setItem('neonHunter',JSON.stringify(qaSeed));
setInterval(()=>{
  const n=document.getElementById('qaState');if(!n)return;
  n.textContent=JSON.stringify({phase:boot.phase,ready:boot.assets.filter(a=>a.state==='ready').length,total:boot.assets.length,
    failed:boot.assets.filter(a=>a.state==='failed').length,attempts:boot.assets.filter(a=>a.attempts>1).map(a=>a.url),
    entryCalls:qaCalls,paused,floor:S.floor,gold:S.gold,hp:player.hp,runSouls:S.runSouls,souls:S.souls,
    errors:qaErrors,cover:!!document.getElementById('cover'),pending:!!S.prestigeOffer,skill:skillOfferOpen});
},100);
'''
controls='''<aside id="qaTools" style="position:fixed;z-index:999;top:0;left:0;font-size:10px;background:#101820;color:white;padding:4px;max-width:100%">
<button onclick="qaRelease()">QA 放行素材</button><button onclick="qaDoubleStart()">QA 重复开始</button><button onclick="qaRefresh()">QA 刷新</button><button onclick="this.parentElement.style.opacity='0'">QA 隐藏工具</button>
<output id="qaState" style="display:block;max-width:520px;word-break:break-all"></output></aside>'''
source=source.replace('// ============ 启动 ============',fixture+'\n// ============ 启动 ============')
source=source.replace('</body>',controls+'</body>')
(out/'qa.html').write_text(source)
