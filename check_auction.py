import urllib.request, json

res = urllib.request.urlopen('http://127.0.0.1:5000/api/auctions/A003')
raw = res.read()
data = json.loads(raw)

print("Keys:", list(data.keys()))
print("status:", data.get('status'))
print("name:", data.get('name'))
print("auction_code:", data.get('auction_code'))
print("budget:", data.get('budget'))
print("organizer_id:", data.get('organizer_id'))
print("logo_url:", data.get('logo_url'))
print("players_count:", data.get('players_count'))
print("players_per_team:", data.get('players_per_team'))
print("date:", data.get('date'))
print("time:", data.get('time'))
print("views:", data.get('views'))
print("plan:", data.get('plan'))
