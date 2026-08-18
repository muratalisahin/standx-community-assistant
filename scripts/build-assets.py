"""Cut the official StandX assets out of the source sheets.

Inputs are an official wordmark on black and the Stander character sheet
(turnaround plus state poses). Outputs go to public/images with the light page
background knocked out so everything sits cleanly on the dark site.
"""
from pathlib import Path
from shutil import copy2

from PIL import Image

ASSETS = Path(r"C:\Users\Murat\.cursor\projects\c-Users-Murat-Desktop-standx-raid\assets")
LOGO_DARK = ASSETS / "c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_2f3b0b7ff9a5bfe92001ad86e205c008_images_standx-logo-dark-542db51f-f2fb-416f-809d-77362fdeab92.png"
SHEET = ASSETS / "c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_2f3b0b7ff9a5bfe92001ad86e205c008_images_stander-prototype-210429c0-1874-46d6-b3ee-0e233793ca97.png"

root = Path(__file__).resolve().parents[1]
out = root / "public" / "images"
out.mkdir(parents=True, exist_ok=True)

# --- official wordmark, white on black -------------------------------------
logo = Image.open(LOGO_DARK).convert("RGBA")
print("logo source", logo.size)
lw, lh = logo.size
lpx = logo.load()
# Keep the glyphs, drop the black plate, so it can sit on any dark panel.
for y in range(lh):
    for x in range(lw):
        r, g, b, a = lpx[x, y]
        lum = max(r, g, b)
        if lum < 40:
            lpx[x, y] = (255, 255, 255, 0)
        elif lum < 210:
            lpx[x, y] = (255, 255, 255, int(255 * (lum - 40) / 170))
        else:
            lpx[x, y] = (255, 255, 255, 255)
bbox = logo.getbbox()
if bbox:
    logo = logo.crop(bbox)
logo.save(out / "standx-wordmark-light.png")
print("standx-wordmark-light", logo.size)

# --- character sheet --------------------------------------------------------
sheet = Image.open(SHEET).convert("RGBA")
print("sheet source", sheet.size)
copy2(SHEET, root / "scripts" / "stander-sheet.png")


def knock_white(tile, thresh=242):
    px = tile.load()
    w, h = tile.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= thresh and g >= thresh and b >= thresh:
                px[x, y] = (255, 255, 255, 0)
    return tile


def cut(name, box, pad=8):
    tile = knock_white(sheet.crop(box).copy())
    bb = tile.getbbox()
    if bb:
        l, t, r, b = bb
        tile = tile.crop(
            (max(0, l - pad), max(0, t - pad), min(tile.size[0], r + pad), min(tile.size[1], b + pad))
        )
    tile.save(out / f"{name}.png")
    print(name, tile.size)


cut("standx-mark", (76, 62, 228, 222), pad=4)

# Turnaround: these four are what make the 3D spin read correctly.
cut("stander-34", (50, 348, 230, 585))
cut("stander-front", (306, 348, 474, 585))
cut("stander-side", (554, 348, 714, 585))
cut("stander-back", (790, 348, 970, 585))

# States.
cut("stander-focus", (20, 645, 250, 890))
cut("stander-think", (326, 645, 520, 890))
cut("stander-formal", (554, 645, 766, 890))
cut("stander-cozy", (814, 645, 974, 890))

Image.open(out / "stander-front.png").save(out / "stander.png")
print("done")
