from PIL import Image
from pathlib import Path

src = Path(
    r"C:\Users\Murat\.cursor\projects\c-Users-Murat-Desktop-standx-raid\assets\c__Users_Murat_AppData_Roaming_Cursor_User_workspaceStorage_2f3b0b7ff9a5bfe92001ad86e205c008_images_ChatGPT_Image_27_Tem_2026_17_10_44-cd74c77f-4166-4f83-b404-bb6114c44aab.png"
)
im = Image.open(src).convert("RGB")
w, h = im.size
print("size", w, h)
px = im.load()


def dark(x, y, t=90):
    r, g, b = px[x, y]
    return r < t and g < t and b < t


print("\nDARK-pixel row profile (mascot body is near-black)")
for y in range(0, h, 12):
    c = sum(1 for x in range(0, w, 4) if dark(x, y))
    pct = c / (w / 4)
    if pct > 0.02:
        print(f"{y:5d} {pct:.2f} {'#' * int(pct * 50)}")

print("\nDARK-pixel col profile")
for x in range(0, w, 10):
    c = sum(1 for y in range(0, h, 4) if dark(x, y))
    pct = c / (h / 4)
    if pct > 0.02:
        print(f"{x:5d} {pct:.2f} {'#' * int(pct * 50)}")
