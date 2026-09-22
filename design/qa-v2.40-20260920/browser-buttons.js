(async()=>{
 const out=[],ev=n=>curSession.events.filter(x=>x.type===n).length;
 const cases=[['攻击标题','#btnAtk .nh-button__title','upgrade'],['生命图标','#btnHp .nh-button__icon','upgrade'],['合成输入','#gs-fuset-weapon span','fuse'],['合成输出','#gs-fuset-weapon span:last-child','fuse'],['合成图标','#gs-fuse-weapon img','fuse'],['拆解','#gs-salvt-weapon','salvage'],['成长树','#treeBox button .nh-button__title','tree'],['技能说明','#modalBox button .nh-button__detail','skill'],['补给图标','#btnCrate img','crate'],['倍速空白','#btnSpeed','speed'],['倍速图标','#btnSpeed img','speed'],['倍速文字','#btnSpeed .spd-t','speed']];
 for(const [name,sel,type] of cases){
  qaReset();adLock=false;
  if(type==='fuse'){S.equip.weapon={slot:'weapon',q:0};S.inv=[{slot:'weapon',q:0},{slot:'weapon',q:0}];}
  if(type==='salvage'){S.floor=30;S.inv=[{slot:'weapon',q:0}];}
  renderPanels();if(type==='skill')offerSkills('p10',['overclock','fatal','neuro'],10);
  const target=document.querySelector(sel);if(!target){out.push({name,pass:false,error:'missing '+sel});continue;}
  const before=ev(type),speed=S.speed2;qaTouch(target,'touchstart');
  if(type==='fuse')dropRoll(true); await qaSleep(650);const connected=target.isConnected;qaTouch(target,'touchend',109);
  const count=type==='speed'?Number(S.speed2!==speed):ev(type)-before;
  out.push({name,connectedBeforeRelease:connected,connectedAfterAction:target.isConnected,count,staleTouch:!!tapBtn,pass:connected&&count===1&&!tapBtn});
 }
 for(const [name,x,y,type,want] of [['9px',109,100,'touchend',1],['10px',110,100,'touchend',1],['11px末点',111,100,'touchend',0],['斜向9px',109,109,'touchend',0],['取消',100,100,'touchcancel',0]]){
  qaReset();const t=document.querySelector('#btnAtk .nh-button__title');qaTouch(t,'touchstart');qaTouch(t,type,x,y);out.push({name,pass:S.atkLv===want&&!tapBtn});
 }
 qaReset();let t=document.querySelector('#btnAtk .nh-button__title');qaTouch(t,'touchstart');qaTouch(t,'touchmove',120);qaTouch(t,'touchend',120);t.click();await qaSleep(100);qaTouch(t,'touchstart');qaTouch(t,'touchend');out.push({name:'取消后100ms再点击只升1级',pass:S.atkLv===1&&!tapBtn});
 qaReset();t=document.querySelector('#btnAtk .nh-button__title');qaTouch(t,'touchstart',100,100,901);qaTouch(t,'touchend',100,100,902);const held=!!tapBtn&&S.atkLv===0;qaTouch(t,'touchend',100,100,901);out.push({name:'多指归属',pass:held&&S.atkLv===1&&!tapBtn});
 for(const sel of ['#btnSpeed','#btnSpeed img','#btnSpeed .spd-t'])for(const speed of [false,true]){
  qaReset(speed);t=document.querySelector(sel);qaTouch(t,'touchstart');renderPanels();await qaSleep(100);qaTouch(t,'touchend',109);out.push({name:sel+'短点 '+(speed?'2→1':'1→2'),pass:t.isConnected&&S.speed2!==speed&&!tapBtn});
 }
 return out;
})()
