from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import json, re, urllib.request, concurrent.futures, wave, xml.etree.ElementTree as ET
from PIL import Image

ROOT=Path(__file__).resolve().parent
site=ROOT/'site'
results=[]
for p in sorted((site/'assets').rglob('*')):
    if not p.is_file():continue
    try:
        extra={}
        if p.suffix in ['.png','.webp','.jpg']:
            with Image.open(p) as im:extra={'size':list(im.size),'mode':im.mode};im.verify()
        elif p.suffix=='.svg':ET.parse(p)
        elif p.suffix=='.wav':
            with wave.open(str(p)) as w:extra={'seconds':w.getnframes()/w.getframerate(),'channels':w.getnchannels(),'sampleRate':w.getframerate()}
        results.append({'file':str(p.relative_to(site)),'status':'PASS',**extra})
    except Exception as e:results.append({'file':str(p.relative_to(site)),'status':'FAIL','error':str(e)})

def request_file(r):
    try:
        with urllib.request.urlopen('http://127.0.0.1:19322/'+r['file']) as response:
            r['httpStatus']=response.status;r['bytes']=len(response.read());r['contentType']=response.headers.get('Content-Type')
    except Exception as e:r['status']='FAIL';r['httpError']=str(e)
    return r
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(request_file,results))
html=(site/'index.html').read_text()
refs=sorted(set(re.findall(r'assets/[\w./-]+\.(?:png|svg|webp|jpg|wav|css)',html)))
missing=[p for p in refs if not (site/p).exists()]
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.duplicates=[]
    def handle_starttag(self,tag,attrs):
        names=[x[0] for x in attrs]
        if len(names)!=len(set(names)):self.duplicates.append({'tag':tag,'attrs':attrs})
        self.ids += [v for k,v in attrs if k=='id']
parser=Parser();parser.feed(html)
report={'assetCount':len(results),'assetFailures':sum(r['status']=='FAIL' for r in results),'staticReferences':len(refs),'missingStaticReferences':missing,'duplicateIds':[k for k,v in Counter(parser.ids).items() if v>1],'duplicateAttributes':parser.duplicates,'results':results}
(ROOT/'asset-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False))
