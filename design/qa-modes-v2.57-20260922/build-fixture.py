from pathlib import Path
import json
q=Path(__file__).resolve().parent;r=q.parents[1];site=q/'site';site.mkdir(exist_ok=True)
if not (site/'assets').exists():(site/'assets').symlink_to(r/'game/assets',target_is_directory=True)
s=(r/'game/index.html').read_text();(site/'index.html').write_text(s)
# Fault test only: simulate quota failure for the active progress key while preserving original data.
fault='''const qaSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='neonHunter.build')throw Error('QA simulated quota');return qaSet.call(this,k,v)};'''
(site/'fault.html').write_text(s.replace('"use strict";','"use strict";'+fault,1))
base=json.loads((q/'fresh-state.json').read_text())
(site/'seed.html').write_text('''<!doctype html><meta charset="utf-8"><title>双模式测试夹具</title>
<style>body{background:#111b28;color:white;font:16px sans-serif;padding:20px}button,a{display:block;margin:12px;padding:14px;background:#234258;color:white}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
<h1>双模式测试夹具 · 仅本机19457测试源</h1><p>以下按钮仅写测试源中指定模式的数据，不进入正式发行文件。</p>
<button onclick="oldFive()">准备旧版阶段五无尽档</button>
<button onclick="pendingBuild()">准备构筑待选技能</button>
<button onclick="read()">读取存档诊断</button>
<a href="index.html">打开正式游戏副本</a><a href="fault.html">打开写入失败测试页</a><pre id="diag"></pre>
<script>const base='''+json.dumps(base,ensure_ascii=False)+''';
function oldFive(){const s={...structuredClone(base),stage:5,gold:1234,souls:19,skills:['ghoststep'],floor:11,maxFloor:11};delete s.mode;localStorage.setItem('neonHunter',JSON.stringify(s));localStorage.removeItem('neonHunterModes');localStorage.removeItem('neonHunter.build');read()}
function pendingBuild(){const s={...structuredClone(base),mode:'build',gold:87,floor:5,maxFloor:5,skills:['ghoststep'],pendingOffer:{pool:'p5',picks:['ghoststep','soulrush','critsurge'],floor:5}};localStorage.setItem('neonHunter.build',JSON.stringify(s));localStorage.setItem('neonHunterModes',JSON.stringify({schema:1,selected:'build',buildUnlocked:true}));read()}
function read(){const d={};for(const k of ['neonHunterModes','neonHunter','neonHunter.build','neonHunterLogs','neonHunterLogs.build']){try{const s=JSON.parse(localStorage.getItem(k));d[k]=k.includes('Logs')?{mode:s?.current?.mode,build:s?.current?.build}:s}catch(e){d[k]='unreadable'}}document.getElementById('diag').textContent=JSON.stringify(d,null,2)}read();</script>''')
hud='''<button id="qaHud" style="position:fixed;bottom:0;left:0;z-index:100" onclick="document.getElementById('cover')?.remove();document.body.classList.remove('booting');boot.phase='playing';S.stage=5;S.floor=100;S.mobIdx=5;dispFloor=100;spawnMob();wall=true;paused=true;renderCombat();this.remove()">查看窄屏阶段五受阻HUD</button>'''
(site/'hud.html').write_text(s.replace('</body>',hud+'</body>'))
