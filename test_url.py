import urllib.request
import ssl

url = "https://plans-bool-roommate-dist.trycloudflare.com"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"STATUS: {resp.status}")
        print(f"URL IS LIVE AND ACCESSIBLE")
except Exception as e:
    print(f"ERROR: {e}")
