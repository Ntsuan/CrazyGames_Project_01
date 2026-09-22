const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const mod={exports:{}};vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{exports:mod.exports,module:mod});const acorn=mod.exports;
const root=path.resolve(__dirname,'../..');
function normalized(n){if(Array.isArray(n))return n.map(normalized).filter(x=>x!==null);if(!n||typeof n!=='object')return n;
 if(n.type==='VariableDeclaration'&&n.declarations.length===1&&n.declarations[0].id.name==='L')return null;
 if(n.type==='FunctionDeclaration'&&n.id.name==='changeLanguage')return null;
 if(n.type==='ExpressionStatement'&&n.expression.type==='ChainExpression'&&n.expression.expression.callee?.property?.name==='localize')return null;
 if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.callee.name==='L')return normalized(n.arguments[0]);
 if(n.type==='TaggedTemplateExpression'&&n.tag.name==='L')return normalized(n.quasi);
 const result={};for(const [k,v]of Object.entries(n)){if(['start','end','raw'].includes(k))continue;result[k]=normalized(v);}if(result.type==='Literal'&&result.value==='v2.62')result.value='v2.61';if(result.type==='Literal'&&typeof result.value==='string'&&/^assets\/upgrades\/[1-4]-[2-5]\.js/.test(result.value))result.value=result.value.split('?')[0];return result;}
for(const file of ['game/index.html',...Array.from({length:4},(_,i)=>`game/assets/upgrades/${i+1}-${i+2}.js`)]){
 let before=fs.readFileSync(path.join(__dirname,'baseline',file),'utf8'),after=fs.readFileSync(path.join(root,file),'utf8');
 if(file.endsWith('.html')){before=before.match(/<script>([\s\S]*?)<\/script>/)[1];after=after.match(/<script>([\s\S]*?)<\/script>/)[1];}
 assert.deepStrictEqual(normalized(acorn.parse(after,{ecmaVersion:'latest'})),normalized(acorn.parse(before,{ecmaVersion:'latest'})),file);console.log('PASS unchanged game logic after removing localization wrappers: '+file);
}
for(const file of ['runtime.js','en.js'])new vm.Script(fs.readFileSync(path.join(root,'game/assets/i18n',file),'utf8'));
console.log('PASS localization JavaScript syntax');
