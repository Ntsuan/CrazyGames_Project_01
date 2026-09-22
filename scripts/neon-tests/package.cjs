const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..');const source=fs.readFileSync(path.join(root,'game/index.html'),'utf8');const profile=source.match(/const BUILD_PROFILE="([^"]+)"/)[1];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/neon',profile+'-manifest.json')));
assert.equal(manifest.profile,profile);
assert(manifest.files.length>100);
for(const {file,bytes,sha256} of manifest.files){const content=fs.readFileSync(path.join(root,'dist/neon',profile,file));assert.equal(content.length,bytes);assert.equal(crypto.createHash('sha256').update(content).digest('hex'),sha256);assert(file==='index.html'||file.startsWith('assets/'));assert(!/versions\/|logs\/|design\/|README|\.md$|\.cjs$|en\.json$/.test(file));}
const built=fs.readFileSync(path.join(root,'dist/neon',profile,'index.html'),'utf8');assert(built.includes(`const BUILD_PROFILE="${profile}";`));
const full=spawnSync(process.execPath,['scripts/neon-release.cjs','build','full'],{cwd:root,encoding:'utf8'});assert.notEqual(full.status,0);assert(full.stderr.includes('Full release blocked'));
const wrong=spawnSync(process.execPath,['scripts/neon-release.cjs','check',profile==='basic'?'codex/develop':'main'],{cwd:root,encoding:'utf8'});assert.notEqual(wrong.status,0);assert(wrong.stderr.includes('must use'));
console.log('PASS runtime-only package, channel marker, Full release gate, branch mismatch gate');
