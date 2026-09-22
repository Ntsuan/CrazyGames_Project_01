(()=>{
 window.qaTiming=async(kind,initial,changes)=>{
 qaReset(initial);let ended=null,ends=0,animEnd=null;const switches=[];const oldSpawn=spawnMob,oldShow=showWallModal;let start;
 const sample=()=>{const id=kind==='enemy'||kind==='kill'?'enemy':'player',el=kind==='scene'?document.querySelector('.bgSlide')||$(id):$(id),a=el.getAnimations()[0];return{position:parseFloat(getComputedStyle(el)[id==='enemy'?'right':'left']),current:a?.currentTime??null,rate:a?.playbackRate??null,sprite:$(id+'Spr').getAnimations()[0]?.currentTime??null};};
 const finish=()=>{ended??=performance.now()-start;ends++;};
 const listener=e=>{if(e.animationName==='gunnerDeath')animEnd=performance.now()-start;};
 if(kind==='enemy'||kind==='kill')spawnMob=()=>{oldSpawn();finish();};
 if(kind==='death'){showWallModal=()=>{finish();oldShow();};$('playerSpr').addEventListener('animationend',listener);}
 start=performance.now();
 if(kind==='death'){player.hp=0;checkWall(0);}
 if(kind==='enemy'){cur.hp=1e18;enemyRunIn();}
 if(kind==='kill')onKill();
 if(kind==='transit')startFloorTransit();
 if(kind==='opening')openingRunIn();
 if(kind==='scene'){transit=true;sceneSwap(runSeq);}
 let ci=0,elapsed=0;
 while(elapsed<5000){
  elapsed=performance.now()-start;
  if(ci<changes.length&&elapsed>=changes[ci]){const before=sample();toggleSpeed();const after=sample();switches.push({at:elapsed,before,after,jump:Math.abs(after.position-before.position)});ci++;}
  if(['transit','opening','scene'].includes(kind)&&!paused){finish();paused=true;}
  if(ended!==null)break;
  await qaSleep(8);
 }
 const rc=runCfg();const base={death:900,enemy:rc.e+50,kill:1650+rc.e+50,transit:1400+480+rc.t+50+rc.settle,opening:rc.p+50+rc.settle,scene:480+rc.t+50+rc.settle}[kind];
 let used=0,last=0,rate=initial?2:1;
 for(const sw of switches){used+=(sw.at-last)*rate;last=sw.at;rate=rate===1?2:1;}
 const expected=last+(base-used)/rate;
 const modalAtEnd=kind!=='death'||(animEnd!==null&&ended>=animEnd-1&&getComputedStyle($('playerSpr')).backgroundPositionX==='-770px');
 const clean=kind==='death'?deathWait===null:presentationTasks.size===0&&presentationTweens.size===0&&sceneLayers.size===0;
 const result={kind,initial:initial?2:1,changes,switches,expected,elapsed:ended,animEnd,ends,clean,pass:ended!==null&&Math.abs(ended-expected)<130&&ends===1&&modalAtEnd&&clean&&switches.every(s=>s.jump<1)};
 spawnMob=oldSpawn;showWallModal=oldShow;$('playerSpr').removeEventListener('animationend',listener);qaReset();return result;
 };
 return 'ready';
})()
