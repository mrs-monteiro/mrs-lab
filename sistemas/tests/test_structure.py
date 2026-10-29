from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
class IDs(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.paths=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag=='script' and 'src' in attrs:self.paths.append(attrs['src'])
        if tag=='link' and attrs.get('href','').startswith('assets/'):self.paths.append(attrs['href'])
p=IDs();p.feed((root/'index.html').read_text(encoding='utf-8'))
assert len(p.ids)==len(set(p.ids)),'IDs HTML duplicados'
assert all((root/x).is_file() for x in p.paths),'Referências de ficheiros em falta'
print('MRS: HTML verificado,',len(p.ids),'IDs sem duplicados.')
