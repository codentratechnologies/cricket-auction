import urllib.request, json, time

t = time.time()
res = urllib.request.urlopen('http://127.0.0.1:5000/api/auctions/A003')
d = json.loads(res.read())
elapsed = time.time() - t
print(f"Time: {elapsed:.2f}s")
print(f"Keys: {list(d.keys())}")
print(f"'players' in response: {'players' in d}")
print(f"'teamList' in response: {'teamList' in d}")
