const fs=require('fs'),vm=require('vm'),path=require('path');
const m={exports:{}}; vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{exports:m.exports,module:m});
const acorn=m.exports;
const han=/[\u3400-\u9fff]/;
function walk(n,fn){if(!n||typeof n!=='object')return;if(n.type)fn(n);for(const [k,v] of Object.entries(n)){if(k==='loc')continue;if(Array.isArray(v))v.forEach(x=>walk(x,fn));else if(v&&typeof v==='object')walk(v,fn);}}
function parts(s){return s.split(/(<[^>]*>)/g).flatMap(p=>p.startsWith('<')?[...p.matchAll(/(?:title|aria-label|alt)=["']([^"']*)["']/g)].map(x=>x[1]):[p]);}
function canonical(s){const ids=[];return s.trim().replace(/\{(\d+)\}/g,(_,id)=>{if(!ids.includes(id))ids.push(id);return '{'+ids.indexOf(id)+'}';});}
const root=path.resolve(__dirname,'../..');const files=['game/index.html',...[1,2,3,4].map(n=>`game/assets/upgrades/${n}-${n+1}.js`)];
const keys=new Set();
for(const file of files){
 const original=fs.readFileSync(path.join(root,file),'utf8');let src=original;
 if(file.endsWith('html')){
   src=original.match(/<script>([\s\S]*?)<\/script>/)[1];
   const staticHtml=original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');
   parts(staticHtml).filter(s=>han.test(s)).forEach(s=>keys.add(canonical(s)));
 }
 walk(acorn.parse(src,{ecmaVersion:'latest'}),n=>{
   let s;
   if(n.type==='Literal'&&typeof n.value==='string')s=n.value;
   if(n.type==='TemplateLiteral')s=n.quasis.map((q,i)=>q.value.cooked+(i<n.expressions.length?'{'+i+'}':'')).join('');
   if(s)parts(s).filter(s=>han.test(s)).forEach(s=>keys.add(canonical(s)));
 });
}
fs.writeFileSync(path.join(__dirname,'source-strings.json'),JSON.stringify([...keys],null,2)+'\n');
console.log([...keys].map((k,i)=>i+' '+JSON.stringify(k)).join('\n'));
module.exports={acorn,walk,parts,canonical,files,root};
