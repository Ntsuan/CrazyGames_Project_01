// Isolated QA fixture only; never copied into game/.
const qaPanel=document.createElement('div');qaPanel.style='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#102030;padding:4px;display:flex;flex-wrap:wrap';document.body.append(qaPanel);
save=()=>{};
function qaReset(kind='spider',floor=1,boss=false){
 beginPresentationRun();paused=true;wall=false;transit=false;S.floor=floor;S.mobIdx=boss?5:1;S.bestEver=200;S.speed2=false;mobKind=kind;spawnMob();
 document.querySelectorAll('#cover').forEach(e=>e.style.display='none');
 $('enemy').style.right=fightPos();$('enemy').style.opacity='1';$('player').style.left=fightPos();$('player').style.opacity='1';$('playerSpr').className='psprite';
 $('enemySpr').className='esprite';$('enemyHp').style.display='';$('enemyHpT').style.display='';renderCombat();syncPresentationSpeed();
}
function qaButton(name,fn){const b=document.createElement('button');b.textContent=name;b.onclick=fn;qaPanel.append(b);}
qaButton('QA 蜘蛛待机',()=>qaReset());
qaButton('QA 蜘蛛行走',()=>{qaReset();$('enemySpr').classList.add('run');});
qaButton('QA 蜘蛛射击',()=>{qaReset();enemyAnim('shoot',333);});
qaButton('QA 开火帧',()=>{qaReset();enemyAnim('shoot',333);cancelPresentation($('enemySpr')._t);const a=$('enemySpr').getAnimations()[0];a.pause();a.currentTime=281;});
qaButton('QA 蜘蛛死亡',()=>{qaReset();onKill();});
qaButton('QA 残骸帧',()=>{qaReset();enemyDie();const a=$('enemySpr').getAnimations()[0];a.pause();a.currentTime=1410;});
qaButton('QA 安保兵',()=>qaReset('trooper'));
qaButton('QA 机械犬',()=>qaReset('hound'));
qaButton('QA Boss',()=>qaReset('trooper',1,true));
qaButton('QA 2倍',()=>{S.speed2=true;syncPresentationSpeed();});
qaButton('QA 1倍',()=>{S.speed2=false;syncPresentationSpeed();});
qaButton('QA 入场',()=>{qaReset();const random=Math.random;Math.random=()=>.9;enemyRunIn();Math.random=random;});
qaButton('QA 帧检查',async()=>{
 const results=[];const spec={idle:[260,260,260,260],run:Array(8).fill(110),shoot:[120,160,60,80,100,140],die:[80,90,100,100,120,140,180,600]};
 for(const [action,ds] of Object.entries(spec)){
  qaReset();if(action!=='idle')$('enemySpr').classList.add(action);syncPresentationSpeed();
  const sp=$('enemySpr'),anim=sp.getAnimations()[0];anim.pause();let t=0;
  for(let i=0;i<ds.length;i++){
   anim.currentTime=t+ds[i]/2;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const cs=getComputedStyle(sp),x=parseFloat(cs.backgroundPositionX),src=cs.backgroundImage;
   results.push({action,frame:i,pass:x===-128*i&&src.includes('/riftclaw/'),x,src});t+=ds[i];
  }
  if(action==='die'){anim.currentTime=2000;results.push({action:'death-hold',pass:parseFloat(getComputedStyle(sp).backgroundPositionX)===-896});}
 }
 qaReset();$('enemySpr').classList.add('run');syncPresentationSpeed();const anim=$('enemySpr').getAnimations()[0];anim.pause();anim.currentTime=330;S.speed2=true;syncPresentationSpeed();
 results.push({action:'speed-change-preserves-progress',pass:anim.playbackRate===2&&anim.currentTime===330,rate:anim.playbackRate,time:anim.currentTime});
 const imgs=await Promise.all(['idle','walk','shoot','death'].map(async action=>{const im=new Image();im.src='assets/riftclaw/'+action+'.webp';await im.decode();return {action,w:im.naturalWidth,h:im.naturalHeight};}));
 let out=document.getElementById('qa-results');if(!out){out=document.createElement('pre');out.id='qa-results';out.style='position:relative;z-index:9;white-space:pre-wrap;background:#102030';document.body.append(out);}
 out.textContent=JSON.stringify({results,images:imgs,viewport:[innerWidth,innerHeight],passed:results.filter(x=>x.pass).length,total:results.length});qaReset();
});
