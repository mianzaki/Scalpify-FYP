# Scalpify App

React Native (Expo) front-end for the Scalpify ML FastAPI backend.

## Run

```bash
cd Scalpify-App
EXPO_PUBLIC_DEV_LAN_IP=<your-laptop-LAN-IP> npx expo start --lan
```

Press `i` for iOS simulator, `a` for Android, or scan the QR code with the Expo Go app.

## Backend URL

`API_BASE_URL` in [src/config.ts](src/config.ts) is derived from `EXPO_PUBLIC_DEV_LAN_IP` in dev. Re-run `ifconfig | grep "inet "` if your laptop's LAN IP changes.

Start the FastAPI server bound to `0.0.0.0` so the phone (on the same Wi-Fi) can reach it:

```bash
cd ../Scalpify-ML/api
../env/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production, set `EXPO_PUBLIC_API_BASE_URL` to your deployed FastAPI URL in your `.env` / EAS env before building.

## What's wired up

- **Capture** → `expo-camera` with draggable zoom, torch toggle, double-tap flip
- **Analyze** → `POST /api/v1/analyze` (multipart, ~0.5s server-side)
- **Hair journey** → `POST /api/v1/hair-journey/generate` (multipart, ~2-3 min, requires `REPLICATE_API_TOKEN` on the backend)
- **Local persistence** → AsyncStorage for user / meds / scans / daily logs
