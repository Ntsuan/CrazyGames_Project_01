# coding: utf-8
from pathlib import Path
import re,json,shutil
r=Path('/Users/zmy/WorkBuddy/CrazyGames');q=r/'design/qa-visual-v2.54-20260922';site=q/'site';site.mkdir(exist_ok=True)
if not (site/'assets').exists():(site/'assets').symlink_to(r/'game/assets',target_is_directory=True)
s=(r/'game/index.html').read_text();(site/'index.html').write_text(s)
css=re.search(r'<style>(.*?)</style>',s,re.S).group(1)
packs=json.loads(re.search(r'const UPGRADE_PACKS=(\{.*?\});',s,re.S).group(1))
html='''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>v2.54 视觉验收</title><style>'''+css+'''</style><link rel="stylesheet" href="assets/stages/stages.css"><style>
body{display:block;max-width:1040px;margin:auto;padding:16px}#fixture-arena{position:relative;height:160px;background:url(assets/arena-bg.webp) center/cover}#player{left:40%;bottom:15px}select{font-size:16px}#shots{display:flex;flex-wrap:wrap;gap:12px}#shots figure{margin:0;max-width:100%}canvas{width:480px;max-width:100%;height:auto}pre{white-space:pre-wrap;max-height:140px;overflow:auto;font-size:11px}button{margin:4px;padding:8px}#summary{color:#7fe5a0}
</style><h1>v2.54 视觉验收</h1><p>正式样式与改装渲染器；测试状态仅在此页面。</p><select id="stage" aria-label="人物阶段">'''+''.join(f'<option value="{n}">阶段 {n}</option>' for n in range(1,6))+'''</select><button onclick="showState('')">普通</button><button onclick="showState('shielded')">仅护盾</button><button onclick="showState('cloaked')">仅无敌</button><button onclick="showState('shielded cloaked')">护盾＋无敌</button><button onclick="audit()">检查全部状态</button><div id="fixture-arena"><div id="player" class="fighter" data-stage="2"><div class="psprite" id="playerSpr"></div></div></div><p id="state"></p><p id="summary">资源加载中</p><div id="shots"><figure><figcaption>2→3 桌面背景</figcaption><canvas id="desktop" width="960" height="720"></canvas></figure><figure><figcaption>2→3 手机背景</figcaption><canvas id="mobile" width="960" height="720"></canvas></figure></div><button id="play" disabled onclick="playUpgrade()">播放完整8秒改装</button><output id="phase"></output><pre id="results"></pre><script src="'''+packs['2']['script']+'''"></script><script>
const pack='''+json.dumps(packs['2'])+''';
const results={styles:[],render:[],errors:[]};let layers={},state='shielded cloaked';
window.addEventListener('error',e=>{results.errors.push(e.message);publish()});
window.addEventListener('unhandledrejection',e=>{results.errors.push(String(e.reason));publish()});
function publish(){document.getElementById('results').textContent=JSON.stringify(results);document.getElementById('summary').textContent=results.errors.length?'失败：'+results.errors.join(';'):`样式 ${results.styles.filter(x=>x.ok).length}/${results.styles.length} · 背景 ${results.render.filter(x=>x.ok).length}/${results.render.length}`}
function showState(s){state=s;const p=document.getElementById('player');p.dataset.stage=document.getElementById('stage').value;p.className='fighter '+s;document.getElementById('playerSpr').className='psprite';document.getElementById('state').textContent=`阶段 ${p.dataset.stage} · ${s||'普通'} · ${getComputedStyle(p).animationName}`}
document.getElementById('stage').onchange=()=>showState(state);
function audit(){results.styles=[];const p=document.getElementById('player'),spr=document.getElementById('playerSpr');
for(let stage=1;stage<=5;stage++)for(const status of ['', 'shielded', 'cloaked','shielded cloaked'])for(const action of ['', 'atk','run']){
p.dataset.stage=stage;p.className='fighter '+status;spr.className='psprite '+action;
const expected=status==='shielded cloaked'?'shieldCloakPulse':status==='cloaked'?'cloakPulse':status==='shielded'?'auraGlow':'none';
getComputedStyle(p).animationName;for(const a of p.getAnimations()){a.pause();a.currentTime=600}
const st=getComputedStyle(p),sp=getComputedStyle(spr),alpha=Number(st.opacity);const ok=st.animationName===expected&&(status.includes('cloaked')?alpha>=.44&&alpha<=.76:alpha===1)&&sp.animationName!=='none'&&(stage===1||sp.backgroundImage.includes('stage0'+stage));
results.styles.push({stage,status,action,animation:st.animationName,spriteAnimation:sp.animationName,opacity:alpha,filter:st.filter,ok});
}
document.getElementById('stage').value='2';showState('shielded cloaked');for(const a of p.getAnimations())a.play();publish()}
async function init(){for(const tier of ['desktop','mobile']){
layers[tier]=Object.fromEntries(await Promise.all(Object.entries(pack[tier]).map(async([k,url])=>{const im=new Image();im.src=url;await im.decode();return[k,im]})));
const ctx=document.getElementById(tier).getContext('2d');for(const time of [0,2,4,6,8]){let first=null;const proxy=new Proxy(ctx,{get(target,key){if(key==='drawImage')return(...args)=>{if(!first)first=args[0];return target.drawImage(...args)};const v=target[key];return typeof v==='function'?v.bind(target):v},set(target,key,value){target[key]=value;return true}});const ret=NeonUpgrade0203.render(proxy,layers[tier],time);results.render.push({tier,time,phase:ret.phase,backgroundFirst:first===layers[tier]['repair-room'],ok:first===layers[tier]['repair-room']});}
NeonUpgrade0203.render(ctx,layers[tier],2);
}audit();document.getElementById('play').disabled=false}
function playUpgrade(){document.getElementById('play').disabled=true;const start=performance.now();function frame(now){const t=Math.min(8,(now-start)/1000);for(const tier of ['desktop','mobile']){const ret=NeonUpgrade0203.render(document.getElementById(tier).getContext('2d'),layers[tier],t);document.getElementById('phase').textContent=t.toFixed(2)+'秒 · '+ret.phase;}if(t<8)requestAnimationFrame(frame);else document.getElementById('play').disabled=false}requestAnimationFrame(frame)}
init().catch(e=>{results.errors.push(String(e));publish()});
</script>'''
(site/'qa.html').write_text(html);shutil.copy2('/tmp/build-visual-qa-254.py',q/'build-fixture.py');print(site)
