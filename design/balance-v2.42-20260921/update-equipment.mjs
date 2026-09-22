import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Workbook} from '@oai/artifact-tool';
const dir=path.dirname(fileURLToPath(import.meta.url));
const lines=(await fs.readFile(path.join(dir,'baseline/装备表-v2.csv'),'utf8')).trimEnd().split('\n');
const wb=await Workbook.fromCSV(lines.slice(2,13).join('\n'),{sheetName:'装备'});
const sheet=wb.worksheets.getItem('装备');
sheet.getRange('A1:I11').format.font={name:'Arial',size:11};
sheet.getRange('A1:I11').format.rowHeight=42;
sheet.getRange('A1:I1').format.rowHeight=64;
sheet.getRange('A1:I11').format.wrapText=true;
for(const [col,width] of [['A',55],['B',65],['C',190],['D',82],['E',82],['F',82],['G',85],['H',300],['I',290]])sheet.getRange(`${col}1:${col}11`).format.columnWidthPx=width;
// Temporary rules view for rendering; preserve the original CSV's ragged layout.
const rules=wb.worksheets.add('规则');
rules.getRange('A1:C3').values=lines.slice(14,17).map(s=>{const c=s.split(',');return [c[1],c[3],c[8]||''];});
rules.getRange('A1:C3').format.font={name:'Arial',size:11};
rules.getRange('A1:C3').format.wrapText=true;
rules.getRange('A1:C3').format.rowHeight=60;rules.getRange('A1:C1').format.rowHeight=140;
rules.getRange('A1:A3').format.columnWidthPx=130;rules.getRange('B1:B3').format.columnWidthPx=780;rules.getRange('C1:C3').format.columnWidthPx=240;
const editing=process.argv[2]==='edit';
if(editing){
 sheet.getRange('I6:I9').values=[['f50–249 可掉落；f150–249 为区间最低档'],['f75+ 可掉落；f250+ 为区间最低档'],['f150+ 可掉落；原有词条保持'],['f250+ 可掉落；原有词条保持']];
 rules.getRange('B1:C3').values=[
  ['f1–24: q0~q2（60/30/10）· f25–49: q1~q3（60/32/8）· f50–74: q2~q4（60/34/6）· f75–149: q3~q5（58/36/6）· f150–249: q4~q6（58/36/6）· f250+: q5~q7（58/36/6）','权重依低/中/高档排列；永恒q8与不朽q9仅合成'],
  ['25%（Boss 必掉1件；品质使用被击杀楼层区间）','权重仅针对实际掉落且未触发保底时'],
  ['连续10次实际掉落未出区间最高档 → 下次必出；跨部位及楼层共享，重塑清零','跨150/250层保留计数，保底目标随新区间变化']
 ];
}
wb.recalculate();
for(const [name,range,out] of [['装备','A1:I11','equipment'],['规则','A1:C3','rules']]){
 const preview=await wb.render({sheetName:name,range,scale:1,format:'png'});
 await fs.writeFile(path.join(dir,`${out}-${editing?'after':'before'}.png`),new Uint8Array(await preview.arrayBuffer()));
}
if(editing){
 const values=sheet.getRange('I6:I9').values;
 for(let i=0;i<4;i++){const c=lines[7+i].split(',');c[8]=values[i][0];lines[7+i]=c.join(',');}
 const rv=rules.getRange('B1:C3').values;
 for(let i=0;i<3;i++){const c=lines[14+i].split(',');c[3]=rv[i][0];c[8]=rv[i][1];lines[14+i]=c.join(',');}
 lines[0]='# 《霓虹猎手》装备表 v2（2026-09-21，同步游戏 v2.42；Codex：150/250层扩展掉落）';
 await fs.writeFile(path.resolve(dir,'../装备表-v2.csv'),lines.join('\n')+'\n');
 console.log('CSV updated: four quality remarks, drop bands, chance and pity documentation.');
}
