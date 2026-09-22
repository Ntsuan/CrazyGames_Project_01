from pathlib import Path
q=Path(__file__).resolve().parent;r=q.parents[1];site=q/'site';site.mkdir(exist_ok=True)
if not (site/'assets').exists():(site/'assets').symlink_to(r/'game/assets',target_is_directory=True)
s=(r/'game/index.html').read_text();(site/'index.html').write_text(s)
s=s.split('// ============ 启动 ============')[0]+'''
// 可见测试按钮准备旧版混合待选，实际执行正式保存/读取/技能展示函数。
boot.phase='playing';$('cover').remove();document.body.classList.remove('booting');S=freshState();newSession();spawnMob();paused=true;renderPanels();renderCombat();
function qaOffer(floor,mode='build'){
 closeModal();gameMode=mode;S=freshState();S.stage=5;S.floor=floor+1;S.skills=['ghoststep'];
 S.pendingOffer={floor,pool:floor%10===0?'p5':'p10',picks:Object.keys(SKILLS)};
 save();load();newSession();spawnMob();offerSkills(S.pendingOffer.pool,S.pendingOffer.picks,S.pendingOffer.floor);
 $('qaState').textContent=JSON.stringify({mode:gameMode,floor:S.pendingOffer.floor,pool:S.pendingOffer.pool,picks:curOffer});
}
$('panels').insertAdjacentHTML('beforebegin',`<div><button onclick="qaOffer(5)">构筑5层旧待选</button><button onclick="qaOffer(10)">构筑10层旧待选</button><button onclick="qaOffer(105)">构筑105层旧待选</button><button onclick="qaOffer(110,'endless')">无尽110层旧待选</button><pre id="qaState" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></div>`);
</script></body></html>'''
(site/'fixture.html').write_text(s)
