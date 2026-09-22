// One-time v2.61 -> v2.62 migration from the preserved baseline, not a build step.
const fs=require('fs'),vm=require('vm'),path=require('path');
const m={exports:{}};vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{exports:m.exports,module:m});
const acorn=m.exports, root=path.resolve(__dirname,'../..'),han=/[\u3400-\u9fff]/;
function walk(n,fn){if(!n||typeof n!=='object')return;if(n.type)fn(n);for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v&&typeof v==='object')walk(v,fn);}}
function wrap(src){
 const edits=[];
 walk(acorn.parse(src,{ecmaVersion:'latest'}),n=>{
  if(n.type==='Literal'&&typeof n.value==='string'&&han.test(n.value)){edits.push([n.start,'L('],[n.end,')']);}
  if(n.type==='TemplateLiteral'&&n.quasis.some(q=>han.test(q.value.cooked))){edits.push([n.start,'L']);}
 });
 for(const [i,s] of edits.sort((a,b)=>b[0]-a[0]))src=src.slice(0,i)+s+src.slice(i);
 acorn.parse(src,{ecmaVersion:'latest'});return src;
}
let html=fs.readFileSync(path.join(__dirname,'baseline/game/index.html'),'utf8');
html=html.replace(/<script>([\s\S]*?)<\/script>/,(_,src)=>'<script>'+wrap(src)+'</script>');
html=html.replace('"use strict";',`"use strict";
const L=window.NeonI18n?.text || ((input,...values)=>typeof input==="string"?input:input.reduce((s,p,i)=>s+p+(i<values.length?values[i]:""),""));`);
html=html.replace('<html lang="zh-CN">','<html lang="en">');
html=html.replace('</head>',`<script src="assets/i18n/en.js?v=2620"></script>
<script src="assets/i18n/runtime.js?v=2620"></script>
<link rel="stylesheet" href="assets/i18n/layout.css?v=2620">
</head>`);
html=html.replace('<div class="row2"><span>语言</span><span class="val">中文（EN 制作中）</span></div>',`<div class="row2"><label for="languageSelect">语言</label><select id="languageSelect" data-language-select data-no-i18n aria-label="Language / 语言" onchange="changeLanguage(this.value)"><option value="en">English</option><option value="zh">中文</option></select></div>`);
html=html.replace('// ============ 启动 ============',`function changeLanguage(code){
  // Switching is available on the cover only: no active combat is restarted.
  if(boot.phase!=="cover"||hasGameModal())return;
  window.NeonI18n?.choose(code);
}
// ============ 启动 ============
window.NeonI18n?.localize(document.body);`);
html=html.replace('const VERSION="v2.61"','const VERSION="v2.62"');
html=html.replaceAll('assets/upgrades/1-2.js"','assets/upgrades/1-2.js?v=2620"').replaceAll('assets/upgrades/2-3.js?v=2540','assets/upgrades/2-3.js?v=2620').replaceAll('assets/upgrades/3-4.js"','assets/upgrades/3-4.js?v=2620"').replaceAll('assets/upgrades/4-5.js"','assets/upgrades/4-5.js?v=2620"');
fs.writeFileSync(path.join(root,'game/index.html'),html);
for(let i=1;i<=4;i++){
 const name=`game/assets/upgrades/${i}-${i+1}.js`;
 let src=fs.readFileSync(path.join(__dirname,'baseline',name),'utf8');
 src=wrap(src).replace("'use strict';","'use strict';\n  const L=root.NeonI18n?.text || (s=>s);");
 if(!src.includes('const L='))throw Error('Missing IIFE injection: '+name);
 fs.writeFileSync(path.join(root,name),src);
}
const dict=JSON.parse(fs.readFileSync(path.join(root,'game/assets/i18n/en.json'),'utf8'));
fs.writeFileSync(path.join(root,'game/assets/i18n/en.js'),'// Generated from en.json; regenerate after glossary changes.\nwindow.NeonEnglish = '+JSON.stringify(dict,null,2)+';\n');
console.log('Localized main HTML and four animation scripts.');
