(()=>{
qaReset(); const out=[];
const actors=[['player','',['','atk','run','death']],['security','',['','shoot','hurt','run','die']],['warden','boss',['','shoot','hurt','run','die']],['prism','boss prism',['','shoot','slash','hurt','run','die']],['hound','hound',['','shoot','bite','hurt','run','die']],['tianshu','boss tianshu',['','shoot','charge','cannon','hurt','run','die']]];
for(const speed of [false,true])for(const [actor,parent,states] of actors)for(const state of states){
 const el=$(actor==='player'?'playerSpr':'enemySpr'); el.parentElement.className='fighter '+parent; el.className=(actor==='player'?'psprite':'esprite')+' '+state;
 S.speed2=speed;syncPresentationSpeed(); const anim=el.getAnimations()[0];if(!anim){out.push({actor,state,pass:false,error:'no animation'});continue;}anim.pause();
 const timing=anim.effect.getTiming(),style=getComputedStyle(el),width=parseFloat(style.width),size=style.backgroundSize.split(' ')[0],sheet=size.endsWith('%')?parseFloat(size)*width/100:parseFloat(size),duration=timing.duration,positions=[];
 for(const t of [0,duration*.25,duration*.5,duration*.75,duration-.1,duration]){anim.currentTime=t;positions.push({t,x:parseFloat(getComputedStyle(el).backgroundPositionX)});}
 const aligned=positions.every(p=>Math.abs(p.x/width-Math.round(p.x/width))<.005),inside=timing.fill!=='forwards'||Math.abs(positions.at(-1).x)<sheet;
 out.push({actor,state:state||'idle',rate:anim.playbackRate,animation:anim.animationName,duration,width,sheet,positions,fill:timing.fill,pass:aligned&&inside&&anim.playbackRate===(speed?2:1)});
}
qaReset();$('player').className='fighter';$('playerSpr').className='psprite';$('enemySpr').className='esprite';syncPresentationSpeed();return out;
})()
