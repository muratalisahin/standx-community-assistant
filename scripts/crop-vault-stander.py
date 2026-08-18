"""Lift the SIP-5B Stander render off its light background for use on a dark site.

The source is an infographic, so headline text and callout cards sit right next to the
figure. After knocking out the background we keep only the largest connected shape,
which is the mascot together with the three jars it is holding.
"""
from collections import deque
from pathlib import Path
from shutil import copy2

from PIL import Image

src = Path(
    r"C:\Users\Murat\.cursor\projects\c-Users-Murat-Desktop-standx-raid\assets\c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_2f3b0b7ff9a5bfe92001ad86e205c008_images_ChatGPT_Image_27_Tem_2026_17_10_44-cd74c77f-4166-4f83-b404-bb6114c44aab.png"
)
root = Path(__file__).resolve().parents[1]
out = root / "public" / "images"
out.mkdir(parents=True, exist_ok=True)

copy2(src, out / "sip5b-vaults.png")
full = Image.open(src).convert("RGBA")
print("full", full.size)

tile = full.crop((150, 80, 500, 830)).convert("RGBA")
w, h = tile.size
px = tile.load()


def is_bg(x, y):
    """Light and near-neutral: the page itself plus the soft grey contact shadow.

    Colour survives (green leaf, jar contents) and so does anything the flood fill
    cannot reach from the border, which is how the white eye and logo are kept.
    """
    r, g, b, a = px[x, y]
    if a == 0:
        return False
    lo = min(r, g, b)
    hi = max(r, g, b)
    return lo > 168 and (hi - lo) < 32


# 1. Flood fill the light background inwards from the border, so whites inside the
#    artwork (the eye, the logo) are left alone.
queue = deque()
edge_seen = bytearray(w * h)
for x in range(w):
    for y in (0, h - 1):
        if is_bg(x, y) and not edge_seen[y * w + x]:
            edge_seen[y * w + x] = 1
            queue.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if is_bg(x, y) and not edge_seen[y * w + x]:
            edge_seen[y * w + x] = 1
            queue.append((x, y))

while queue:
    x, y = queue.popleft()
    px[x, y] = (255, 255, 255, 0)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not edge_seen[ny * w + nx] and is_bg(nx, ny):
            edge_seen[ny * w + nx] = 1
            queue.append((nx, ny))

# 2. Label what is left and keep only the biggest island.
label = bytearray(w * h)
best = None
best_size = 0
for sy in range(h):
    for sx in range(w):
        i = sy * w + sx
        if label[i] or px[sx, sy][3] == 0:
            continue
        island = []
        label[i] = 1
        q = deque([(sx, sy)])
        while q:
            x, y = q.popleft()
            island.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if not label[j] and px[nx, ny][3] > 0:
                        label[j] = 1
                        q.append((nx, ny))
        if len(island) > best_size:
            best_size = len(island)
            best = island

keep = set(best or [])
print("largest island px", best_size)
for y in range(h):
    for x in range(w):
        if px[x, y][3] > 0 and (x, y) not in keep:
            px[x, y] = (255, 255, 255, 0)

# 3. A connector line from a callout card touches a jar, so it survived step 2 as a
#    hairline on the right. Shave columns off that edge until real artwork begins.
for x in range(w - 1, -1, -1):
    filled = sum(1 for y in range(h) if px[x, y][3] > 0)
    if filled >= 30:
        break
    for y in range(h):
        px[x, y] = (255, 255, 255, 0)

bbox = tile.getbbox()
if bbox:
    tile = tile.crop(bbox)
tile.save(out / "stander-vaults.png")
print("stander-vaults", tile.size)
