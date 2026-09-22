from pathlib import Path
q=Path(__file__).resolve().parent;r=q.parents[1];site=q/'site';site.mkdir(exist_ok=True)
if not (site/'assets').exists():(site/'assets').symlink_to(r/'game/assets',target_is_directory=True)
s=(r/'game/index.html').read_text();(site/'index.html').write_text(s)
s=s.split('// ============ 启动 ============')[0]+'''
// 独立可见测试入口；实际调用掉落函数，仅固定品质/部位，保持经济与提示逻辑。
boot.phase='playing';$('cover').remove();document.body.classList.remove('booting');S=freshState();newSession();spawnMob();paused=true;renderPanels();renderCombat();$('topVer').textContent=VERSION+' · 掉落提示测试';
function qaDrop(kind){
 const prior=Math.random,priorRoll=rollQuality;Math.random=()=>.55;rollQuality=()=>2;
 S.equip.armor=kind==='auto'?null:{slot:'armor',q:kind==='convert'?9:3,affix:null};
 dropRoll(true);Math.random=prior;rollQuality=priorRoll;renderPanels();
 $('qaResult').textContent=JSON.stringify({mode:gameMode,local:$('dropNotice').textContent,global:$('toast').textContent,inventory:S.inv.length,gold:S.gold});
}
function qaSequence(){
 const seen=[];qaDrop('gain');setTimeout(()=>qaDrop('auto'),1200);
 setTimeout(()=>{seen.push({at:2300,text:$('dropNotice').textContent});$('qaResult').textContent=JSON.stringify(seen)},2300);
 setTimeout(()=>{seen.push({at:3500,text:$('dropNotice').textContent});$('qaResult').textContent=JSON.stringify(seen)},3500);
}
function qaBuild(){gameMode='build';S=freshState();newSession();spawnMob();renderPanels();qaDrop('gain')}
$('panels').insertAdjacentHTML('afterend',`<div style="margin:16px 0"><button onclick="qaDrop('gain')">测试获得掉落</button><button onclick="qaDrop('auto')">测试自动装备</button><button onclick="qaDrop('convert')">测试满级折算</button><button onclick="qaSequence()">测试连续掉落</button><button onclick="qaBuild()">测试构筑掉落</button><button onclick="toast('操作提示保留顶部');qaDrop('gain')">测试提示并存</button><pre id="qaResult" style="white-space:pre-wrap"></pre></div>`);
</script></body></html>'''
(site/'fixture.html').write_text(s)
