const {make}=require('./core-tests.cjs'),assert=require('assert'),fs=require('fs');const results=[];
function test(name,fn){const g=make();try{g.run('S.prestiges=1;S.bestEver=200;');fn(g);results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
for(const f of [3,5,10,100])for(const fast of [false,true])test(`f${f} ${fast?2:1}× 完整死亡、淡出、后续阶段`,g=>{
 g.run(`S.floor=${f};S.mobIdx=5;S.speed2=${fast};spawnMob();var skills=0,transits=0;var oldOffer=offerSkills,oldTransit=startFloorTransit;offerSkills=(...a)=>{skills++;assertHidden();oldOffer(...a)};startFloorTransit=()=>{transits++;assertHidden();oldTransit()};function assertHidden(){if($('enemy').style.opacity!=='0')throw Error('Boss still visible')};onKill()`);
 const wait=(f%10===0?1100:900)/(fast?2:1),fade=300/(fast?2:1);
 g.advance(wait-1);assert.equal(g.run('skills+transits'),0);assert.notEqual(g.run('$("enemy").style.opacity'),'0');g.advance(1);assert.equal(g.run('$("enemy").style.opacity'),'0');g.advance(fade-1);assert.equal(g.run('skills+transits'),0);g.advance(1);assert.equal(g.run('skills+transits'),1);assert.equal(g.run('S.floor'),f+1);
 if(f%5===0){assert.equal(g.run('skills'),1);g.advance(2000);assert.equal(g.run('$("enemy").style.opacity'),'0');g.run('pickSkill(curOffer[0])');}
 g.advance(5000);assert(g.run('!paused&&!transit&&cur.hp<1e17&&!$("enemySpr").classList.contains("die")'));
});
for(const fast of [false,true])test(`淡出中${fast?'2→1':'1→2'}重排剩余等待`,g=>{g.run(`S.floor=5;S.mobIdx=5;S.speed2=${fast};spawnMob();onKill()`);g.advance(fast?500:1000);g.run('toggleSpeed()');g.advance((fast?200:100)-1);assert(!g.run('skillOfferOpen'));g.advance(1);assert(g.run('skillOfferOpen&&$("enemy").style.opacity==="0"'));});
for(const f of [3,5,10,100])test(`f${f} 淡出途中复位无旧技能或旧转场`,g=>{g.run(`S.floor=${f};S.mobIdx=5;spawnMob();onKill()`);g.advance((f%10===0?1100:900)+100);g.run('doReset()');g.advance(6000);assert(g.run('S.floor===1&&!skillOfferOpen&&!S.pendingOffer&&!pendingTransit&&!transit&&!wall'));});
test('转场入口防御性隐藏旧敌人',g=>{g.run('$("enemy").style.opacity="1";startFloorTransit()');assert.equal(g.run('$("enemy").style.opacity'),'0');});
fs.writeFileSync(__dirname+'/boss-results.json',JSON.stringify(results,null,2));console.log('Boss',results.filter(x=>x.pass).length+'/'+results.length);for(const r of results.filter(x=>!x.pass))console.log(r);process.exitCode=results.some(x=>!x.pass)?1:0;
