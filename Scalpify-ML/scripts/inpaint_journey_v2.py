#!/usr/bin/env python3
"""Chained mask-grounded hair-journey (FLUX.1 Fill [pro]) — v2.

Fixes the "3/4/6 months look identical" problem from v1 by:
  1. CHAINING — each stage inpaints on top of the PREVIOUS stage's output, so
     density physically accumulates (4mo = 3mo's hair + more). 15-day is the one
     exception: it's generated from the original (shock-loss phase is *barer*
     than the patient's current state), then 1mo→6mo chain forward from it.
  2. CONCRETE scalp-visibility prompts — instead of abstract "55% coverage", each
     stage targets an unambiguous visual ("scalp visible between sparse strands"
     → "scalp only at the parting" → "no visible scalp"). Strong, distinct cues
     the model can actually act on.

The bald MASK pixel-freezes the face/sides/back every step, so chaining can't
drift identity — only the crown region evolves.

Usage:
    python scripts/inpaint_journey_v2.py <image_path> [--dilate 6] [--safety 5] [--dry-run]
"""
import sys, os, io, time, argparse, json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))
load_dotenv(ROOT / ".env")

from inpaint_hair_journey import build_bald_mask
from grounded_hair_journey import analyze_bald_region, pad_square, SIZE

MODEL = "black-forest-labs/flux-fill-pro"

IDENTITY = (
    "The existing hair on the sides and back stays exactly as in the photo, photorealistic "
    "top-down scalp photograph, natural light, sharp realistic hair detail, no stylization, "
    "no airbrushing. The image is a clean photograph with absolutely no text, no letters, no "
    "numbers, no labels, no arrows, no captions and no watermarks anywhere."
)

# (stage_name, chain_from_previous, PURE scene description — no instructions, no digits,
#  no colons, so FLUX renders pixels not text)
# chain_from_previous=False  -> generate from the ORIGINAL photo
# chain_from_previous=True   -> generate on top of the previous stage's output
STAGES = [
    ("15_days_post_fue", False,
     "A freshly healed scalp crown that is almost entirely bare smooth skin with no hair "
     "length at all, only tiny faint dark follicle dots, the clean scalp fully visible like "
     "the shock-loss phase shortly after a hair transplant."),

    ("1_month_post_fue", True,
     "A scalp crown with very sparse ultra-short dark stubble scattered thinly, with large "
     "areas of bare scalp still clearly visible between the individual short hairs, a faint "
     "shadow of hair just beginning to appear."),

    ("3_months_post_fue", True,
     "A scalp crown with patchy short hair roughly one to two centimetres long, see-through "
     "and uneven, the bare scalp still clearly visible in the gaps between clumps of hair, "
     "about half covered and distinctly incomplete."),

    ("4_months_post_fue", True,
     "A scalp crown with moderate fuller and more even hair roughly two to three centimetres "
     "long, noticeably denser than before, with the skin mostly covered and the scalp only "
     "showing faintly at the parting and a few small thin spots."),

    ("6_months_post_fue", True,
     "A scalp crown with thick full mature hair completely covering the skin so that no scalp "
     "is visible anywhere, dense even natural coverage that blends seamlessly with the "
     "surrounding hair, the fullest and densest stage."),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--dilate", type=int, default=6)
    ap.add_argument("--safety", type=int, default=5)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default=str(ROOT / "outputs" / "_journey_v2"))
    args = ap.parse_args()

    out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)

    mask255, _ = build_bald_mask(args.image, args.dilate)
    ratio, region_phrase, bbox, dbg = analyze_bald_region(args.image)
    mask_pil = Image.fromarray(mask255)

    original = pad_square(Image.open(args.image).convert("RGB")).resize((SIZE, SIZE))
    original.save(out_dir / "00_original.png")
    cv2.imwrite(str(out_dir / "00_mask.png"), mask255)

    print("=== GROUNDING ==="); print(json.dumps(dbg, indent=2))
    print("mask coverage: %.1f%%  | dilate=%d safety=%d"
          % (100 * (mask255 > 0).sum() / (SIZE * SIZE), args.dilate, args.safety))
    print("\n=== STAGE PLAN (chained) ===")
    for name, chain, desc in STAGES:
        src = "PREVIOUS stage" if chain else "ORIGINAL photo"
        print(f"  {name:22s} base={src}")

    if args.dry_run:
        print("\n(dry-run: mask + original saved, no API calls)")
        return

    import replicate
    os.environ["REPLICATE_API_TOKEN"] = os.getenv("REPLICATE_API_TOKEN")

    def buf(pil):
        b = io.BytesIO(); pil.save(b, format="PNG"); b.seek(0); return b

    DELAY = 11
    last = 0.0
    prev = original  # running base for the chain
    for i, (stage, chain, desc) in enumerate(STAGES, 1):
        base = prev if chain else original
        prompt = f"{desc} {IDENTITY}"

        if last and (time.time() - last) < DELAY:
            w = DELAY - (time.time() - last); print(f"⏳ pacing {w:.0f}s"); time.sleep(w)
        print(f"\n=== {i}/{len(STAGES)}: {stage}  (base={'prev' if chain else 'original'}) ===")

        for attempt in range(3):
            try:
                out = replicate.run(MODEL, input={
                    "image": buf(base),
                    "mask": buf(mask_pil),
                    "prompt": prompt,
                    "steps": 50,
                    "guidance": 60,
                    "safety_tolerance": args.safety,
                    "output_format": "png",
                    "seed": 123456,
                })
                last = time.time()
                fobj = out[0] if isinstance(out, list) else out
                result = Image.open(io.BytesIO(fobj.read())).convert("RGB").resize((SIZE, SIZE))
                result.save(out_dir / f"{i:02d}_{stage}.png")
                prev = result  # feed forward
                print(f"✅ saved {i:02d}_{stage}.png")
                break
            except Exception as e:
                print(f"  attempt {attempt+1} failed: {e}"); time.sleep(6)
        else:
            print(f"  ⚠️  giving up on {stage}; chain continues from last good base")


if __name__ == "__main__":
    main()
