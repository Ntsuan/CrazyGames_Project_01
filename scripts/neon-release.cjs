// No third-party dependencies: run with Node 24.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),game=path.join(root,'game');
const settings=JSON.parse(fs.readFileSync(path.join(root,'release/profiles.json')));
const [command='build',arg]=process.argv.slice(2);
let html=fs.readFileSync(path.join(game,'index.html'),'utf8');
const marker=/const BUILD_PROFILE="([^"]+)";/;
const sourceProfile=html.match(marker)?.[1];
if(!sourceProfile)throw Error('Missing explicit build profile');
function validateProfile(profile){const config=settings.profiles[profile];if(!config)throw Error('Unknown profile: '+profile);if(!config.packageEnabled)throw Error('Full release blocked: '+config.blockedReason);return config;}
if(command==='configure'){
 validateProfile(arg);const configured=html.replace(marker,`const BUILD_PROFILE="${arg}";`);fs.writeFileSync(path.join(game,'index.html'),configured);const snapshot=path.join(game,'versions','index_'+html.match(/const VERSION="([^"]+)"/)[1]+'.html');if(fs.existsSync(snapshot))fs.writeFileSync(snapshot,configured);console.log('Source profile: '+arg);
}else if(command==='check'){
 const expected=arg&&settings.branches[arg];validateProfile(sourceProfile);
 if(expected&&expected!==sourceProfile)throw Error(`${arg} must use ${expected}, found ${sourceProfile}`);
 console.log(`PASS branch ${arg||'(local)'} / source ${sourceProfile}`);
}else if(command==='build'){
 const profile=arg||sourceProfile,config=validateProfile(profile);
 html=html.replace(marker,`const BUILD_PROFILE="${profile}";`);
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 const out=path.join(root,'dist/neon',profile);fs.mkdirSync(out,{recursive:true});
 // Recreate this known build-output directory only.
 for(const name of fs.readdirSync(out))fs.rmSync(path.join(out,name),{recursive:true,force:true});
 fs.writeFileSync(path.join(out,'index.html'),html);
 const {make}=require('./neon-tests/harness.cjs'),g=make(29,new Map(),profile);
 const urls=new Set(g.json('[...BOOT_IMAGES,SFX_SRC,...Object.values(UPGRADE_PACKS).flatMap(p=>[p.script,...Object.values(p.desktop),...Object.values(p.mobile)])]'));
 for(const m of html.matchAll(/(?:src|href)="(assets\/[^"$]+)"/g))urls.add(m[1]);
 const files=new Set();
 function add(url,base=''){
  if(/^(data:|https?:|#)/.test(url))return;
  const file=path.posix.normalize(path.posix.join(base,url.split('?')[0]));
  if(!file.startsWith('assets/')||file.includes('..'))throw Error('Invalid asset path: '+file);
  if(files.has(file))return;
  const src=path.join(game,file);if(!fs.existsSync(src))throw Error('Missing runtime asset: '+file);
  if(fs.lstatSync(src).isSymbolicLink())throw Error('Runtime assets must be real files: '+file);
  files.add(file);
  if(file.endsWith('.css'))for(const match of fs.readFileSync(src,'utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g))add(match[1],path.posix.dirname(file));
  const dst=path.join(out,file);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);
 }
 for(const url of urls)add(url);
 const entries=['index.html',...files].sort().map(file=>{const b=fs.readFileSync(path.join(out,file));return {file,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};});
 const report={profile,version:html.match(/const VERSION="([^"]+)"/)[1],...config,totalBytes:entries.reduce((s,x)=>s+x.bytes,0),files:entries};
 fs.writeFileSync(path.join(root,'dist/neon',profile+'-manifest.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`Built ${profile}: ${entries.length} runtime files, ${(report.totalBytes/1048576).toFixed(2)} MiB -> ${path.relative(root,out)}`);
}else throw Error('Use configure PROFILE, check BRANCH or build [PROFILE]');
