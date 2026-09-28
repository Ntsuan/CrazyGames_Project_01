const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../../game/assets/platform.js'),'utf8');
const slot='neonHunter.progress.v1';
const save=JSON.stringify({floor:44,stage:3,mode:'endless'});
const build=JSON.stringify({floor:8,stage:1,mode:'build'});
function setup({host='www.crazygames.com',local={},cloud=null,disabled=false,failWrite=false}={}){
  const values=new Map(Object.entries(local)),data=new Map(cloud==null?[]:[[slot,cloud]]),events=[];
  const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};
  const sdk={environment:disabled?'disabled':'crazygames',init:async()=>{},
    data:{getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(failWrite)throw Error('SDK write failed');data.set(k,String(v));}},
    game:{gameplayStart:()=>events.push('start'),gameplayStop:()=>events.push('stop')},
    user:{addAuthListener:fn=>{sdk.auth=fn;}}};
  const window={CrazyGames:{SDK:sdk}};
  const ctx={window,location:{hostname:host},localStorage,TextEncoder,console,document:{}};
  vm.runInNewContext(source,ctx);
  return {platform:window.NeonPlatform,sdk,data,values,events};
}
function validate(key,raw){const d=JSON.parse(raw);if(key!=='neonHunterModes'&&(!Number.isInteger(d.floor)||d.floor<1))throw Error('bad save');}
async function run(){
  const game=require('./harness.cjs').make();
  assert.equal(game.json('sdkGameplayRunning()'),true);
  game.run('document.hidden=true');assert.equal(game.json('sdkGameplayRunning()'),true);
  game.run('gameSettingsOpen=true');assert.equal(game.json('sdkGameplayRunning()'),false);
  console.log('PASS gameplay lifecycle ignores focus loss and stops for in-game settings');

  let x=setup({local:{neonHunter:save,'neonHunter.build':build,neonHunterModes:JSON.stringify({schema:1,selected:'build',buildUnlocked:true})}});
  let result=await x.platform.init(validate);assert.equal(result.cloud,true);
  assert.equal(result.storage.getItem('neonHunter'),save);
  assert.equal(result.storage.getItem('neonHunter.build'),build);
  assert.equal(x.values.get('neonHunter'),save); // legacy backup remains untouched
  assert.equal(JSON.parse(x.data.get(slot)).revision,1);
  result.storage.setItem('neonHunter.build',JSON.stringify({floor:9,stage:1,mode:'build'}));
  assert.equal(JSON.parse(JSON.parse(x.data.get(slot)).slots['neonHunter.build']).floor,9);
  assert.equal(JSON.parse(JSON.parse(x.data.get(slot)).slots.neonHunter).floor,44);
  x.platform.syncGameplay(true);x.platform.syncGameplay(true);x.platform.syncGameplay(false);
  assert.deepEqual(x.events,['start','stop']);
  x.sdk.auth({username:'new'});assert.throws(()=>result.storage.setItem('neonHunter',save),/not ready/);
  console.log('PASS legacy migration, independent modes, lifecycle and auth handoff');

  const newer=JSON.stringify({schema:1,revision:7,slots:{neonHunter:JSON.stringify({floor:80,stage:4}),
    'neonHunter.build':null,neonHunterModes:null}});
  x=setup({local:{neonHunter:save},cloud:newer});result=await x.platform.init(validate);
  assert.equal(JSON.parse(result.storage.getItem('neonHunter')).floor,80);
  assert.equal(x.data.get(slot),newer);
  console.log('PASS existing cloud save wins over legacy local save');

  x=setup({local:{neonHunter:'{"floor":0}'}});
  await assert.rejects(x.platform.init(validate),/bad save/);
  assert.equal(x.data.get(slot),undefined);assert.equal(x.values.get('neonHunter'),'{"floor":0}');
  x=setup({cloud:'{"schema":99}'});await assert.rejects(x.platform.init(validate),/Invalid cloud/);
  console.log('PASS malformed local/cloud saves block migration without overwrite');

  x=setup({cloud:newer});result=await x.platform.init(validate);
  x.sdk.data.setItem=(k,v)=>{throw Error('SDK write failed');};
  assert.throws(()=>result.storage.setItem('neonHunter',save),/SDK write failed/);
  assert.equal(result.storage.getItem('neonHunter'),JSON.parse(newer).slots.neonHunter);
  x=setup({cloud:newer});result=await x.platform.init(validate);
  x.data.set(slot,JSON.stringify({...JSON.parse(newer),revision:8}));
  assert.throws(()=>result.storage.setItem('neonHunter',save),/another session/);
  console.log('PASS failed writes and concurrent revision changes preserve prior save');

  x=setup({disabled:true});await assert.rejects(x.platform.init(validate),/Data unavailable/);
  x=setup({host:'example.com',local:{neonHunter:save}});result=await x.platform.init(validate);
  assert.equal(result.cloud,false);assert.equal(result.storage.getItem('neonHunter'),save);
  console.log('PASS platform fails closed; standalone build remains local');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
