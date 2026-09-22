// Reproducible layered firearm-style SFX; no recorded or external samples.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Sound, Synth, Clip} from '/Users/zmy/.codex/skills/jfxr-audio/node_modules/jfxr/index.js';

const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'ballistic-shot-01.wav');
const sourcePath = output.replace(/\.wav$/, '.source.json');
if (fs.existsSync(output) || fs.existsSync(sourcePath)) throw Error('Output already exists; use a new version name.');
const rate = 44100;
const duration = .22;
const layers = [
  {name:'muzzle-crack', gain:1.15, delay:0, falloff:90, parameters:{waveform:'whitenoise', frequency:10000, interpolateNoise:false, attack:.00025, sustain:.0015, decay:.029, highPassCutoff:1200, lowPassCutoff:15000, compression:1.3}},
  {name:'powder-body', gain:1.45, delay:.0005, falloff:32, parameters:{waveform:'whitenoise', frequency:10000, interpolateNoise:false, attack:.0006, sustain:.003, decay:.12, lowPassCutoff:2800, highPassCutoff:85, compression:1.1}},
  {name:'pressure-thump', gain:.45, delay:.001, falloff:45, parameters:{waveform:'sine', frequency:145, frequencySweep:-45, attack:.001, sustain:.001, decay:.065}},
  {name:'short-air-tail', gain:.17, delay:.013, falloff:24, parameters:{waveform:'pinknoise', frequency:10000, attack:.002, sustain:.001, decay:.16, lowPassCutoff:4200, highPassCutoff:350}},
  {name:'action-clack', gain:.12, delay:.052, falloff:110, parameters:{waveform:'whitenoise', frequency:10000, interpolateNoise:false, attack:.00025, sustain:.0005, decay:.018, highPassCutoff:1900, lowPassCutoff:8500}},
];
const mix = new Float32Array(Math.round(rate*duration));
for (const layer of layers) {
  const sound = new Sound();
  sound.name = layer.name;
  for (const [key,value] of Object.entries(layer.parameters)) sound[key].value=value;
  const clip = await new Promise(resolve => new Synth(sound.serialize()).run(resolve));
  const samples = clip.toFloat32Array();
  layer.jfxr = JSON.parse(sound.serialize());
  const offset = Math.round(layer.delay*rate);
  for (let i=0;i<samples.length && i+offset<mix.length;i++) {
    mix[i+offset] += samples[i]*layer.gain*Math.exp(-layer.falloff*i/rate);
  }
}
// DC blocker; soften the last 8ms to zero, then leave fixed mix headroom.
let previousInput=0, previousOutput=0, peak=0;
for (let i=0;i<mix.length;i++) {
  const input=mix[i];
  const filtered=input-previousInput+.995*previousOutput;
  previousInput=input; previousOutput=filtered;
  mix[i]=filtered*Math.min(1,(mix.length-1-i)/(rate*.008));
  peak=Math.max(peak,Math.abs(mix[i]));
}
if (!(peak>0)) throw Error('Silent synthesis');
const targetPeak=10**(-5/20);
for (let i=0;i<mix.length;i++) mix[i]*=targetPeak/peak;
if (mix.some(v=>!Number.isFinite(v)||Math.abs(v)>=1)) throw Error('Invalid output');
const wav=Buffer.from(new Clip(mix,rate).toWavBytes());
const metadata={
  name:'ballistic-shot-01', status:'candidate', replaces:'laser-shot-01 (deprecated)',
  design:'Single dry firearm-style shot: broadband muzzle crack, low pressure body, short air tail and subtle action clack. Procedural approximation, not a real firearm recording.',
  origin:'Locally authored synthesis and mixing; no external samples',
  tool:'Jfxr 0.13.0 + local deterministic layer mixer',
  tool_source:'https://github.com/ttencate/jfxr',
  generated_at:new Date().toISOString(), sample_rate:rate, channels:1, duration_seconds:duration,
  peak_dbfs:-5, sha256:crypto.createHash('sha256').update(wav).digest('hex'),
  render_script:'source/render-ballistic-shot-01.mjs', layers,
};
fs.writeFileSync(output,wav,{flag:'wx'});
fs.writeFileSync(sourcePath,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sourcePath,duration,bytes:wav.length,peak_dbfs:-5},null,2));
