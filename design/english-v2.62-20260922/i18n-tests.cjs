const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../..'),game=path.join(root,'game');
const runtime=fs.readFileSync(path.join(game,'assets/i18n/runtime.js'),'utf8');
const dict=JSON.parse(fs.readFileSync(path.join(game,'assets/i18n/en.json')));
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
function env(saved,url='https://example.test/',denied=false){const storage=new Map(saved?[['neonHunter.language',saved]]:[]);let destination;
 const ctx=vm.createContext({URL,console,document:{documentElement:{}},window:{NeonEnglish:dict,location:{href:url,replace:s=>destination=s},localStorage:{getItem:k=>{if(denied)throw Error('denied');return storage.get(k)},setItem:(k,v)=>{if(denied)throw Error('denied');storage.set(k,v)}}}});vm.runInContext(runtime,ctx);return {ctx,api:ctx.window.NeonI18n,storage,destination:()=>destination};}
check('Default English',()=>assert.equal(env().api.language,'en'));
check('Remember Chinese',()=>assert.equal(env('zh').api.language,'zh'));
check('Query overrides saved language',()=>assert.equal(env('zh','https://example.test/?lang=en').api.language,'en'));
check('Invalid language falls back to English',()=>assert.equal(env('fr').api.language,'en'));
check('Storage unavailable still honors language query',()=>assert.equal(env(null,'https://example.test/?lang=zh',true).api.language,'zh'));
check('Selection only writes preference; URL parameters preserved',()=>{const g=env(null,'https://example.test/?qa=1');g.api.choose('zh');assert.deepStrictEqual([...g.storage],[['neonHunter.language','zh']]);assert.equal(g.destination(),'https://example.test/?qa=1&lang=zh');});
check('Storage unavailable can still switch',()=>{const g=env(null,'https://example.test/',true);g.api.choose('zh');assert.equal(g.destination(),'https://example.test/?lang=zh');});
check('Dictionary completeness and placeholders',()=>{const keys=JSON.parse(fs.readFileSync(path.join(__dirname,'source-strings.json')));assert.equal(Object.keys(dict).length,372);for(const [key,value] of Object.entries(dict)){assert(value&&!/[\u3400-\u9fff]/.test(value),key);assert.deepStrictEqual((key.match(/\{\d+\}/g)||[]).sort(),(value.match(/\{\d+\}/g)||[]).sort(),key);}});
check('All dictionary fragments translate',()=>{const g=env();for(const key of Object.keys(dict))g.api.text(key);assert.deepStrictEqual([...g.api.missing],[]);});
check('Opaque interpolation preserves HTML and nested translated values',()=>{const g=env();const value='<b>8</b>';const out=g.api.text(['攻击 ',' · 生命 <b>','</b> · 攻速 ','/秒<br>'],value,100,'1.30');assert.equal(out,'Attack <b>8</b> · Health <b>100</b> · Attack speed 1.30/s<br>');});
// Reuse the established deterministic VM game harness, with the real localization runtime loaded before game code.
let harness=fs.readFileSync(path.join(root,'design/skill-pools-v2.61-20260922/core-tests.cjs'),'utf8').split("test('C01'")[0];
harness=harness.replace('vm.runInContext(source,ctx);',`ctx.window.localStorage=ctx.localStorage;ctx.window.location={href:'https://example.test/?lang='+process.env.QA_LANG};ctx.window.NeonEnglish=JSON.parse(fs.readFileSync('${game}/assets/i18n/en.json','utf8'));ctx.document.documentElement={};vm.runInContext(fs.readFileSync('${game}/assets/i18n/runtime.js','utf8'),ctx);vm.runInContext(source,ctx);`);
function make(lang){const mod={exports:{}};vm.runInNewContext(harness+';module.exports={make};',{require,module:mod,process:{env:{GAME_HTML:path.join(game,'index.html'),QA_LANG:lang}},__dirname,console,URL,Blob});const g=mod.exports.make();const j=g.json;g.json=s=>JSON.parse(JSON.stringify(j(s)));return g;}
check('Bilingual numeric and save compatibility across combat, skills, upgrades and reforge',()=>{const en=make('en'),zh=make('zh');const steps=['renderPanels();renderCombat();','S.gold=100;$("btnAtk").onclick();$("btnHp").onclick();','offerSkills("p5");pickSkill(curOffer[0]);','S.mobIdx=5;spawnMob();onKill();','S.runSouls=10;wall=true;doPrestige();applyPrestige(1);','save();load();spawnMob();'];for(const code of steps){en.run(code);zh.run(code);assert.deepStrictEqual(en.json('S'),zh.json('S'),code);assert.deepStrictEqual(en.json('calcStats()'),zh.json('calcStats()'),code);}for(const key of ['neonHunter','neonHunter.build'])if(en.storage.has(key))assert.equal(en.storage.get(key),zh.storage.get(key));});
check('English dynamic panels and milestone modals contain no Chinese or missing keys',()=>{for(const pool of ['p5','p10']){const g=make('en');g.run('renderPanels();renderCombat();offerSkills("'+pool+'");');for(const [id,node] of g.nodes){const display=node.innerHTML+' '+node.textContent;assert(!/[\u3400-\u9fff]/.test(display),id+': '+display);}assert.deepStrictEqual(g.json('[...window.NeonI18n.missing]'),[]);}});
check('English reset confirmation retains confirmation flag',()=>{const g=make('en');g.run('confirmOpen=true;showModal(L("确认复位"),"","",null)');assert.equal(g.run('confirmOpen'),true);});
check('Chinese strings are unchanged',()=>{const g=env('zh');for(const key of Object.keys(dict))assert.equal(g.api.text(key),key);});
console.log(count+'/'+count+' PASS');
