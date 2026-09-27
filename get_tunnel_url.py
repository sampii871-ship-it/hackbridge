import urllib.request, json
try:
    with urllib.request.urlopen("http://localhost:20241/metrics", timeout=5) as r:
        print(r.read().decode()[:2000])
except Exception as e:
    print(f"metrics error: {e}")

# Try the cloudflared local API on common ports
for port in [20241, 20242, 2019]:
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/", timeout=3) as r:
            print(f"port {port}:", r.read().decode()[:500])
    except Exception as e:
        print(f"port {port} error: {e}")
