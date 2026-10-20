"""Make the transparent light and dark versions of the homepage plot.

The source is the Day 3 "Utility Representation" slide rendered on white.
Each pixel is split into an ink colour and an opacity, so the white becomes
transparent and the page colour shows through instead.

  light:  the ink is kept, so on a white page it looks like the source.
  dark:   the ink's lightness is inverted in OKLab, keeping its hue, so the
          navy curves turn light periwinkle and the black labels near-white.

Opacities keep their order, so the lighter curves, which are the slide navy
blended with white, stay fainter than the darker ones in both versions.

Usage:  python scripts/make_plot_variants.py [SOURCE.png]

The source defaults to assets/indifference-curves.png, which is overwritten
by the light version; the dark one is written next to it with a -dark
suffix.  Rerunning is safe: the source is flattened onto white first.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = ROOT / "assets" / "indifference-curves.png"

# OKLab lightness of the brightest dark-mode ink (black text in the source).
# 0.93 is about #e6e6e6: clearly light, a touch softer than pure white.
DARK_TOP = 0.93
# How far the dark inks spread below DARK_TOP.  Below 1, mid-dark inks such as
# the slide navy land well above the dark page colour instead of near it.
DARK_SPREAD = 0.75
# Faint marks read fainter on a dark page than on white, so the dark version
# raises low opacities a little: the u = 0.8 curve goes from 36% to 46%.
DARK_ALPHA_GAMMA = 0.75

# Björn Ottosson's OKLab matrices (linear sRGB -> LMS -> Lab).
M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
               [0.2119034982, 0.6806995451, 0.1073969566],
               [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
               [1.9779984951, -2.4285922050, 0.4505937099],
               [0.0259040371, 0.7827717662, -0.8086757660]])


def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)


def rgb_to_oklab(rgb):
    return np.cbrt(srgb_to_linear(rgb) @ M1.T) @ M2.T


def oklab_to_rgb(lab):
    lms = (lab @ np.linalg.inv(M2).T) ** 3
    return linear_to_srgb(lms @ np.linalg.inv(M1).T)


def split_from_white(rgb):
    """Ink and opacity that reproduce `rgb` exactly when laid over white."""
    alpha = (1.0 - rgb).max(axis=-1)
    safe = np.where(alpha > 0, alpha, 1.0)[..., None]
    ink = 1.0 - (1.0 - rgb) / safe
    return np.clip(ink, 0.0, 1.0), alpha


def darken_ink(ink):
    lab = rgb_to_oklab(ink)
    lab[..., 0] = DARK_TOP - DARK_SPREAD * lab[..., 0]
    return oklab_to_rgb(lab)


def to_png(ink, alpha, path):
    rgba = np.dstack([ink, alpha])
    Image.fromarray(np.round(rgba * 255).astype(np.uint8), "RGBA").save(path, optimize=True)
    print("  -> %s  (%d KB)" % (path.relative_to(ROOT) if path.is_relative_to(ROOT) else path,
                                path.stat().st_size // 1024))


def main(argv):
    source = Path(argv[0]).resolve() if argv else DEFAULT_SOURCE
    image = Image.open(source).convert("RGBA")
    rgba = np.asarray(image, dtype=np.float64) / 255.0
    # Flatten onto white, so a source that is already transparent gives the
    # same result as the original opaque render.
    rgb = rgba[..., :3] * rgba[..., 3:] + (1.0 - rgba[..., 3:])

    ink, alpha = split_from_white(rgb)
    dark = source.with_name(source.stem + "-dark" + source.suffix)
    to_png(darken_ink(ink), alpha ** DARK_ALPHA_GAMMA, dark)
    to_png(ink, alpha, source)


if __name__ == "__main__":
    main(sys.argv[1:])
