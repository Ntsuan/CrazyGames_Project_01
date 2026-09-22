const assert = require('assert');
const {simulate} = require('./balance-sim-v2.24.20.cjs');
const near = (a,b) => assert(Math.abs(a-b)<1e-8, `${a} != ${b}`);
const p=simulate({verify:true},1);
near(p.firstMob.hp,23); near(p.firstMob.atk,1.725); near(p.firstMob.playerHp,100);
near(p.costLv10,6*1.25**10);
near(p.prism.hp,20*1.15**20*6); assert.equal(p.prism.shield,Math.round(p.prism.hp*.8));
near(p.prism.atk,1.5*1.15**20*1.8);
near(p.shieldHitHp,50); near(p.fleshHitHp,50.4); near(p.hpUpgrade,60);
assert.deepStrictEqual(p.fusion,{quality:3,inventory:0}); assert.equal(p.firstSoulDrop,2);
const a=simulate({runs:2},42),b=simulate({runs:2},42);
assert.deepStrictEqual(a,b); assert.equal(a.rows.length,2);
for(const r of a.rows){assert.equal(r.reason,'hp_zero');assert(r.souls>0);assert(Math.abs(r.minutes-r.combatMinutes-r.transitionMinutes-r.choiceMinutes)<.002);}
const no=simulate({runs:1,fuse:false},42); assert(Object.values(no.rows[0].gear).every(q=>q<=2));
console.log('PASS: base stats; costs; prism HP/shield/attack; shield blocks lifesteal; upgrade healing; fusion; soul rounding; deterministic seeds; prestige cycles; time accounting; no-fusion bounds.');
