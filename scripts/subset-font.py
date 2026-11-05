"""Build the committed Inter Bold subset from the pinned upstream release."""

import hashlib
import io
from pathlib import Path
from urllib.request import urlopen

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = "https://raw.githubusercontent.com/rsms/inter/v4.1/"
FONT_PATH = "docs/font-files/InterVariable.ttf"
SUPPORTED_POINTS = set(range(0x20, 0x7F)) | set(range(0xA0, 0x180))
SUPPORTED_POINTS.remove(0xAD)
BOLD_WEIGHT = 700
OPTICAL_SIZE = 14
SOURCE_SHA256 = "4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf"


def download(path: str) -> bytes:
    with urlopen(UPSTREAM + path) as response:
        return response.read()


def add_deprecated_n(font: TTFont) -> None:
    # Inter omits U+0149. Its Unicode decomposition uses these two Inter glyphs.
    cmap = font.getBestCmap()
    apostrophe, letter = cmap[0x2BC], cmap[0x6E]
    advance = font["hmtx"][apostrophe][0]
    pen = TTGlyphPen(font.getGlyphSet())
    pen.addComponent(apostrophe, (1, 0, 0, 1, 0, 0))
    pen.addComponent(letter, (1, 0, 0, 1, advance, 0))
    name = "uni0149"
    order = [*font.getGlyphOrder(), name]
    font["glyf"][name] = pen.glyph()
    font.setGlyphOrder(order)
    font["hmtx"][name] = (advance + font["hmtx"][letter][0], 0)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[0x149] = name


def main() -> None:
    source = download(FONT_PATH)
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA256:
        raise ValueError("Inter source changed. Check the pinned release before regeneration.")
    font = TTFont(io.BytesIO(source), recalcTimestamp=False)
    instantiateVariableFont(
        font, {"wght": BOLD_WEIGHT, "opsz": OPTICAL_SIZE}, inplace=True
    )
    add_deprecated_n(font)
    names = {1: "Inter", 2: "Bold", 4: "Inter Bold", 6: "Inter-Bold", 16: "Inter", 17: "Bold"}
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    options = subset.Options()
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=SUPPORTED_POINTS)
    subsetter.subset(font)
    missing = SUPPORTED_POINTS - set(font.getBestCmap())
    if missing:
        raise ValueError(f"Inter-Bold.ttf lacks supported characters: {missing}")
    assets = ROOT / "assets"
    assets.mkdir(exist_ok=True)
    font.save(assets / "Inter-Bold.ttf")
    (assets / "Inter-LICENSE.txt").write_bytes(download("LICENSE.txt"))


if __name__ == "__main__":
    main()
