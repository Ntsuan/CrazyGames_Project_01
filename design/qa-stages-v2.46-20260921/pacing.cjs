const {make}=require('./harness.cjs'),fs=require('fs');const out=[];
for(let stage=1;stage<=Number(process.env.STAGE_COUNT||4);stage++){
 const g=make(stage);g.run('renderPanels=renderCombat=save=saveLogs=()=>{};logEvent=()=>{};showModal=()=>{};');
 const r=g.json(`(()=>{
 S.stage=${stage};S.speed2=true;S.sfxOn=false;openingRunIn();
 const start=Date.now();let nextCrate=start+60000,nextBuy=start,deaths=0,crates=0,firstWall=null;
 const ranks=['fire','nano','neuro','shield','subdermal','blackmarket','overclock','fatal','resonance','adrenaline','ghoststep','lowhp','critsurge','killcycle','soulrush'];
 while(Date.now()-start<${Number(process.env.MAX_HOURS||6)}*3600000&&deaths<${Number(process.env.MAX_RUNS||30)}){
  __advance(1000/10);
  if(S.stageUpgrade)break;
  if(S.prestigeOffer){
   if(S.prestigeOffer.source==='milestone')continueMilestone();
   else{if(firstWall===null)firstWall=S.floor;doPrestige();requestPrestigeAd();finishPrestigeAd(prestigeAd.attempt,'completed');deaths++;
     for(let i=0;i<10000;i++){let keys=['dmg','gold','soul'].filter(k=>S.souls>=treeCost(k));if(!keys.length)break;keys.sort((a,b)=>(S.tree[a]+1)/({dmg:2,gold:2,soul:1}[a])-(S.tree[b]+1)/({dmg:2,gold:2,soul:1}[b]));buyTree(keys[0]);}
   }
  }
  if(skillOfferOpen)pickSkill(curOffer.slice().sort((a,b)=>ranks.indexOf(a)-ranks.indexOf(b))[0]);
  if(!wall&&!skillOfferOpen&&Date.now()>=nextCrate){openCrate();nextCrate=Date.now()+60000;crates++;}
  if(Date.now()>=nextBuy&&!wall&&!skillOfferOpen){
   for(const slot of Object.keys(SLOTS)){let n=0;while(fuseInfo(slot)&&n++<100)fuseSlot(slot);}
   for(let i=0;i<200;i++){let a=cost(S.atkLv)/1.5<=cost(S.hpLv);if(S.gold<cost(a?S.atkLv:S.hpLv))break;$(a?'btnAtk':'btnHp').onclick();}
   nextBuy=Date.now()+2000;
  }
  loop(performance.now());
 }
 return {stage:S.stage,clear:!!S.stageUpgrade,minutes:(Date.now()-start)/60000,floor:S.floor,best:S.bestEver,deaths,crates,firstWall,atkLv:S.atkLv,hpLv:S.hpLv,tree:S.tree};
})()`);out.push(r);console.log(JSON.stringify(r));fs.writeFileSync(__dirname+'/'+(process.env.OUTPUT_TAG||'pacing')+'-results.json',JSON.stringify({policy:'单种子/阶段；每60秒领取一次现行补给；仅受阻时模拟广告翻倍重塑；优先伤害技能；自动合成和强化；上限通过 MAX_HOURS/MAX_RUNS 配置；默认6小时/30轮；非真人时间',results:out},null,2));
}
