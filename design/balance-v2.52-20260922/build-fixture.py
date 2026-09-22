from pathlib import Path
root=Path(__file__).resolve().parents[2]
out=Path(__file__).parent/'site';out.mkdir(exist_ok=True)
if not (out/'assets').exists():(out/'assets').symlink_to(root/'game/assets',target_is_directory=True)
s=(root/'game/index.html').read_text();(out/'index.html').write_text(s)
fixture=r'''
// Disposable QA UI. These controls are not part of the production game.
const qaErrors=[];window.addEventListener('error',e=>qaErrors.push(e.message));
window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));
function qaSupply(ms){
 beginPresentationRun();S=freshState();S.crateCooldownMs=ms;S.sfxOn=false;
 crateAd=null;prestigeAd=null;adRelease();confirmOpen=false;skillOfferOpen=false;pendingSkillOffer=null;pendingTransit=false;transit=false;wall=false;paused=false;curOffer=[];
 closeModal();spawnMob();cur.hp=cur.max=1e12;cur.atk=0;dispFloor=1;lastT=performance.now();renderPanels();save();
}
function qaLegacy(){const d={...freshState(),gold:321,cratesRun:39};delete d.economySchema;delete d.crateCooldownMs;localStorage.setItem('neonHunter',JSON.stringify(d));location.reload();}
function qaReshape(){S.runSouls=25;wall=true;doPrestige();}
function qaBoss(){beginPresentationRun();closeModal();S.stage=1;S.floor=100;S.mobIdx=5;spawnMob();onKill();}
setInterval(()=>{$('qaState').textContent=JSON.stringify({phase:boot.phase,stage:S.stage,floor:S.floor,gold:S.gold,cooldownMs:Math.round(S.crateCooldownMs),crates:S.cratesRun,rate:effSpeed(),paused,ad:!!crateAd,version:VERSION,errors:qaErrors,lastCrate:curSession.events.filter(x=>x.type==='crate').at(-1)||null});},100);
'''
ui='''<aside style="position:fixed;bottom:0;left:0;z-index:2500;background:#07121bee;color:white;max-width:620px;padding:4px;font-size:10px" id="qaTools"><button onclick="qaSupply(3000)">QA 3秒补给</button><button onclick="qaSupply(60000)">QA 60秒补给</button><button onclick="qaLegacy()">QA 旧档</button><button onclick="save();location.reload()">QA 保存刷新</button><button onclick="qaReshape()">QA 重塑</button><button onclick="qaBoss()">QA 百层</button><button onclick="this.parentElement.style.display='none'">QA 隐藏工具</button><output id="qaState" style="display:block;word-break:break-all;max-height:40px;overflow:auto"></output></aside>'''
(out/'qa.html').write_text(s.replace('</script>',fixture+'\n</script>',1).replace('</body>',ui+'\n</body>'))
print(out)
