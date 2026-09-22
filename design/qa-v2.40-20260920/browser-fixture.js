(()=>{
window.qaSleep=ms=>new Promise(r=>setTimeout(r,ms));
window.qaReset=(speed=false)=>{beginPresentationRun();tapReset();suppressClickFor=null;confirmOpen=false;pendingSkillOffer=null;pendingTransit=false;skillOfferOpen=false;curOffer=[];S=freshState();S.gold=10000;S.souls=100;S.prestiges=1;S.bestEver=200;S.speed2=speed;S.sfxOn=false;player={hp:100,shield:0};buff={adrenaline:0,killcycle:0,critsurge:0,soulrush:0};wall=false;paused=true;transit=false;barsHidden=false;closeModal();spawnMob();atkTimer=0;renderPanels();syncPresentationSpeed();$('player').style.left=fightPos();$('player').style.opacity='1';};
window.qaTouch=(target,type,x=100,y=100,id=901)=>{const t=new Touch({identifier:id,target,clientX:x,clientY:y});const end=type==='touchend'||type==='touchcancel';const e=new TouchEvent(type,{bubbles:true,cancelable:true,changedTouches:[t],touches:end?[]:[t],targetTouches:end?[]:[t]});target.dispatchEvent(e);return e.defaultPrevented;};
window.qaErrors=[];window.addEventListener('error',e=>qaErrors.push(e.message));return VERSION;
})()
