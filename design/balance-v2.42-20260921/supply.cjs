const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert'),crypto=require('node:crypto');
const ref=path.resolve(__dirname,'../drop-projection-20260920');
const model=fs.readFileSync(path.join(ref,'crosscheck.cjs'),'utf8');
const factory=model.slice(model.indexOf('const run=new Function'),model.indexOf('const rows=run'))+'return run;';
const actual=fs.readFileSync(path.join(ref,'project.cjs'),'utf8');
const actualFactory=actual.slice(actual.indexOf('const body='),actual.indexOf('const start=')).replace("return ['keep','salvage','no_fuse'].map(run);","return run('keep');")+'return new Function("trials","cap",body);';
const trials=Number(process.argv[2]||10000),crosscheckTrials=100;
const output={trials,crosscheckTrials,assumptions:['单轮从1层空装备出发，每层5小怪+1Boss','不死亡、不重塑、不刷档、不拆解','每次掉落后重复手动合成到无可用配方；统计达到至少该品质','供给模型不模拟战斗可达性、点击耗时或真人游戏时长'],versions:{}};
for(const [tag,file] of [['baseline','baseline/index_v2.41.html'],['current','site/index.html']]){
 const html=fs.readFileSync(path.join(__dirname,file),'utf8');
 const run=new Function('text','a','b',factory)(html,html.indexOf('function dropBand('),html.indexOf('function dropRoll('));
 const cut=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
 const extracted=cut('const QUALITY=','// （DROPS')+'\n'+cut('function dropBand(','function itemDesc(')+'\n'+cut('function fuseInfo(','// ============ 技能');
 const live=new Function('extracted',actualFactory)(extracted)(crosscheckTrials,2500);
 const quick=run(crosscheckTrials);
 assert.deepStrictEqual(live.rows.map(({name,...r})=>r),quick);
 output.versions[tag]={version:html.match(/const VERSION="([^"]+)"/)[1],sha256:crypto.createHash('sha256').update(html).digest('hex'),actualFunctionsCrosscheck:'PASS',rows:run(trials)};
 console.log(tag,'actual functions vs independent model: 100 seeds matched');
}
fs.writeFileSync(path.join(__dirname,'supply-results.json'),JSON.stringify(output,null,2));
console.table(output.versions.current.rows.map((r,q)=>({q,oldFirst:output.versions.baseline.rows[q].any.p50,newFirst:r.any.p50,oldAll:output.versions.baseline.rows[q].all.p50,newAll:r.all.p50})));
