const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..');const source=fs.readFileSync(path.join(root,'game/index.html'),'utf8');const sourceProfile=source.match(/const BUILD_PROFILE="([^"]+)"/)[1];const profile=process.argv[2]||sourceProfile;assert(['basic','development'].includes(profile));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/neon',profile+'-manifest.json')));
assert.equal(manifest.profile,profile);assert.equal(manifest.version,source.match(/const VERSION="([^"]+)"/)[1]);
assert(manifest.files.length>100);
for(const {file,bytes,sha256} of manifest.files){const content=fs.readFileSync(path.join(root,'dist/neon',profile,file));assert.equal(content.length,bytes);assert.equal(crypto.createHash('sha256').update(content).digest('hex'),sha256);assert(file==='index.html'||file.startsWith('assets/'));assert(!/versions\/|logs\/|design\/|README|\.md$|\.cjs$|en\.json$/.test(file));}
const built=fs.readFileSync(path.join(root,'dist/neon',profile,'index.html'),'utf8');assert(built.includes(`const BUILD_PROFILE="${profile}";`));
if(source.includes('const MOVEMENT_SFX=')){
 const audio=manifest.files.filter(x=>x.file.startsWith('assets/sfx/')).map(x=>x.file).sort();
 const {make}=require('./harness.cjs');const g=make();
 assert.deepStrictEqual(audio,g.json('[...Object.values(MOVEMENT_SFX),...(typeof COMBAT_SFX!=="undefined"?Object.values(COMBAT_SFX):[]),...(typeof UI_SFX!=="undefined"?Object.values(UI_SFX):[])]').sort());
 for(const file of audio)assert(fs.readFileSync(path.join(root,'game',file)).equals(fs.readFileSync(path.join(root,'dist/neon',profile,file))));
}
const full=spawnSync(process.execPath,['scripts/neon-release.cjs','build','full'],{cwd:root,encoding:'utf8'});assert.notEqual(full.status,0);assert(full.stderr.includes('Full release blocked'));
const wrong=spawnSync(process.execPath,['scripts/neon-release.cjs','check',sourceProfile==='basic'?'codex/develop':'main'],{cwd:root,encoding:'utf8'});assert.notEqual(wrong.status,0);assert(wrong.stderr.includes('must use'));
console.log('PASS runtime-only package, channel marker, Full release gate, branch mismatch gate');

if(source.includes('const MUSIC_SFX=')){
 const {make}=require('./harness.cjs'),g=make();
 const music=manifest.files.filter(x=>x.file.startsWith('assets/music/')).map(x=>x.file).sort();
 assert.deepStrictEqual(music,g.json('Object.values(MUSIC_SFX)').sort());assert.equal(music.length,4);
 for(const file of music)assert(fs.readFileSync(path.join(root,'game',file)).equals(fs.readFileSync(path.join(root,'dist/neon',profile,file))));
 console.log('PASS all four music files present and byte-identical');
}
