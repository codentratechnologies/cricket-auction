import re
content = open('d:/cricket-auction/frontend/auction-dashboard.html', encoding='utf-8').read()
ids = re.findall(r'id="([^"]+)"', content)
for i in sorted(set(ids)):
    print(i)
