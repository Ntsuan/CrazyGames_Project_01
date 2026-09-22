from pathlib import Path
q=Path(__file__).resolve().parent;r=q.parents[1];site=q/'site';site.mkdir(exist_ok=True)
if not (site/'assets').exists():(site/'assets').symlink_to(r/'game/assets',target_is_directory=True)
s=(r/'game/index.html').read_text();(site/'index.html').write_text(s)
fixture='''
// 独立测试源的可见入口；不进入正式源码。仅稳定敌人血量以观察状态。
boot.phase='playing';document.getElementById('cover')?.remove();document.body.classList.remove('booting');
for(const id of ['topbar','arena','panels'])$(id).inert=false;
function qaSetup(){
 crateAd=null;adRelease();setPresentationHidden(false);beginPresentationRun();S=freshState();S.stage=2;S.floor=23;dispFloor=23;
 S.skills=['critsurge','critsurge','critsurge','soulrush','soulrush','ghoststep'];S.hpLv=20;S.crateCooldownMs=0;
 player={hp:calcStats().hp,shield:0,pendingInvuln:0,invulnUntil:0};buff={adrenaline:0,critsurge:0,soulrush:0};wall=false;transit=false;paused=true;skillOfferOpen=false;confirmOpen=false;pendingSkillOffer=null;
 $('overlay').classList.remove('show');$('stageOverlay').hidden=true;document.body.classList.remove('stage-active');setStageInert(false);newSession();spawnMob();
 $('player').dataset.stage=S.stage;$('player').style.left=fightPos();$('player').style.opacity='1';$('enemy').style.right=fightPos();$('enemy').style.opacity='1';$('arena').style.backgroundImage=`url('${bgForFloor(S.floor)}')`;
 renderPanels();renderCombat();
}
function qaActivate(){qaSetup();const prior=Math.random;Math.random=()=>0;cur.shield=1;cur.hp=1;dealPlayerHit();Math.random=prior;paused=true;renderPanels();renderCombat();qaRead()}
function qaFight(){paused=false;transit=false;cur.hp=1e12;cur.atk=0;Math.random=()=>.999;renderPanels();qaRead()}
function qaRead(){const out={version:VERSION,paused,transit,floor:S.floor,gameMs:combatNow(),skillMs:typeof skillNow==='function'?skillNow():null,buffs:typeof activeSkillBuffs==='function'?activeSkillBuffs():null,cloaked:$('player').classList.contains('cloaked'),remaining:player.pendingInvuln||Math.max(0,(player.invulnUntil||0)-(typeof skillNow==='function'?skillNow():combatNow()))};$('qaReadout').textContent=JSON.stringify(out)}
const qaTools=document.createElement('div');qaTools.style.cssText='position:fixed;bottom:0;right:0;background:#091424;z-index:9999;padding:3px;border:1px solid #6a9';qaTools.innerHTML=`<button onclick="qaSetup();qaRead()">准备HUD</button><button onclick="qaActivate()">激活并等待</button><button onclick="qaFight()">恢复战斗</button><button onclick="paused=true;renderPanels();qaRead()">暂停战斗</button><button onclick="S.stage=5;S.floor=1234567;dispFloor=S.floor;renderCombat()">无尽长楼层</button><button onclick="gameMode='build';offerSkills('p10',null,10)">全部技能选择</button><button onclick="qaRead()">读取状态</button><button onclick="qaTools.style.display='none'">隐藏工具</button><pre id="qaReadout" style="max-width:320px;max-height:65px;overflow:auto;font-size:9px;margin:0"></pre>`;document.body.appendChild(qaTools);
qaSetup();$('topVer').textContent=VERSION;requestAnimationFrame(loop);
</script></body></html>'''
(site/'qa.html').write_text(s.split('// ============ 启动 ============')[0]+fixture)
b=(q/'baseline/game/index.html').read_text();(site/'before-modes.css').write_text((q/'baseline/game/assets/start-screen/modes.css').read_text());b=b.replace('assets/start-screen/modes.css?v=2572','before-modes.css');(site/'before.html').write_text(b.split('// ============ 启动 ============')[0]+fixture)
print(site)
