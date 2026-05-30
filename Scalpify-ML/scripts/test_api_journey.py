#!/usr/bin/env python3
"""Local test harness for the calibrated HairJourneyService.

Calls the real API service method (not the HTTP server) on a local image.
Redirects OUTPUTS_DIR to outputs/_api_test so the service's cleanup step does NOT
wipe the rest of outputs/. Supabase degrades to mock URLs when not configured.

Usage:
    python scripts/test_api_journey.py [image] [--stages N] [--check-only]
"""
import os, sys, asyncio, uuid, argparse
from pathlib import Path

ROOT = Path(__file__).parent.parent  # Scalpify-ML

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
tok = os.getenv("REPLICATE_API_TOKEN")
if tok:
    os.environ["REPLICATE_API_TOKEN"] = tok  # ensure pydantic Settings picks it up

# import paths: api package, src (YOLO service), scripts (grounding)
for p in ("api", "src", "scripts"):
    sys.path.insert(0, str(ROOT / p))

import app.services.hair_journey_service as hj
from app.models.schemas import HairJourneyOptions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image", nargs="?", default=str(ROOT / "outputs" / "test-2.jpeg"))
    ap.add_argument("--stages", type=int, default=6)
    ap.add_argument("--check-only", action="store_true", help="verify wiring, no API calls")
    args = ap.parse_args()

    # redirect outputs so the service's cleanup_outputs_folder() can't wipe outputs/
    hj.OUTPUTS_DIR = ROOT / "outputs" / "_api_test"

    svc = hj.HairJourneyService()
    print(f"model         : {svc.editor.model}")
    print(f"editor enabled: {svc.enabled}")
    print(f"stages        : {[s[0] for s in svc.stages]}")
    print(f"supabase      : {'enabled' if svc.supabase.enabled else 'disabled (mock URLs)'}")

    if args.check_only:
        print("\n✅ wiring OK (check-only, no API calls)")
        return
    if not svc.enabled:
        print("\n❌ editor disabled — REPLICATE_API_TOKEN missing"); sys.exit(1)

    opts = HairJourneyOptions(iterations=args.stages, save_intermediate=True)
    result = asyncio.run(svc.generate_hair_journey(args.image, opts, uuid.uuid4()))

    print("\n=== RESULT ===")
    print("iterations    :", len(result.iterations))
    print("view_type     :", result.view_type)
    print("total_time_ms :", round(result.total_processing_time_ms, 1))
    print("output dir    :", hj.OUTPUTS_DIR)


if __name__ == "__main__":
    main()
