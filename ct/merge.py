from PIL import Image

base = Image.open("top.png")
pix = base.load()
w, h = base.size

second = Image.open("bottom.png")
spix = second.load()

for x in range(w):
    for y in range(h):
        p = pix[x, y]
        sp = spix[x, y]
        if p != sp:
           pix[x, y] = (p[0], sp[0], p[2], p[3])

base.save("nova.png")

