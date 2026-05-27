import os
import uuid
import time
import shutil
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path
import io

from PIL import Image, ImageOps
import replicate

from app.core.config import get_settings
from app.core.supabase_client import get_supabase_client
from app.models.schemas import (
    HairJourneyOptions, HairJourneyResponse, HairJourneyStatus,
    HairJourneyResult, IterationResult
)

settings = get_settings()

# Outputs directory for local storage
OUTPUTS_DIR = Path(__file__).parent.parent.parent.parent / "outputs"

class NanoBananaEditor:
    """Google nano-banana-2 image editor for hair journey progression"""

    def __init__(self):
        self.model = "google/nano-banana-2"
        self.enabled = False

        if not settings.REPLICATE_API_TOKEN:
            print("⚠️  REPLICATE_API_TOKEN not configured - hair journey features disabled")
            return

        os.environ["REPLICATE_API_TOKEN"] = settings.REPLICATE_API_TOKEN
        self.enabled = True

    def edit_image(self, image: Image.Image, prompt: str, max_retries: int = 4):
        """Edit image using google/nano-banana-2 (image-to-image).

        Retries on Replicate 429 throttle (low-credit accounts cap at 6/min, burst 1)
        with exponential backoff so a multi-stage journey can finish within the rate limit.
        """
        if not self.enabled:
            raise RuntimeError("Replicate API not configured - REPLICATE_API_TOKEN required")

        attempt = 0
        while True:
            try:
                buffered = io.BytesIO()
                image.save(buffered, format="PNG")
                buffered.seek(0)

                input_data = {
                    "prompt": prompt,
                    "image_input": [buffered],
                    "aspect_ratio": "match_input_image",
                    "output_format": "png",
                }

                output = replicate.run(self.model, input=input_data)

                file_obj = output[0] if isinstance(output, list) else output
                image_bytes = file_obj.read()
                result_image = Image.open(io.BytesIO(image_bytes))

                class EditResult:
                    def __init__(self, image):
                        self.images = [image]

                return EditResult(result_image)

            except Exception as e:
                msg = str(e)
                is_throttle = "429" in msg or "throttled" in msg.lower() or "rate limit" in msg.lower()
                if is_throttle and attempt < max_retries:
                    backoff = min(60, 12 * (2 ** attempt))
                    print(f"⏳ Replicate throttle hit (attempt {attempt + 1}/{max_retries + 1}); sleeping {backoff}s")
                    time.sleep(backoff)
                    attempt += 1
                    continue
                print(f"Error with nano-banana-2: {e}")
                raise

