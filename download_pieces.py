import os
import requests
import time

base = "https://www.chessboardjs.com/img/chesspieces/wikipedia"
pieces = ["wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK"]

out_dir = "static/img/chesspieces/wikipedia"
os.makedirs(out_dir, exist_ok=True)

for piece in pieces:
    path = os.path.join(out_dir, f"{piece}.png")
    if os.path.exists(path):
        print(piece, "skipped (already exists)")
        continue

    url = f"{base}/{piece}.png"
    r = requests.get(url, timeout=30)
    print(piece, r.status_code, r.url)
    r.raise_for_status()

    with open(path, "wb") as f:
        f.write(r.content)

    time.sleep(2)

print("done")
