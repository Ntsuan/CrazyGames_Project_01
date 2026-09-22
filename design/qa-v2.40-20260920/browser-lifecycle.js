(async()=>{
 const out=[];let originalSpawn=spawnMob,originalShow=showWallModal;
 for(const kind of ['death','enemy','scene','transit']){
  qaReset(true);let shows=0,spawns=0;showWallModal=()=>{shows++;originalShow();};spawnMob=()=>{spawns++;originalSpawn();};
  if(kind==='death'){player.hp=0;checkWall(0);}if(kind==='enemy'){cur.hp=1e18;enemyRunIn();}if(kind==='scene')sceneSwap(runSeq);if(kind==='transit')startFloorTransit();
  await qaSleep(80);doReset();const layersAfterReset=sceneLayers.size,spawnsAtReset=spawns;await qaSleep(1500);paused=true;
  out.push({name:kind+'途中复位',shows,spawns,spawnsAtReset,layersAfterReset,pass:shows===0&&spawnsAtReset===1&&spawns===2&&layersAfterReset===0&&!wall&&!deathWait&&!$('overlay').classList.contains('show')&&!$('playerSpr').classList.contains('death')&&presentationTasks.size===0});
  spawnMob=originalSpawn;showWallModal=originalShow;
 }
 qaReset();let shows=0;showWallModal=()=>{shows++;originalShow();};player.hp=0;checkWall(0);await qaSleep(1500);out.push({name:'动画结束与兜底只弹一次',shows,pass:shows===1&&!deathWait&&presentationTasks.size===0});showWallModal=originalShow;
 qaReset(true);S.bestEver=1;S.mobIdx=5;spawnMob();onKill();out.push({name:'突破记录立即回1×',pass:effSpeed()===1&&$('enemySpr').getAnimations()[0].playbackRate===1});beginPresentationRun();
 const deaths=[['安保兵',1,0,'trooper',-825],['机械犬',1,0,'hound',-550],['典狱长',1,5,'trooper',-1155],['棱镜',10,5,'trooper',-1050],['天枢',100,5,'trooper',-1330]];
 for(const [name,f,m,kind,end] of deaths){qaReset();S.floor=f;S.mobIdx=m;mobKind=kind;spawnMob();onKill();await qaSleep(name==='棱镜'?950:850);const x=parseFloat(getComputedStyle($('enemySpr')).backgroundPositionX);out.push({name:name+'自然死亡末帧',x,pass:x===end});}
 qaReset();return out;
})()
