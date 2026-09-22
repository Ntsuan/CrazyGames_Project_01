import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Workbook} from '@oai/artifact-tool';
const dir=path.dirname(fileURLToPath(import.meta.url));
const source=await fs.readFile(path.join(dir,'baseline/装备表-v2.csv'),'utf8');
const lines=source.trimEnd().split('\n');
const wb=await Workbook.fromCSV(lines.slice(2,13).join('\n'),{sheetName:'装备'});
const sheet=wb.worksheets.getItem('装备');
sheet.getRange('A1:I11').format.font={name:'Arial',size:11};
sheet.getRange('A1:I11').format.rowHeight=34;
sheet.getRange('A1:I1').format.rowHeight=64;
sheet.getRange('A1:I11').format.wrapText=true;
for(const [col,width] of [['A',55],['B',65],['C',190],['D',82],['E',82],['F',82],['G',85],['H',300],['I',260]])sheet.getRange(`${col}1:${col}11`).format.columnWidthPx=width;
const editing=process.argv[2]==='edit';
if(editing){
 sheet.getRange('H1').values=[['固定词条（q3 改装起；依武器/插件/装甲）']];
 sheet.getRange('H5:H7').values=[['暴击+2% / 攻速+4% / 吸血+1%'],['暴击+3% / 攻速+6% / 吸血+1.5%'],['暴击+4% / 攻速+8% / 吸血+2%']];
 sheet.getRange('I5').values=[['v2.41 Codex：弱词条起点；芯片无额外词条']];
 sheet.getRange('I8').values=[['原有词条保持；仅合成']];
}
wb.recalculate();
const preview=await wb.render({sheetName:'装备',range:'A1:I11',scale:1,format:'png'});
await fs.writeFile(path.join(dir,editing?'equipment-after.png':'equipment-before.png'),new Uint8Array(await preview.arrayBuffer()));
if(editing){
 // CSV has no stored visual formatting. Preserve all untouched source lines/cells.
 const values=sheet.getRange('A1:I11').values;
 for(const [row,col] of [[0,7],[4,7],[5,7],[6,7],[4,8],[7,8]]){
  const cells=lines[row+2].split(',');cells[col]=String(values[row][col]);
  if(/[\n",]/.test(cells[col]))throw Error('Target cell requires CSV escaping');
  lines[row+2]=cells.join(',');
 }
 lines[0]='# 《霓虹猎手》装备表 v2（2026-09-21，同步游戏 v2.41；Codex：改装起弱词条）';
 await fs.writeFile(path.resolve(dir,'../装备表-v2.csv'),lines.join('\n')+'\n');
 console.log((await wb.inspect({kind:'table',range:'装备!H1:I8',include:'values',tableMaxRows:8,maxChars:2200})).ndjson);
}
