import urllib.request, json, sys

sys.stdout.reconfigure(encoding='utf-8')
res = urllib.request.urlopen('http://127.0.0.1:5000/api/auctions/A003')
data = json.loads(res.read())

# Simulate what JS does
print("=== SIMULATING JS DATA PROCESSING ===")
print(f"data.name = {data.get('name')!r}")
print(f"data.status = {data.get('status')!r}")
print(f"data.budget = {data.get('budget')!r}")
print(f"data.players_count = {data.get('players_count')!r}")
print(f"data.logo_url = {data.get('logo_url')!r}")
print(f"data.date = {data.get('date')!r}")
print(f"data.time = {data.get('time')!r}")
print(f"data.auction_code = {data.get('auction_code')!r}")
print(f"data.plan = {data.get('plan')!r}")
print(f"data.views = {data.get('views')!r}")
print(f"data.players_per_team = {data.get('players_per_team')!r}")
print(f"data.organizer_id = {data.get('organizer_id')!r}")
print(f"data.organizer_name = {data.get('organizer_name')!r}")

# Check if budget is a string (required for .replace())
budget = data.get('budget')
if budget is not None:
    print(f"budget type = {type(budget).__name__}")
    if isinstance(budget, str):
        stripped = budget.replace('\u20b9', '').replace(',', '').replace('$', '')
        print(f"budget stripped = {stripped!r}")
    else:
        print(f"WARNING: budget is not a string! JS .replace() will CRASH!")
