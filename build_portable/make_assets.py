"""Maakt minimale placeholder PNG assets aan voor Expo build."""
import pathlib
import struct
import zlib

def make_png(width: int, height: int, rgb: tuple = (10, 10, 10)) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    sig  = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    row  = b"\x00" + bytes(rgb) * width
    idat = chunk(b"IDAT", zlib.compress(row * height, 1))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


assets_dir = pathlib.Path(__file__).resolve().parent.parent / "assets"
assets_dir.mkdir(exist_ok=True)

FILES = [
    ("icon.png",          1024, 1024),
    ("splash.png",        1284, 2778),
    ("adaptive-icon.png", 1024, 1024),
    ("favicon.png",         32,   32),
]

for name, w, h in FILES:
    dest = assets_dir / name
    if not dest.exists():
        dest.write_bytes(make_png(w, h))
        print(f"  Aangemaakt: {name}  ({w}x{h})")
    else:
        print(f"  Al aanwezig: {name}")

print("Assets klaar.")
