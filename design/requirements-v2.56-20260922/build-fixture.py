from pathlib import Path
q=Path(__file__).resolve().parent;r=q.parents[1];site=q/'site';site.mkdir(exist_ok=True)
if not (site/'assets').exists():(site/'assets').symlink_to(r/'game/assets',target_is_directory=True)
s=(r/'game/index.html').read_text();(site/'index.html').write_text(s)
s=s.split('// ============ 启动 ============')[0]+'''
// 本页专用测试入口；不写入发行文件。固定战斗伤害为零，保留演出、广告、视觉与计时真实函数。
boot.phase="playing";$("cover").style.display="none";combatStep=()=>{};
function qaPrepare(mode,stage=2){
 crateAd=null;adRelease();setPresentationHidden(false);beginPresentationRun();S=freshState();S.stage=stage;S.skills=['ghoststep'];S.crateCooldownMs=0;
 player={hp:calcStats().hp,shield:0,pendingInvuln:0,invulnUntil:0};wall=false;transit=false;paused=false;skillOfferOpen=false;confirmOpen=false;pendingSkillOffer=null;pendingTransit=false;testSpeed=1;
 $("overlay").classList.remove("show");$("stageOverlay").hidden=true;setStageInert(false);document.body.classList.remove("stage-active");
 $("player").setAttribute('data-stage',String(stage));$("player").style.left=fightPos();$("player").style.opacity='1';$("playerSpr").className='psprite';newSession();spawnMob();
 if(mode==='run'){openingRunIn();openCrate()}
 if(mode==='kill'){onKill();openCrate()}
 if(mode==='ten'){S.floor=10;S.mobIdx=5;spawnMob();onKill();openCrate()}
 if(mode==='hundred'){S.floor=100;S.mobIdx=5;spawnMob();onKill();openCrate()}
 if(mode==='death'){player.hp=0;checkWall(.1);openCrate();deathWait.listener({target:$("playerSpr"),animationName:'stage2death'})}
 renderPanels();renderCombat();qaRead();
}
function qaRead(){ $('qaState').textContent=JSON.stringify({version:VERSION,stage:S.stage,floor:S.floor,mob:S.mobIdx,gold:S.gold,crates:S.cratesRun,cooldown:S.crateCooldownMs,paused,transit,wall,pending:player.pendingInvuln,remaining:Math.max(0,(player.invulnUntil||0)-combatNow()),cloaked:$('player').classList.contains('cloaked'),shielded:$('player').classList.contains('shielded'),ad:!!crateAd,suspended:presentationSuspended,canOpen:canOpenCrate(),tasks:presentationTasks.size,animations:[$('playerSpr'),$('enemySpr')].flatMap(e=>e.getAnimations().map(a=>({name:a.animationName,rate:a.playbackRate})))})}
const qaPanel=document.createElement('div');qaPanel.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#081321;z-index:9999;padding:4px;font-size:10px;border-top:1px solid cyan';
qaPanel.innerHTML=`<button onclick="qaPrepare('ready')">准备就绪</button><button onclick="qaPrepare('run')">跑入中补给</button><button onclick="qaPrepare('kill')">击杀中补给</button><button onclick="qaPrepare('ten')">十层补给</button><button onclick="qaPrepare('hundred')">百层补给</button><button onclick="qaPrepare('death')">死亡补给</button><button onclick="qaRead()">读取状态</button><button onclick="qaPanel.style.display='none'">隐藏测试工具</button><pre id="qaState" style="white-space:pre-wrap;margin:0;max-height:80px;overflow:auto"></pre>`;document.body.appendChild(qaPanel);
qaPrepare('ready');$('topVer').textContent=VERSION;requestAnimationFrame(loop);
</script></body></html>'''
(site/'qa.html').write_text(s)
print(site)