class HairJourneyService:
    """Service for generating hair journey visualizations using google/nano-banana-2"""

    def __init__(self):
        self.editor = NanoBananaEditor()
        self.enabled = self.editor.enabled
        self.supabase = get_supabase_client()

        # Hair transplant journey stages — 4-month timeline
        # 15 days, 1 month, 3 months, 4 months
        identity_block = (
            "STRICT IDENTITY PRESERVATION: face, eyes, eyebrows, ears, jawline, skin tone, expression, lighting, "
            "and head pose are IDENTICAL to the original photo. The natural forehead hairline stays exactly where "
            "it is in the original — DO NOT add any hair onto the forehead skin, the temples, or below the original "
            "hairline. The existing hair on the sides, back, and crown periphery remains completely unchanged. "
            "Preserve the person's identity exactly. "
            "Style: photorealistic portrait photograph, natural daylight, sharp realistic detail, no over-smoothing, "
            "no airbrushing, no stylization."
        )

        self.stages = [
            ("15_days_post_fue",
             "Edit this photograph to show the SAME person 15 days after a successful FUE hair transplant. "
             "The recipient area is fully healed — clean, smooth, normal natural skin tone, no redness, no scabs, "
             "no swelling, no visible scarring. The transplanted follicles appear as a faint sparse pattern of tiny "
             "dark pinprick-like dots across the recipient zone, with almost no hair length yet (0.1-0.3 mm) because "
             "the newly placed grafts have entered the normal shock-loss phase — the area looks predominantly bare "
             "with only barely-visible dark dots. Approximately 5% visible coverage. " + identity_block),

            ("1_month_post_fue",
             "Edit this photograph to show the SAME person 1 month after a successful FUE hair transplant. "
             "Sparse very-short dark stubble (0.5-1 mm) is now visible in the recipient area, evenly distributed but "
             "still thin — like a fresh buzz cut just starting to fill in. Approximately 10-15% visible scalp "
             "coverage; the underlying scalp is still clearly visible between strands. The hair color, growth "
             "direction, and density match a natural early-regrowth phase and blend with surrounding existing hair. "
             "Scalp is fully healed: normal skin tone, no redness, no scarring. " + identity_block),

            ("3_months_post_fue",
             "Edit this photograph to show the SAME person 3 months after a successful FUE hair transplant. "
             "In the recipient area the hair is now visibly thicker and longer (approximately 1-2 cm), darker and "
             "more structured, beginning to look like mature hair. Approximately 40-50% scalp coverage — clearly "
             "improved from the 1-month stage but still patchy with some thin spots; about half of the scalp remains "
             "partially visible between strands. The hair color, texture, and growth direction blend naturally with "
             "the surrounding existing hair. Scalp is fully healed with no signs of the original procedure. " + identity_block),

            ("4_months_post_fue",
             "Edit this photograph to show the SAME person 4 months after a successful FUE hair transplant. "
             "Hair in the recipient area is now 2-3 cm long with noticeably improved density compared to month 3 — "
             "approximately 55-65% scalp coverage. Strands are thicker, more structured, and gaining real volume; "
             "thin patches are smaller and fewer. The hair tone, texture, and growth direction match the surrounding "
             "natural hair. Scalp is fully healed and the recipient area starts to visually integrate with the rest "
             "of the head. " + identity_block),
        ]

    def pad_to_square(self, image: Image.Image, fill_color=(0, 0, 0)) -> Image.Image:
        """Pad image to square dimensions"""
        width, height = image.size
        max_side = max(width, height)
        padding = (
            (max_side - width) // 2,
            (max_side - height) // 2,
            (max_side - width + 1) // 2,
            (max_side - height + 1) // 2
        )
        return ImageOps.expand(image, padding, fill=fill_color)

    def cleanup_outputs_folder(self):
        """Delete all files in the outputs folder"""
        try:
            if OUTPUTS_DIR.exists():
                # Remove all files in the directory
                for file_path in OUTPUTS_DIR.glob("*"):
                    if file_path.is_file():
                        file_path.unlink()
                        print(f"🗑️  Deleted old file: {file_path.name}")
            else:
                # Create outputs directory if it doesn't exist
                OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
                print(f"📁 Created outputs directory: {OUTPUTS_DIR}")
        except Exception as e:
            print(f"⚠️  Error cleaning outputs folder: {e}")

    def save_image_locally(self, image: Image.Image, filename: str) -> str:
        """Save image to local outputs folder"""
        try:
            # Ensure outputs directory exists
            OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

            # Save image
            file_path = OUTPUTS_DIR / filename
            image.save(file_path, format="PNG")
            print(f"💾 Saved locally: {filename}")

            return str(file_path)
        except Exception as e:
            print(f"❌ Error saving image locally: {e}")
            return None

    async def upload_to_supabase(self, image: Image.Image, filename: str, bucket: str = "hair-journey") -> str:
        """Upload image to Supabase storage and return URL"""
        try:
            # Convert image to bytes
            img_buffer = io.BytesIO()
            image.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            
            # Upload using the client's upload method
            url = await self.supabase.upload_file(
                file_bytes=img_buffer.getvalue(),
                file_path=filename,
                bucket=bucket,
                content_type="image/png"
            )
            return url
            
        except Exception as e:
            print(f"Error uploading to Supabase: {e}")
            raise
    
    async def save_journey_to_db(self, session_id: uuid.UUID, result: HairJourneyResult):
        """Save hair journey result to database"""
        try:
            if not self.supabase.enabled:
                print("Database not enabled, skipping save")
                return
                
            journey_data = {
                "id": str(session_id),
                "created_at": datetime.utcnow().isoformat(),
                "original_image_url": result.original_image_url,
                "final_result_url": result.final_result_url,
                "iterations_count": len(result.iterations),
                "view_type": result.view_type,
                "processing_time_ms": result.total_processing_time_ms,
                "iterations_data": [
                    {
                        "iteration_number": iter_result.iteration_number,
                        "image_url": iter_result.image_url,
                        "mask_url": iter_result.mask_url,
                        "processing_time_ms": iter_result.processing_time_ms,
                        "timestamp": iter_result.timestamp.isoformat()
                    }
                    for iter_result in result.iterations
                ]
            }
            
            # Use the client's direct access for now
            response = self.supabase.client.table("hair_journey_sessions").insert(journey_data).execute()
            
            # Check if response has data (successful insert)
            if not response.data:
                print("Database save error: No data returned from insert")
                
        except Exception as e:
            print(f"Error saving to database: {e}")
    
    async def generate_hair_journey(self, image_path: str, options: HairJourneyOptions, session_id: uuid.UUID) -> HairJourneyResult:
        """Generate hair journey visualization using Qwen Image Edit Plus with progressive editing"""
        start_time = time.time()
        iterations_results = []

        try:
            # Clean up outputs folder before starting new generation
            print("\n🧹 Cleaning outputs folder...")
            self.cleanup_outputs_folder()

            # Preprocess input image
            input_image = Image.open(image_path).convert("RGB")
            input_image = self.pad_to_square(input_image).resize((512, 512))

            # Save original image locally
            self.save_image_locally(input_image, "00_original.png")

            # Upload original image
            original_filename = f"{session_id}/original.png"
            original_url = await self.upload_to_supabase(input_image, original_filename)

            # Use ORIGINAL image as base for ALL stages (independent editing, not progressive)
            base_image = input_image.copy()

            # Process each stage
            num_stages = min(len(self.stages), options.iterations if options.iterations <= len(self.stages) else len(self.stages))

            # Replicate caps at 6 req/min on low-credit accounts. Spacing
            # calls ~11s apart keeps us under that ceiling without retries.
            INTER_STAGE_DELAY_S = 11
            last_call_at = 0.0

            for i in range(num_stages):
                # Throttle: ensure at least INTER_STAGE_DELAY_S has elapsed since
                # the previous Replicate call before kicking off the next one.
                elapsed = time.time() - last_call_at
                if last_call_at and elapsed < INTER_STAGE_DELAY_S:
                    wait = INTER_STAGE_DELAY_S - elapsed
                    print(f"⏳ Pacing: sleeping {wait:.1f}s before next stage to respect Replicate rate limit")
                    time.sleep(wait)

                iter_start = time.time()
                stage_name, prompt = self.stages[i]

                print(f"\n{'='*60}")
                print(f"Processing stage {i+1}/{num_stages}: {stage_name}")

                # Edit image using nano-banana-2 (always uses the original base image)
                output = self.editor.edit_image(
                    image=base_image,
                    prompt=prompt,
                ).images[0]
                last_call_at = time.time()

                iter_end = time.time()
                iter_time = (iter_end - iter_start) * 1000

                # Save image locally with numbered prefix
                local_filename = f"{i+1:02d}_{stage_name}.png"
                self.save_image_locally(output, local_filename)

                # Upload iteration results if requested
                if options.save_intermediate:
                    iter_filename = f"{session_id}/{stage_name}.png"
                    iter_url = await self.upload_to_supabase(output, iter_filename)

                    iterations_results.append(IterationResult(
                        iteration_number=i+1,
                        image_url=iter_url,
                        mask_url=None,
                        processing_time_ms=iter_time,
                        timestamp=datetime.utcnow()
                    ))

                print(f"  ✅ Completed in {iter_time/1000:.2f}s")
                print(f"{'='*60}")

            # Use last stage as final result
            final_filename = f"{session_id}/final_result.png"
            if iterations_results:
                final_url = iterations_results[-1].image_url
            else:
                # If no intermediate saves, upload the final current_image
                final_url = await self.upload_to_supabase(current_image, final_filename)

            total_time = (time.time() - start_time) * 1000

            # Print summary
            print(f"\n{'='*60}")
            print(f"✅ HAIR JOURNEY GENERATION COMPLETE!")
            print(f"{'='*60}")
            print(f"📊 Total processing time: {total_time/1000:.2f}s")
            print(f"📁 Local files saved to: {OUTPUTS_DIR}")
            print(f"📄 Files generated:")
            for file_path in sorted(OUTPUTS_DIR.glob("*.png")):
                print(f"   - {file_path.name}")
            print(f"{'='*60}\n")

            result = HairJourneyResult(
                session_id=session_id,
                original_image_url=original_url,
                final_result_url=final_url,
                iterations=iterations_results,
                total_processing_time_ms=total_time,
                view_type="front"
            )

            # Save to database
            await self.save_journey_to_db(session_id, result)

            return result

        except Exception as e:
            print(f"Error in hair journey generation: {e}")
            raise
    
    async def get_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get hair journey history for a user"""
        try:
            if not self.supabase.enabled:
                return []
                
            response = self.supabase.client.table("hair_journey_sessions")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
                
            return response.data if response.data else []
            
        except Exception as e:
            print(f"Error fetching history: {e}")
            return []

# Service instance
hair_journey_service = HairJourneyService()