(()=>{
window.qaBoss=async(floor,fast,changeAt=null)=>{
 qaReset(fast);S.floor=floor;S.mobIdx=5;spawnMob();$('enemy').style.right=fightPos();renderPanels();
 const originalTransit=startFloorTransit,originalOffer=offerSkills;const events=[],samples=[];let stage=null,hiddenWait=true,switched=false;
 const opacity=()=>parseFloat(getComputedStyle($('enemy')).opacity);let t0=performance.now();
 startFloorTransit=()=>{events.push({type:'transit',time:performance.now()-t0,opacity:opacity()});stage='transit';originalTransit();};
 offerSkills=(...a)=>{events.push({type:'skill',time:performance.now()-t0,opacity:opacity()});stage='skill';originalOffer(...a);};
 const gold=S.gold,souls=S.runSouls;onKill();const reward={gold:S.gold-gold,souls:S.runSouls-souls};
 try{
  while(performance.now()-t0<6500){
   const elapsed=performance.now()-t0,op=opacity();samples.push({time:elapsed,opacity:op,dead:$('enemySpr').classList.contains('die')});
   if(changeAt!==null&&!switched&&elapsed>=changeAt){toggleSpeed();switched=true;}
   if(stage==='skill'){
    await qaSleep(180);hiddenWait=opacity()===0;pickSkill(curOffer[0]);
   }
   if(stage==='transit'&&!transit&&!paused)break;
   await qaSleep(15);
  }
  paused=true;const op=opacity();const fadeSeen=samples.some(x=>x.opacity>0&&x.opacity<1);const noGhost=samples.filter(x=>x.time>=(events[0]?.time??Infinity)&&x.dead).every(x=>x.opacity===0);
  const result={floor,initialSpeed:fast?2:1,changeAt,events,reward,fadeSeen,hiddenWait,noGhost,newEnemyVisible:op===1&&!$('enemySpr').classList.contains('die'),finalFloor:S.floor,pass:events.every(x=>x.opacity===0)&&events.length===(floor%5===0?2:1)&&fadeSeen&&hiddenWait&&noGhost&&op===1&&!$('enemySpr').classList.contains('die')&&S.floor===floor+1&&!transit&&cur.hp<1e17};
  return result;
 }finally{startFloorTransit=originalTransit;offerSkills=originalOffer;qaReset();}
};return 'ready';
})()
