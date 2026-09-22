// Original procedural movement SFX. No recorded samples or external audio.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Sound, Synth, Clip} from '/Users/zmy/.codex/skills/jfxr-audio/node_modules/jfxr/index.js';

const RATE=44100;
const outDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files=['footstep-metal-01','footstep-metal-02','footstep-metal-03','floor-transition-01','preview-footsteps'];
for (const name of files) {
  for (const suffix of ['.wav','.source.json']) {
    if(fs.existsSync(path.join(outDir,name+suffix))) throw Error('Refusing to overwrite '+name+suffix);
  }
}

async function synth(parameters) {
  const sound=new Sound();
  for(const [key,value] of Object.entries(parameters)) sound[key].value=value;
  const clip=await new Promise(resolve=>new Synth(sound.serialize()).run(resolve));
  return {samples:clip.toFloat32Array(),parameters:JSON.parse(sound.serialize())};
}
function add(target,source,offset,gain,decay=0) {
  const start=Math.round(offset*RATE);
  for(let i=0;i<source.length && start+i<target.length;i++) {
    target[start+i]+=source[i]*gain*Math.exp(-decay*i/RATE);
  }
}
function ring(target,frequency,offset,gain,decay) {
  const start=Math.round(offset*RATE);
  for(let i=0;start+i<target.length;i++) {
    const t=i/RATE;
    target[start+i]+=gain*Math.sin(2*Math.PI*frequency*t)*Math.exp(-decay*t)*(1-Math.exp(-1800*t));
  }
}
function finish(samples,dbfs) {
  // Remove subsonic DC, smooth boundaries, retain transient headroom.
  let priorIn=0,priorOut=0,peak=0;
  for(let i=0;i<samples.length;i++) {
    const x=samples[i],y=x-priorIn+.996*priorOut;
    priorIn=x;priorOut=y;
    const envelope=Math.min(1,i/(RATE*.0006),(samples.length-1-i)/(RATE*.012));
    samples[i]=y*Math.max(0,envelope);
    peak=Math.max(peak,Math.abs(samples[i]));
  }
  if(peak<=0) throw Error('Silent synthesis');
  const scale=10**(dbfs/20)/peak;
  for(let i=0;i<samples.length;i++) samples[i]*=scale;
  return samples;
}
function write(name,samples,details) {
  let peak=0,energy=0;
  for(const value of samples) {
    if(!Number.isFinite(value)||Math.abs(value)>=1)throw Error('Invalid or clipping output: '+name);
    peak=Math.max(peak,Math.abs(value));energy+=value*value;
  }
  const wav=Buffer.from(new Clip(samples,RATE).toWavBytes());
  const meta={name,created_at:new Date().toISOString(),status:'candidate-awaiting-listening-approval',
    source:'Original procedural synthesis; no external audio samples',tool:'Jfxr 0.13.0 + local deterministic mixing',
    tool_source:'https://github.com/ttencate/jfxr',render_script:'source/render.mjs',
    sample_rate:RATE,channels:1,format:'PCM16 WAV',duration_seconds:samples.length/RATE,
    peak_dbfs:20*Math.log10(peak),rms_dbfs:20*Math.log10(Math.sqrt(energy/samples.length)),
    sha256:crypto.createHash('sha256').update(wav).digest('hex'),...details};
  const output=path.join(outDir,name+'.wav');
  fs.writeFileSync(output,wav,{flag:'wx'});
  fs.writeFileSync(path.join(outDir,name+'.source.json'),JSON.stringify(meta,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,duration:meta.duration_seconds,peak_dbfs:meta.peak_dbfs}));
}

const configs=[
  {duration:.16,pitch:1,soleCutoff:620,rattleDelay:.021,dbfs:-9},
  {duration:.17,pitch:.93,soleCutoff:570,rattleDelay:.024,dbfs:-9.6},
  {duration:.155,pitch:1.07,soleCutoff:690,rattleDelay:.019,dbfs:-8.7},
];
const steps=[];
for(let variant=0;variant<configs.length;variant++) {
  const c=configs[variant],mix=new Float32Array(Math.round(c.duration*RATE));
  const sole=await synth({waveform:'whitenoise',frequency:10000,interpolateNoise:false,
    attack:.0008,sustain:.002,decay:.09,lowPassCutoff:c.soleCutoff,highPassCutoff:55});
  const contact=await synth({waveform:'whitenoise',frequency:8500*c.pitch,interpolateNoise:false,
    attack:.0003,sustain:.001,decay:.036,highPassCutoff:800,lowPassCutoff:4200});
  const scuff=await synth({waveform:'pinknoise',frequency:9600,attack:.004,sustain:.002,decay:.075,
    highPassCutoff:650,lowPassCutoff:2400});
  add(mix,sole.samples,0,.86,30);
  add(mix,contact.samples,.0015,.27,65);
  add(mix,scuff.samples,c.rattleDelay,.085,30);
  // Inharmonic short plate resonances: restrained metal, not a pitched UI chime.
  ring(mix,155*c.pitch,.001,.34,55);
  ring(mix,485*c.pitch,.002,.12,65);
  ring(mix,1173*c.pitch,.003,.075,75);
  ring(mix,2631*c.pitch,.002,.035,110);
  finish(mix,c.dbfs);steps.push(mix);
  write(files[variant],mix,{requirement:'X01',design:'Short boot-on-metal step: cushioned heel, hard contact and restrained plate resonance',
    configuration:c,jfxr_layers:{sole:sole.parameters,contact:contact.parameters,scuff:scuff.parameters}});
}

const transition=new Float32Array(Math.round(.36*RATE));
const air=await synth({waveform:'whitenoise',frequency:10000,interpolateNoise:false,
  attack:0,sustain:.36,decay:0,normalization:true,lowPassCutoff:1800});
const low=await synth({waveform:'brownnoise',frequency:9000,attack:0,sustain:.36,decay:0,normalization:true});
let filtered=0;
for(let i=0;i<transition.length;i++) {
  const t=i/RATE,u=t/.36,apex=.36;
  const envelope=u<apex ? Math.sin(Math.PI*.5*u/apex)**1.6 : Math.cos(Math.PI*.5*(u-apex)/(1-apex))**2.4;
  const cutoff=450+2800*Math.sin(Math.PI*u)**2;
  const alpha=1-Math.exp(-2*Math.PI*cutoff/RATE);
  filtered+=alpha*(air.samples[i]-filtered);
  transition[i]=(filtered*.85+low.samples[i]*.12)*envelope;
}
finish(transition,-12);
write('floor-transition-01',transition,{requirement:'X02',design:'Soft unpitched air sweep for a horizontal background transition; no door, lift or weapon cue',
  duration:.36,envelope_apex_fraction:.36,filter_cutoff_hz:[450,3250],jfxr_layers:{air:air.parameters,low:low.parameters}});

// Audition helper only: 10 alternating steps at 0.27s spacing, then the floor sweep.
const preview=new Float32Array(RATE*4);
const sequence=[0,1,2,0,2,1,0,1,2,1];
for(let i=0;i<sequence.length;i++)add(preview,steps[sequence[i]],.15+i*.27,1);
add(preview,transition,3.3,1);
write('preview-footsteps',preview,{purpose:'Audition only; do not loop or import as an individual footstep',sequence:sequence.map(i=>files[i]),
  step_interval_seconds:.27,first_step_seconds:.15,transition_seconds:3.3});
