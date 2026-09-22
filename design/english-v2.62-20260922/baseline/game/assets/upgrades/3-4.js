/* Standalone delivery renderer. No game state, storage, network or framework dependency. */
(function(root){
  'use strict';
  const WIDTH=960, HEIGHT=720, DURATION=8.0, UPGRADE_TIME=4.05;
  const NAMES=['capsule','stage03-handoff','stage04-handoff','stage03-walk','stage04-walk','weapon03','weapon04','tool-arm','repair-room'];
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
  const mix=(a,b,p)=>a+(b-a)*p;
  const POD={x:240,y:40,w:472,h:629.333};
  const BAY={x:356,y:118,w:222,h:494};
  const FOOT=610, INSIDE=466;
  // Only the entrance/exit are lengthened; treatment and handoff keep the approved timing.
  function sceneTime(time){
    if(time<1.8)return time/1.8;
    if(time<5.5)return time-.8;
    if(time<7.3)return 4.7+(time-5.5)/1.8;
    return time-1.6;
  }
  function phaseAt(time){
    const t=sceneTime(time);
    if(t<1)return '进入修复舱';
    if(t<1.7)return '武器交接';
    if(t<2)return '舱门闭合';
    if(t<3.65)return '义体与武器升级';
    if(t<4)return '改造完成 · 开舱';
    if(t<4.7)return '接回脉冲枪';
    if(t<5.7)return '新阶段出舱';
    return '04 阶段 · 神经融合';
  }
  function sprite(ctx,img,cols,index,x,foot,size=480){
    const cell=img.width/cols;
    ctx.drawImage(img,(index%cols)*cell,Math.floor(index/cols)*cell,cell,cell,x-240/512*size,foot-464/512*size,size,size);
  }
  function weapon(ctx,img,x,y,h,alpha=1){
    ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,x-img.width/img.height*h/2,y,img.width/img.height*h,h);ctx.restore();
  }
  function round(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
  function bayClip(ctx){round(ctx,BAY.x,BAY.y,BAY.w,BAY.h,17);ctx.clip()}
  function tool(ctx,img,x,y,size,angle,flip=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(flip,1);
    const h=size,w=h*img.width/img.height;
    ctx.drawImage(img,-w*.32,-h*.14,w,h);ctx.restore();
  }
  function backdrop(ctx,assets){
    ctx.drawImage(assets['repair-room'],0,0,WIDTH,HEIGHT);
  }
  function render(ctx,assets,time,options={}){
    const realTime=clamp(time,0,DURATION),t=sceneTime(realTime),bg=options.background!==false;
    ctx.save();ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(bg)backdrop(ctx,assets);
    ctx.drawImage(assets.capsule,POD.x,POD.y,POD.w,POD.h);
    const closed=t<1.7?0:t<2?ease((t-1.7)/.3):t<3.65?1:t<4?1-ease((t-3.65)/.35):0;
    const upgraded=t>=3.25;
    // New upright walk poses. Travel is linear while feet step, avoiding ease-induced skating.
    let x=INSIDE, sheet=assets['stage03-handoff'],cols=2,index=3;
    if(t<1){x=mix(200,INSIDE,t);sheet=assets['stage03-walk'];cols=2;index=Math.floor(realTime/.225)%4}
    else if(t<1.45){index=Math.min(3,Math.floor((t-1)/.1125))}
    else if(t<4.25){sheet=assets[upgraded?'stage04-handoff':'stage03-handoff'];index=upgraded?0:3}
    else if(t<4.7){sheet=assets['stage04-handoff'];index=Math.min(3,Math.floor((t-4.25)/.1125))}
    else if(t<5.7){x=mix(INSIDE,740,t-4.7);sheet=assets['stage04-walk'];cols=2;index=Math.floor((realTime-5.5)/.225)%4}
    else {x=740;sheet=assets['stage04-handoff'];index=3}
    sprite(ctx,sheet,cols,index,x,FOOT);

    // Service clamp carries the released rifle to/from the external rack.
    if(t>=1.3375 && t<4.3625){
      let wx=654,wy=318,wh=198;
      if(t<1.7){const p=ease((t-1.3375)/.3625);wx=mix(542,654,p);wy=mix(186,318,p);wh=mix(202,198,p)}
      if(t>=4){const p=ease((t-4)/.3625);wx=mix(654,576,p);wy=mix(318,216,p);wh=mix(198,212,p)}
      weapon(ctx,assets[upgraded?'weapon04':'weapon03'],wx,wy,wh);
      if(t<1.7 || t>=4){
        ctx.save();ctx.strokeStyle='#69ecf1';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(642,446);ctx.lineTo(wx+5,wy+wh*.65);ctx.stroke();ctx.restore();
      }
    }
    // A rigged native-art arm works inside the pod, behind the door glass.
    if(t>=1.7 && t<4){
      const amount=Math.min(ease((t-1.7)/.3),1-ease((t-3.65)/.35));
      ctx.save();bayClip(ctx);ctx.globalAlpha=amount;
      const a=-.38+Math.sin(t*5)*.12;
      tool(ctx,assets['tool-arm'],392,186,191,a,1);
      tool(ctx,assets['tool-arm'],550,211,176,-a,-1);
      ctx.restore();
    }
    if(closed>0){
      ctx.save();bayClip(ctx);
      const h=BAY.h*closed;
      // Cyan glass descends; a dark shutter track makes the motion readable at mobile scale.
      ctx.fillStyle='rgba(2,46,62,.6)';ctx.fillRect(BAY.x,BAY.y,BAY.w,h);
      const glass=ctx.createLinearGradient(BAY.x,0,BAY.x+BAY.w,0);glass.addColorStop(0,'rgba(40,237,255,.18)');glass.addColorStop(.45,'rgba(56,215,237,.04)');glass.addColorStop(1,'rgba(36,214,244,.25)');ctx.fillStyle=glass;ctx.fillRect(BAY.x,BAY.y,BAY.w,h);
      ctx.strokeStyle='rgba(107,251,255,.6)';ctx.lineWidth=2;ctx.strokeRect(BAY.x+3,BAY.y+3,BAY.w-6,h-4);
      ctx.fillStyle='#203846';ctx.fillRect(BAY.x,BAY.y+h-12,BAY.w,12);
      ctx.fillStyle='#61edee';ctx.fillRect(BAY.x+7,BAY.y+h-10,BAY.w-14,3);
      ctx.fillStyle='rgba(126,234,246,.12)';ctx.beginPath();ctx.moveTo(BAY.x+22,BAY.y);ctx.lineTo(BAY.x+52,BAY.y);ctx.lineTo(BAY.x+115,BAY.y+h);ctx.lineTo(BAY.x+94,BAY.y+h);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    if(t>=2 && t<3.65){
      const p=(t-2)/1.65,scanY=mix(235,570,(p*1.7)%1);
      ctx.save();bayClip(ctx);
      const band=ctx.createLinearGradient(0,scanY-28,0,scanY+28);band.addColorStop(0,'rgba(30,230,246,0)');band.addColorStop(.5,'rgba(53,245,255,.65)');band.addColorStop(1,'rgba(30,230,246,0)');ctx.fillStyle=band;ctx.fillRect(BAY.x,scanY-28,BAY.w,56);
      ctx.strokeStyle='#a3fcff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(467,scanY,110,12,0,0,Math.PI*2);ctx.stroke();
      // Deterministic small sparks, never rapid full-screen flashes.
      for(let i=0;i<7;i++){
        const q=(t*1.8+i*.17)%1, sx=420+Math.sin(i*3.1+t)*55,sy=350+Math.cos(i*4.2)*65;
        ctx.globalAlpha=(1-q)*.8;ctx.strokeStyle='#ffd987';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(i)*14*q,sy+q*18);ctx.stroke();
      }
      ctx.globalAlpha=1;
      ctx.restore();
      // Weapon rack has its own scan, synchronized with the body change.
      ctx.save();ctx.strokeStyle='#73f8fa';ctx.lineWidth=3;ctx.shadowColor='#00dce8';ctx.shadowBlur=14;ctx.beginPath();ctx.ellipse(654,330+((p*1.7)%1)*172,42,9,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    // A single opaque cyan bloom hides the exact stage/weapon replacement.
    const flash=t<3.1?0:t<3.23?ease((t-3.1)/.13):t<3.31?1:t<3.58?1-ease((t-3.31)/.27):0;
    if(flash>0){
      ctx.save();bayClip(ctx);ctx.globalAlpha=flash*(options.reducedMotion?.22:1);
      const bloom=ctx.createLinearGradient(BAY.x,0,BAY.x+BAY.w,0);bloom.addColorStop(0,'#269fb6');bloom.addColorStop(.18,'#77e8f4');bloom.addColorStop(.5,'#ddffff');bloom.addColorStop(.82,'#77e8f4');bloom.addColorStop(1,'#269fb6');ctx.fillStyle=bloom;ctx.fillRect(BAY.x,BAY.y,BAY.w,BAY.h);
      ctx.fillStyle='rgba(235,255,255,.32)';for(let i=0;i<5;i++)ctx.fillRect(BAY.x+25+i*42,BAY.y,2,BAY.h);
      ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(467,385,109,15,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      ctx.save();ctx.globalAlpha=flash*(options.reducedMotion?.22:1);ctx.translate(654,417);ctx.scale(.5,1);const wg=ctx.createRadialGradient(0,0,5,0,0,125);wg.addColorStop(0,'#c7fdff');wg.addColorStop(.65,'rgba(129,249,255,.96)');wg.addColorStop(1,'rgba(50,220,240,0)');ctx.fillStyle=wg;ctx.fillRect(-125,-125,250,250);ctx.restore();
    }
    // Opening releases a brief low steam plume. All effects stay inside the safe canvas.
    if(t>=3.65 && t<4.6){
      const p=(t-3.65)/.95;
      for(let i=0;i<8;i++){
        const xx=410+i*15+(i-3.5)*p*12,yy=591-p*65-(i%3)*7,r=17+p*20;
        const g=ctx.createRadialGradient(xx,yy,1,xx,yy,r);g.addColorStop(0,`rgba(151,237,244,${.16*(1-p)})`);g.addColorStop(1,'rgba(151,237,244,0)');ctx.fillStyle=g;ctx.fillRect(xx-r,yy-r,r*2,r*2);
      }
    }
    ctx.restore();
    return {time:realTime,phase:phaseAt(realTime),upgraded,complete:realTime>=DURATION,characterX:x};
  }
  async function loadAssets(base='.',tier='desktop',loader){
    const load=loader || (src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载素材：'+src));im.src=src}));
    const entries=await Promise.all(NAMES.map(async name=>[name,await load(base.replace(/\/$/,'')+'/assets/'+tier+'/'+name+'.png')]));
    return Object.fromEntries(entries);
  }
  class Player{
    constructor(canvas,assets,{background=true,onUpgrade=()=>{},onComplete=()=>{},onFrame=()=>{}}={}){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.assets=assets;this.background=background;this.onUpgrade=onUpgrade;this.onComplete=onComplete;this.onFrame=onFrame;this.time=0;this.playing=false;this.upgradeSent=false;this.completeSent=false;this.raf=0;this.last=0;
      this.tick=stamp=>{if(!this.playing)return;const dt=this.last?(stamp-this.last)/1000:0;this.last=stamp;this.time=Math.min(DURATION,this.time+dt);this.draw();this.events();if(this.time<DURATION)this.raf=requestAnimationFrame(this.tick);else this.pause()};
      this.visibility=()=>{this.last=0};document.addEventListener('visibilitychange',this.visibility);
      this.draw();
    }
    draw(){const c=this.ctx;c.setTransform(this.canvas.width/WIDTH,0,0,this.canvas.height/HEIGHT,0,0);const state=render(c,this.assets,this.time,{background:this.background});this.onFrame(state);return state}
    events(){if(this.time>=UPGRADE_TIME&&!this.upgradeSent){this.upgradeSent=true;this.onUpgrade()};if(this.time>=DURATION&&!this.completeSent){this.completeSent=true;this.onComplete()}}
    play(){if(this.playing||this.time>=DURATION)return;this.playing=true;this.last=0;this.raf=requestAnimationFrame(this.tick)}
    pause(){this.playing=false;cancelAnimationFrame(this.raf);this.last=0}
    restart(){this.pause();this.time=0;this.upgradeSent=false;this.completeSent=false;this.draw();this.play()}
    seek(seconds){this.pause();this.time=clamp(seconds,0,DURATION);this.draw() /* Preview-only scrub: no progression events. */}
    finish(){this.pause();this.time=DURATION;this.draw();this.events()}
    destroy(){this.pause();document.removeEventListener('visibilitychange',this.visibility)}
  }
  const api={SOURCE_STAGE:3,TARGET_STAGE:4,WIDTH,HEIGHT,DURATION,UPGRADE_TIME,NAMES,render,loadAssets,phaseAt,Player};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.NeonUpgrade0304=api;
})(typeof window!=='undefined'?window:this);
