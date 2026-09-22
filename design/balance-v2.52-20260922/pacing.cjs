const fs=require('node:fs'),assert=require('node:assert/strict');const {make}=require('./harness.cjs');const results=[];
for(const stage of [1,2,3,4,5])for(const seed of [1,2,3]){
 const g=make(seed);
 const r=g.json(`(()=>{
 S=freshState();S.stage=${stage};S.speed2=true;S.sfxOn=false;spawnMob();openingRunIn();renderPanels=renderCombat=()=>{};save=()=>{};
 let active=0,deaths=0,crates=0,crateGold=0,lastActive=0,nextAction=0,pending=null;const start=Date.now(),realKill=onKill,realLog=logEvent;
 onKill=()=>{if(isBoss()&&S.floor%10===0)pending={floor:S.floor,hp:player.hp/calcStats().hp,time:cur.fightT};realKill()};
 logEvent=(type,d)=>{if(type==='crate'){crates++;crateGold+=d.gold;}realLog(type,d)};
 const ranks=['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'];
 const resets=[];
 function reshape(reason){const floor=S.prestigeOffer.floor;doPrestige();requestPrestigeAd();finishPrestigeAd(prestigeAd.attempt,'completed');if(reason==='active')active++;else deaths++;resets.push({floor,reason,minutes:(Date.now()-start)/60000});
 let guard=0;while(guard++<10000){const ks=['dmg','gold','soul'].filter(k=>S.souls>=treeCost(k));if(!ks.length)break;ks.sort((a,b)=>(S.tree[a]+1)/({dmg:2,gold:2,soul:1}[a])-(S.tree[b]+1)/({dmg:2,gold:2,soul:1}[b]));buyTree(ks[0]);}}
 while(Date.now()-start<360*60000&&active+deaths<20){
 __advance(1000/30);loop(performance.now());
 if(S.stageUpgrade||S.floor>100)break;
 if(S.prestigeOffer&&$('overlay').classList.contains('show')){
 if(S.prestigeOffer.source==='wall'){reshape('death');pending=null;}
 else if(S.prestigeOffer.stage==='choice'){
 if(pending&&pending.floor>lastActive&&(pending.hp<.35||pending.time>12)){lastActive=pending.floor;reshape('active');}
 else continueMilestone();pending=null;}
 }
 if(skillOfferOpen)pickSkill(curOffer.slice().sort((a,b)=>ranks.indexOf(a)-ranks.indexOf(b))[0]);
 if(canOpenCrate()){openCrate();finishCrateAd(crateAd.id,'completed');}
 if(Date.now()>=nextAction&&!wall&&!S.prestigeOffer&&!skillOfferOpen&&!stageBusy()){
 for(const slot of Object.keys(SLOTS))while(fuseInfo(slot))fuseSlot(slot);
 for(let i=0;i<200;i++){const a=cost(S.atkLv)/1.5<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}nextAction=Date.now()+2000;}
 if(!Number.isFinite(S.gold)||!Number.isFinite(player.hp))throw Error('Non-finite');
 }
 return {clear100:!!S.stageUpgrade||S.floor>100,minutes:(Date.now()-start)/60000,active,deaths,crates,crateGold,resets,floor:S.floor};
 })()`);
 results.push({stage,seed,...r});fs.writeFileSync(__dirname+'/pacing-results.json',JSON.stringify({version:'v2.52',simulationOnly:true,seeds:3,policy:'cautious',adPlaybackExcluded:true,stage5UsesExistingEndlessBoss:true,results},null,2));
 console.log(stage,seed,r.clear100?'PASS':'CAP',r.minutes.toFixed(1)+'min','resets='+[r.active,r.deaths],'crates='+r.crates);
}
