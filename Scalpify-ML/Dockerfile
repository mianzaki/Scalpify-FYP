# Scalpify AI backend (FastAPI + YOLOv11). CPU-only torch to keep the image small.
FROM python:3.12-slim

# System libs OpenCV needs at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install the CPU build of torch first (the default build pulls ~2GB of CUDA we don't use),
# then the rest of the deps (torch is already satisfied so it's skipped).
COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# App code + the YOLO model (model/ must NOT be in .dockerignore).
COPY . .

# The app loads MODEL_PATH="../model/best.pt" relative to the api/ working dir,
# so run uvicorn from /app/api (=> ../model resolves to /app/model).
WORKDIR /app/api

# Hosts (Render/Railway/Cloud Run) inject $PORT; default to 8000 locally.
ENV PORT=8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
