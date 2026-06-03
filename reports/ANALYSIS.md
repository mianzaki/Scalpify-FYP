# Scalpify — Complete Deep Project Analysis

> Auto-generated FYP technical analysis covering all 15 phases.
> Scope: the entire repository (`Scalpify-App` mobile client + `Scalpify-ML` Python/FastAPI backend), every source file, config, dependency, model and diagram.
> Every claim is cited to the exact file it was found in. Where information is absent it is explicitly marked "Not found in codebase".

## Table of Contents
- Phase 1 — Project Overview
- Phase 2 — Architecture Analysis
- Phase 3a — Frontend Screens
- Phase 3b — Frontend Infrastructure
- Phase 4a — Backend API Core
- Phase 8 — API Documentation
- Phase 4b — Backend Services & Business Logic
- Phase 5 — Machine Learning & AI Analysis
- Phase 6 — Python Code Analysis
- Phase 7 — Database Analysis
- Phase 9 — Dependency Analysis
- Phase 13 — Deployment Analysis (evidence)
- Phase 10 — Execution Flow
- Phase 11 — Important Files
- Phase 12 — Security Analysis
- Phase 13 — Deployment Analysis
- Phase 14 — Executive Summary
- Phase 15 — Presentation Ready Notes
- Questions You Should Be Able To Answer
- Appendix — Existing Project Diagrams (transcribed)

---



---

I have all the source material from the area analyses. I'll now write the cross-cutting and synthesis sections directly, citing files as the area analyses did.

## Phase 1 — Project Overview

### Overall objective

Scalpify is a final-year-project (FYP) hair-loss and hair-transplant-recovery companion. Its objective is to let a user photograph their own scalp, receive an **automated, computer-vision-based baldness analysis** (how much of the hair-bearing scalp is bald, a severity grade, and a Norwood-scale estimate), then track recovery over time and preview an **AI-generated regrowth journey** of what their scalp could look like 15 days to 8 months after an FUE hair transplant. A grounded AI chat assistant answers hair-loss questions using the user's own data.

### Main problem solved

Hair-loss sufferers and post-transplant patients have no easy, objective, at-home way to measure baldness progression or visualise recovery. Clinical Norwood grading is subjective and requires a specialist. Scalpify replaces eyeballing with a quantitative pixel-ratio measurement from a phone photo (`Scalpify-ML/src/components/bald_area_calculation_service.py`), pairs it with longitudinal tracking (`Scalpify-App/src/scanStore.ts`, `NorwoodAnalysisScreen.tsx`), medication-adherence reminders (`Scalpify-App/src/medsStore.ts`, `notifications.ts`), and a generative recovery preview (`Scalpify-ML/api/app/services/hair_journey_service.py`).

### Target users

Per the use case diagram (`diagrams/fig1_use_case.png`) there are two actors:
- **Patient** — the primary user: captures/uploads photos, views analysis, generates the hair-journey preview, reviews the recovery timeline, tracks medication, and views the Norwood reference.
- **Admin** — a secondary actor associated with the analysis use cases (UC-3 and others). No admin UI or admin auth was found in the codebase; the role is aspirational in the diagram.

### Core features

- Local-only account sign-up / sign-in (no auth server) (`Scalpify-App/src/userStore.ts`).
- Branched 12-step onboarding questionnaire capturing medical/lifestyle profile (`Scalpify-App/src/onboardingFlow.ts`).
- Scalp photo capture or gallery upload with quality hints and zoom (`Scalpify-App/src/screens/CameraScreen.tsx`).
- AI baldness analysis: YOLOv11 segmentation → bald/hair ratio, cm² estimate, severity, Norwood scale, region coordinates (`Scalpify-ML/api/app/services/analysis_service.py`).
- Scalp Report with before/after overlay and clinician note (`Scalpify-App/src/screens/ScanResultsScreen.tsx`).
- Progression tracking: baldness-over-time chart, scan-activity grid, history table (`Scalpify-App/src/screens/NorwoodAnalysisScreen.tsx`).
- Generative hair-journey recovery preview via Replicate `google/nano-banana-pro` (`Scalpify-ML/api/app/services/hair_journey_service.py`).
- Medication management with daily adherence ring, streak, and local reminders (`Scalpify-App/src/screens/MedsScreen.tsx`, `notifications.ts`).
- Post-surgery recovery calendar with milestones and a daily journal (`Scalpify-App/src/screens/RecoveryCalendarScreen.tsx`, `dailyLog.ts`).
- Grounded AI chat assistant backed by OpenAI (`Scalpify-App/src/screens/ChatScreen.tsx`, `Scalpify-ML/api/app/services/chat_service.py`).
- Heuristic AGA risk score and recovery-projection shift (`Scalpify-App/src/medicalContext.ts`).
- Facial-landmark detection endpoint via AWS Rekognition (`Scalpify-ML/api/app/services/facial_recognition_service.py`).

### Folder hierarchy (annotated)

```
Scalpify-FYP/
├── README.md                         # Top-level project readme (stack: Supabase · Replicate)
├── diagrams/                         # Seven+ UML/architecture PNGs (use case, architecture, ERD, class, component, sequence, activity, state)
│
├── Scalpify-App/                     # Expo / React Native + TypeScript mobile client (frontend)
│   ├── index.ts                      # Entry: registerRootComponent(App)
│   ├── App.tsx                       # Root: store hydration + notification wiring + providers
│   ├── app.json                      # Expo config (newArchEnabled, plugins: notifications, datetimepicker)
│   ├── package.json                  # Frontend dependencies + scripts
│   ├── tsconfig.json                 # TypeScript config (strict, extends expo base)
│   ├── .env / .env.example           # EXPO_PUBLIC_* env (API base URL, dev LAN IP)
│   ├── README.md                     # Frontend run/build notes
│   └── src/
│       ├── api.ts                    # HTTP client: /analyze, /chat, /hair-journey/generate
│       ├── config.ts                 # Resolves API_BASE_URL per environment; APP_VERSION
│       ├── navigation.tsx            # Root stack + bottom tabs + custom tab bar + dark theme
│       ├── onboardingFlow.ts         # Branched questionnaire ordering + advance helpers
│       ├── theme.ts                  # Design tokens (colors, spacing, radius, typography, shadow)
│       ├── userStore.ts              # Account + medical profile store; auth lifecycle
│       ├── medsStore.ts              # Medications, adherence, dose log; schedules reminders
│       ├── scanStore.ts              # Scan history store (max 60)
│       ├── chatStore.ts              # Chat history store (max 100)
│       ├── dailyLog.ts               # Per-day scalp journal store
│       ├── medicalContext.ts         # Pure risk/recovery heuristics
│       ├── notifications.ts          # expo-notifications local reminders
│       ├── screens/                  # All screen components (Splash, Welcome, Onboarding*, Auth, Home, Camera, ScanResults, Norwood, Journey, Chat, Meds, MedicalProfile, Profile, RecoveryCalendar)
│       └── components/               # Reusable UI kit (ui, Header, GlobalBackground, charts, onboarding, ScalpOutline, BeforeAfterScalp, WireframeHead, RulerPicker)
│
└── Scalpify-ML/                      # Python ML + FastAPI backend
    ├── app.py                        # Standalone CLI baldness-analysis tool (offline harness)
    ├── requirements.txt              # Backend dependencies (unpinned)
    ├── README.md                     # Backend run/deploy guide
    ├── .env                          # Active backend env (REPLICATE_API_TOKEN, OPENAI_API_KEY)
    ├── model/                        # YOLO weights: best.pt, bald_back_model.pt, selfie_model.pt
    ├── testing/                      # Sample scalp images for batch testing
    ├── output/ , outputs/            # Annotated analysis outputs / generated journey PNGs
    ├── src/
    │   ├── utils/                    # yolov11_bald_segmentation_script.py, calculate_bald_area.py
    │   └── components/               # bald_area_calculation_service.py (prod), hair_journey_generation_service.py
    ├── scripts/                      # Journey-generation iterations + deployment helpers
    │   ├── grounded_hair_journey.py  # Region-grounding library (analyze_bald_region)
    │   ├── inpaint_hair_journey.py   # FLUX.1 Fill inpainting
    │   ├── inpaint_journey_v2.py     # Chained inpainting
    │   ├── nano_pro_journey.py       # Chained nano-banana-pro (current technique)
    │   ├── download_models_from_aws.py  # Pull .pt weights from S3
    │   └── test_api_journey.py       # Production service test harness
    └── api/
        ├── migrations/               # SQL DDL: create_tables.sql, create_hair_journey_table.sql
        └── app/
            ├── main.py               # FastAPI app: lifespan, middleware, handlers, mounts
            ├── core/                 # config.py (Settings), exceptions.py, supabase_client.py
            ├── models/               # schemas.py (Pydantic request/response models)
            ├── services/             # analysis, chat, facial_recognition, hair_journey services
            ├── utils/                # coordinate_extractor.py (mask → geometry)
            └── api/v1/               # router.py + endpoints (analysis, hair_journey, facial_recognition, chat, health)
```

### Purpose of each major file

| File | Purpose |
|------|---------|
| `Scalpify-App/App.tsx` | Hydrates all stores, wires medication notifications, renders providers/background. |
| `Scalpify-App/src/api.ts` | Single typed gateway to the three backend endpoints; JPEG re-encode + timeouts. |
| `Scalpify-App/src/config.ts` | Resolves `API_BASE_URL` for dev/prod; reads version from package.json. |
| `Scalpify-App/src/navigation.tsx` | Whole nav tree: root stack + bottom tabs + custom tab bar. |
| `Scalpify-App/src/userStore.ts` | UserProfile + MedicalProfile store; sign up/in/out; wipes data on account change. |
| `Scalpify-App/src/medsStore.ts` | Meds CRUD, adherence stats, dose log; schedules/cancels reminders. |
| `Scalpify-App/src/medicalContext.ts` | Heuristic AGA risk + recovery-projection shift logic. |
| `Scalpify-ML/api/app/main.py` | FastAPI bootstrap: app creation, CORS/TrustedHost/timing middleware, global handlers, static mount, root endpoint, Uvicorn run. |
| `Scalpify-ML/api/app/core/config.py` | Pydantic `Settings` for all config + `get_settings()` lru_cache. |
| `Scalpify-ML/api/app/core/supabase_client.py` | DB + storage layer with graceful degradation when Supabase absent. |
| `Scalpify-ML/api/app/services/analysis_service.py` | YOLO inference orchestration → measurements, severity, Norwood, coordinates. |
| `Scalpify-ML/api/app/services/hair_journey_service.py` | Replicate-backed generative recovery preview, grounded by YOLO. |
| `Scalpify-ML/src/components/bald_area_calculation_service.py` | Production YOLO segmentation engine (`YOLOTesterWithAnnotations`). |
| `Scalpify-ML/app.py` | Standalone CLI counterpart sharing the same YOLO core. |

### Full technology stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Mobile framework | Expo (~54) / React Native (0.81.5) | Cross-platform iOS/Android app (`Scalpify-App/package.json`) |
| Language (frontend) | TypeScript (~5.9) | Type-safe app code (`Scalpify-App/tsconfig.json`) |
| UI runtime | React 19.1.0 | Component model |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) | Screen routing (`navigation.tsx`) |
| State management | Custom `useSyncExternalStore` stores | Global state, no Redux/Zustand (`userStore.ts` et al.) |
| Local persistence | AsyncStorage 2.2.0 | Device-local data (`scalpify.*.v1` keys) |
| Camera / images | expo-camera, expo-image-picker, expo-image-manipulator | Capture/pick/re-encode photos |
| Notifications | expo-notifications | Local medication reminders (`notifications.ts`) |
| Date/time UI | @react-native-community/datetimepicker | Med schedules |
| Graphics | react-native-svg, expo-linear-gradient | Charts, overlays, gradients |
| Gestures/haptics | react-native-gesture-handler, expo-haptics | Zoom slider, before/after wipe, ruler picker |
| Icons | @expo/vector-icons (Ionicons) | UI icons |
| Backend framework | FastAPI | REST API (`api/app/main.py`) |
| ASGI server | Uvicorn | Serves FastAPI (port 8000) |
| Language (backend) | Python (3.12) | Backend + ML |
| Config | pydantic-settings, python-dotenv | Typed settings from `.env` |
| File uploads | python-multipart | multipart/form-data parsing |
| ML model | YOLOv11 segmentation via Ultralytics | Bald/hair instance segmentation (`best.pt`) |
| DL backend | PyTorch (torch) | Powers Ultralytics inference |
| Image processing | OpenCV (opencv-python), Pillow, NumPy | Masks, contours, areas, image I/O |
| Generative AI | Replicate — `google/nano-banana-pro` (also nano-banana-2, FLUX.1 Fill, Qwen in scripts) | Hair-journey recovery preview |
| Chat AI | OpenAI (gpt-4o-mini) | Grounded assistant (`chat_service.py`) |
| Facial recognition | AWS Rekognition via boto3 | Face landmarks/attributes |
| Database | Supabase (PostgreSQL) | Sessions, results, journeys |
| Object storage | Supabase Storage (uploads, processed, hair-journey buckets) | Image files |
| Model storage | AWS S3 (`gasp-ai-models`) | Distributes `.pt` weights (`download_models_from_aws.py`) |
| Deployment | Manual Uvicorn (optional systemd + Nginx) on AWS EC2; Expo/EAS for app | Self-hosted backend at `http://51.21.1.14` |

---

## Phase 2 — Architecture Analysis

### Overall system architecture

Scalpify is a **three-tier client–server system with an embedded ML/AI processing layer** and external SaaS providers. The architecture diagram (`diagrams/fig2_architecture.png`) presents it as five layers: Presentation (Expo/RN client, stores, navigation, AsyncStorage), API/Service (FastAPI app + endpoints), Processing & AI (YOLOv11, mask extraction, Replicate, classification, coordinate/area calculators, Rekognition), Data & Storage (Supabase Postgres + Storage, local filesystem, model registry), and Cross-Cutting Concerns (Pydantic validation, request-ID tracing, quality gate, CORS/logging).

The mobile app is **offline-first**: all user data lives in AsyncStorage and the app only contacts the backend for three AI operations (analyze, chat, hair-journey). There is no per-user backend persistence of profile data; the backend persists only analysis sessions, results, and journeys keyed by an optional `user_id` text column.

### Frontend architecture

The frontend (`Scalpify-App/`) is a single Expo app booting from `index.ts` → `App.tsx`. Global state uses a **custom external-store pattern** built on React 18's `useSyncExternalStore`: each store (`userStore`, `medsStore`, `scanStore`, `chatStore`, `dailyLog`) is a singleton module holding a `let` state variable, a `Set` of listeners, and `emit()`/`subscribe()`, persisting to AsyncStorage under versioned keys (`Scalpify-App/src/userStore.ts:10-17`). Screens subscribe via hooks (`useUser`, `useMeds`, `useScanHistory`, etc.) rather than prop drilling. Navigation is one root native stack containing a nested bottom-tab navigator (`navigation.tsx:80-135`), with a module-level `navigationRef` so the notification handler can navigate from non-component code (`App.tsx`).

> Note: `diagrams/fig2_architecture.png` labels the stores "Zustand Stores," but the actual implementation is hand-rolled `useSyncExternalStore` modules, not Zustand (per the frontend infrastructure analysis).

### Backend architecture

The backend (`Scalpify-ML/api/app/`) is a FastAPI application using the **service-layer pattern**: thin HTTP endpoint modules (`api/v1/endpoints/*`) delegate to fat service classes (`services/*`) that encapsulate business logic and call the ML core or external providers. Configuration is a cached Pydantic `Settings` singleton (`config.py`). A two-tier router mounts an aggregator (`router.py`) under `/api/v1` (`main.py:167`). Custom middleware adds request-ID tracing and timing headers (`main.py:82-97`). Every optional dependency (Supabase, OpenAI, Replicate, AWS) **degrades gracefully** — missing credentials yield mock data or explicit 503s rather than crashes.

### ML architecture

Two distinct AI capabilities: (1) **discriminative** — a fine-tuned **YOLOv11 instance-segmentation** model (`model/best.pt`) producing bald/hair masks, run via Ultralytics and standardized to 512×512 (`bald_area_calculation_service.py:91-94`); (2) **generative** — a Replicate-hosted diffusion pipeline (`google/nano-banana-pro`) that progressively edits the user's photo across six recovery stages, **grounded** by a custom YOLO-mask-derived English phrase describing where the bald zone is (`scripts/grounded_hair_journey.py`). The same YOLO core is shared by the CLI (`app.py`), the analysis API, and journey grounding.

### Database architecture

Supabase/PostgreSQL with three tables: `analysis_sessions` (1) → `analysis_results` (N, FK `session_id` `ON DELETE CASCADE`), and a standalone `hair_journey_sessions` (`api/migrations/*.sql`). Users link only loosely via a nullable `user_id` text column — there is no `users` table server-side; the canonical user record lives only in the app's AsyncStorage. Three storage buckets (`uploads`, `processed`, `hair-journey`) hold images, written with the service-role admin client (`supabase_client.py:148-158`).

### API architecture

REST over HTTP, all under `/api/v1`. Multipart uploads for image endpoints (`/analyze`, `/facial-recognition`, `/hair-journey/generate`), JSON for `/chat`. Uniform error envelopes (`{success, status, error:{code,message,details}, request_id, timestamp}`) from global handlers (`main.py:100-164`), with endpoints also catching locally. Pydantic schemas (`schemas.py`) drive validation and OpenAPI docs (exposed at `/docs` only when `DEBUG`).

### Authentication flow

There is **no server-side authentication**. The OpenAPI description states "Currently open API" (`main.py:57`), `ENABLE_API_KEY_AUTH` defaults `False` (`config.py:56`), and no route has an auth dependency. On the client, "auth" is **local-only**: `signUp` mints a device-local user and wipes prior data; `signIn(email)` succeeds only if the locally stored email matches (`userStore.ts:137-160`). Passwords are validated but never stored.

```
Local auth (client only):
  SignUp form ── signUp() ──► clear prior data ──► mint u_<id> ──► AsyncStorage(scalpify.user.v1)
  SignIn form ── signIn(email) ──► email matches stored? ──► yes: reset→MainTabs / no: "Account not found"
  Backend: receives no credentials; user_id is an optional, unauthenticated label.
```

### End-to-end data flow

User captures a photo → client re-encodes to JPEG (`api.ts:73-83`) → `POST /api/v1/analyze` (multipart) → endpoint validates + creates a Supabase session → `AnalysisService.process_full_analysis` standardizes to 512×512, runs YOLO, computes ratios/cm²/severity/Norwood/coordinates → uploads original+annotated to Storage, saves result row → returns `AnalysisResponse` → client stores it in `scanStore` and renders the Scalp Report. Optionally the user generates a hair-journey (`POST /hair-journey/generate`) and chats (`POST /chat`).

#### (1) Architecture diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION (Mobile)                       │
│  Expo / React Native + TS                                       │
│  Screens ◄── hooks ── Custom Stores (useSyncExternalStore)      │
│                          └─ persist → AsyncStorage (local only) │
│  api.ts (fetch + JPEG re-encode + timeouts)                     │
└───────────────────────────────┬──────────────────────────────┘
                                 │ HTTPS/JSON + multipart
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                      API / SERVICE (FastAPI)                    │
│  main.py: CORS · TrustedHost · request-ID/timing middleware     │
│  /api/v1 router → endpoints: analyze · chat · hair-journey ·    │
│                   facial-recognition · health                   │
│  → services (analysis · chat · facial · hair_journey)           │
└───────┬───────────────────┬───────────────────┬───────────────┘
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│ PROCESSING/AI │   │ EXTERNAL PROVIDERS│   │   DATA / STORAGE      │
│ YOLOv11(best) │   │ Replicate(nano-pro)│  │ Supabase Postgres     │
│ Coord/Area    │   │ OpenAI (chat)      │  │ Supabase Storage      │
│ Severity/NW   │   │ AWS Rekognition    │  │ AWS S3 (model weights)│
└──────────────┘   └──────────────────┘   └──────────────────────┘
```

#### (2) Request-response flow diagram

```
[App] --POST /api/v1/analyze (multipart: file,user_id)--> [FastAPI endpoint]
        validate file ──► create Supabase session ──► AnalysisService
        ──► YOLO predict (512²) ──► measurements/severity/Norwood/coords
        ──► upload original+annotated (Storage) ──► save_analysis_result
[App] <-------------- AnalysisResponse JSON (+X-Request-ID,X-Process-Time) ----
   store in scanStore ──► render ScanResultsScreen
```

#### (3) Data pipeline diagram

```
Image upload (JPEG ≤1600px)
   ▼
Validate: type/size/dimensions(224²–4096²) + quality gate (brightness/contrast/blur)
   ▼
Resize 512×512 (LANCZOS) → YOLOv11 segmentation (iou=0.4, mask>0.5)
   ▼
Bald & hair pixel areas → baldness_ratio = bald/(bald+hair)*100
   ▼
cm²/inch² estimate (15 cm head-width reference) + severity + Norwood bucket
   ▼
Coordinate extraction (OpenCV contours → boundary/simplified/hull)
   ▼
[Optional] Hair-journey: ground bald region → nano-banana-pro × 6 stages (chained)
   ▼
Storage: Supabase buckets (uploads/processed/hair-journey) + DB rows
   ▼
Return JSON → App stores in scanStore/scan history → renders report/timeline
```

---

---

I have now read all the screen files fully, plus the navigation, stores, API layer, and supporting modules. I have everything needed to write the complete documentation section.

## Phase 3a — Frontend Screens

### Intro: app entry, screen map, and overall user flow

Scalpify's mobile client is an **Expo / React Native + TypeScript** app. Everything boots from `index.ts`, which calls `registerRootComponent(App)` (`Scalpify-App/index.ts:8`). `App.tsx` is the real root component (`Scalpify-App/App.tsx:37`). Before any UI renders, `App` does two things:

1. **Hydrates all local state stores** in parallel — user profile, meds, scans, daily log, and chat history — and only flips a `ready` flag once they finish (`App.tsx:40-42`). Until then it shows a centered `ActivityIndicator` (`App.tsx:60-66`). This means the app is fully offline-first; all data lives in `AsyncStorage`, not a backend (confirmed by `userStore.ts:10-12` comments and `ProfileScreen` "LOCAL-ONLY STORAGE" copy).
2. **Wires up medication notifications** — sets foreground behaviour (`configureNotifications()` at `App.tsx:18`), registers the "Taken ✓ / Snooze" action buttons (`registerMedNotifications()` at `App.tsx:46`), and listens for notification taps via `addNotificationResponseReceivedListener` plus a cold-start check with `getLastNotificationResponseAsync` (`App.tsx:45-52`). The handler `handleMedNotification` (`App.tsx:21-35`) marks a dose done, snoozes 15 min, or navigates to the `Track` tab depending on which action button was pressed.

The app is wrapped in `GestureHandlerRootView` → `SafeAreaProvider`, with a `StatusBar` and a `GlobalBackground` radial-glow layer behind everything (`App.tsx:54-59`).

**Screen map (all routes declared in `Scalpify-App/src/navigation.tsx`):**

| Layer | Screens |
|---|---|
| Entry / Auth | Splash → Welcome → Onboarding (carousel) → SignUp / SignIn |
| Onboarding questionnaire (12 step screens) | OnbTreatment, OnbAge, OnbSex, OnbOnset, OnbEthnicity, OnbFamily, OnbSurgery, OnbRoutine, OnbAdherence, OnbGoals, OnbIntent, OnbReminders |
| Main app (bottom-tab `MainTabs`) | Home, Scan (= ScanResultsScreen), Track (= MedsScreen), Profile |
| Stack-pushed feature screens | Camera, Chat, Journey, NorwoodAnalysis, RecoveryCalendar, MedicalProfile |

**Typical user flow:** Splash decides between returning user (→ `MainTabs`) and new user (→ `Welcome`) based on whether a persisted `user` exists (`SplashScreen.tsx:30-32`). New users go Welcome → Onboarding carousel → SignUp → 12-question branched questionnaire → into `MainTabs`. Inside the app: Home is the dashboard; Scan opens the Camera to capture a scalp photo, runs AI analysis, and shows the Scalp Report; Track manages medications/adherence; Profile manages account + opens MedicalProfile; Chat is an AI assistant reachable from Home.

---

### Navigation structure

Defined in `Scalpify-App/src/navigation.tsx`. It uses **one root native-stack navigator** (`createNativeStackNavigator`, `navigation.tsx:80`) containing a nested **bottom-tab navigator** (`MainTabs`, `navigation.tsx:123-135`).

- **Param lists** are strongly typed: `RootStackParamList` (`navigation.tsx:41-69`) and `TabParamList` (`navigation.tsx:71-76`). The 12 onboarding routes all accept an optional `{ edit?: boolean }` param so a single question screen can be reopened from Profile to edit just that answer (`navigation.tsx:57-68`).
- A module-level `navigationRef` (`createNavigationContainerRef`, `navigation.tsx:78`) is exported so non-component code (the notification handler in `App.tsx`) can navigate.
- **Custom tab bar** `CustomTabBar` (`navigation.tsx:85-121`) renders 4 items: Home (`grid`), Scan→"Analysis" (`scan`), Track→"Calendar" (`calendar`), Profile (`person`). The focused tab gets a filled pill behind the icon (`iconWrapOn`, `navigation.tsx:213-215`).
- `MainTabs` maps tab names to screens (`navigation.tsx:129-132`): **Scan → `ScanResultsScreen`**, **Track → `MedsScreen`** (note the label/component mismatch is intentional).
- The whole tree is themed dark via `NavigationContainer theme` (`navigation.tsx:139-157`), and all screens have `headerShown: false` (`navigation.tsx:159`). `Camera` is presented as a `fullScreenModal` (`navigation.tsx:166`).

---

### Onboarding flow ordering

The branching logic lives in `Scalpify-App/src/onboardingFlow.ts`. After answering "Have you had a transplant?" the flow splits:

```
DONE     → Treatment, Age, Sex, Onset, Ethnicity, Family, Surgery, Routine, Adherence, Reminders
NOT DONE → Treatment, Age, Sex, Onset, Ethnicity, Family, Goals,   Intent,  Reminders
```

(`onboardingFlow.ts:7-23`). Constants `ONB_COMMON`, `ONB_DONE`, `ONB_NOTDONE`, `ONB_TAIL` (`onboardingFlow.ts:10-14`) build the per-branch order via `onbOrder(treatmentDone)` (`onboardingFlow.ts:22-24`). Helpers:

- `onbStep(current, treatmentDone)` → `{ step, total }` for the progress bar (`onboardingFlow.ts:26-30`).
- `onbNext` → next route or `null` (`onboardingFlow.ts:32-37`).
- `goNext` → navigate to next, or `nav.reset` into `MainTabs` when finished (`onboardingFlow.ts:40-44`).
- `advance(nav, route, current, treatmentDone)` → in **edit mode** (`route.params.edit`) just `goBack()` to Profile; otherwise continue the flow (`onboardingFlow.ts:50-56`).

Every step screen follows the same recipe: read existing value from `useUser()`, hold it in local `useState`, on continue call `updateMedical({...})` then `advance(...)`. The shared UI is `OnboardingScaffold` (with `RadioOption`/`CheckOption`/`RulerPicker`) from `src/components/onboarding`.

---

### Authentication screens flow (SignIn / SignUp)

Auth is **local-only** — there is no auth server. `userStore.ts` stores a single `UserProfile` in `AsyncStorage` under `scalpify.user.v1`.

- **SignUp** (`SignUpScreen.tsx`): collects name, email, password, confirm, optional surgery date, and a consent checkbox. Validation: name/email required, password ≥ 6 chars, passwords must match, surgery date must match `YYYY-MM-DD` (`SignUpScreen.tsx:28-35`). On success it calls `signUp(...)` — which **wipes any previous user's local data** first (`userStore.ts:137-139`) and creates a new id — then `nav.reset` to **`OnbTreatment`** so Back can't return to the form (`SignUpScreen.tsx:38-41`). Password is never stored (only used for validation).
- **SignIn** (`SignInScreen.tsx`): email + password fields. `signIn(email)` returns the persisted user only if the stored email matches (`userStore.ts:153-160`); otherwise an "Account not found" alert. On match, `nav.reset` to `MainTabs` (`SignInScreen.tsx:27-33`). "Forgot password" shows an alert explaining auth is local-only (`SignInScreen.tsx:64-70`).
- **SignOut** (used by Profile) wipes all user-scoped data so the next account starts clean (`userStore.ts:162-168`).

---

### Per-screen reference

#### SplashScreen — `src/screens/SplashScreen.tsx`

| Field | Detail |
|---|---|
| Purpose | Animated brand splash; routes returning vs new users. |
| Key components | `Animated.Image` logo, animated progress bar, footer tagline. |
| Props | None (route component). |
| State | None (`useState`); uses `useRef` animated values `fade`, `scale`, `barW` (`SplashScreen.tsx:15-17`). |
| Hooks | `useNavigation`, `useUser()`, `useEffect` (runs parallel/spring/timing animations + a 2600 ms timer) (`SplashScreen.tsx:19-34`). |
| APIs | None. |
| Navigation | After 2.6 s: `nav.reset` → `MainTabs` if `user` exists else `Welcome` (`SplashScreen.tsx:30-32`). |
| Notable | Timer cleared on unmount; bar width interpolates 0→100%. |

#### WelcomeScreen — `src/screens/WelcomeScreen.tsx`

| Field | Detail |
|---|---|
| Purpose | First-impression landing with primary CTA + guest mode. |
| Key components | Logo, "Sign In / Get Started" `Pressable`, "Explore as Guest" link, decorative diagonal lines. |
| Props | None. |
| State | None; `useRef` animated values `brandFade`, `brandSlide`, `ctaFade` (`WelcomeScreen.tsx:14-16`). |
| Hooks | `useNavigation`, `useEffect` for entrance animation sequence (`WelcomeScreen.tsx:18-26`). |
| APIs | None. |
| Navigation | Primary → `Onboarding` (`WelcomeScreen.tsx:40`); Guest → `nav.reset` to `MainTabs` (`WelcomeScreen.tsx:47`). |

#### OnboardingScreen — `src/screens/OnboardingScreen.tsx`

| Field | Detail |
|---|---|
| Purpose | 4-page horizontal value-prop carousel (scan, journey, medical, track) before sign-up. |
| Key components | Paging `FlatList` of `PAGES`, custom SVG visuals (`ScanVisual`, `JourneyVisual`, `MedicalVisual`, `TrackVisual`), `WireframeHead`, progress dots, `PrimaryButton`. |
| Props | None. |
| State | `currentIndex` (`useState`, `OnboardingScreen.tsx:71`); `flatListRef`, `onViewableChanged`, `viewConfig` via `useRef` (`OnboardingScreen.tsx:72-82`). |
| Hooks | `useNavigation`, `useRef`. |
| APIs | None (visuals are static SVG mocks). |
| Navigation | `goNext` scrolls to next page or, on last page, → `SignUp` (`OnboardingScreen.tsx:84-90`); Skip → `SignUp` (`OnboardingScreen.tsx:92-94`). |
| Notable | Heavy hand-built SVG (`react-native-svg`) illustrations; copy references "YOLO-powered computer vision … 98% detection accuracy" and "Generative AI" hair-journey. |

#### SignInScreen — `src/screens/SignInScreen.tsx`

| Field | Detail |
|---|---|
| Purpose | Local sign-in. |
| Key components | `Card`, `Field`, password `TextInput` with show/hide eye, `PrimaryButton`, `GhostLink`, trust footer. |
| Props | None. |
| State | `email`, `password`, `show`, `submitting` (`SignInScreen.tsx:16-19`). |
| Hooks | `useNavigation`, `useState`. |
| APIs | `signIn(email)` from `userStore` (`SignInScreen.tsx:27`). |
| Navigation | Success → reset to `MainTabs`; "Sign Up" → `SignUp` (`SignInScreen.tsx:103`). |
| Notable | Validates non-empty fields; "Forgot password" explains local-only model. |

#### SignUpScreen — `src/screens/SignUpScreen.tsx`

| Field | Detail |
|---|---|
| Purpose | Create local account; entry into the onboarding questionnaire. |
| Key components | `ScreenProgress` (30%), `Card`, custom `BoxField`s, consent checkbox, `PrimaryButton`, `TrustItem` row. |
| Props | None. |
| State | `name`, `email`, `password`, `confirm`, `surgeryDate`, `agreed`, `submitting` (`SignUpScreen.tsx:20-26`). |
| Hooks | `useNavigation`, `useState`. |
| APIs | `signUp({fullName, email, surgeryDate})` (`SignUpScreen.tsx:38`). |
| Navigation | Success → `nav.reset` to `OnbTreatment` (`SignUpScreen.tsx:41`); "Log In" → `SignIn`. |
| Notable | `ISO_DATE_RE` validates surgery date (`SignUpScreen.tsx:16`); create button disabled until consent checked. |

#### Onboarding questionnaire screens (12)

All live in `src/screens/Onboarding*Screen.tsx` and share the pattern: `useNavigation`/`useRoute`, `useUser()`, local `useState` seeded from `user.medical`, `onbStep(...)` for progress, save via `updateMedical(...)`, then `advance(nav, route, ...)`. They render `OnboardingScaffold`. None call network APIs.

| Screen / Path | Question & input | State | Saves field(s) | Notable |
|---|---|---|---|---|
| OnbTreatment — `OnboardingTreatmentScreen.tsx` | "Have you had a transplant?" two `RadioOption`s | `done: boolean\|null` | `treatmentDone` | **Branch selector** — drives whole flow length. |
| OnbAge — `OnboardingAgeScreen.tsx` | Age via `RulerPicker` (16–90) | `age` (default 26) | `age` | Editable later from Profile via `{edit:true}`. |
| OnbSex — `OnboardingSexScreen.tsx` | Biological sex, 4 `RadioOption`s | `value: Sex\|null` | `sex` | Gates PCOS/pregnancy questions elsewhere. |
| OnbOnset — `OnboardingOnsetScreen.tsx` | Age first noticed loss, `RulerPicker` (10–70) | `onset` | `ageOfOnset` | Defaults to current age if known. |
| OnbEthnicity — `OnboardingEthnicityScreen.tsx` | Ethnic background, 8 `RadioOption`s | `value: Ethnicity\|null` | `ethnicity` | — |
| OnbFamily — `OnboardingFamilyScreen.tsx` | Family history, 5 `RadioOption`s | `value: FamilyHistory\|null` | `familyHistory` | Strongest risk factor in `computeRisk`. |
| OnbSurgery — `OnboardingSurgeryScreen.tsx` | Technique (FUE/FUT/other) + optional surgery date + graft count | `tech`, `grafts`, `surgeryDate` | `surgeryTechnique`, `graftCount` (via `updateMedical`) + `surgeryDate` (via `updateUser`) | **DONE branch only.** Date validated `YYYY-MM-DD` (`OnboardingSurgeryScreen.tsx:30`); date powers the Home recovery counter. |
| OnbRoutine — `OnboardingRoutineScreen.tsx` | Current meds, multi-select `CheckOption`s | `meds: Medication[]` | `medications` | **DONE branch.** Continue label changes if none selected. |
| OnbAdherence — `OnboardingAdherenceScreen.tsx` | "How often do you skip?", 3 `RadioOption`s | `value: Adherence\|null` | `adherence` | **DONE branch**, label "Finish". |
| OnbGoals — `OnboardingGoalsScreen.tsx` | App goals, multi-select `CheckOption`s | `goals: Goal[]` | `goals` | **NOT-DONE branch.** |
| OnbIntent — `OnboardingIntentScreen.tsx` | Has a treatment routine?, 4 `RadioOption`s | `value: TreatmentIntent\|null` | `treatmentIntent` | **NOT-DONE branch**, label "Finish". |
| OnbReminders — `OnboardingRemindersScreen.tsx` | Soft pre-prompt to enable notifications | `busy: boolean` | none | **Shared final step.** "Enable reminders" calls `ensureNotificationPermission()` (`OnboardingRemindersScreen.tsx:34`); "Maybe later" skips. Either path then `advance` → resets into `MainTabs`. |

#### HomeScreen — `src/screens/HomeScreen.tsx` (Tab: Home)

| Field | Detail |
|---|---|
| Purpose | Dashboard: greeting, hero recovery/assessment card, density & adherence stats, AI assistant entry, today's protocol checklist, daily reflection. |
| Key components | Header (logo, chat icon, avatar), `WireframeHead`, recovery progress bar OR assessment summary, two stat cards with `MiniSparkLine` (custom SVG), "Ask Scalpify" card, protocol list, quote block. |
| Props | None. |
| State | None (`useState`); `useMemo` for `now` and `last7` adherence series (`HomeScreen.tsx:105,132-142`). |
| Hooks | `useNavigation`, `useUser()`, `useMeds()`, `useMedsRevision()` (re-render on mark-done), `useLatestScanFull()`, `useScanHistory()` (`HomeScreen.tsx:98-103`). |
| APIs / store fns | `daysSinceSurgery`, `firstNameOf`, `initialsOf`, `adherencePctForDate`, `adherenceStreak`, `formatTime`, `markDone`, `statusForToday`. No network. |
| Navigation | Recovery card → `RecoveryCalendar` (if `treatmentDone`) else → Scan tab; chat icon/Ask card → `Chat`; avatar → Profile tab; Density card → `NorwoodAnalysis`; Adherence card / empty-protocol → Track tab. |
| Notable | **Hero card branches on `treatmentDone`** (`HomeScreen.tsx:183`): post-op shows a Day X / 365 progress over 6 `PHASES`; not-yet shows latest baldness % or "no scan yet". Density delta computed from last two scans (`HomeScreen.tsx:118-122`). `quoteOfTheDay` rotates 15 quotes by day-of-year. Tapping a protocol item toggles `markDone`. |

#### CameraScreen — `src/screens/CameraScreen.tsx` (pushed, fullScreenModal)

| Field | Detail |
|---|---|
| Purpose | Capture or pick a scalp photo, collect optional context, run AI analysis. |
| Key components | `CameraView` (expo-camera), dark overlay, reticle, vertical zoom slider (`PanResponder`), lighting hint, shutter + Upload + Flash controls, busy/error/no-detection states, `PreScanModal` bottom sheet. |
| Props | None. |
| State | `facing`, `flash`, `torch`, `zoom`, `scan` (discriminated union `idle\|busy\|ok\|no-detection\|error`), `pendingUri` (`CameraScreen.tsx:36-42`); `cam`, `lastTapRef`, `railHeightRef`, `zoomPanResponder` via `useRef`. Modal holds `stress`, `sleep`, `shedding`, `pregnant`. |
| Hooks | `useCameraPermissions`, `useNavigation`, `useSafeAreaInsets`, `useUser()`, `useRef`, `useState`. |
| APIs | **`analyzePhoto(uri, user.id ?? 'guest')`** → `POST /analyze` (`CameraScreen.tsx:110`, `api.ts:118-139`). Stores result via `setLatestScan(...)` (scanStore). |
| Navigation | On successful analysis → `nav.reset` to `MainTabs` Scan tab (`CameraScreen.tsx:119-122`); back/close → `goBack` or `MainTabs`. |
| Notable | Double-tap flips camera (`handleDoubleTap`, 300 ms window). `runAnalyze` treats `coverage+baldness < 1` as **no-detection** (`CameraScreen.tsx:111-116`). `PreScanModal` only shows the pregnancy toggle when `user.medical.sex === 'female'` (`CameraScreen.tsx:286`). Image gets JPEG-converted/downscaled in `toJpeg` before upload. |

#### ScanResultsScreen — `src/screens/ScanResultsScreen.tsx` (Tab: Scan / "Analysis")

| Field | Detail |
|---|---|
| Purpose | The "Scalp Report" — full breakdown of the latest scan + optional AI recovery preview. |
| Key components | `ScreenProgress`, `AppHeader`, photo with overlay legend pills, `BeforeAfterScalp` drag-compare (if coordinates), `NorwoodBars`, hair-coverage/baldness stat cards, calculated cm² area, `generateClinicianNote` card, disclaimer + feedback, recent-scans thumbnails, hair-journey preview. Empty state when no scan. |
| Props | None. |
| State | `gen` (`idle\|busy\|ok\|error`) (`ScanResultsScreen.tsx:61`). |
| Hooks | `useNavigation`, `useLatestScanFull()`, `useScanHistory()`. |
| APIs | **`generateHairJourney(scan.photoUri)`** → `POST /hair-journey/generate` (`ScanResultsScreen.tsx:117`, `api.ts:163-180`). Also `Share.share` and `Linking.openURL` mailto for feedback. |
| Navigation | "Take a scan"/"New Scan" → `Camera`; "Treatment Plan" → Track tab; "View Trends" → `NorwoodAnalysis`; "View History" → `Journey`. |
| Notable | `severityVariant` maps severity → pill color; `generateClinicianNote` produces tier-specific advice from coverage/baldness/Norwood (`ScanResultsScreen.tsx:35-45`). Baldness ratio shown as a 0–1 decimal in its stat card. Recovery preview ~2-3 min generation. |

#### NorwoodAnalysisScreen — `src/screens/NorwoodAnalysisScreen.tsx` (pushed)

| Field | Detail |
|---|---|
| Purpose | Progression tracking: baldness-over-time chart, scan-activity month grid, scan-history table, AI insight ring. |
| Key components | `AppHeader`, `PageTitle`, `Card`, `Segmented` (3/6 months), `SparkLine`, scan-activity calendar grid, history table with `Pill` trend badges, `ProgressRing` insight. |
| Props | None. |
| State | `range: '3'\|'6'` (`NorwoodAnalysisScreen.tsx:34`); `chart` & `monthGrid` via `useMemo` (`...:36,46-67`). |
| Hooks | `useScanHistory()`, `useMemo`, `useState`. |
| APIs | None. |
| Navigation | Back via `AppHeader showBack`. |
| Notable | `bucketByMonth` keeps the latest scan per month within the window (`...:14-30`). `delta` = newest−oldest coverage; insight title/body branch on `< 2 scans`, stable, up, or down. Activity grid is Mon-first, sliced to 21 cells. |

#### JourneyScreen — `src/screens/JourneyScreen.tsx` (pushed)

| Field | Detail |
|---|---|
| Purpose | Regrowth simulation: baseline vs simulated compare, iteration timeline, generation trigger, treatment parameters. |
| Key components | `ScreenProgress`(60), `AppHeader`, `PageTitle`, `Compare` boxes, iteration slider (`ITERATIONS=[5,10,15,20]`), session card with `KeyValue` rows, `PrimaryButton` generate, parameters `Pill`s, info card. |
| Props | None (uses `Compare`/`KeyValue` sub-components). |
| State | `iter` (default 20), `gen` union (`...:27-28`); `densityDelta`, `simulatedUri` via inline/`useMemo` (`...:34-51`). |
| Hooks | `useNavigation`, `useUser()`, `useScanHistory()`, `useLatestScanFull()`, `useMemo`, `useState`. |
| APIs | **`generateHairJourney(latest.photoUri)`** → `POST /hair-journey/generate` (`JourneyScreen.tsx:57`). |
| Navigation | "Adjust" parameters → `MedicalProfile` (`...:155`). |
| Notable | `simulatedUri` = last iteration image once generated, else the latest photo. Parameters derive from `treatmentSummary(user.medical)`; falls back to demo pills (`Minoxidil 5%`, `Dermaroller`) if none. |

#### ChatScreen — `src/screens/ChatScreen.tsx` (pushed)

| Field | Detail |
|---|---|
| Purpose | Grounded AI assistant for scan/meds/recovery questions. |
| Key components | Header (back, avatar, new-chat), empty state with suggestion chips, inverted `FlatList` of `Bubble`s, `TypingBubble`, error bar, `KeyboardAvoidingView` composer. |
| Props | None. |
| State | `input`, `sending`, `error` (`...:61-63`); `listRef` ref; `data` reversed messages & `empty` via `useMemo` (`...:116-117`). |
| Hooks | `useNavigation`, `useUser()`, `useLatestScanFull()`, `useMeds()`, `useMedsRevision()`, `useChatMessages()`, `useCallback` (`buildContext`, `send`). |
| APIs | **`sendChatMessage(turns, context)`** → `POST /chat` (`...:105`, `api.ts:143-161`). Persists via `appendMessage`; `clearChat` resets. |
| Navigation | Back via `nav.goBack`. |
| Notable | `buildContext` assembles a `ChatContext` snapshot — name, treatmentDone, recovery day & phase, age, sex, latest scan summary, med names, today's adherence — so replies are grounded (`...:66-87`). Recovery `phaseName` derived from `RECOVERY_PHASES`. Messages capped at 100 in `chatStore`. |

#### MedsScreen — `src/screens/MedsScreen.tsx` (Tab: Track / "Calendar")

| Field | Detail |
|---|---|
| Purpose | Medication management: adherence ring + streak, active regimen cards, daily checklist, dose history, add/edit/remove meds with reminders. |
| Key components | `AppHeader`, `PageTitle`, adherence `ProgressRing`, streak bar, `MedCard`s (status-aware: done/now/upcoming), daily checklist, test-reminder button, dose-history list, FAB, `MedModal` (add/edit with `DateTimePicker`), `DoseTimeModal`. |
| Props | None on screen; sub-components take `med`/`entry`. |
| State | `adding`, `editMed`, `editingDose`, plus a 1-min `force` re-render (`...:55-63`). Modals hold `name`,`type`,`timeDate`,`showPicker`,`reminder`,`submitting` / `dt`,`picker`,`saving`. |
| Hooks | `useMeds()`, `useMedsRevision()`, `useEffect` (interval + modal prefill), `useState`. |
| APIs | None network. Store: `addMed`, `updateMed`, `removeMed`, `markDone`, `editDoseTime`, `statusForToday`, `adherenceStreak`, `getMedLog`. Notifications: `ensureNotificationPermission`, `sendTestReminder` (`...:21`). |
| Navigation | Self-contained (modals); App.tsx notifications can deep-link here. |
| Notable | Adding/editing a med with reminder asks permission first; if denied, saves without reminder (`...:334-343`). `pickPalette` hashes the name to an icon/color. Editing keeps the med id so adherence + dose log survive (`medsStore.ts:225-243`). `DoseTimeModal` can move a logged dose to another day. |

#### MedicalProfileScreen — `src/screens/MedicalProfileScreen.tsx` (pushed)

| Field | Detail |
|---|---|
| Purpose | Show onboarding answers read-only, edit lifestyle/conditions, preview computed risk + regrowth projection. Doubles as a first-run "Tell us about you" gate when `onboarding=true`. |
| Key components | `ScreenProgress` (90/75), `AppHeader`, `PageTitle`, risk card (or locked card pre-scan), onboarding-summary rows (Age editable), lifestyle `ToggleChip`s, recalibration note, save button, completeness footer. |
| Props | Route param `{ onboarding?: boolean }` (`...:73`). |
| State | `smoker`, `thyroid`, `pcos`, `recentIllness`, `highStress`, `vitDef`, `saving` (`...:79-85`); `previewProfile`, `risk`, `shift` via `useMemo`. |
| Hooks | `useNavigation`, `useRoute`, `useUser()`, `useScanHistory()`, `useMemo`, `useState`. |
| APIs | None network. `updateUser({ medical: previewProfile })`; `computeRisk`, `recoveryProjectionShiftDays`, `riskNote` from `medicalContext`. |
| Navigation | Age row → `OnbAge {edit:true}` (`...:179`). Save → if `onboarding` reset to `MainTabs`, else `goBack` (`...:108-113`). |
| Notable | **Risk & projection only unlock after the first scan** (`hasScan` gate, `...:135`). PCOS chip only shown when `sex==='female'`. `countMarkers`/`computeCompletePct` drive the "precision markers" and "% Complete" copy. |

#### ProfileScreen — `src/screens/ProfileScreen.tsx` (Tab: Profile)

| Field | Detail |
|---|---|
| Purpose | Account identity, settings list, local-only sync toggle (cosmetic), data persistence info / clear cache, sign in/out. |
| Key components | `AppHeader`, identity block (avatar initials, status dot, member-since, scan/regimen pills), settings `Card`, sync `Switch`, data card with Clear Cache, logout/sign-in, version footer. |
| Props | None. |
| State | `sync` (default false — no backend) (`...:35`). |
| Hooks | `useNavigation`, `useUser()`, `useScanHistory()`. |
| APIs | `signOut`, `clearScans`, `clearMeds`; `daysSinceSurgery`, `initialsOf`; `APP_VERSION` from config. |
| Navigation | "Personal Information" → `MedicalProfile`; Sign Out → reset to `Welcome` (`...:38-40`); Sign In → `SignIn`. |
| Notable | `handleClearCache` wipes scans + meds; copy emphasizes AsyncStorage (`scalpify.*.v1`) and on-device storage. Sync switch only changes label text — no real sync. |

#### RecoveryCalendarScreen — `src/screens/RecoveryCalendarScreen.tsx` (pushed)

| Field | Detail |
|---|---|
| Purpose | Post-surgery milestone tracker: current phase, monthly calendar with milestone/scan dots, daily log (sensation + notes), next milestone, care tip. |
| Key components | `ScreenProgress`, `AppHeader`, `PageTitle`, `Segmented` (Daily/Weekly), phase card with progress bar, month calendar grid, daily-log `Card` (sensation chips + notes + Save), next-milestone card, scientific-insight + care-tip cards. |
| Props | None; `Legend` sub-component. |
| State | `view`, `today`, `selected`, `viewMonth`, `sensation`, `notes`, `saving` (`...:52-58`); `phase`, `cells`, `nextMilestone` via `useMemo`. |
| Hooks | `useUser()`, `useScanHistory()`, `useDailyEntries()`, `daysSinceSurgery`, `useEffect` (hydrate form on date change), `useMemo`, `useState`. |
| APIs | None network. Daily log: `getEntry`, `saveEntry`. |
| Notable | `day` from `daysSinceSurgery`; 4 `PHASES` over `TOTAL_RECOVERY_DAYS=180`; `MILESTONE_DAYS=[7,14,28,60,90,120,180]` mapped onto calendar dates relative to surgery date. Selecting a day hydrates the log form; saving persists to `dailyLog` and re-renders via `useDailyEntries`. `tipForToday` rotates 7 tips by day-of-year; "See All Tips" shows an alert. |

---

### Cross-cutting notes

- **State management is a custom external-store pattern**, not Redux/Context: each store (`userStore`, `medsStore`, `scanStore`, `chatStore`, `dailyLog`) exposes `useSyncExternalStore`-based hooks (`useUser`, `useMeds`, `useMedsRevision`, `useLatestScanFull`, `useScanHistory`, `useChatMessages`, `useDailyEntries`) and persists to `AsyncStorage`. Screens subscribe via these hooks rather than props drilling.
- **Only three network endpoints exist** (all in `src/api.ts`): `POST /analyze` (CameraScreen), `POST /hair-journey/generate` (ScanResults + Journey), `POST /chat` (ChatScreen). Base URL resolves per environment in `config.ts`.
- **Reusable UI primitives** referenced across screens but defined under `src/components/` (not in scope here): `Card`, `Pill`, `PrimaryButton`/`SecondaryButton`, `Field`, `GhostLink`, `ScreenProgress`, `Segmented`, `AppHeader`/`PageTitle`, `ProgressRing`/`SparkLine`/`NorwoodBars`, `WireframeHead`, `BeforeAfterScalp`, `GlobalBackground`, and the onboarding `OnboardingScaffold`/`RadioOption`/`CheckOption`/`RulerPicker`.

---

I have read all files fully. Producing the documentation section now.

## Phase 3b — Frontend Infrastructure

This section documents the **frontend infrastructure** of the Scalpify mobile app — the shared plumbing that every screen depends on: the state stores, the HTTP/API client, the navigation tree, the design/theme system, the reusable component library, the local-notification layer, and the onboarding-flow definition. The app is a **React Native + Expo** application written in **TypeScript**. All files referenced here live under `Scalpify-App/src/`.

### 3b.0 Overview & architectural choices

| Concern | Implementation found in code | Notes |
| --- | --- | --- |
| State management | **Custom "vanilla" external stores** built on React's `useSyncExternalStore` hook — *no* Redux, MobX, Zustand, or Context API | Each store is a plain module that holds a `let` variable, a `Set` of listeners, an `emit()`/`subscribe()` pair, and exported hooks. See `userStore.ts`, `chatStore.ts`, `scanStore.ts`, `medsStore.ts`, `dailyLog.ts`. |
| Persistence | **`@react-native-async-storage/async-storage`** (device-local key/value store) | Every store serialises its state to JSON under a versioned key (e.g. `scalpify.user.v1`). There is **no per-user backend persistence** — data is device-global (Scalpify-App/src/userStore.ts:10-17). |
| Networking | Plain `fetch` wrapped with `AbortController` timeouts | No axios. See `api.ts`. |
| Navigation | **React Navigation** — native stack + bottom tabs | `@react-navigation/native`, `native-stack`, `bottom-tabs` (Scalpify-App/src/navigation.tsx:4-9). |
| Styling | **`StyleSheet.create`** + a central design-token module (`theme.ts`); SVG via `react-native-svg` | Dark "clinical" theme, glassmorphic cards, no third-party UI kit. |
| Notifications | **`expo-notifications`** local (on-device) scheduled reminders | `notifications.ts`. |

The state-management pattern is worth highlighting because it is unusual but deliberate. Instead of pulling in a library, each store is a singleton module:

```ts
let state = { ... };                  // the single source of truth
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }   // notify subscribers
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
export function useX() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

`useSyncExternalStore` is the official React 18 primitive for subscribing a component to an external (non-React) data source. When `emit()` runs, every subscribed component re-renders. This gives Redux-like global state with ~30 lines per store and zero dependencies.

---

### 3b.1 `config.ts` — environment / base-URL resolution

| Item | Detail |
| --- | --- |
| **File purpose** | Resolves the backend API base URL and exposes the app version, switching automatically between dev and production. |
| **Exports** | `APP_VERSION: string`, `API_BASE_URL: string` |
| **Dependencies** | `react-native` (`Platform`), `../package.json` (for the version) |
| **State / Hooks / Components** | None (pure module constants) |
| **APIs called** | None directly — it only *produces* the base URL other modules use. |

Logic (Scalpify-App/src/config.ts:9-21):

- `APP_VERSION` is read from `package.json`'s `version` field (Scalpify-App/src/config.ts:4).
- In **dev** (`__DEV__` true):
  - If `EXPO_PUBLIC_DEV_LAN_IP` is set → `http://<LAN_IP>:8000/api/v1` (used to reach a laptop server from a physical phone).
  - Else on **Android emulator** → `http://10.0.2.2:8000/api/v1` (the emulator's alias for the host machine's localhost).
  - Else (iOS simulator) → `http://localhost:8000/api/v1`.
- In **production**: requires `EXPO_PUBLIC_API_BASE_URL`; if missing it **throws** an explicit error telling the developer to configure the EAS/`.env` variable (Scalpify-App/src/config.ts:15-20).

This means the API contract is fixed at `/api/v1/...` and the server is expected on port `8000` in development.

---

### 3b.2 `api.ts` — the HTTP API client

| Item | Detail |
| --- | --- |
| **File purpose** | Single typed gateway to the backend. Handles JPEG re-encoding of photos, multipart uploads, JSON requests, request timeouts, and error-body parsing. |
| **Dependencies** | `expo-image-manipulator` (image resize/re-encode), `./config` (`API_BASE_URL`) |
| **State / Hooks / Components** | None — it is a stateless function library. |
| **Exported types** | `BoundaryPoint`, `ScanCoordinates`, `AnalyzeResponse`, `HairJourneyResponse`, `ChatRole`, `ChatTurn`, `ChatContext`, `ChatResponse` |
| **Exported functions** | `analyzePhoto`, `sendChatMessage`, `generateHairJourney` |

#### Internal helpers (not exported)

| Helper | Lines | Purpose |
| --- | --- | --- |
| `toJpeg(uri)` | 73-83 | Re-encodes any image (incl. HEIC) to JPEG via `ImageManipulator.manipulateAsync`, resizing to a max width of `MAX_DIM = 1600` at `compress: 0.92`. Comment notes it downscales only when larger, to preserve sharpness for the server's blur-detection quality gate. |
| `jpegFormPart(uri)` | 85-87 | Builds the `{ uri, name: 'photo.jpg', type: 'image/jpeg' }` object React Native FormData expects for a file part (cast to `Blob`). |
| `readErrorBody(res)` | 89-101 | Reads an error response body and tries to extract `error.message` or `detail` from JSON, falling back to raw text or `HTTP <status>`. |
| `fetchWithTimeout(url, init, ms)` | 103-116 | Wraps `fetch` with an `AbortController` that aborts after `ms`; converts an `AbortError` into a friendly "Request timed out after Ns — check Wi-Fi / server" message. |

#### Timeout constants

| Constant | Value | Used by |
| --- | --- | --- |
| `REQUEST_TIMEOUT_MS` | `90_000` (90 s) | `analyzePhoto` |
| `CHAT_TIMEOUT_MS` | `60_000` (60 s) | `sendChatMessage` |
| `HAIR_JOURNEY_TIMEOUT_MS` | `600_000` (10 min) | `generateHairJourney` (comment: "8 stages × ~13s + 11s pacing + retries", Scalpify-App/src/api.ts:71) |

#### Exported endpoint functions

| Function | Signature | HTTP method & endpoint | Request shape | Response type |
| --- | --- | --- | --- | --- |
| `analyzePhoto` | `(photoUri: string, userId: string) => Promise<AnalyzeResponse>` | `POST {API_BASE_URL}/analyze` | `multipart/form-data`: `file` (JPEG), `user_id`, `save_annotated='false'`, `include_coordinates='false'` (Scalpify-App/src/api.ts:123-127) | `AnalyzeResponse` |
| `sendChatMessage` | `(messages: ChatTurn[], context?: ChatContext) => Promise<ChatResponse>` | `POST {API_BASE_URL}/chat` | JSON `{ messages, context: context ?? null }` with header `Content-Type: application/json` (Scalpify-App/src/api.ts:147-154) | `ChatResponse` |
| `generateHairJourney` | `(photoUri: string) => Promise<HairJourneyResponse>` | `POST {API_BASE_URL}/hair-journey/generate` | `multipart/form-data`: `image` (JPEG) (Scalpify-App/src/api.ts:167-168) | `HairJourneyResponse` |

All three: re-encode the image first (when applicable), check `res.ok`, and on failure throw `new Error("... (HTTP <status>): <parsed body>")`.

#### Key response type shapes

`AnalyzeResponse` (Scalpify-App/src/api.ts:15-28):

```ts
{
  success: boolean;
  session_id: string;
  measurements: {
    percentage: { baldness_ratio: number; hair_coverage: number };
    cm2: { bald: number; hair: number; total_head: number };
  };
  classification: { severity: string; norwood_scale: string; confidence: number };
  coordinates?: ScanCoordinates;   // boundary polygons in pixel space
}
```

`ScanCoordinates` (Scalpify-App/src/api.ts:8-13) carries `bald_segments` / `hair_segments` (arrays of `{ simplified_boundary | boundary_points }`) and a `coordinate_space: { width, height }` — consumed by the `ScalpOutline` and `BeforeAfterScalp` components.

`ChatContext` (Scalpify-App/src/api.ts:50-65) is a snapshot of the user's data (name, treatment status, recovery day/phase, age, sex, latest scan severity/Norwood/percentages, medications, adherence) sent with each chat request so the assistant's replies are grounded in the user's situation.

`HairJourneyResponse` (Scalpify-App/src/api.ts:30-44) returns a `result` with `original_image_url`, `final_result_url`, and an `iterations[]` array (each with `iteration_number`, `image_url`, `processing_time_ms`).

---

### 3b.3 State stores

All stores share the same `useSyncExternalStore` pattern and persist to AsyncStorage. They are summarised together first, then detailed individually.

| Store file | AsyncStorage key(s) | Core data | Hydrate fn | Clear fn |
| --- | --- | --- | --- | --- |
| `userStore.ts` | `scalpify.user.v1` | current `UserProfile` (+ embedded `MedicalProfile`) | `hydrateUser` | `signOut` / `clearUserScopedData` |
| `chatStore.ts` | `scalpify.chat.v1` | array of `ChatMessage` (cap 100) | `hydrateChat` | `clearChat` |
| `scanStore.ts` | `scalpify.scans.v1` | array of `ScanRecord` (cap 60) | `hydrateScans` | `clearScans` / `removeScan` |
| `medsStore.ts` | `scalpify.meds.v1`, `.done.v1`, `.lastMarked.v1`, `.doneTimes.v1` | meds list + dose-completion sets | `hydrateMeds` | `clearMeds` / `clearAllMeds` |
| `dailyLog.ts` | `scalpify.dailyLog.v1` | `Record<dateKey, DailyEntry>` | `hydrateDailyLog` | `clearDailyLog` |

#### 3b.3.1 `userStore.ts` — account + medical/onboarding profile

| Item | Detail |
| --- | --- |
| **File purpose** | Holds the signed-in user, their medical/onboarding answers, and the auth lifecycle (sign up / in / out). On account change it wipes all other user-scoped stores. |
| **Dependencies** | `react` (`useSyncExternalStore`), AsyncStorage, **and the other stores' clear fns**: `clearScans`, `clearAllMeds`, `clearDailyLog`, `clearChat` (Scalpify-App/src/userStore.ts:3-6) |
| **State** | module singleton `state: { user: UserProfile \| null; hydrated: boolean }` (Scalpify-App/src/userStore.ts:97) |
| **Hooks exported** | `useUser()` → `UserProfile \| null`; `useUserHydrated()` → `boolean` |
| **APIs called** | None (purely local). |

**Types defined**: `Sex`, `FamilyHistory`, `SurgeryTechnique`, `Medication`, `Ethnicity`, `Adherence`, `TreatmentIntent`, `Goal`, `MedicalProfile`, `UserProfile`, `SignUpInput`, plus the constant `EMPTY_MEDICAL_PROFILE`.

`MedicalProfile` (Scalpify-App/src/userStore.ts:44-62) stores both clinical fields (`age`, `sex`, `familyHistory`, `ageOfOnset`, `surgeryTechnique`, `graftCount`, `medications[]`, `smoker`, `hasThyroidIssue`, `hasPCOS`, `recentMajorIllness`) and onboarding-questionnaire fields (`treatmentDone` branch flag, `ethnicity`, `adherence`, `treatmentIntent`, `goals[]`).

**Functions**:

| Function | Lines | Behaviour |
| --- | --- | --- |
| `clearUserScopedData()` | 15-17 | `Promise.all` of `clearScans/clearAllMeds/clearDailyLog/clearChat` — prevents a new account inheriting the previous user's local data. |
| `hydrateUser()` | 120-129 | Loads & parses the persisted user; sets `hydrated=true`. |
| `signUp(input)` | 137-151 | First wipes user-scoped data, then mints a new user with id `u_<base36 time>_<random>`, normalises name/email, persists. |
| `signIn(email)` | 153-160 | "Logs in" only if the locally-stored user's email matches (device-local auth — no server). Returns `null` otherwise. |
| `signOut()` | 162-168 | Clears the user, persists null, then wipes user-scoped data. |
| `updateUser(patch)` | 170-176 | Shallow-merges a patch into the user and persists. |
| `updateMedical(patch)` | 179-186 | Merges into `EMPTY_MEDICAL_PROFILE ∪ existing medical ∪ patch` — used by the step-by-step onboarding screens. |
| `firstNameOf` / `initialsOf` / `daysSinceSurgery` | 196-215 | Derived helpers (first token of name; up to 2 initials; whole days since `surgeryDate`). |

#### 3b.3.2 `chatStore.ts` — AI chat history

| Item | Detail |
| --- | --- |
| **File purpose** | Persisted conversation log for the AI assistant, capped at `MAX_MESSAGES = 100`. |
| **Dependencies** | AsyncStorage, `ChatRole` type from `./api` |
| **State** | `messages: ChatMessage[]`, `hydrated: boolean` |
| **Type** | `ChatMessage = { id; role; content; createdAt }` |
| **Hooks** | `useChatMessages()`, `useChatHydrated()` |

**Functions**: `hydrateChat` (38-47), `appendMessage(role, content)` returns the new message and keeps only the last 100 (53-59), `updateMessage(id, content)` (used to swap a "typing…" placeholder for the real reply — 62-66), `removeMessage(id)` (68-72), `clearChat()` (74-78). `newId()` generates `c_<time>_<random>` ids.

#### 3b.3.3 `scanStore.ts` — scan history

| Item | Detail |
| --- | --- |
| **File purpose** | Stores up to `MAX_HISTORY = 60` scan records (newest first), each pairing the raw `AnalyzeResponse`, the photo URI, capture time, and optional self-report `ScanContext`. |
| **Dependencies** | AsyncStorage, `AnalyzeResponse` type from `./api` |
| **Types** | `ScanContext` (stressLevel 1–5, sleepHours, newSheddingNoticed, daysSinceWashed, pregnantOrPostpartum) and `ScanRecord` |
| **State** | `state: { history: ScanRecord[]; hydrated: boolean }` |
| **Hooks** | `useLatestScan()` (latest `AnalyzeResponse`), `useLatestScanFull()` (latest full `ScanRecord`), `useScanHistory()` (whole array) |

**Functions**: `hydrateScans` (51-60), `setLatestScan(data, photoUri, context?)` prepends a record with id `s_<time>_<random>` and trims to 60 (62-73), `clearScans` (75-79), `removeScan(id)` (81-87).

#### 3b.3.4 `medsStore.ts` — medications, adherence & dose log

This is the most feature-rich store; it also bridges into the notifications layer.

| Item | Detail |
| --- | --- |
| **File purpose** | Manages the user's medication list, per-day dose completion, timestamped dose log, adherence stats, and schedules/cancels the daily local reminders for each med. |
| **Dependencies** | AsyncStorage, `Ionicons` (icon name type), and **`./notifications`** (`scheduleDailyMedReminder`, `cancelMedReminder`) (Scalpify-App/src/medsStore.ts:1-4) |
| **State** | `meds: Med[]`, `hydrated`, a `revision` counter bumped on **every** change, `doneSet: Set<"medId|YYYY-MM-DD">`, `doneTimes: Record<key, timestamp>`, `lastMarkedAt: number\|null` |
| **Type** | `Med` (id, name, type, time `"HH:MM"`, weeklyPct, icon, iconColor, iconBg, reminderEnabled?, notificationId?) and `MedLogEntry` |
| **Hooks** | `useMeds()` (list), `useMedsRevision()` (re-renders on list OR completion change — 282-284), `useMedsHydrated()` |

The `revision` counter (Scalpify-App/src/medsStore.ts:28-29) exists because `useMeds()` only re-renders when the *array reference* changes; marking a dose done does not change the array, so `useMedsRevision()` lets completion-sensitive UI re-render.

**Key functions**:

| Function | Lines | Behaviour |
| --- | --- | --- |
| `hydrateMeds()` | 74-102 | Loads all four AsyncStorage keys, each guarded in its own try/catch. |
| `markDone(medId, done=true)` | 108-121 | Toggles a dose for *today*; records/clears the exact `doneTimes` timestamp; clones the Set for re-render. |
| `editDoseTime(medId, currentDateKey, newTakenAt)` | 128-145 | Moves a logged dose to the calendar day of `newTakenAt` so adherence stays correct. |
| `getMedLog(limit=60)` | 157-172 | Builds a newest-first `MedLogEntry[]` from `doneTimes`, joining the med name from the current list. |
| `isDoneToday`, `adherencePctForDate(d)`, `adherenceStreak()` | 174-201 | Today-done check; % of current meds done on a date; consecutive-day streak (caps at 60). |
| `addMed`, `updateMed`, `removeMed`, `clearMeds`, `clearAllMeds` | 203-274 | CRUD that also schedules/cancels reminders. `addMed` schedules a reminder if `reminderEnabled` and stores the returned `notificationId`. `updateMed` cancels + reschedules when `time` or `reminderEnabled` changed (keeps the same id so history survives). `clearAllMeds` cancels every reminder and wipes all four keys. |
| `nextDoseFor`, `statusForToday`, `formatTime` | 290-319 | Compute next dose time; classify a med as `done`/`now`/`upcoming` (15-min lead window; a missed dose stays "now"); format `"HH:MM"` to 12-hour. |

#### 3b.3.5 `dailyLog.ts` — daily scalp journal

| Item | Detail |
| --- | --- |
| **File purpose** | A per-day journal keyed by date; each entry records a `Sensation` (`normal`/`itchy`/`tender`) and free-text `notes`. |
| **Dependencies** | AsyncStorage |
| **Type** | `DailyEntry = { date; sensation; notes; savedAt }` |
| **State** | `entries: Record<dateKey, DailyEntry>` |
| **Hooks** | `useDailyEntries()`, `useDailyLogHydrated()` |
| **Functions** | `hydrateDailyLog` (34-43), `clearDailyLog` (46-50), `dateKey(d)` → `YYYY-MM-DD` (52-57), `saveEntry(date, sensation, notes)` (59-64), `getEntry(date)` (66-68). |

#### 3b.3.6 `medicalContext.ts` — risk & recovery heuristics

This is a **pure logic module** (not a store — no state, no AsyncStorage) that turns the medical profile into human-readable risk/recovery insights.

| Item | Detail |
| --- | --- |
| **File purpose** | Computes a heuristic AGA (androgenetic alopecia) risk score, recovery-projection shifts, and summary text from the `MedicalProfile`/`ScanContext`. |
| **Dependencies** | types from `./userStore` and `./scanStore` only |
| **Exports** | `MED_LABELS`, `RiskLevel`, `RiskSummary`, `computeRisk`, `treatmentSummary`, `recoveryProjectionShiftDays`, `riskNote`, `scanContextSummary`, `isProfileComplete` |

`computeRisk(m)` (Scalpify-App/src/medicalContext.ts:27-72) is a **weighted heuristic, explicitly not a learned model** (comment line 22). Weighting: family history `both +3 / maternal +2 / paternal +1`; early onset (`<25`) `+2`; smoker/thyroid/PCOS/recent-illness `+1` each; treatment offsets (`finasteride/dutasteride/spironolactone −2`, any minoxidil `−1`). It maps the score to `low/standard/elevated/high` and to a 5–95% band (`MAX_RISK_SCORE = 9`). `recoveryProjectionShiftDays` (84-93) shifts the projected regrowth date (smoking `+14`, illness/thyroid `+7`, finasteride/dutasteride/minoxidil `−7`). `isProfileComplete` (121-128) requires `age`, `sex`, `familyHistory` to be set.

---

### 3b.4 `navigation.tsx` — navigation tree

| Item | Detail |
| --- | --- |
| **File purpose** | Defines the entire app navigation: a root **native stack** that contains a nested **bottom-tab** navigator, plus a custom tab bar, dark navigation theme, and a global `navigationRef`. |
| **Dependencies** | `@react-navigation/native`, `native-stack`, `bottom-tabs`, `react-native-safe-area-context`, `@expo/vector-icons` (Ionicons), `./theme`, and all 28 screen modules. |
| **Components** | `CustomTabBar`, `MainTabs`, `RootNavigator` (default export) |
| **Exports** | `RootStackParamList`, `TabParamList`, `navigationRef`, default `RootNavigator` |
| **State / Hooks** | None of its own; `navigationRef = createNavigationContainerRef()` (line 78) lets non-component code navigate. |

**Type-safe route maps**: `RootStackParamList` (Scalpify-App/src/navigation.tsx:41-69) and `TabParamList` (71-76). Most routes take `undefined` params; `MedicalProfile` takes `{ onboarding?: boolean }`; every `Onb*` route takes `{ edit?: boolean }` — the `edit` flag (commented lines 54-56) means a single onboarding screen was opened from Profile to edit one answer and should return to Profile instead of advancing.

**Tab structure** — `MainTabs` (123-135) holds four tabs, with screen labels deliberately differing from route names:

| Tab route | Component | Icon (off / on) | Label |
| --- | --- | --- | --- |
| `Home` | `HomeScreen` | grid-outline / grid | Home |
| `Scan` | `ScanResultsScreen` | scan-outline / scan | Analysis |
| `Track` | `MedsScreen` | calendar-outline / calendar | Calendar |
| `Profile` | `ProfileScreen` | person-outline / person | Profile |

`CustomTabBar` (85-121) is a hand-built tab bar (replacing the default) rendered inside a bottom-edge `SafeAreaView`; the focused tab gets a filled primary-colour circular icon and bold white label.

**Stack structure** — `RootNavigator` (137-189) wraps everything in `NavigationContainer` with a custom **dark** theme (line 142) mapping `colors` into React Navigation's theme + a System-font family map. All screens use `headerShown: false`. Screens registered: `Splash`, `Welcome`, `Onboarding`, `SignIn`, `SignUp`, `MainTabs`, `Camera` (presented as `fullScreenModal`, line 166), `Chat`, `Journey`, `NorwoodAnalysis`, `RecoveryCalendar`, `MedicalProfile`, and the 12 `Onb*` questionnaire screens (174-185).

---

### 3b.5 `theme.ts` — design tokens

| Item | Detail |
| --- | --- |
| **File purpose** | Central design-token system: a "dark clinical theme" — premium, medical-grade dark UI with blue accents and glassmorphic cards (Scalpify-App/src/theme.ts:1-4). |
| **Dependencies** | None |
| **Exports** | `colors`, `spacing`, `radius`, `typography`, `shadow` |

| Token group | Contents |
| --- | --- |
| `colors` | Surfaces (`bgBase #0A0C12`, `bg: transparent`, elevated cards as translucent white overlays), brand blues (`primary #0A84FF` and variants), status colours (`success`, `warning`, `danger` + `*Soft` tints), and a text-opacity ladder (`textStrong` → `textFaint`). |
| `spacing` | `xs 4` → `xxl 28` |
| `radius` | `sm 8` → `xl 22`, `pill 999` |
| `typography` | `display/h1/h2/h3/body/bodyMuted/small/label` presets |
| `shadow` | `card` and `cardStrong` (iOS shadow + Android `elevation`) |

A key architectural detail (commented lines 2-4): `bgBase` is the solid colour painted once at the root, while `bg` is **transparent** so each screen lets the root's radial-glow background (`GlobalBackground`) show through.

---

### 3b.6 Reusable component library (`src/components/`)

Nine component files. Grouped: generic UI kit (`ui.tsx`), header/chrome (`Header.tsx`), background (`GlobalBackground.tsx`), data-viz (`charts.tsx`), onboarding kit (`onboarding.tsx`), and domain-specific scalp/visualisers (`ScalpOutline`, `BeforeAfterScalp`, `WireframeHead`, `RulerPicker`).

#### 3b.6.1 `ui.tsx` — generic UI kit

| Item | Detail |
| --- | --- |
| **File purpose** | The app's base widget set, all styled from `theme.ts`. |
| **Dependencies** | `react-native` primitives, Ionicons, `./theme` |
| **State / Hooks** | None — all are stateless presentational components. |

| Component | Props | Renders |
| --- | --- | --- |
| `Card` | `children`, `style?`, `glow?: 'primary'\|'success'\|'warning'\|'danger'`, `flat?` | A rounded glass card; `glow` tints the border, `flat` drops the shadow (15-39). |
| `Pill` | `label`, `variant?` (default/primary/success/warning/danger/soft), `icon?`, `style?` | A coloured chip with optional leading icon; colour palette per variant (43-69). |
| `PrimaryButton` | `label`, `onPress?`, `loading?`, `disabled?`, `style?`, `variant?: 'primary'\|'success'`, `iconRight?` | Filled CTA (off-white `#F5F5F0` for primary, green for success); shows a spinner when `loading`; scales on press (71-113). |
| `SecondaryButton` | `label`, `onPress?`, `iconLeft?`, `style?` | Soft-blue secondary button (115-139). |
| `GhostLink` | `label`, `onPress?`, `underline?`, `color?` | Text-only link (141-159). |
| `Field` | `label?`, `iconLeft?`, `iconRight?`, plus all `TextInputProps` | Labelled text input with optional flanking icons (161-189). |
| `CircleIconButton` | `icon`, `onPress?`, `bg?`, `size?` (40), `color?`, `border?`, `shadowed?` | Round icon button; icon scales to 45% of size (191-230). |
| `Segmented<T>` | `options: {value,label}[]`, `value`, `onChange`, `style?` | A pill-style segmented control (232-261). |
| `ScreenProgress` | `pct?` (default 30) | A thin top progress bar (263-269). |

#### 3b.6.2 `Header.tsx` — page chrome

| Item | Detail |
| --- | --- |
| **File purpose** | Header bars and titles used across screens. |
| **Dependencies** | Ionicons, `useNavigation`, `./ui` (`CircleIconButton`), `./theme`, `../userStore` (`initialsOf`, `useUser`) |
| **Hooks** | `useNavigation`, `useUser` (in `AppHeader`); `useNavigation` (in `ScreenHeader`) |

| Component | Props | Renders |
| --- | --- | --- |
| `AppHeader` | `showBack?`, `variant?: 'menu'\|'back'\|'none'`, `rightSlot?`, `onRightPress?` | Top bar: left (back/menu/spacer), `SCALPIFY` wordmark, and a right avatar showing the user's initials with a green online-status dot when signed in (9-54). |
| `PageTitle` | `title`, `subtitle?`, `style?` | Large title + muted subtitle block (56-71). |
| `ScreenHeader` | `title?`, `subtitle?`, `showBack?` (true), `rightSlot?` | Compact header with a back `CircleIconButton` (73-99). |
| `StatusBarFiller` | — | An 8px spacer (101-103). |
| `PulseLogo` | `size?` (18) | A primary-colour `pulse` Ionicon (105-107). |

#### 3b.6.3 `GlobalBackground.tsx`

| Item | Detail |
| --- | --- |
| **File purpose** | The full-screen radial-glow background behind every screen. |
| **Dependencies** | `react-native-svg`, `./theme` |
| **Props / State / Hooks** | None |
| **Renders** | An absolutely-filled, `pointerEvents="none"` SVG over `bgBase`: a primary blue **top-center** radial glow (~28% peak) and a subtle **bottom-center** glow (~10% peak), each using many gradient stops to avoid banding on dark backgrounds (Scalpify-App/src/components/GlobalBackground.tsx:6-50). |

#### 3b.6.4 `charts.tsx` — data visualisations

| Item | Detail |
| --- | --- |
| **File purpose** | SVG charts for stats and the Norwood scale. |
| **Dependencies** | `react-native-svg`, `./theme` |
| **State / Hooks** | None (pure SVG math). |

| Component | Props | Renders |
| --- | --- | --- |
| `ProgressRing` | `pct`, `size?` (130), `stroke?` (10), `color?`, `trackColor?`, `children?` | A circular progress ring (track + rounded progress arc, rotated −90°); arc drawn only when `pct>0` to avoid a stray dot; `children` shown centred (6-57). |
| `SparkLine` | `data: number[]`, `height?`, `width?`, `color?`, `gradient?`, `style?` | A min/max-normalised line chart with optional gradient fill and dots (last point emphasised); shows "No data yet" when empty (59-132). |
| `NorwoodBars` | `active: string`, `height?` (64) | A 7-bar I–VII Norwood-stage chart; the matching stage's bar/label is highlighted in primary (134-173). |

#### 3b.6.5 `onboarding.tsx` — onboarding UI kit

| Item | Detail |
| --- | --- |
| **File purpose** | Shared chrome + option widgets so each onboarding question screen stays boilerplate-free. |
| **Dependencies** | `react-native`, Ionicons, `SafeAreaView`, `useNavigation`, `./ui` (`PrimaryButton`), `./theme` |
| **Hooks** | `useNavigation` (in `OnboardingScaffold`) |

| Component | Props | Renders |
| --- | --- | --- |
| `OnboardingScaffold` | `step`, `total`, `eyebrow?`, `title`, `subtitle?`, `insight?: {label?, text}`, `canContinue?` (true), `onContinue`, `continueLabel?` ('Continue'), `children` | Full question-screen layout: back/header, a `step/total` progress bar, eyebrow/title/subtitle, the question body (`children`), an optional warning-styled insight card, and a footer `PrimaryButton` (disabled when `!canContinue`) (23-96). |
| `RadioOption` | `label`, `sublabel?`, `selected`, `onPress` | Single-select option card with a radio on the right (99-121). |
| `CheckOption` | `label`, `icon?`, `selected`, `onPress` | Multi-select card with optional leading icon and a checkbox (124-148). |

#### 3b.6.6 `ScalpOutline.tsx`

| Item | Detail |
| --- | --- |
| **File purpose** | Shows the scan photo with the detected bald region's boundary drawn on top. |
| **Dependencies** | `react-native-svg` (`Polygon`), `./theme`, `ScanCoordinates` type from `../api` |
| **Props** | `photoUri`, `coordinates: ScanCoordinates`, `show?` (true) |
| **Renders** | The photo stretched into a square box; an overlaid SVG whose `viewBox` maps the server's coordinate space (default 512×512, `preserveAspectRatio="none"`) so polygons line up 1:1. Bald polygons filled red-translucent with a `colors.danger` stroke. Only renders when `show` and ≥1 polygon of ≥3 points exists (Scalpify-App/src/components/ScalpOutline.tsx:15-53). |

#### 3b.6.7 `BeforeAfterScalp.tsx`

| Item | Detail |
| --- | --- |
| **File purpose** | A draggable before/after wipe slider: original photo on the right, AI overlay (cyan hair regions, red bald outline) on the left. |
| **Dependencies** | `react-native` (`Animated`, `PanResponder`), `react-native-svg`, Ionicons, `./theme`, `ScanCoordinates` from `../api` |
| **Props** | `photoUri`, `coordinates: ScanCoordinates` |
| **State / refs** | `w` (container width via `useState`); refs: `divX` (`Animated.Value` divider position), `containerRef`, `offsetX`, `widthRef` |
| **Hooks** | `useMemo` (the `PanResponder`), `useRef`, `useState` |
| **Renders / behaviour** | Base photo + "Before" label; a clipped `Animated.View` whose `width` equals `divX` revealing the AI overlay (hair `Polygon`s cyan, bald red) + "AI" label; a draggable divider handle. Crucially, the divider is updated via `Animated.Value.setValue` during the gesture so the wipe runs **without React re-renders** (commented 15-22); `onMoveShouldSetPanResponder` only claims horizontal drags so vertical scroll still works (line 49). |

#### 3b.6.8 `WireframeHead.tsx`

| Item | Detail |
| --- | --- |
| **File purpose** | A decorative animated 3D-style wireframe head with a sweeping scan line (used on scan/landing screens). |
| **Dependencies** | `react-native` (`Animated`), `react-native-svg`, `./theme` |
| **Props** | `size?` (280), `scanLine?` (true), `animated?` (true) |
| **State / Hooks** | `useRef` for `scanAnim` & `fadeAnim` (`Animated.Value`s); `useEffect` to fade in and loop the scan line. |
| **Renders** | An SVG ellipse "head" with computed latitude (`Ellipse`) and longitude (`Path`) grid lines, ears, and a hair-area arc; plus an overlaid animated scan line/glow that sweeps vertically via `scanAnim.interpolate` (Scalpify-App/src/components/WireframeHead.tsx:6-180). |

#### 3b.6.9 `RulerPicker.tsx`

| Item | Detail |
| --- | --- |
| **File purpose** | A horizontal snapping number carousel with a fixed ruler + haptics; shared by the age and age-of-onset onboarding screens. |
| **Dependencies** | `react-native` (`ScrollView`, `Dimensions`), `expo-haptics`, `./theme` |
| **Props** | `value`, `onChange(n)`, `min`, `max` |
| **State / refs / Hooks** | refs `scrollRef`, `inited`; `useMemo` for the item list; `useRef`. |
| **Renders / behaviour** | A horizontal `ScrollView` of numbers (5 visible, centre item large/white, neighbours smaller/faded via `numStyle`), snapping by `ITEM_W`; below it a fixed 41-tick ruler with a primary centre mark. On each value change it fires `Haptics.selectionAsync()` and calls `onChange` (Scalpify-App/src/components/RulerPicker.tsx:39-113). |

---

### 3b.7 `notifications.ts` — local medication reminders

| Item | Detail |
| --- | --- |
| **File purpose** | Wraps `expo-notifications` to configure, schedule, cancel, snooze, and test on-device medication reminders. Consumed by `medsStore.ts`. |
| **Dependencies** | `expo-notifications`, `react-native` (`Platform`) |
| **Constants** | `MED_CATEGORY = 'MED_REMINDER'`, `ANDROID_CHANNEL = 'med-reminders'` |
| **State / Hooks / Components** | None — a side-effecting function library. All functions are wrapped in try/catch to "fail soft" where notifications are unsupported (e.g. Expo Go). |

| Function | Lines | Behaviour |
| --- | --- | --- |
| `configureNotifications()` | 10-19 | Sets the foreground handler so reminders show a banner + play a sound even when the app is open. |
| `registerMedNotifications()` | 22-38 | Registers the `Taken ✓` / `Snooze 15m` action buttons and the high-importance Android channel (with vibration pattern). Called once at startup. |
| `ensureNotificationPermission()` | 41-50 | Checks, and if needed requests, notification permission; returns `boolean`. |
| `scheduleDailyMedReminder(med)` | 53-74 | Schedules a **daily repeating** notification at the med's `HH:MM`; returns the notification id (or null on failure). |
| `cancelMedReminder(id)` | 77-84 | Cancels a scheduled reminder by id (no-op if falsy). |
| `sendTestReminder()` | 87-108 | Fires a one-off test notification ~5 s later (ensures permission first). |
| `snoozeMedReminder(med, minutes=15)` | 111-130 | Schedules a one-off reminder N minutes out (used by the Snooze action). |

---

### 3b.8 `onboardingFlow.ts` — questionnaire flow definition

| Item | Detail |
| --- | --- |
| **File purpose** | Defines the post-sign-up onboarding question order, **branching** on whether the user has already had a hair transplant, and provides navigation helpers (progress, next, advance). |
| **Dependencies** | None (operates on the navigation object passed in) |
| **State / Hooks / Components** | None — pure functions and constant arrays. |

**Branch definition** (Scalpify-App/src/onboardingFlow.ts:10-14):

| Group | Routes |
| --- | --- |
| `ONB_COMMON` | `OnbTreatment`, `OnbAge`, `OnbSex`, `OnbOnset`, `OnbEthnicity`, `OnbFamily` |
| `ONB_DONE` (had transplant) | `OnbSurgery`, `OnbRoutine`, `OnbAdherence` |
| `ONB_NOTDONE` | `OnbGoals`, `OnbIntent` |
| `ONB_TAIL` (shared final) | `OnbReminders` (soft notification-permission pre-prompt) |

**Functions**:

| Function | Lines | Behaviour |
| --- | --- | --- |
| `onbOrder(treatmentDone)` | 22-24 | Concatenates common + the correct branch + tail into the full route list. |
| `onbStep(current, treatmentDone)` | 26-30 | Returns `{ step, total }` (1-based) for the per-branch progress bar. |
| `onbNext(current, treatmentDone)` | 32-37 | Returns the next route, or `null` at the end. |
| `goNext(nav, current, treatmentDone)` | 40-44 | Navigates to the next screen, or `nav.reset` into `MainTabs` when finished. |
| `advance(nav, route, current, treatmentDone)` | 50-56 | If opened in `edit` mode (from Profile), `goBack`; otherwise `goNext`. |

This file is the contract that wires the 12 `Onb*` screens (registered in `navigation.tsx`) into a coherent, branch-aware flow, and ties back to `userStore.updateMedical` (which persists each answer) and `onboarding.tsx`'s `OnboardingScaffold` (which renders the per-step progress using `onbStep`).

---

I have read all files fully. Producing the documentation section.

## Phase 4a — Backend API Core

This phase documents the core of the GASP-AI backend: a Python **FastAPI** application that powers the Scalpify mobile app. It covers how the server is created and run, how requests are routed, how configuration is loaded, how errors are handled, the data models (Pydantic schemas), and every API endpoint module.

The backend lives under `Scalpify-ML/api/app/`. The package marker file (`Scalpify-ML/api/app/__init__.py`) contains only a comment identifying it as the "GASP-AI FastAPI Application" — no code runs on package import.

### 1. Server / Application Setup

All application bootstrapping happens in `Scalpify-ML/api/app/main.py`.

#### 1.1 Configuration load
At import time the module calls `settings = get_settings()` (`main.py:15`), which returns the cached singleton `Settings` object (see Section 3). Every later reference to `settings.*` reads from this object.

#### 1.2 Lifespan handler (startup / shutdown)
FastAPI's modern lifecycle is implemented with an async context manager decorated by `@asynccontextmanager` (`main.py:17-27`):

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 Starting {settings.APP_NAME} v{settings.VERSION}")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    yield
    print(f"🛑 Shutting down {settings.APP_NAME}")
```

- **Beginner explanation:** Everything before `yield` runs once when the server starts; everything after runs once when it shuts down. Here it only prints banners — no DB pools or model preloading happen in the lifespan.
- It is wired into the app via `lifespan=lifespan` (`main.py:61`).

#### 1.3 FastAPI app creation
The `app` object is created in `main.py:30-62`:

| Argument | Value | Source |
|----------|-------|--------|
| `title` | `settings.APP_NAME` (= "GASP-AI API") | `main.py:31` |
| `version` | `settings.VERSION` (= "1.0.0") | `main.py:32` |
| `description` | Long markdown describing GASP-AI features, supported formats, auth note | `main.py:33-58` |
| `docs_url` | `/docs` if `DEBUG` else `None` | `main.py:59` |
| `redoc_url` | `/redoc` if `DEBUG` else `None` | `main.py:60` |
| `lifespan` | the `lifespan` function | `main.py:61` |

**Important detail:** Interactive docs (Swagger at `/docs`, ReDoc at `/redoc`) are only exposed when `DEBUG` is `True`. In production (`DEBUG=False`) these are disabled.

#### 1.4 Middleware
Three middleware layers are registered:

1. **CORS** (`main.py:65-72`) via `CORSMiddleware`:
   - `allow_origins=settings.CORS_ORIGINS` (default `["*"]`)
   - `allow_credentials=True`
   - `allow_methods=["*"]`, `allow_headers=["*"]`, `expose_headers=["*"]`
   - *Note:* `allow_credentials=True` combined with `allow_origins=["*"]` is permissive and intended for development; the config comments say to configure for production (`config.py:17-18`).

2. **TrustedHostMiddleware** (`main.py:75-79`): only added when **not** in debug mode, restricting allowed `Host` headers to `settings.ALLOWED_HOSTS`.

3. **Custom HTTP timing/tracing middleware** `add_process_time_header` (`main.py:82-97`):
   - Records `start_time`.
   - Generates a UUID4 `request_id` and stores it on `request.state.request_id` (used later by exception handlers for tracing).
   - Calls the next handler, then adds two response headers:
     - `X-Process-Time` — seconds the request took.
     - `X-Request-ID` — the generated UUID.

#### 1.5 Router inclusion and static files
- The versioned API router is mounted with `app.include_router(api_router, prefix=settings.API_V1_STR)` (`main.py:167`), so every endpoint is served under `/api/v1`.
- A static-file mount serves generated hair-journey images: `app.mount("/journey-files", StaticFiles(directory=str(OUTPUTS_DIR), check_dir=False), ...)` (`main.py:171-173`). `OUTPUTS_DIR` is imported from `app.services.hair_journey_service` and created if missing. This is a development fallback so the mobile app can fetch generated images over HTTP when Supabase storage is not configured.

#### 1.6 Root endpoint
`GET /` (`main.py:176-189`) returns a JSON welcome object with app name, version, a short description, key endpoint paths, and `"status": "operational"`. The documentation link is `/docs` only in debug, otherwise `"Contact admin for docs"`.

#### 1.7 How the server is run
The `if __name__ == "__main__":` block (`main.py:192-205`) starts Uvicorn programmatically:

```python
uvicorn.run("main:app", host="0.0.0.0", port=8000,
            reload=settings.DEBUG,
            log_level="info" if settings.DEBUG else "warning")
```

- Binds to `0.0.0.0:8000`.
- Auto-reload on file changes is enabled only in debug.
- It prints helper URLs for the docs and health check on startup.

### 2. Router Structure

Routing is two-tiered.

- **Aggregator router** — `Scalpify-ML/api/app/api/v1/router.py` creates `api_router = APIRouter()` and includes five sub-routers, each with `prefix=""` and a descriptive tag (used to group endpoints in Swagger):

| Sub-router included | Tag | Source |
|---------------------|-----|--------|
| `analysis.router` | `analysis` | `router.py:7-11` |
| `hair_journey.router` | `hair_journey` | `router.py:13-17` |
| `facial_recognition.router` | `facial_recognition` | `router.py:19-23` |
| `chat.router` | `chat` | `router.py:25-29` |
| `health.router` | `health` | `router.py:31-35` |

- Because each sub-router uses `prefix=""` and the aggregator is mounted at `/api/v1` (`main.py:167`), the final path for any endpoint = `/api/v1` + the path in the endpoint's decorator. For example `@router.post("/analyze")` becomes `POST /api/v1/analyze`.

### 3. Core Configuration

Configuration is defined in `Scalpify-ML/api/app/core/config.py` using **pydantic-settings** (`BaseSettings`). The class `Settings` declares typed fields with defaults, and values can be overridden by environment variables or a `.env` file.

- **Env loading rules** (`config.py:113-115`): `env_file = "../.env"` (looks for a `.env` in the parent directory) and `case_sensitive = True`.
- **Caching** (`config.py:117-119`): `get_settings()` is wrapped in `@lru_cache()`, so a single `Settings` instance is shared process-wide.

**All settings fields** (name : type = default):

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `APP_NAME` | str | "GASP-AI API" | App title |
| `VERSION` | str | "1.0.0" | Version string |
| `DEBUG` | bool | True | Toggles docs, reload, error verbosity |
| `API_V1_STR` | str | "/api/v1" | Router prefix |
| `ENVIRONMENT` | str | "development" | Environment name |
| `ENABLE_DOCS` | bool | True | (declared; docs gating actually uses `DEBUG`) |
| `ENABLE_PROFILING` | bool | False | Profiling flag |
| `ALLOWED_HOSTS` | list[str] | `["*"]` | TrustedHost allowlist |
| `CORS_ORIGINS` | list[str] | `["*"]` | CORS origins |
| `SUPABASE_URL` | Optional[str] | None | Supabase project URL |
| `SUPABASE_ANON_KEY` | Optional[str] | None | Public anon key |
| `SUPABASE_SERVICE_KEY` | Optional[str] | None | Service role key |
| `MAX_FILE_SIZE` | int | 10*1024*1024 (10MB) | Upload size limit |
| `ALLOWED_EXTENSIONS` | Set[str] | `{.jpg,.jpeg,.png,.bmp}` | Allowed file extensions |
| `ALLOWED_MIME_TYPES` | Set[str] | jpeg/jpg/png/bmp | Allowed MIME types |
| `MIN_IMAGE_SIZE` | tuple[int,int] | (224,224) | Min resolution |
| `MAX_IMAGE_SIZE` | tuple[int,int] | (4096,4096) | Max resolution |
| `MODEL_PATH` | str | "../model/best.pt" | YOLO weights path |
| `CONFIDENCE_THRESHOLD` | float | 0.4 | Detection confidence |
| `IOU_THRESHOLD` | float | 0.4 | NMS IoU threshold |
| `STORAGE_BUCKET_UPLOADS` | str | "uploads" | Upload bucket name |
| `STORAGE_BUCKET_PROCESSED` | str | "processed" | Processed bucket name |
| `FILE_EXPIRY_HOURS` | int | 24 | File URL expiry / cleanup window |
| `RATE_LIMIT_REQUESTS` | int | 10 | Rate-limit count |
| `RATE_LIMIT_WINDOW` | int | 60 | Rate-limit window (s) |
| `SECRET_KEY` | Optional[str] | None | App secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | int | 30 | Token TTL |
| `ENABLE_API_KEY_AUTH` | bool | False | API-key auth toggle |
| `AWS_REGION` | Optional[str] | "us-east-1" | AWS region (Rekognition) |
| `AWS_ACCESS_KEY_ID` | Optional[str] | None | AWS key |
| `AWS_SECRET_ACCESS_KEY` | Optional[str] | None | AWS secret |
| `AWS_S3_BUCKET` | Optional[str] | "gasp-ai-models" | S3 bucket |
| `DEBUG_RESPONSES` | bool | False | Extra debug in responses |
| `REPLICATE_API_TOKEN` | Optional[str] | None | Replicate token (hair journey) |
| `OPENAI_API_KEY` | Optional[str] | None | OpenAI key (chat) |
| `OPENAI_CHAT_MODEL` | str | "gpt-4o-mini" | Chat model |
| `HOST` | str | "0.0.0.0" | Bind host |
| `PORT` | int | 8000 | Bind port |
| `WORKERS` | int | 2 | Worker count |
| `SUPABASE_SESSIONS_TABLE` | str | "analysis_sessions" | Sessions table |
| `SUPABASE_RESULTS_TABLE` | str | "analysis_results" | Results table |
| `DEVICE` | str | "cpu" | ML device |
| `MODEL_CONFIDENCE` | float | 0.25 | Model confidence |
| `MODEL_IOU` | float | 0.4 | Model IoU |
| `UPLOAD_DIR` | str | "../uploads" | Upload directory |
| `OUTPUT_DIR` | str | "../output" | Output directory |
| `MAX_STORAGE_PER_USER` | int | 100 | Storage quota |
| `LOG_LEVEL` | str | "INFO" | Log level |
| `ENABLE_METRICS` | bool | True | Metrics toggle |
| `CACHE_TTL` | int | 3600 | Cache TTL |
| `SMTP_PORT` | int | 587 | Email port |
| `SMTP_TLS` | bool | True | Email TLS |
| `FROM_EMAIL` | str | "noreply@your-domain.com" | Sender email |
| `RATE_LIMIT_PER_MINUTE` | int | 30 | Rate limit/min |
| `MAX_CONCURRENT_REQUESTS` | int | 5 | Concurrency cap |
| `JWT_SECRET_KEY` | str | "your-super-secret-jwt-key-here" | JWT secret |
| `JWT_EXPIRATION_HOURS` | int | 24 | JWT TTL |

*Note:* Several fields (rate limiting, JWT, AWS S3, email, metrics) are declared but not all are consumed by the core files in this phase; they are configuration scaffolding.

### 4. Exception Handling

Custom exceptions are defined in `Scalpify-ML/api/app/core/exceptions.py`, and handlers are registered in `main.py`.

#### 4.1 Exception classes
`GASPException` (`exceptions.py:4-16`) subclasses FastAPI's `HTTPException` and adds two extra attributes: `error_code` (a stable machine string) and `extra_data` (a details dict). All other exceptions subclass it:

| Class | HTTP status | error_code | extra_data |
|-------|-------------|-----------|-----------|
| `InvalidFileTypeException` | 400 | `INVALID_FILE_TYPE` | `received_type`, `allowed_types` |
| `FileTooLargeException` | 413 | `FILE_TOO_LARGE` | `file_size`, `max_size` |
| `ImageProcessingException` | 422 | `IMAGE_PROCESSING_ERROR` | — |
| `DetectionFailedException` | 422 | `DETECTION_FAILED` | `suggestion` |
| `AnalysisFailedException` | 500 | `ANALYSIS_FAILED` | — |
| `RateLimitExceededException` | 429 | `RATE_LIMIT_EXCEEDED` | `limit`, `window`, `retry_after` + `Retry-After` header |

(Sources: `exceptions.py:18-81`.)

#### 4.2 Global handlers (`main.py`)
1. **`GASPException` handler** (`main.py:100-117`): returns the exception's `status_code` and a uniform JSON envelope:
   ```json
   {"success": false, "status": "error",
    "error": {"code": ..., "message": ..., "details": ...},
    "request_id": ..., "timestamp": ...}
   ```
   It also propagates `exc.headers` (so `Retry-After` is preserved).

2. **`RequestValidationError` handler** (`main.py:119-137`): returns **422** with `code: "VALIDATION_ERROR"` and `details.errors` = the Pydantic validation error list.

3. **`404` handler** (`main.py:139-164`): returns a friendly "Endpoint not found" body listing available endpoints.

All three include the `request_id` from `request.state` (set by the timing middleware) and a UNIX `timestamp`.

*Note:* The individual endpoint modules also catch `GASPException`/`Exception` locally and return their own `JSONResponse` envelopes (e.g. `analysis.py:254-307`), so in practice the global handlers act mainly as a backstop.

### 5. Pydantic Schemas

Defined in `Scalpify-ML/api/app/models/schemas.py`. These drive request validation, response shaping, and OpenAPI docs.

#### 5.1 Enums
- `AnalysisStatus` (`schemas.py:7-10`): `processing`, `completed`, `failed`.
- `SeverityLevel` (`12-16`): `Minimal`, `Mild`, `Moderate`, `Severe`.
- `NorwoodScale` (`18-29`): `I, I-II, II, III, III-A, III-IV, IV, IV-A, V, V-VI, VI, VII`.
- `HairJourneyStatus` (`282-285`): `processing`, `completed`, `failed`.

#### 5.2 Request model
**`AnalysisOptions`** (`33-53`):

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| `save_annotated` | bool | True | — |
| `include_visualization` | bool | True | — |
| `measurement_units` | List[str] | `["cm2","inch2"]` | — |
| `confidence_threshold` | float | 0.4 | ge=0.1, le=1.0 |
| `boundary_points_only` | bool | False | — |
| `target_height` | int | 512 | ge=224, le=4096 |
| `target_width` | int | 512 | ge=224, le=4096 |

#### 5.3 Analysis response building blocks
- **`ImageInfo`** (`56-60`): `filename:str`, `file_size:int`, `mime_type:str`, `dimensions:Dict[str,int]`.
- **`DetectionInfo`** (`62-65`): `regions_detected:Dict[str,int]`, `confidence_scores:Dict[str,float]`, `quality_score:float` (0–1).
- **`AreaMeasurements`** (`67-71`): `pixels`, `cm2`, `inch2`, `percentage` — each a dict.
- **`Classification`** (`73-79`): `severity:SeverityLevel`, `severity_score:int` (0–4), `norwood_scale:Optional[NorwoodScale]`, `norwood_details:Optional[str]`, `confidence:float` (0–1), `recommendations:List[str]`.
- **`VisualizationData`** (`81-84`): `annotated_image_url`, `thumbnail_url`, `overlay_data` (all optional).
- **`FileUrls`** (`86-89`): `original:Dict[str,str]`, optional `annotated`, optional `report_pdf`.
- **`BoundaryPoint`** (`92-95`): `x:int`, `y:int`, `curve_index:int=0`.
- **`SegmentGeometry`** (`97-101`): `area_pixels:float`, `perimeter_pixels:float`, `bounding_box:Dict[str,int]`, `centroid:Dict[str,float]`.
- **`SegmentCoordinates`** (`103-107`): `boundary_points`, `simplified_boundary`, `convex_hull` (lists of `BoundaryPoint`), `geometry:SegmentGeometry`.
- **`CoordinateSpace`** (`109-112`): `width:int`, `height:int`, `note:str`.
- **`CoordinateData`** (`114-121`): optional `bald_segments`, `hair_segments`, `bald_boundary_points`, `hair_boundary_points`, `boundary_points_only:bool`, `coordinate_space`, `summary`.
- **`ProcessingMetadata`** (`123-128`): `model_version:str`, `api_version:str`, `processing_device:str`, optional `region`, `estimated_pixels_per_cm`.
- **`ProblemSeverity`** (`130-136`): `severity_percentage:float`, `level:str`, `urgency:str`, `action_needed:str`, `description:str`, `factors_considered:Dict`.
- **`HairHealth`** (`138-145`): `health_percentage:float`, `grade:str`, `status:str`, `recommendation:str`, `risk_level:str`, `detailed_metrics:Dict`, `health_indicators:Dict`.

#### 5.4 Main analysis response
**`AnalysisResponse`** (`147-198`): `success:bool`, `status:AnalysisStatus`, `session_id:UUID`, `timestamp:datetime`, `processing_time_ms:float`, plus nested `image_info`, `detection`, `measurements`, `classification`, and optional `problem_severity`, `hair_health`, `coordinates`, `visualization`, `files`, and required `metadata:ProcessingMetadata`. A full example payload is embedded in its `Config.schema_extra`.

#### 5.5 Error / history / batch models
- **`ErrorDetail`** (`201-204`): `code:str`, `message:str`, optional `details`.
- **`ErrorResponse`** (`206-211`): `success=False`, `status="error"`, `error:ErrorDetail`, optional `session_id`, `timestamp`.
- **`AnalysisHistoryItem`** (`214-221`): `session_id`, `created_at`, `filename`, `baldness_ratio`, `severity`, optional `norwood_scale`, `annotated_image_url`.
- **`ProgressionData`** (`223-228`): `current_baldness`, `initial_baldness`, `change_percentage`, `trend:str`, `months_tracked:int`.
- **`HistoryResponse`** (`230-235`): `success`, `user_id`, `total_analyses`, `results:List[AnalysisHistoryItem]`, optional `progression`.
- **`BatchAnalysisItem`** (`238-246`), **`BatchSummary`** (`248-251`), **`BatchAnalysisResponse`** (`253-262`): batch processing models (declared but no batch endpoint exists in the files of this phase).

#### 5.6 Health / model models
- **`HealthResponse`** (`265-271`): `status`, `version`, `timestamp`, `database_status`, `storage_status`, `model_status` (all str/datetime).
- **`ModelInfo`** (`273-279`): `name`, `version`, `classes:Dict[int,str]`, `input_size:List[int]`, `confidence_threshold`, `iou_threshold`.

#### 5.7 Hair journey models
- **`HairJourneyOptions`** (`287-299`): `iterations:int=5` (1–20), `save_intermediate:bool=True`, `quality_mode:str="balanced"`.
- **`IterationResult`** (`301-306`): `iteration_number:int`, `image_url:str`, optional `mask_url`, `processing_time_ms:float`, `timestamp:datetime`.
- **`HairJourneyResult`** (`308-314`): `session_id`, `original_image_url`, `final_result_url`, `iterations:List[IterationResult]`, `total_processing_time_ms`, `view_type:str`.
- **`HairJourneyResponse`** (`316-351`): `success`, `status:HairJourneyStatus`, `session_id`, `timestamp`, `processing_time_ms`, optional `result:HairJourneyResult`, optional `error_message`.
- **`HairJourneyHistoryItem`** (`353-360`): `session_id`, `created_at`, `original_filename`, `iterations_count`, `view_type`, `final_result_url`, `processing_time_ms`.
- **`HairJourneyHistoryResponse`** (`362-366`): `success`, `user_id`, `total_sessions`, `results`.

#### 5.8 Facial recognition models
- **`FacialLandmark`** (`369-374`): `type:str`, `x:int`, `y:int`, `x_ratio:float`, `y_ratio:float`.
- **`FaceBoundingBox`** (`376-380`): `left`, `top`, `width`, `height` (ints).
- **`EmotionData`** (`382-384`): `Type:str`, `Confidence:float`.
- **`PoseData`** (`386-389`): optional `Roll`, `Yaw`, `Pitch`.
- **`QualityData`** (`391-393`): optional `Brightness`, `Sharpness`.
- **`AttributeData`** (`395-397`): optional `Value:bool`, `Confidence:float`.
- **`GenderData`** (`399-401`): optional `Value:str`, `Confidence:float`.
- **`AgeRangeData`** (`403-405`): optional `Low:int`, `High:int`.
- **`FaceAttributes`** (`407-419`): `confidence:float` plus optional `age_range`, `gender`, `emotions:List[EmotionData]`, `pose`, `quality`, `smile`, `eyeglasses`, `sunglasses`, `beard`, `mustache`, `eyes_open`, `mouth_open`.
- **`FaceData`** (`422-425`): `face_id:int`, `bounding_box:FaceBoundingBox`, `landmarks:List[FacialLandmark]`, `attributes:FaceAttributes`.
- **`FacialRecognitionImageInfo`** (`428-431`): `filename`, `dimensions`, `original_dimensions`.
- **`FacialRecognitionResponse`** (`433-485`): `success`, `status`, `session_id`, `timestamp`, `processing_time_ms`, `aws_processing_time_ms`, `face_count`, `faces:List[FaceData]`, `image_info`.

(Chat request/response models — `ChatMessage`, `ChatRequest`, `ChatResponse` — are defined locally inside `chat.py`, not in `schemas.py`; see Section 6.4.)

### 6. The Supabase Client (core dependency)

`Scalpify-ML/api/app/core/supabase_client.py` provides the database/storage layer used by the endpoints.

- **`async_supabase` decorator** (`12-18`): wraps a synchronous Supabase call so it runs inside `loop.run_in_executor`, making blocking calls non-blocking for the async event loop.
- **`SupabaseClient`** (`20-230`): on construction it computes `self.enabled` = all three of `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` are present (`22-26`). If enabled it builds a public `client` and an admin `admin_client`; otherwise both are `None` and a warning is printed. This is the **graceful-degradation** design: when Supabase is not configured, every method returns mock/empty data so the API still works in development.
- Key methods: `create_session` (`55-69`), `update_session_status` (`80-107`), `save_analysis_result` (`136-145`, mapping the analysis dict into DB columns), `upload_file` (`160-171`, returns a public URL or a mock `/dev/...` URL), `get_analysis_result` (`184-188`), `get_user_history` (`202-206`), `cleanup_old_files` (`226-230`).
- A global singleton `supabase_client` is created (`233`) and a `get_supabase_client()` accessor is provided (`235-237`).

### 7. Endpoint Modules (detailed)

#### 7.1 `analysis.py` — Baldness analysis
**Purpose:** Run YOLO-based baldness analysis on an uploaded image and persist results.

- **Module setup** (`analysis.py:27-31`): creates `router`, loads `settings`, and instantiates `analysis_service = AnalysisService()` (from `app.services.analysis_service`).
- **`validate_upload_file(file)`** (`33-53`): helper that enforces max size (raises `FileTooLargeException`), allowed MIME type and allowed extension (raises `InvalidFileTypeException`).

**Endpoint `POST /analyze`** — `analyze_image` (`55-307`):
- **Inputs (multipart form):** `file:UploadFile` (required), `user_id:str?`, `height:int=512` (224–4096), `width:int=512` (224–4096), `options:str=""` (JSON string), `request:Request`.
- **Flow:**
  1. Validate file (`86`).
  2. Parse `options` JSON, tolerating Swagger placeholder values like `"string"`, `""`, `"null"`, `"undefined"`; bad JSON → `HTTPException(400)` (`89-99`).
  3. Capture client IP and user-agent (`102-103`).
  4. `supabase_client.create_session(...)` → `session_id` (`106-111`).
  5. Read bytes; re-check size after read (`114-118`).
  6. Inject `target_height`/`target_width` into options (`121-122`).
  7. Call `analysis_service.process_full_analysis(contents, filename, options)` (`125-129`).
  8. Upload standardized 512×512 original to the `uploads` bucket (with a fallback to raw bytes) (`131-154`), and upload annotated image to `processed` bucket if present (`156-172`).
  9. Compute `processing_time_ms`, enrich result dict, `save_analysis_result`, and `update_session_status("completed")` (`174-192`).
  10. Assemble `response_data` and return a validated `AnalysisResponse` (`194-248`).
- **Error handling:** `GASPException` → sets session "failed" and returns the standard error envelope at the exception's status (`254-276`). Any other `Exception` → logs server-side, sets session "failed", and returns a 500 envelope; in `DEBUG` the real message is surfaced, otherwise a generic message (`278-307`).
- **Service called:** `AnalysisService.process_full_analysis`.

**Endpoint `GET /analysis/{session_id}`** — `get_analysis_result` (`309-328`): fetches a stored result via `supabase_client.get_analysis_result`; 404 if missing; returns `{"success": True, "result": ...}`.

**Endpoint `GET /history`** — `get_analysis_history` (`330-389`):
- **Inputs (query):** `user_id:str` (required), `limit:int=10` (capped to 50).
- Fetches history, builds `AnalysisHistoryItem` list, computes `ProgressionData` if ≥2 baldness points (trend = stable/worsening/improving based on change vs ±2), and returns a `HistoryResponse`.

#### 7.2 `chat.py` — Scalpify AI assistant
**Purpose:** Conversational hair-loss assistant backed by OpenAI.

- Defines local models: **`ChatMessage`** (`role: "user"|"assistant"`, `content:str`), **`ChatRequest`** (`messages:List[ChatMessage]`, optional `context:Dict`), **`ChatResponse`** (`success:bool`, `reply:str`, `model:str`) (`10-26`).
- **Endpoint `POST /chat`** — `chat` (`29-56`):
  - If `chat_service.enabled` is False (no `OPENAI_API_KEY`) → `HTTPException(503)`.
  - If `messages` empty → `HTTPException(400)`.
  - Calls `chat_service.reply(messages=..., context=...)` and returns `ChatResponse(success=True, reply=..., model=chat_service.model)`.
  - Any error → `HTTPException(500, "Chat failed: ...")`.
- **Service called:** `chat_service` (from `app.services.chat_service`).

#### 7.3 `facial_recognition.py` — AWS Rekognition
**Purpose:** Detect faces, landmarks, and attributes using AWS Rekognition.

- Setup (`21-25`): `router`, `settings`, `facial_recognition_service = FacialRecognitionService()`. Has its own identical `validate_upload_file` helper (`28-48`).
- **Endpoint `POST /facial-recognition`** — `facial_recognition` (`51-188`):
  - **Inputs (multipart form):** `file:UploadFile`, `user_id:str?`, `height:int=512`, `width:int=512`, `request:Request`.
  - **Flow:** validate file → capture client info → `create_session` → read bytes, re-check size → `facial_recognition_service.process_facial_recognition(contents, filename, target_width, target_height)` → `update_session_status("completed")` → build & return `FacialRecognitionResponse`.
  - **Errors:** `GASPException` and generic `Exception` produce the same error envelopes as analysis (note: generic handler here always echoes the message, unlike analysis which gates on DEBUG) (`142-188`).
- **Endpoint `GET /facial-recognition/{session_id}`** — `get_facial_recognition_result` (`191-210`): reuses `supabase_client.get_analysis_result`; 404 if missing.
- **Service called:** `FacialRecognitionService.process_facial_recognition`.

#### 7.4 `hair_journey.py` — FUE transplant timeline generation
**Purpose:** Generate a multi-stage post-transplant hair journey using the Replicate-backed service.

- Setup (`17-18`) and helper **`_absolutize_urls(result, request)`** (`20-33`) which rewrites relative `/journey-files/...` URLs to absolute URLs (so a phone can reach them) using `request.base_url`.
- **Endpoint `POST /hair-journey/generate`** — `generate_hair_journey` (`36-131`):
  - **Inputs (multipart form):** `request:Request`, `image:UploadFile` (required).
  - **Flow:** if service not enabled (no `REPLICATE_API_TOKEN`) → 503; create local `session_id` (uuid4); validate content-type starts with `image/` (else 400) and size (else 413); write a temp file; build fixed `HairJourneyOptions(iterations=6, save_intermediate=True, quality_mode="balanced")`; call `hair_journey_service.generate_hair_journey(image_path, options, session_id)`; absolutize URLs; return `HairJourneyResponse(...COMPLETED...)`. Temp file is always cleaned up in `finally` (`109-112`).
  - **Errors:** re-raise `HTTPException`; any other error → 500 `JSONResponse` from a FAILED `HairJourneyResponse` (`114-131`).
- **Endpoint `GET /hair-journey/history`** — `get_hair_journey_history` (`133-173`): inputs `user_id:str`, `limit:int=20`; calls `hair_journey_service.get_history`; maps rows into `HairJourneyHistoryResponse`.
- **Endpoint `GET /hair-journey/session/{session_id}`** — `get_hair_journey_session` (`175-214`): if Supabase disabled → 503; queries the `hair_journey_sessions` table directly; 404 if missing.
- **Endpoint `DELETE /hair-journey/session/{session_id}`** — `delete_hair_journey_session` (`216-258`): if Supabase disabled → 503; deletes the row from `hair_journey_sessions`; 404 if not found; returns `{"success": True, "message": ...}`. (File deletion from storage is a TODO.)
- **Service called:** `hair_journey_service` (from `app.services.hair_journey_service`).

#### 7.5 `health.py` — Health, model info, probes
**Purpose:** Operational/health endpoints and model metadata.

- **`GET /health`** — `health_check` (`14-72`): probes the DB (`analysis_sessions` select), storage (`list_buckets`), and the model (via `AnalysisService().get_model_info()`); computes overall `healthy` / `degraded` / `unhealthy`; returns `HealthResponse`.
- **`GET /model/info`** — `get_model_info` (`74-89`): returns `ModelInfo` from `AnalysisService().get_model_info()`; 500 on error.
- **`GET /ping`** — `ping` (`91-100`): returns `{"message": "pong", "timestamp": ..., "version": ...}`.
- **`GET /ready`** — `readiness_probe` (`102-124`): runs `_check_database()` and `_check_model()` concurrently via `asyncio.gather`; 503 if any fails; else `{"status": "ready"}`.
- **`GET /live`** — `liveness_probe` (`126-131`): returns `{"status": "alive"}`.
- Helpers `_check_database` (`134-140`) and `_check_model` (`142-150`, verifies `settings.MODEL_PATH` exists).
- **Service called:** `AnalysisService.get_model_info`.

---

## Phase 8 — API Documentation

All paths are derived from the global prefix `settings.API_V1_STR = "/api/v1"` (`config.py:11`, mounted at `main.py:167`), each sub-router's `prefix=""` (`router.py`), and the individual decorator paths. Two routes (`/` and `/journey-files/...`) are mounted directly on the app, not under `/api/v1`.

### Authentication
There is **no authentication** on any endpoint. The OpenAPI description states "Currently open API" (`main.py:57`), `ENABLE_API_KEY_AUTH` defaults to `False` (`config.py:56`), and no auth dependency is attached to any route. Therefore **Auth = None** for all endpoints below.

### Endpoint Index

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/` | API welcome / info | None |
| POST | `/api/v1/analyze` | Analyze one image for baldness | None |
| GET | `/api/v1/analysis/{session_id}` | Fetch stored analysis result | None |
| GET | `/api/v1/history` | User's analysis history + progression | None |
| POST | `/api/v1/facial-recognition` | Face detection/attributes via AWS Rekognition | None |
| GET | `/api/v1/facial-recognition/{session_id}` | Fetch stored facial recognition result | None |
| POST | `/api/v1/hair-journey/generate` | Generate FUE transplant timeline | None |
| GET | `/api/v1/hair-journey/history` | Hair journey session history | None |
| GET | `/api/v1/hair-journey/session/{session_id}` | Fetch one hair journey session | None |
| DELETE | `/api/v1/hair-journey/session/{session_id}` | Delete a hair journey session | None |
| POST | `/api/v1/chat` | Scalpify AI chat assistant | None |
| GET | `/api/v1/health` | Full health check | None |
| GET | `/api/v1/model/info` | ML model metadata | None |
| GET | `/api/v1/ping` | Connectivity ping | None |
| GET | `/api/v1/ready` | Readiness probe | None |
| GET | `/api/v1/live` | Liveness probe | None |
| GET | `/docs`, `/redoc` | Swagger/ReDoc UI (DEBUG only) | None |
| (static) | `/journey-files/{file}` | Serve generated journey images | None |

---

### `GET /`
- **Request:** none.
- **Response (200):**
```json
{
  "message": "Welcome to GASP-AI API",
  "version": "1.0.0",
  "description": "Advanced baldness analysis using computer vision",
  "endpoints": {"analyze": "/api/v1/analyze", "health": "/api/v1/health", "documentation": "/docs"},
  "status": "operational"
}
```
- **Errors:** none expected.

---

### `POST /api/v1/analyze`
- **Request (multipart/form-data):**
  | Field | Type | Required | Default | Notes |
  |-------|------|----------|---------|-------|
  | `file` | file | yes | — | JPG/PNG/BMP |
  | `user_id` | string | no | null | history tracking |
  | `height` | int | no | 512 | 224–4096 |
  | `width` | int | no | 512 | 224–4096 |
  | `options` | string (JSON) | no | "" | maps to `AnalysisOptions` |
- **Response (200):** `AnalysisResponse` (see Phase 4a §5.4). Example (`schemas.py:166-198`):
```json
{
  "success": true, "status": "completed",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-24T14:30:45.123Z", "processing_time_ms": 1247.5,
  "image_info": {"filename": "patient_photo.jpg", "file_size": 2457600, "mime_type": "image/jpeg", "dimensions": {"width": 1920, "height": 1080}},
  "detection": {"regions_detected": {"bald": 1, "hair": 1, "total": 2}, "confidence_scores": {"bald": 0.94, "hair": 0.89, "average": 0.915}, "quality_score": 0.87},
  "measurements": {"pixels": {"bald": 128456, "hair": 356789, "total_head": 485245}, "cm2": {"bald": 52.4, "hair": 145.6, "total_head": 198.0}, "inch2": {"bald": 8.12, "hair": 22.57, "total_head": 30.69}, "percentage": {"baldness_ratio": 26.5, "hair_coverage": 73.5}},
  "classification": {"severity": "Mild", "severity_score": 2, "norwood_scale": "III", "confidence": 0.89, "recommendations": ["Early stage detected", "Monitor progress"]}
}
```
- **Error responses (uniform envelope `{success:false,status:"error",error:{code,message,details},session_id,timestamp}`):**
  | Code | error.code | Cause |
  |------|-----------|-------|
  | 400 | (raw HTTPException) | Invalid JSON in `options` (`analysis.py:99`) |
  | 400 | `INVALID_FILE_TYPE` | bad MIME/extension |
  | 413 | `FILE_TOO_LARGE` | file > 10MB |
  | 422 | `VALIDATION_ERROR` | request validation (global handler) |
  | 500 | `INTERNAL_ERROR` | unexpected error (message hidden unless DEBUG) |

---

### `GET /api/v1/analysis/{session_id}`
- **Request:** path param `session_id:str`.
- **Response (200):** `{"success": true, "result": {...}}` (DB row + joined session).
- **Errors:** 404 (`Analysis not found for session: ...`); 500 (`Failed to retrieve analysis: ...`).

---

### `GET /api/v1/history`
- **Request (query):** `user_id:str` (required); `limit:int=10` (capped to 50).
- **Response (200):** `HistoryResponse`:
```json
{"success": true, "user_id": "...", "total_analyses": 3,
 "results": [{"session_id": "...", "created_at": "...", "filename": "x.jpg", "baldness_ratio": 26.5, "severity": "Mild", "norwood_scale": "III", "annotated_image_url": null}],
 "progression": {"current_baldness": 26.5, "initial_baldness": 24.1, "change_percentage": 2.4, "trend": "worsening", "months_tracked": 3}}
```
- **Errors:** 422 if `user_id` missing (validation); 500 (`Failed to retrieve history: ...`).

---

### `POST /api/v1/facial-recognition`
- **Request (multipart/form-data):** `file` (required), `user_id?`, `height=512` (224–4096), `width=512` (224–4096).
- **Response (200):** `FacialRecognitionResponse`. Example (`schemas.py:446-485`):
```json
{
  "success": true, "status": "completed",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-24T14:30:45.123Z", "processing_time_ms": 1247.5, "aws_processing_time_ms": 850.2,
  "face_count": 1,
  "faces": [{"face_id": 1, "bounding_box": {"left": 120, "top": 80, "width": 200, "height": 250},
             "landmarks": [{"type": "eyeLeft", "x": 180, "y": 150, "x_ratio": 0.352, "y_ratio": 0.293}],
             "attributes": {"confidence": 99.95, "age_range": {"Low": 25, "High": 35}, "gender": {"Value": "Male", "Confidence": 98.5}}}],
  "image_info": {"filename": "patient_photo.jpg", "dimensions": {"width": 512, "height": 512}, "original_dimensions": {"width": 512, "height": 512}}
}
```
- **Errors (uniform envelope):** 400 `INVALID_FILE_TYPE`; 413 `FILE_TOO_LARGE`; 422 `VALIDATION_ERROR`; 500 `INTERNAL_ERROR` (message always included here, `facial_recognition.py:182`).

---

### `GET /api/v1/facial-recognition/{session_id}`
- **Request:** path param `session_id:str`.
- **Response (200):** `{"success": true, "result": {...}}`.
- **Errors:** 404 (`Facial recognition not found for session: ...`); 500.

---

### `POST /api/v1/hair-journey/generate`
- **Request (multipart/form-data):** `image:UploadFile` (required, content-type must start with `image/`).
- **Response (200):** `HairJourneyResponse`. Example (`schemas.py:327-351`):
```json
{
  "success": true, "status": "completed",
  "session_id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-01-24T15:30:45.123Z", "processing_time_ms": 25000.5,
  "result": {
    "session_id": "550e8400-e29b-41d4-a716-446655440001",
    "original_image_url": "https://.../original.jpg",
    "final_result_url": "https://.../final_result.jpg",
    "iterations": [{"iteration_number": 1, "image_url": "https://.../iter_1.jpg", "mask_url": "https://.../mask_1.jpg", "processing_time_ms": 2500.0, "timestamp": "2025-01-24T15:30:47.123Z"}],
    "total_processing_time_ms": 25000.5, "view_type": "front"
  }
}
```
- **Errors:**
  | Code | Body | Cause |
  |------|------|-------|
  | 503 | `{detail: "...REPLICATE_API_TOKEN not configured"}` | service disabled (`hair_journey.py:51-54`) |
  | 400 | `{detail: "Invalid file type..."}` | non-image upload |
  | 413 | `{detail: "File too large..."}` | > 10MB |
  | 500 | `HairJourneyResponse` with `success:false, status:"failed", error_message:"Hair journey generation failed: ..."` | generation error (`hair_journey.py:119-131`) |

---

### `GET /api/v1/hair-journey/history`
- **Request (query):** `user_id:str` (required); `limit:int=20`.
- **Response (200):** `HairJourneyHistoryResponse`:
```json
{"success": true, "user_id": "...", "total_sessions": 2,
 "results": [{"session_id": "...", "created_at": "...", "original_filename": "session_xxxxxxxx.jpg", "iterations_count": 6, "view_type": "front", "final_result_url": "https://...", "processing_time_ms": 25000.0}]}
```
- **Errors:** 500 (`Failed to fetch history: ...`).

---

### `GET /api/v1/hair-journey/session/{session_id}`
- **Request:** path param `session_id:str`.
- **Response (200):** `{"success": true, "session": {...full DB row...}}`.
- **Errors:** 503 (`Database not available`); 404 (`Session not found`); 500 (`Failed to fetch session: ...`).

---

### `DELETE /api/v1/hair-journey/session/{session_id}`
- **Request:** path param `session_id:str`.
- **Response (200):** `{"success": true, "message": "Session deleted successfully"}`.
- **Errors:** 503 (`Database not available`); 404 (`Session not found`); 500 (`Failed to delete session: ...`).

---

### `POST /api/v1/chat`
- **Request (application/json):** `ChatRequest`:
```json
{"messages": [{"role": "user", "content": "Is my recovery on track?"}],
 "context": {"latest_scan": {}, "meds": [], "adherence": 0.9, "recovery_phase": "month_3"}}
```
  - `messages` required, each item `{role: "user"|"assistant", content: str}`; `context` optional dict.
- **Response (200):** `ChatResponse`:
```json
{"success": true, "reply": "Based on your latest scan...", "model": "gpt-4o-mini"}
```
- **Errors:**
  | Code | Body | Cause |
  |------|------|-------|
  | 503 | `{detail: "Chat assistant not available — OPENAI_API_KEY is not configured."}` | service disabled |
  | 400 | `{detail: "At least one message is required."}` | empty `messages` |
  | 422 | validation error | malformed body |
  | 500 | `{detail: "Chat failed: ..."}` | OpenAI/service error |

---

### `GET /api/v1/health`
- **Request:** none.
- **Response (200):** `HealthResponse`:
```json
{"status": "healthy", "version": "1.0.0", "timestamp": "...",
 "database_status": "healthy", "storage_status": "healthy", "model_status": "healthy"}
```
  - `status` ∈ {`healthy`, `degraded` (a "warning" present), `unhealthy` (an "error" present)}.
- **Errors:** returns 200 with degraded/error sub-statuses rather than throwing.

---

### `GET /api/v1/model/info`
- **Request:** none.
- **Response (200):** `ModelInfo`:
```json
{"name": "...", "version": "...", "classes": {"0": "bald", "1": "hair"}, "input_size": [640, 640], "confidence_threshold": 0.4, "iou_threshold": 0.4}
```
- **Errors:** 500 (`Failed to get model info: ...` or the model error string).

---

### `GET /api/v1/ping`
- **Request:** none.
- **Response (200):** `{"message": "pong", "timestamp": "...", "version": "1.0.0"}`.
- **Errors:** none.

---

### `GET /api/v1/ready`
- **Request:** none.
- **Response (200):** `{"status": "ready"}`.
- **Errors:** 503 (`Service not ready: ...`) if DB or model checks fail.

---

### `GET /api/v1/live`
- **Request:** none.
- **Response (200):** `{"status": "alive"}`.
- **Errors:** none.

---

### Non-API mounts
- **`GET /docs`, `GET /redoc`** — interactive OpenAPI UIs; present only when `settings.DEBUG` is `True` (`main.py:59-60`), otherwise return 404.
- **`GET /journey-files/{path}`** — static file server for generated hair-journey images (`main.py:171-173`). Files that don't exist return 404.

### Cross-cutting notes
- Every successful response also carries the headers `X-Process-Time` and `X-Request-ID` from the timing middleware (`main.py:82-97`).
- A request to any unknown path returns the global 404 envelope listing available endpoints (`main.py:139-164`).
- Endpoints that depend on external services degrade gracefully: when Supabase is not configured the persistence calls return mock/empty data (`supabase_client.py`), and chat/hair-journey explicitly return 503 when their API tokens are missing.

---

I have read all six files fully. Here is the documentation section.

## Phase 4b — Backend Services & Business Logic

This phase documents the **business-logic layer** of the Scalpify machine-learning backend, located at `Scalpify-ML/api/app/services/`. These services sit between the HTTP endpoints (the "routers") and the raw ML pipeline (the YOLO segmentation model and external AI providers). Each service is a self-contained class that encapsulates one capability: scalp/baldness analysis, the AI chat assistant, facial-landmark recognition, and the AI-generated hair-recovery "journey." A shared utility, `coordinate_extractor.py`, turns segmentation masks into geometric coordinate data. Finally, the repository-root `Scalpify-ML/app.py` is a standalone command-line tool that predates and underpins the API.

> **Beginner orientation.** A "service" here is just a Python class that holds all the steps for one feature in one place, so the web endpoint only has to call one method (e.g. `service.process_full_analysis(...)`) instead of wiring everything together itself. This is the classic "service layer" pattern: endpoints handle HTTP, services handle the actual work.

---

### 1. `analysis_service.py` — Scalp / Baldness Analysis Service

**File:** `Scalpify-ML/api/app/services/analysis_service.py`

#### File purpose
This is the core business logic for the app's headline feature: analyzing a scalp photo to measure how much of the head is bald vs. covered with hair, classify severity on the Norwood scale, score the photo quality, and extract the coordinates of bald/hair regions. It wraps the underlying YOLOv11 segmentation model and translates its raw output into a rich, structured JSON result for the API.

#### Imports & external integrations
- **YOLO model** via `YOLOTesterWithAnnotations` imported from `src.components.bald_area_calculation_service` (`analysis_service.py:25`). To reach that module, the file manually adds the ML project root to `sys.path` (`analysis_service.py:10-12`).
- **Pillow (`PIL.Image`)**, **OpenCV (`cv2`)**, **NumPy** for image handling and quality metrics (`analysis_service.py:14-16`).
- **`CoordinateExtractor`** (the utility documented in section 5) for boundary extraction (`analysis_service.py:26`).
- **App config** via `get_settings()` (`analysis_service.py:19`, `28`) — supplies `MODEL_PATH`, `CONFIDENCE_THRESHOLD`, `IOU_THRESHOLD`, image size limits, `VERSION`, `DEBUG`.
- **Custom exceptions** `ImageProcessingException`, `DetectionFailedException`, `AnalysisFailedException` (`analysis_service.py:20-24`) so the API can map failures to proper HTTP status codes.

#### Class: `AnalysisService`

**Constructor `__init__` (`analysis_service.py:31-36`)** — stores model path and thresholds from settings, sets `self._yolo_service = None` (lazy-loaded), and instantiates a `CoordinateExtractor`.

| Method | Inputs | Output | What it does |
|---|---|---|---|
| `_get_yolo_service` (`38-66`) | none | `YOLOTesterWithAnnotations` instance | **Lazy-loads the YOLO model.** On first call it creates a unique temp output folder under `/tmp/gasp_analysis_<hex>`, resolves the model path to absolute, checks the file exists, then constructs `YOLOTesterWithAnnotations(model_path, output_folder)`. Caches the instance in `self._yolo_service`. Raises `AnalysisFailedException` if loading fails. Loading only once avoids paying the model-load cost on every request. |
| `_assess_image_quality` (`68-113`) | `PIL.Image` | dict of metrics | **Photo quality gate.** Converts to grayscale, computes **brightness** (mean), **contrast** (std-dev), and **sharpness** (variance of the Laplacian — values <100 are typically blurry). Each is scored 0–1 via the inner `_score` helper; the three are averaged into `overall`. Flags `issues` (too dark/overexposed/low-contrast/blurry) and sets `hard_fail` for dark/overexposed/blurry. Returns `acceptable = overall >= 0.2 and not hard_fail`. |
| `validate_image` (async, `115-164`) | `image_bytes`, `filename` | `(PIL.Image, image_info dict)` | Opens the image, builds `image_info` (filename, size, MIME, dimensions), enforces `MIN_IMAGE_SIZE`/`MAX_IMAGE_SIZE`, converts to RGB, then runs `_assess_image_quality`. Rejects poor photos with a helpful `ImageProcessingException`. Non-`ImageProcessingException` errors are wrapped as `Invalid image file`. |
| `_classify_severity` (`166-218`) | `baldness_ratio: float` | dict | **Norwood classification.** Buckets the baldness ratio into Minimal (<15, NW I-II), Mild (<30, NW III-IV), Moderate (<50, NW V-VI), or Severe (≥50, NW VII), each with `severity_score`, `norwood_details`, and a list of `recommendations`. |
| `_calculate_problem_severity` (`220-275`) | `baldness_ratio`, `hair_coverage` | dict | Computes an **adjusted severity %**: starts from baldness ratio, multiplies by a `hair_quality_factor` (1.3 if coverage <30%, 1.15 if <50%, 0.9 if >80%, capped at 100). Maps the adjusted score to a `level`, `urgency`, `action_needed`, and `description`, and returns the factors considered. |
| `_calculate_hair_health` (`277-346`) | `baldness_ratio`, `hair_coverage`, `result` | dict | Computes a **health score** = `coverage_score*0.6 + hair_density*0.4` where `coverage_score = 100 - baldness_ratio` and density = hair pixels / total-head pixels. Maps it to a `grade`/`status`/`risk_level`, derives a `thickness` label from a `thickness_ratio`, and returns detailed metrics + indicators. |
| `analyze_image` (async, `348-583`) | `image`, `image_info`, optional `options` | full analysis dict | **The orchestrator** (see flow below). |
| `process_full_analysis` (async, `585-599`) | `image_bytes`, `filename`, optional `options` | analysis dict | Convenience pipeline: calls `validate_image` then `analyze_image`. This is the single entry point endpoints use. |
| `get_model_info` (`601-616`) | none | dict | Returns model metadata (name, version, class names from the YOLO service, input size `[640,640]`, thresholds), or an error dict if the model can't load. |

#### Execution flow of `analyze_image` (the heart of the service)
1. **Load model** via `_get_yolo_service()` (`360`).
2. **Resize** the image to target dimensions (from `options`, default 512×512) using LANCZOS resampling (`362-372`).
3. **Write temp files** under `/tmp` — both a working copy for YOLO and a "standardized original" for the API response (`375-382`).
4. **Run segmentation** by calling `yolo_service.process_and_annotate_image(temp_path)` (`387`). Empty result → `DetectionFailedException`.
5. **Coordinate extraction** (`392-452`): resizes the image, calls `yolo_service.model.predict(..., iou=0.4)` directly to get masks, separates them into combined **bald** and **hair** masks using `yolo_service.bald_class_id` / `hair_class_id`, then calls either `coordinate_extractor.get_boundary_points_only(...)` (if `options.boundary_points_only`) or `extract_coordinates_data(...)`. Coordinate-space metadata is attached. Failures here are non-fatal (logged, `coordinate_data = None`).
6. **Pull measurements** from the YOLO result: `areas_cm2`, `areas_inch2`, `areas_pixels`, `percentages` (`458-461`). Missing pixels/percentages → `DetectionFailedException`.
7. **Real confidence** (`469-481`): reads per-class YOLO confidences (`bald_mean`, `hair_mean`) and computes an **area-weighted average** confidence — explicitly replacing a previous hardcoded `0.85`.
8. **Classify & score** (`483-490`): `_classify_severity`, `_calculate_problem_severity`, `_calculate_hair_health`.
9. **Assemble result** (`493-568`): a large dict with `session_id` (UUID), timestamp, processing time, image info, detection counts + confidence scores + quality score, measurements (pixels/cm²/inch²/percentage), classification, problem severity, hair health, metadata (`model_version: "yolov11-segmentation-v1.0"`, API version, device, pixels-per-cm), file paths, coordinate data, and `_raw_result` only when `settings.DEBUG`.
10. **Cleanup** the temp working file in a `finally` block (`572-575`).

#### How it connects
- **To endpoints:** routers call `process_full_analysis` / `analyze_image` / `get_model_info`; the custom exceptions let the API return appropriate error responses.
- **To the ML pipeline:** through `YOLOTesterWithAnnotations` (same class used by the standalone `app.py` — see section 6) and through direct `model.predict` calls for masks.

---

### 2. `chat_service.py` — Scalpify AI Chat Assistant

**File:** `Scalpify-ML/api/app/services/chat_service.py`

#### File purpose
Wraps the **OpenAI Chat Completions API** behind a small, hair-loss-scoped assistant. Its key idea is **grounding**: the system prompt is enriched with the caller's real app data (latest scan, medications, adherence, recovery phase) so answers reference the user's own numbers rather than generic advice (`chat_service.py:1-8`).

#### External integrations
- **OpenAI** SDK, imported **lazily** inside `_get_client` (`chat_service.py:105-107`) so the API still boots even if the `openai` package or key is missing.
- **Config:** `OPENAI_API_KEY` and `OPENAI_CHAT_MODEL` from settings (`95-96`).

#### Module-level pieces
- **`BASE_SYSTEM_PROMPT`** (`16-34`) — defines the assistant's persona ("Scalpify Assistant"), its scope (hair loss, Norwood, FUE/FUT, treatments like finasteride/minoxidil, app usage), and safety rules (be concise, ground answers in user data, "you are NOT a doctor," steer back if off-topic, never invent numbers).
- **`_format_context(ctx)`** (`37-90`) — renders the user's app data dict into a compact bulleted block: name, transplant status + recovery day/phase, age, sex, latest scan (severity, Norwood, baldness %, coverage %), medications, and today's adherence %. Returns a friendly fallback string when no data is provided.

#### Class: `ChatService`
| Member | Inputs | Output | What it does |
|---|---|---|---|
| `__init__` (`94-97`) | none | — | Stores API key and model; `_client = None` (lazy). |
| `enabled` (property, `99-101`) | none | bool | True only if an API key is configured — lets endpoints gate the feature. |
| `_get_client` (`103-108`) | none | OpenAI client | Lazily imports `OpenAI` and constructs the client once. |
| `reply` (`110-137`) | `messages` (list of `{role, content}`), optional `context` | assistant reply string | Builds the grounded system prompt (`BASE_SYSTEM_PROMPT` + formatted context), filters history to valid `user`/`assistant` turns, **caps to the last 20 turns** for token control, calls `chat.completions.create` with `temperature=0.5`, `max_tokens=600`, and returns the trimmed reply text. |

A module-level singleton `chat_service = ChatService()` is exported (`140`) for endpoints to import directly.

#### Execution flow
Endpoint receives a chat request → builds a `context` dict from the user's stored app data → calls `chat_service.reply(messages, context)` → service grounds + truncates → OpenAI returns a completion → text returned to the endpoint. No database access; this service is purely a stateless wrapper.

---

### 3. `facial_recognition_service.py` — Facial Landmark Detection (AWS Rekognition)

**File:** `Scalpify-ML/api/app/services/facial_recognition_service.py`

#### File purpose
Detects faces, facial landmarks, and attributes in an uploaded photo using **AWS Rekognition**, and maps the returned (0–1 ratio) coordinates to a chosen pixel grid (default 512×512) so the frontend can overlay landmarks consistently (`facial_recognition_service.py:1-4`).

#### External integrations
- **AWS Rekognition** via **boto3** (`facial_recognition_service.py:5`, `22-27`), using `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` from settings.
- **Pillow** for image standardization (`9`).
- Handles `ClientError` / `NoCredentialsError` from botocore (`10`, `29-31`).

#### Class: `FacialRecognitionService`
| Method | Inputs | Output | What it does |
|---|---|---|---|
| `__init__` (`19-31`) | none | — | Builds the boto3 `rekognition` client; raises on credential/client errors. |
| `standardize_image` (`33-85`) | `image_bytes`, `target_size=(512,512)` | `(PIL.Image, bytes)` | Opens, converts to RGB, **resizes preserving aspect ratio**, and pastes onto a white square canvas (letterboxing). Returns the canvas and its JPEG bytes. Note this differs from `AnalysisService`, which stretches to the target size. |
| `detect_faces_and_landmarks` (`87-122`) | `image_bytes` | dict | Calls Rekognition `detect_faces` with `Attributes=['ALL']`, times it, and returns `face_details`, `processing_time_ms`, and `face_count`. |
| `map_coordinates_to_dimensions` (`124-168`) | `landmarks`, source/target W/H | list of dicts | Converts each landmark's `X`/`Y` **ratio (0–1)** into pixel `x`/`y` for the target dimensions, clamps to bounds, and keeps the original ratios. |
| `process_facial_recognition` (async, `170-295`) | `image_bytes`, `filename`, `target_width=512`, `target_height=512` | result dict | Full pipeline (see flow). |

#### Execution flow of `process_facial_recognition`
1. **Standardize** the image to the target size (`200-204`).
2. **Detect** faces/landmarks via Rekognition (`208`).
3. **Per face** (`212-257`): map the bounding box to pixels, map landmarks via `map_coordinates_to_dimensions`, and collect a rich `attributes` block (confidence, age range, gender, emotions, pose, quality, smile, eyeglasses, sunglasses, beard, mustache, eyes/mouth open).
4. **Assemble** a result with `success`, `face_count`, `faces`, `image_info` (target + standardized dimensions), and timing fields (total vs. AWS time).

#### How it connects
Called by the facial-recognition endpoint; the returned landmark coordinates are designed to align with the same 512×512 space used by the analysis/coordinate pipeline so overlays line up on the client.

---

### 4. `hair_journey_service.py` — AI Hair-Recovery Journey Generator

**File:** `Scalpify-ML/api/app/services/hair_journey_service.py`

#### File purpose
Generates a sequence of AI-edited images visualizing a patient's **post-FUE hair-transplant recovery timeline** (15 days → 8 months) by progressively editing the user's scalp photo with Google's **nano-banana-pro** image model on **Replicate**, grounding each edit to the actual bald region detected by YOLO, and persisting results to **Supabase** (or locally as a dev fallback).

#### External integrations
- **Replicate** (`replicate` package) running `google/nano-banana-pro` (`hair_journey_service.py:11`, `63`, `108`). Token from `REPLICATE_API_TOKEN`.
- **Supabase** via `get_supabase_client()` for storage + a `hair_journey_sessions` table (`14`, `138`, `237-304`).
- **Pillow** for image prep (`10`).
- **YOLO grounding** indirectly: `ground_bald_region` imports `analyze_bald_region` from `scripts/grounded_hair_journey.py` (`36-51`).
- **Schemas** `HairJourneyOptions/Response/Status/Result`, `IterationResult` (`15-18`).

#### Module-level helpers
- **`OUTPUTS_DIR`** / **`_PROJECT_ROOT`** (`23-26`) — local output folder and project root paths.
- **`_GENERIC_REGION`** (`30-33`) — fallback region phrase used when grounding can't run.
- **`ground_bald_region(image_path)`** (`36-51`) — **best-effort spatial grounding.** Adds `scripts/` to `sys.path`, calls `analyze_bald_region` (YOLO-based), and returns a phrase describing where the recipient zone is. Falls back to `_GENERIC_REGION` on any failure so journey generation never hard-fails on grounding.

#### Class: `NanoBananaEditor` (`54-130`)
The low-level Replicate wrapper.
- **`__init__` (`62-71`)** — sets model to `google/nano-banana-pro`; disables itself (`enabled=False`) if no token, else sets the env var and `enabled=True`.
- **`edit_image(images, prompt, max_retries=4)` (`73-130`)** — accepts a single PIL image or a list (the **last** image is the original anchor for framing/identity). Encodes each as PNG, builds Replicate `input_data` (`prompt`, `image_input`, `aspect_ratio: "match_input_image"`, `safety_filter_level: "block_only_high"`, `allow_fallback_model: True`), runs the model, reads bytes back into a PIL image, and returns a small `EditResult` holding `.images`. On **429/throttle** errors it retries with exponential backoff (`12 * 2^attempt`, capped 60s) to survive Replicate's 6-req/min low-credit limit.

#### Class: `HairJourneyService` (`132-458`)
- **`__init__` (`135-191`)** — builds a `NanoBananaEditor`, mirrors its `enabled`, gets the Supabase client, and defines two prompt-engineering assets:
  - **`identity_block`** (`147-157`) — a strict instruction to keep the same person/face/pose/lighting/background and only modify hair in the described zone, with no text/watermarks.
  - **`self.stages`** (`159-191`) — six tuples `(stage_name, chain_from_previous, edit_instruction)` for 15 days, 1, 3, 4, 6, 8 months. `chain_from_previous=False` (only the 15-day stage) edits the **original**; the rest build on the previous output so density accumulates smoothly.

| Method | Inputs | Output | What it does |
|---|---|---|---|
| `pad_to_square` (`193-203`) | `image`, `fill_color` | `PIL.Image` | Pads to a square via `ImageOps.expand`. |
| `cleanup_outputs_folder` (`205-219`) | none | — | Deletes old files in `OUTPUTS_DIR` (creates it if missing). |
| `save_image_locally` (`221-235`) | `image`, `filename` | path str / None | Saves a PNG to `OUTPUTS_DIR`. |
| `upload_to_supabase` (async, `237-267`) | `image`, `filename`, `bucket="hair-journey"` | URL str | Uploads PNG to Supabase storage; **dev fallback** saves locally and returns a `/journey-files/...` relative URL when Supabase is disabled. |
| `save_journey_to_db` (async, `269-304`) | `session_id`, `HairJourneyResult` | — | Inserts a row into `hair_journey_sessions` (original/final URLs, iteration count, view type, timing, per-iteration data). No-ops if Supabase is disabled. |
| `generate_hair_journey` (async, `306-436`) | `image_path`, `HairJourneyOptions`, `session_id` | `HairJourneyResult` | The main pipeline (see flow). |
| `get_history` (async, `438-455`) | `user_id`, `limit=20` | list of dicts | Queries `hair_journey_sessions` filtered by `user_id`, newest first. |

A singleton `hair_journey_service = HairJourneyService()` is exported (`458`).

#### Execution flow of `generate_hair_journey`
1. Clean the outputs folder (`314`).
2. Open the input image, pad to square, resize to 512×512, save `00_original.png`, and upload as `<session_id>/original.png` (`317-325`).
3. **Ground** the bald region with `ground_bald_region(image_path)` (`330`).
4. Loop over `num_stages` (capped at `len(self.stages)`), **pacing** ≥11s between Replicate calls (`342-352`) to respect the rate limit. For each stage, build the prompt `desc + region_phrase + identity_block` (`361`), choose the base image (original for the first stage; previous output + original anchor for chained stages, `365-370`), call `editor.edit_image(...)`, save locally, and — if `options.save_intermediate` — upload and append an `IterationResult` (`372-394`).
5. Pick the **last stage as the final result** (`399-405`), compute total time, print a summary, build a `HairJourneyResult`, persist it via `save_journey_to_db`, and return it (`420-432`).

#### How it connects
- **To endpoints:** the journey router calls `generate_hair_journey` (typically as a background task) and `get_history`; the API rewrites local fallback URLs into phone-reachable absolute URLs.
- **To the ML pipeline:** via `ground_bald_region` → `scripts/grounded_hair_journey.analyze_bald_region`, which itself uses the same YOLO segmentation that `AnalysisService` relies on.

---

### 5. `coordinate_extractor.py` — Mask-to-Coordinates Utility

**File:** `Scalpify-ML/api/app/utils/coordinate_extractor.py`

#### Purpose (beginner-friendly)
The YOLO model outputs **masks** — grids where each pixel is "bald," "hair," or "neither." A mask is great for math but not for drawing on a phone screen. This utility converts masks into **geometric coordinate data**: the outline (boundary) points of each region, simplified outlines, convex hulls, areas, perimeters, bounding boxes, and centroids. The frontend uses these to draw overlays on the photo.

#### Data classes
- **`BoundaryPoint`** (`12-17`) — a single point `(x, y)` plus a `curve_index` identifying which contour it belongs to (a mask can contain multiple separate blobs).
- **`SegmentGeometry`** (`20-29`) — the full geometry of one region: boundary points, contour area, bounding box, centroid, perimeter, convex hull, and a simplified boundary.

#### Class: `CoordinateExtractor`
- **`__init__` (`35-37`)** — sets `min_contour_area = 100` (ignore tiny noise blobs) and `epsilon_factor = 0.02` (controls how aggressively outlines are simplified).

| Method | Inputs | Output | What it does |
|---|---|---|---|
| `extract_contours` (`39-60`) | binary `mask` | list of contours | Binarizes the mask (`>0.5`), runs `cv2.findContours` with `RETR_EXTERNAL`/`CHAIN_APPROX_SIMPLE`, and drops contours smaller than `min_contour_area`. Returns `[]` for empty masks. |
| `contour_to_boundary_points` (`62-74`) | `contour`, `curve_index` | list[`BoundaryPoint`] | Converts an OpenCV contour array into `BoundaryPoint` objects. |
| `simplify_contour` (`76-87`) | `contour`, optional `epsilon_factor` | simplified contour | Uses the **Douglas–Peucker algorithm** (`cv2.approxPolyDP`) with epsilon = `epsilon_factor × perimeter` to reduce the point count while keeping the shape — important for lightweight API payloads. |
| `get_bounding_box` (`89-97`) | `contour` | dict `{x,y,width,height}` | Axis-aligned bounding rectangle via `cv2.boundingRect`. |
| `get_centroid` (`99-115`) | `contour` | dict `{x,y}` | Center of mass from image **moments**; falls back to bounding-box center if area is zero. |
| `get_convex_hull` (`117-120`) | `contour`, `curve_index` | list[`BoundaryPoint`] | Convex hull (`cv2.convexHull`) as boundary points. |
| `extract_segment_geometry` (`122-156`) | `mask`, `segment_type` | list[`SegmentGeometry`] | For each valid contour, computes area, perimeter, full + simplified boundary, bounding box, centroid, and convex hull, bundled into a `SegmentGeometry`. |
| `extract_coordinates_data` (`158-204`) | `bald_mask`, optional `hair_mask` | dict | The main API-facing method. Builds geometry for bald (and optionally hair) segments, serializes each to JSON-friendly dicts (boundary points, simplified boundary, convex hull, geometry block), and adds a `summary` (segment counts, largest bald area, total boundary/simplified point counts). |
| `get_boundary_points_only` (`206-221`) | `mask`, `simplified=True` | list of `{x,y,curve_index}` | Lightweight path: returns just boundary points (optionally simplified), used when the caller passes `boundary_points_only`. |

#### How it connects
`AnalysisService.analyze_image` builds combined bald/hair masks from YOLO's raw masks and calls `extract_coordinates_data` or `get_boundary_points_only` (`analysis_service.py:422-449`). The output becomes the `coordinates` field of the analysis response, consumed by the client to render region overlays.

---

### 6. `Scalpify-ML/app.py` — Standalone CLI Baldness-Analysis Tool

**File:** `Scalpify-ML/app.py`

#### What it is
This is **not** the web API. It is a **standalone command-line application** ("GASP-AI Baldness Analysis," v1.0.0) that runs the YOLOv11 segmentation pipeline directly from the terminal (`app.py:1-7`, `20-24`). It is the original/offline harness around the same `YOLOTesterWithAnnotations` model class that the FastAPI `AnalysisService` later wrapped for the app — making it useful for batch testing, model validation, and reproducing results outside the API.

#### Structure
- **Path setup** (`app.py:15-16`) adds its own directory to `sys.path`, then imports `YOLOTesterWithAnnotations` from `src.components.bald_area_calculation_service` (`18`) — the exact class `AnalysisService` uses, confirming both the CLI and the API share one ML core.

- **Class `GASPAnalysisApp`** (`20-245`):
  | Method | Inputs | Output | What it does |
  |---|---|---|---|
  | `print_banner` (`26-36`) | none | prints banner | Decorative startup banner. |
  | `run_analysis` (`38-75`) | `input_folder`, `output_folder`, `model_path` | bool | Validates model/input paths, builds `YOLOTesterWithAnnotations`, runs `process_all_images`, and prints a summary. |
  | `run_single_image_analysis` (`77-118`) | `image_path`, `output_folder`, `model_path` | bool | Runs `process_and_annotate_image` on one image, prints results, and saves JSON via `save_results_to_json`. |
  | `display_single_result` (`120-165`) | `result`, `output_folder` | prints | Pretty-prints one image's detection counts, baldness ratio, areas (cm²/in²), output paths, and a Norwood severity label. |
  | `display_summary` (`167-204`) | `results`, `output_folder` | prints | Aggregate stats across a batch: count, total/average time, baldness average/range, area stats, and least/most-bald images. |
  | `load_and_display_results` (`206-245`) | `json_path` | bool | Loads a previously saved `analysis_results.json` and prints its summary/individual results, handling missing-file and invalid-JSON errors. |

- **`main()` / CLI** (`248-327`) — uses `argparse` with flags `--input/-i`, `--output/-o`, `--model/-m` (default `model/best.pt`), `--load/-l`, `--image`, `--version/-v`. It dispatches to load mode, single-image mode, or folder mode and exits with the success/failure code. Run via `if __name__ == "__main__": main()` (`326-327`).

#### Role in the project
`app.py` is the **developer/offline counterpart** to the production analysis endpoint. Both call the same `YOLOTesterWithAnnotations`, so the CLI lets the project OWNER test the model, batch-process the `testing/` folder, and inspect annotated outputs and JSON without running the FastAPI server — effectively the original prototype that the `AnalysisService` business-logic layer productionized for the mobile app.

---

### Cross-cutting notes
- **Shared ML core:** `AnalysisService`, `app.py`, and (indirectly) `HairJourneyService` all route to the same `YOLOTesterWithAnnotations` segmentation model, ensuring consistent measurements across the API, CLI, and journey grounding.
- **Standardized 512×512 space:** analysis, coordinate extraction, and facial recognition all default to a 512×512 coordinate grid so client overlays from different features align.
- **Graceful degradation:** chat, hair-journey, and region-grounding all check a key/`enabled` flag and fall back (clear error, local storage, or generic phrase) instead of crashing, so the API boots and runs even when optional providers (OpenAI, Replicate, Supabase, YOLO grounding) are absent.
- **External provider matrix:** YOLOv11 (local), OpenAI Chat Completions (chat), AWS Rekognition (facial recognition), Replicate `google/nano-banana-pro` (hair journey), Supabase (journey storage/DB).

---

I have all the information I need. No GroundingDINO/SAM libraries are present (the "grounding" here is a custom YOLO-mask-derived text technique). Now I'll write the documentation.

## Phase 5 — Machine Learning & AI Analysis

This phase documents the complete machine-learning and generative-AI stack of the **Scalpify-ML** subsystem. The system has two distinct AI capabilities:

1. **Analysis (discriminative AI):** A **YOLOv11 instance-segmentation model** that looks at a scalp photo and outputs pixel-level masks of "bald" vs "hair" regions. From these masks the code computes a *baldness ratio* (the core medical metric).
2. **Generation (generative AI):** A pipeline that takes the patient's photo plus the segmentation result and asks a hosted **text-to-image / image-to-image diffusion model** (Google's `nano-banana` family, and FLUX.1 Fill, run on **Replicate**) to *hallucinate a realistic recovery preview* — what the patient's scalp will look like 15 days → 8 months after an FUE hair transplant.

There is no in-house training code in the files provided; the `.pt` files are **pre-trained / custom-trained weights** that are simply *loaded and run* (inference only). This is a transfer-learning / fine-tuning workflow at heart (see "Transfer learning" below).

---

### 5.1 Inventory of AI models

| Model | File / identifier | Type | Where it lives | Used by |
|---|---|---|---|---|
| Bald/hair segmenter | `model/best.pt` (≈19.6 MB) | YOLOv11 **instance segmentation** (CNN) | local `.pt` weights | Every analysis & grounding script |
| Back-of-head segmenter | `model/bald_back_model.pt` (≈38.9 MB) | YOLO (segmentation/detection) — **separate weights for the back/occipital view** | local `.pt` weights | Downloaded by deployment script; not loaded in the read files |
| Selfie / front-view model | `model/selfie_model.pt` (≈5.7 MB) | YOLO (smaller weights, front/selfie view) | local `.pt` weights | Downloaded by deployment script; not loaded in the read files |
| Hair-journey generator (current) | `google/nano-banana-pro` | **Generative diffusion (image-to-image edit)**, hosted | Replicate API | `scripts/nano_pro_journey.py`, production `api/.../hair_journey_service.py` |
| Hair-journey generator (earlier) | `google/nano-banana-2` | Generative diffusion (image-to-image edit), hosted | Replicate API | `scripts/grounded_hair_journey.py` (line 156) |
| Inpainting generator | `black-forest-labs/flux-fill-pro` (**FLUX.1 Fill [pro]**) | **Generative diffusion inpainting** (masked), hosted | Replicate API | `scripts/inpaint_hair_journey.py`, `scripts/inpaint_journey_v2.py` |
| Earlier journey generator | `qwen/qwen-image-edit-plus` (**Qwen Image Edit Plus**) | Generative diffusion (image-to-image edit), hosted | Replicate API | `scripts/hair_journey_generation_service.py` |

> **Note on `bald_back_model.pt` and `selfie_model.pt`:** Across all the source files I was asked to read, these two weights are **only referenced inside the deployment downloader** `scripts/download_models_from_aws.py` (lines 154–155). They are pulled from the S3 bucket `gasp-ai-models` to `model/selfie_model.pt` and `model/bald_back_model.pt`, but **none of the files in scope actually call `YOLO("…selfie_model.pt")` or `YOLO("…bald_back_model.pt")`**. Based on file sizes, names, and the production schema field `view_type: "front" or "back"` (`api/app/models/schemas.py:314`), the intended design is clearly: `selfie_model.pt` = a lightweight model for the **front/selfie scalp view**, and `bald_back_model.pt` = a heavier model for the **back/occipital scalp view**, while `best.pt` is the primary bald/hair segmenter. The exact loading code for the front/back models is **not found in the files provided** — only their download is in scope.

> **No GroundingDINO / SAM present.** The scripts repeatedly print `=== GROUNDING ===` and talk about "grounded" prompts, which might suggest GroundingDINO or Segment-Anything. **They do not use those libraries.** "Grounding" here is a *custom, home-grown technique*: the YOLO bald mask's centroid/bbox is converted into an English phrase that tells the generative model where the bald zone is (see §5.5). No `groundingdino`, `segment_anything`, or `sam` import exists anywhere in the codebase.

---

### 5.2 The YOLOv11 segmentation model (`best.pt`) — the analysis core

**Purpose.** Given one scalp photo, produce per-pixel **masks** for two classes — *bald* and *hair* — plus bounding boxes and confidence scores.

**Architecture type.** YOLOv11 **instance segmentation** (the `-seg` variant). It is a single-stage **convolutional neural network** (CNN) that simultaneously:
- *detects* objects (bounding boxes),
- *classifies* them (`bald` / `hair`), and
- *segments* them (a binary mask per detected instance, via mask prototype coefficients).

It is loaded through the **Ultralytics** library: `from ultralytics import YOLO; model = YOLO("model/best.pt")` (`src/utils/calculate_bald_area.py:1,20`).

**Inputs.** A single image (a NumPy BGR array from `cv2.imread`). The production-grade service standardizes input to **512×512** before inference (`src/components/bald_area_calculation_service.py:92–94`):

```python
STANDARD_SIZE = 512
img = cv2.resize(original_img, (STANDARD_SIZE, STANDARD_SIZE))
```

**Outputs.** A `results` object whose fields the code reads:
- `results[0].masks.data` — a tensor of per-instance masks (moved to CPU + NumPy: `.cpu().numpy()`).
- `results[0].boxes.cls` — class id per detection.
- `results[0].boxes.conf` — confidence per detection.

**Hyperparameters / thresholds found in code.**
- **IoU (NMS) threshold = 0.4** is set on *every* `model.predict(..., iou=0.4)` call (`yolov11_bald_segmentation_script.py:30`, `calculate_bald_area.py:99,188`, `bald_area_calculation_service.py:99`, `grounded_hair_journey.py:43`, `inpaint_hair_journey.py:42`). This controls Non-Max Suppression: overlapping boxes with IoU > 0.4 are merged.
- **Mask binarization threshold = 0.5:** the soft mask is thresholded with `mask = (mask > 0.5).astype(np.uint8)` (`calculate_bald_area.py:114`). Pixels with mask probability above 0.5 are "on".
- The confidence threshold is left at the Ultralytics default (no explicit `conf=` is passed); confidences are *read back* and reported (mean/min) but not used to filter (`bald_area_calculation_service.py:240–243`).

**Pre-processing.**
1. Read with OpenCV (`cv2.imread`) → BGR NumPy array.
2. (Production service) Resize to 512×512 for *coordinate consistency*, so the mask coordinates the frontend draws line up exactly with the displayed image (`bald_area_calculation_service.py:91–94, 173–174`).
3. Ultralytics internally normalizes/letterboxes the image to the network input size.

**Post-processing.**
1. `masks[i]` is resized back to the working image size with `cv2.resize` and binarized at 0.5 (`calculate_bald_area.py:113–114`).
2. Mask area = count of "on" pixels: `np.sum(mask > 0)` (`calculate_bald_area.py:49`).
3. Masks of the same class are merged with `np.maximum` into a combined mask (`bald_area_calculation_service.py:129,133`).
4. The bald mask is drawn as a semi-transparent **red overlay** with **contours** for the user-facing visualization (`bald_area_calculation_service.py:137–144`).

---

### 5.3 How the bald-area percentage is computed

Two distinct percentages are produced (both in `calculate_bald_area.py:127–132` and `bald_area_calculation_service.py:147–151`):

- **`baldness_ratio`** — *bald relative to the head* (the medically meaningful one):
  ```
  baldness_ratio = bald_area_pixels / (bald_area_pixels + hair_area_pixels) * 100
  ```
  i.e., what fraction of the *hair-bearing scalp* is bald. This deliberately **ignores background pixels**, so a face/wall in the photo doesn't dilute the number.
- **`bald_percentage_of_image`** — bald pixels relative to the *whole image* (`bald_area_pixels / total_pixels * 100`, `calculate_bald_area.py:127`). Less meaningful clinically; reported for completeness.
- **`hair_coverage`** is the complement of baldness_ratio: `hair_area_pixels / total_head_area_pixels * 100`.

**Real-world area estimation (pixels → cm²).** Because the photo has no scale reference, the code *estimates* a `pixels_per_cm` factor from the assumption that an average human head is **15 cm wide** (`calculate_bald_area.py:27`). It treats the detected head as a slightly elliptical blob:

```python
estimated_head_width_pixels = np.sqrt(total_head_area_pixels * 1.3)  # 1.3 = elliptical fudge factor
pixels_per_cm = estimated_head_width_pixels / 15.0                    # 15 cm avg head width
area_cm2 = area_pixels / (pixels_per_cm ** 2)                         # convert area
area_inch2 = area_cm2 * 0.155                                          # 1 cm² = 0.155 in²
```
(`calculate_bald_area.py:51–61, 63–83`). This is an **approximation**, not a calibrated measurement — the documentation should treat the cm²/inch² values as indicative, while `baldness_ratio` (a pure pixel ratio) is robust.

**Relation to the Norwood scale.** The **Norwood–Hamilton scale** is the standard 1–7 clinical grading of male pattern baldness. *Within the Python files in scope, there is no explicit Norwood lookup table or mapping.* The computed `baldness_ratio` is the quantitative substrate that a Norwood stage would be derived from (a higher ratio → a higher Norwood grade), but the actual Norwood mapping is **not found in the ML files provided** — if it exists it lives elsewhere (likely in the API layer or the app, outside this phase's file list). This should be stated honestly in the report.

---

### 5.4 Transfer learning / pre-trained usage

- **Ultralytics YOLOv11** ships ImageNet/COCO-pretrained backbones. The `best.pt` file is the conventional Ultralytics name for the *best checkpoint of a fine-tuning run* — i.e., the project took a pretrained YOLOv11-seg model and **fine-tuned it on a custom bald/hair-scalp dataset** (transfer learning). Evidence: the code never trains; it only `predict()`s, and it discovers the custom class names dynamically (`self.model.names`, `calculate_bald_area.py:30`) then matches them by substring — `'bald' in class_name.lower()` and `'hair' in class_name.lower()` (`calculate_bald_area.py:38–41`). This dynamic discovery is exactly what you'd write when consuming *your own fine-tuned* weights.
- The generative models (`nano-banana-pro`, `flux-fill-pro`, `qwen-image-edit-plus`) are **large foundation diffusion models used zero-shot** through Replicate — no fine-tuning, all behavior is steered purely by prompt text + the input image (and, for FLUX, a mask). This is **prompt engineering on a frozen pretrained model**.

---

### 5.5 The generative hair-journey (recovery preview) — prompt & image flow

The project iterated through **four generations** of journey generators (visible across the scripts), each fixing a flaw in the previous one. Understanding the progression is the heart of Phase 5.

#### Common stage concept
A "journey" is an ordered list of post-FUE time points — e.g. `15_days → 1_month → 3_months → 4_months → 6_months → 8_months`. For each stage the code sends the image + a stage-specific prompt to a hosted diffusion model and saves the returned PNG. Stages are paced with an **11-second delay** (`DELAY = 11`) to respect Replicate's low-credit rate cap of ~6 requests/min (`grounded_hair_journey.py:148`, `inpaint_hair_journey.py:117`, `nano_pro_journey.py:118`).

#### Generation 1 — plain image-to-image (`hair_journey_generation_service.py`)
- **Model:** `qwen/qwen-image-edit-plus` (line 121).
- **Method:** image-to-image edit with **no spatial guidance** — the model is just handed the plain photo and a long medical prompt and must *guess* where the bald area is.
- **Hyperparameters per stage (image-to-image diffusion):**
  - `num_inference_steps` 35→45 (more steps for later, denser stages),
  - `guidance_scale` 10.0→8.5 (classifier-free guidance — how strongly to obey the prompt),
  - `strength` 0.35→0.50 (how much of the original image to overwrite; *low strength = preserve identity*),
  - fixed `seed=123456` for reproducibility (lines 76, 80, 84, 88, 92, 96, 100, 129).
- A large shared **negative prompt** (lines 56–70) forbids adding hair to the forehead, changing the face, scarring, cartoonish/over-processed looks, etc.
- Output is downloaded with `requests.get(...)` (with 3-retry logic, lines 140–149), saved per stage, and finally **all stages are tiled into one comparison figure** with matplotlib (`plt.subplots`, lines 188–210).

#### Generation 2 — **region grounding** (`grounded_hair_journey.py`)
The key innovation. Instead of letting the model guess the bald location, it:
1. Runs YOLO (`analyze_bald_region`, lines 34–85) to get the bald mask, then computes the **centroid** `(cx, cy)` and **bbox**.
2. Translates the centroid into human anatomy words on the 512×512 frame (lines 71–74):
   - vertical band → "crown/vertex", "frontal/hairline", or "occipital/back-of-crown";
   - horizontal → "centered", "left-biased", "right-biased".
3. Buckets the baldness ratio into "a small / a moderate / a large / an extensive" portion (lines 75–76).
4. Assembles a **`region_phrase`** (lines 78–82) such as *"The thinning/bald recipient zone is the crown/vertex, centered in the frame, covering a moderate portion of the scalp (~45% …). Add new hair ONLY inside this zone."*
5. Injects that phrase into each stage prompt alongside a strong **IDENTITY** preservation block (lines 90–96) and sends the **clean original** (never the red overlay) to `google/nano-banana-2` (lines 156–159). Input image is passed as an in-memory `BytesIO` PNG; the image is first **padded to square** (`pad_square`, lines 130–134) and resized to 512 to avoid distortion.
- Supports `--dry-run` to print prompts without spending API credits (lines 186–188).

#### Generation 3 — **mask-grounded inpainting** (`inpaint_hair_journey.py`, then chained `inpaint_journey_v2.py`)
Stronger spatial control via true **inpainting** with `black-forest-labs/flux-fill-pro` (FLUX.1 Fill [pro]):
- `build_bald_mask` (lines 35–68) turns the YOLO bald mask into a **clean binary inpaint mask**: morphological close to fill holes (`MORPH_CLOSE`, 9×9), keep the **largest connected component**, then **dilate** by `--dilate` px (default 6) so new hair blends past the hard segmentation edge.
- **Mask convention:** white = regenerate, black = freeze. So the bald region is white → only it is repainted; the face, existing hair, and background are *pixel-frozen* (lines 8–10).
- **Diffusion hyperparameters:** `steps=50`, `guidance=60`, `safety_tolerance` (default 5, `--safety`), `seed=123456` (lines 128–134). Sends image + mask + per-stage prompt.
- **`inpaint_journey_v2.py`** adds **chaining**: each later stage inpaints *on top of the previous stage's output* (`prev = result; feed forward`, lines 116, 141), so density physically accumulates and avoids the "3/4/6 months look identical" problem (docstring lines 5–12). Prompts are rewritten as **pure, digit-free, colon-free scene descriptions** (lines 49–74) because digits/colons cause diffusion models to literally render caption text.

#### Generation 4 — chained non-inpaint with nano-banana-pro (`nano_pro_journey.py`) — and the production model
- **Model:** `google/nano-banana-pro` (line 34). No mask, so identity is enforced *entirely in the prompt* via a hard `IDENTITY` block (lines 37–47).
- **Drift control:** chained stages also pass the **original photo as a second reference image** so framing/identity stays locked (lines 131–134: `image_input = [buf(base), buf(original)]`).
- **Failsafes** for the earlier "6-month generation errors": `safety_filter_level="block_only_high"` (loosest) and `allow_fallback_model=True` (falls back to seedream-5 rather than erroring) (lines 140–141).
- Stages go up to **8 months**, with prompts deliberately describing only *small gradual* improvements at the late stages to look medically realistic (lines 71–82).

#### What gets returned to the user
Each generation downloads the returned image (`fobj.read()` → `PIL.Image.open`) and saves `NN_stagename.png` to an outputs folder. The production wrapper is exercised by `scripts/test_api_journey.py`, which calls the real async service `HairJourneyService.generate_hair_journey(image, opts, uuid)` (line 53), confirming the production model is `nano-banana-pro` (line 41) and stages map to a `view_type` ("front"/"back") result object.

---

## Phase 6 — Python Code Analysis

This phase walks each Python file end-to-end: purpose, key imports, functions/classes, call sequence, I/O, and how it interacts with siblings. The two most important files — the **YOLO segmentation production service** and the **generative journey script** — are explained near line-by-line.

### Shared libraries used across the phase

| Library | Role |
|---|---|
| `ultralytics` (`YOLO`) | Load + run the YOLOv11 segmentation model |
| `cv2` (OpenCV) | Read/resize images, draw masks/contours/text, morphology, connected components |
| `numpy` | Mask math (areas, max-merge, statistics) |
| `PIL` (`Image`, `ImageOps`) | Image handling for the generative pipeline (square-pad, RGB convert, in-memory PNG) |
| `replicate` | Call hosted generative models (nano-banana, FLUX, Qwen) |
| `requests` | Download generated images by URL (Qwen script) |
| `dotenv` (`load_dotenv`) | Load `REPLICATE_API_TOKEN` / AWS creds from `.env` |
| `boto3` | Download model weights from AWS S3 |
| `matplotlib` | Tile all journey stages into one comparison image |
| `glob`, `os`, `pathlib.Path`, `json`, `csv`, `datetime`, `argparse`, `io`, `time`, `asyncio`, `uuid` | Filesystem, CLI, serialization, async plumbing |

---

### 6.1 `src/utils/yolov11_bald_segmentation_script.py` — minimal batch segmenter

- **Purpose:** the simplest possible smoke test — load `best.pt`, run it on every image in `testing/`, and save Ultralytics' built-in annotated visualization.
- **Key calls:** `YOLO("model/best.pt")` (line 12); collect images via `glob.glob` over `*.jpg/*.jpeg/*.png/*.bmp` (lines 15–18); for each, `model.predict(img, iou=0.4)` (line 30); `results[0].plot()` produces the annotated image (line 33); `cv2.imwrite` to `output/segmented_<name>` (lines 37–38).
- **I/O example:** input `testing/scalp01.jpg` → output `output/segmented_scalp01.jpg` with boxes+masks drawn by Ultralytics.
- **Interaction:** standalone; shares only the `best.pt` model and the `testing/` convention with the other analysis files. No measurements computed here.

---

### 6.2 `src/utils/calculate_bald_area.py` — measurement engine (`BaldAreaCalculator`)

- **Purpose:** batch-measure bald/hair areas and export CSV + JSON + visualizations with summary statistics.
- **Class `BaldAreaCalculator`** (lines 11–362):
  - `__init__` (12–43): loads YOLO; reads `model.names` and **auto-detects** the bald/hair class ids by substring match (38–41); stores `pixels_per_cm` (or `None` to auto-estimate) and the 15 cm head-width assumption.
  - `calculate_mask_area` (45–49): `np.sum(mask > 0)`.
  - `estimate_pixels_per_cm` (51–61): √(area·1.3)/15 — the scale heuristic.
  - `convert_pixels_to_real_world` (63–83): pixels² → cm²/m²/inch².
  - `process_image` (85–179): the workhorse — `predict(iou=0.4)`, loop detections, resize+binarize each mask, accumulate bald/hair pixels, compute `baldness_ratio`, `hair_coverage`, percentages, and real-world areas; returns a flat dict (145–167).
  - `create_visualization` (181–223): **re-runs prediction**, draws red (bald) / green (hair) 50/50 blends, overlays text with the metrics.
  - `process_all_images` (225–241), `save_results_to_csv` (243–256), `save_results_to_json` (258–277, wraps results with a timestamp + summary), `calculate_summary_statistics` (279–312, mean/min/max/std of baldness ratio + averages), `create_visualizations` (314–333), `print_summary` (335–362).
- **`main()`** (365–380): instantiate → `process_all_images("testing")` → save CSV+JSON → create visualizations → print summary.
- **I/O example:** folder of scalp photos → `bald_area_results.csv`, `bald_area_results.json`, `analysis_output/analysis_*.jpg`.
- **Interaction:** superseded by the production `bald_area_calculation_service.py` (same logic, but 512-standardized and JSON-API-shaped). Shares `best.pt`.

---

### 6.3 `src/components/bald_area_calculation_service.py` — production analysis service (`YOLOTesterWithAnnotations`) — most important analysis file

This is the file the API actually relies on for analysis. It differs from §6.2 by **standardizing to 512×512** (so frontend overlay coordinates match), producing a **clean overlay** (red mask + contour, no text), capturing **inference timing and confidences**, and returning an API-shaped nested dict.

Near line-by-line of `process_and_annotate_image` (lines 78–247):
- **83–89:** `cv2.imread`; bail if unreadable; record original H×W for metadata.
- **91–94:** resize to `STANDARD_SIZE = 512` — comment notes the frontend must display this exact 512×512 image so mask coordinates align.
- **97–100:** time the call; `results = self.model.predict(img, iou=0.4, verbose=False)`; convert elapsed to ms.
- **106–111:** init accumulators + empty combined masks + confidence lists.
- **114–134:** if masks exist, pull `masks.data`, `boxes.cls`, `boxes.conf` to NumPy; per detection resize the mask to 512², binarize at 0.5, add pixel area to bald or hair bucket, merge into the combined mask with `np.maximum`, and record confidence.
- **137–144:** if any bald pixels, draw a 30%-alpha **red overlay** and **contours** (`create_colored_overlay` 51–55 + `cv2.findContours`/`drawContours`). Hair is *not* overlaid (clean preview).
- **147–169:** compute `total_head_area_pixels`, `baldness_ratio`, `hair_coverage`, and the cm²/inch² conversions via `estimate_pixels_per_cm` (35–43); zero-safe fallbacks if no head detected.
- **177–179:** save `annotated_<name>` to the output folder.
- **182–202:** count bald/hair detections and print a faux-Ultralytics line ("0: 512x512 N bald, …ms"), with a synthetic preprocess/inference/postprocess speed breakdown.
- **205–247:** return a rich dict: `image_dimensions` (incl. original + standardized), `detection_counts`, `areas_pixels/cm2/inch2`, `percentages`, `confidences` (bald/hair mean+min), `inference_time_ms`, `timestamp`.
- **`process_all_images`** (249–270) sorts images, processes each, then **`save_results_to_json`** (272–329) emits a `processing_info` block that explicitly records `'model': 'YOLOv11 Segmentation'`, `'iou_threshold': 0.4`, plus per-metric statistics.
- **Interaction:** this is the analysis half of the system; its YOLO masks/ratio feed the *grounding* logic reused by the journey scripts (`analyze_bald_region` re-implements the same mask→ratio math).

---

### 6.4 `src/components/hair_journey_generation_service.py` — generative journey (Qwen) — most important generative file

Despite "service" in the name, this is a **top-level script** (no class), the first journey generator. Near line-by-line:

- **19–36:** imports; `load_dotenv()`; read `REPLICATE_API_TOKEN` and *fail loudly* if missing (32–33); re-export it into `os.environ` so the `replicate` client finds it.
- **38–53:** locate the base input image via `glob`; pick index 16 if available else fall back to the first file (graceful index handling).
- **56–70:** the big shared **`enhanced_negative_prompt`** — the "do nots" steering identity/realism.
- **72–101:** the **`stages`** list — 7 tuples `(stage_name, prompt, params)`. Each prompt is a paragraph of *medically described* FUE progression; `params` carries the diffusion knobs (`num_inference_steps`, `guidance_scale`, `strength`) that ramp with stage.
- **105–164:** the generation loop:
  - **109–114:** announce stage + params.
  - **117–131:** open the image binary and call `replicate.run("qwen/qwen-image-edit-plus", input={prompt, negative_prompt, image:[file], num_inference_steps, guidance_scale, strength, seed:123456})`. Note `image` must be a **list** (line 126).
  - **136–153:** normalize output to a URL, `requests.get` the bytes with a **3-attempt retry** + 2 s backoff.
  - **151–159:** save `outputs/NN_stagename.png`; print timing + URL; append to `generated_images`.
  - **161–164:** per-stage `try/except` so one failed stage doesn't abort the journey.
- **166–212:** summary print, then **matplotlib** tiling of all stages into `outputs/hair_transplant_journey_complete.png` (saved at 150 dpi) and `plt.show()`.
- **I/O example:** `test/test_image.jpg` → seven PNGs + one combined montage.
- **Interaction:** conceptual ancestor of the grounded/inpaint/nano scripts; the later scripts keep its stage idea + negative-prompt philosophy but add YOLO grounding and switch models.

---

### 6.5 `scripts/grounded_hair_journey.py` — region-grounded journey (nano-banana-2)

- **Purpose:** add **spatial grounding** so the generator knows *where* the bald zone is; never sends the red overlay.
- **`analyze_bald_region`** (34–85): loads `best.pt`, resizes to 512, predicts (`iou=0.4`), builds bald/hair masks, computes `ratio`, bbox, centroid, and the human-readable `region_phrase`; returns `(ratio, region_phrase, bbox, debug)`.
- **`IDENTITY`** (90–96) + **`STAGE_TEMPLATES`** (99–117) + **`build_grounded_prompts`** (120–125): concatenate `"Edit this photograph to {coverage} {region_phrase} {IDENTITY}"`.
- **`pad_square`** (130–134): square-pad before resize so faces aren't stretched.
- **`run_generation`** (137–165): late-imports `replicate`, paces 11 s, sends the clean square 512 PNG via `BytesIO` to `google/nano-banana-2`, saves each stage.
- **`main`** (168–193): argparse (`image`, `--dry-run`, `--stages`, `--out`); prints grounding debug + prompts; runs generation unless `--dry-run`.
- **Interaction:** `analyze_bald_region`, `build_grounded_prompts`, `pad_square`, and `SIZE` are **imported and reused** by `inpaint_hair_journey.py`, `inpaint_journey_v2.py`, and `nano_pro_journey.py` — this file is the shared grounding library.

---

### 6.6 `scripts/inpaint_hair_journey.py` — mask-grounded inpainting (FLUX.1 Fill)

- **Purpose:** strictly confine edits to the bald region using a true inpaint mask.
- **`build_bald_mask`** (35–68): YOLO → bald-only binary mask → `MORPH_CLOSE` hole-fill → keep largest connected component (`connectedComponentsWithStats`) → dilate by `dilate_px` → return `(mask*255, img)`. Raises if no bald region.
- **`main`** (71–146): argparse (`--stages`, `--dilate`, `--safety`, `--dry-run`, `--out`); builds mask + reuses `analyze_bald_region`/`build_grounded_prompts`; saves `00_original.png`, `00_mask.png`, and a `00_mask_preview.png` red overlay (for *inspection only*); prints mask coverage %; then for each stage calls `replicate.run("black-forest-labs/flux-fill-pro", {image, mask, prompt, steps:50, guidance:60, safety_tolerance, output_format, seed:123456})` with a 3-attempt retry.
- **Interaction:** imports the grounding helpers from §6.5; exports `build_bald_mask`, which §6.7 imports.

---

### 6.7 `scripts/inpaint_journey_v2.py` — chained inpainting (FLUX.1 Fill v2)

- **Purpose:** fix "later stages look identical" by **chaining** outputs and using concrete, digit-free, colon-free scene prompts.
- **`STAGES`** (49–74): tuples `(name, chain_from_previous, pure_description)`. `15_days` uses `chain=False` (generated from the *original*, since shock-loss is barer than the current state); `1mo→6mo` chain forward.
- **`main`** (77–151): builds the mask once (`build_bald_mask` from §6.6), keeps it fixed every stage to freeze identity; the running `prev` image is fed forward (`base = prev if chain else original`; after success `prev = result`); same FLUX params (`steps:50, guidance:60`). Strong `IDENTITY` block (38–43) forbids text/letters/numbers in the render.
- **Interaction:** imports `build_bald_mask` (§6.6) and `analyze_bald_region`/`pad_square`/`SIZE` (§6.5).

---

### 6.8 `scripts/nano_pro_journey.py` — chained non-inpaint (nano-banana-pro)

- **Purpose:** the latest journey generator; **no mask**, identity enforced via prompt + a second "original" reference image for drift control.
- **`STAGES`** (50–82): six chained stages out to **8 months**, with late stages described as *small gradual* changes for realism.
- **`main`** (85–154): argparse (`--stages`, `--dry-run`, `--out`); reuses `analyze_bald_region` for the `region_phrase`; chains `prev`; for chained stages sends `image_input=[base, original]` (anchor) and sets `safety_filter_level="block_only_high"` + `allow_fallback_model=True` to dodge the historical 6-month failures; 3-attempt retry; saves `NN_stage.png`.
- **Interaction:** imports grounding helpers from §6.5; uses the **same production model** (`google/nano-banana-pro`) that `test_api_journey.py` confirms the live API uses.

---

### 6.9 `scripts/download_models_from_aws.py` — deployment model fetcher

- **Purpose:** at deploy/startup, pull the three trained `.pt` weights from AWS **S3** (bucket default `gasp-ai-models`, region default `ap-south-1`) into `model/`.
- **Key imports:** `boto3` (S3 client; exits with a friendly message if not installed, 29–34), `dotenv` for AWS creds.
- **`download_file`** (60–140): create local dir; **skip if file already exists with matching size** (within 100 KB) else prompt to overwrite; `head_object` to read size; `download_file` with a **progress callback** for >10 MB files; verify final size (warn if off by >1 MB); clean up partial downloads on error. Handles `404`, `NoCredentialsError`, `ClientError`.
- **`main`** (142–183): defines the manifest — `("best.pt", "model/best.pt", 19.6)`, `("selfie_model.pt", …, 5.7)`, `("bald_back_model.pt", …, 38.9)` — downloads each, prints a success/fail summary, exits non-zero if any fail.
- **Interaction:** the **only** file that references `selfie_model.pt`/`bald_back_model.pt`; it provisions the weights the analysis services load (`best.pt`) and the front/back models that the (out-of-scope) production analysis would load.

---

### 6.10 `scripts/test_api_journey.py` — production service test harness

- **Purpose:** exercise the *real* production `HairJourneyService` method (not the HTTP server) on a local image, without wiping `outputs/`.
- **Mechanics:** loads `.env` and forces `REPLICATE_API_TOKEN` into the env for pydantic Settings (18–20); injects `api`, `src`, `scripts` onto `sys.path` (23–24); imports `app.services.hair_journey_service as hj` and the `HairJourneyOptions` schema.
- **`main`** (30–63): argparse (`image`, `--stages`, `--check-only`); **redirects** `hj.OUTPUTS_DIR` to `outputs/_api_test` so the service's `cleanup_outputs_folder()` can't delete other outputs (37–39); instantiates `HairJourneyService()` and prints its model (`svc.editor.model`), enabled flag, stage names, and Supabase status; with `--check-only` it just verifies wiring; otherwise builds `HairJourneyOptions(iterations=stages, save_intermediate=True)` and runs `asyncio.run(svc.generate_hair_journey(image, opts, uuid4()))`, then prints `iterations`, `view_type`, `total_processing_time_ms`.
- **Interaction:** the bridge between these standalone scripts and the deployed FastAPI service; confirms the production model is `google/nano-banana-pro` and that results carry a `view_type` ("front"/"back"), tying back to the front/back model design noted in §5.1.

---

### Phase 6 call-sequence summary

```
Analysis path:
  image → cv2.imread → resize 512² → YOLO best.pt .predict(iou=0.4)
        → masks (>0.5) → bald/hair pixel areas → baldness_ratio (+cm² estimate)
        → red overlay/contour + JSON  (bald_area_calculation_service.py)

Generation path (current):
  image → analyze_bald_region (YOLO best.pt) → region_phrase
        → per-stage prompt + IDENTITY → replicate.run(google/nano-banana-pro,
          image_input=[prev, original]) → save NN_stage.png → feed forward (chain)
          (nano_pro_journey.py / production hair_journey_service.py)

Deployment:
  download_models_from_aws.py → S3 (gasp-ai-models) → model/{best,selfie_model,bald_back_model}.pt
```

---

I have all the evidence I need. Let me write the documentation sections.

## Phase 7 — Database Analysis

### 7.1 What database is used?

The project uses **Supabase** as its backend data platform. Supabase is a hosted "Backend-as-a-Service" built on top of **PostgreSQL**, so under the hood the database is a standard Postgres relational database, accessed through the Supabase Python client library rather than raw SQL at runtime.

Evidence:

- `supabase` is listed as a Python dependency (`Scalpify-ML/requirements.txt:5`).
- The backend creates two Supabase clients (a public/anon client and a privileged service-role admin client) (`Scalpify-ML/api/app/core/supabase_client.py:29-36`).
- Schema is defined with raw PostgreSQL DDL in two migration files (`Scalpify-ML/api/migrations/create_tables.sql`, `Scalpify-ML/api/migrations/create_hair_journey_table.sql`).
- The top-level README confirms the stack: "Supabase · Replicate" (`README.md:13`).

**Important nuance — Supabase is optional at runtime.** The client only "enables" itself if all three Supabase credentials are present; otherwise it runs in a "development mode without database" and returns mock data / writes files to local disk (`Scalpify-ML/api/app/core/supabase_client.py:22-40`, `61-69`, `168-171`). So the app can run entirely without a database.

**The mobile app (frontend) does NOT talk to Supabase directly.** The Expo/React Native app talks only to the FastAPI backend over HTTP and persists user/meds/scans/logs locally with AsyncStorage (`Scalpify-App/README.md:33`). There is no Supabase client in the frontend `package.json`. All Supabase access is server-side.

### 7.2 Tables (relations)

Three tables are referenced in code and/or defined in migrations.

#### Table 1 — `analysis_sessions`

Defined in `Scalpify-ML/api/migrations/create_tables.sql:5-15`. Represents one analysis request/session.

| Column | Type | Notes | Source |
|---|---|---|---|
| `id` | `UUID` PK, default `gen_random_uuid()` | Primary key | create_tables.sql:6 |
| `user_id` | `TEXT` (nullable) | Optional user identifier | create_tables.sql:7; supabase_client.py:46 |
| `ip_address` | `INET` | Client IP | create_tables.sql:8; supabase_client.py:47 |
| `user_agent` | `TEXT` | Client UA string | create_tables.sql:9; supabase_client.py:48 |
| `status` | `TEXT` NOT NULL default `'processing'` | e.g. processing/completed/failed | create_tables.sql:10; supabase_client.py:49, 98 |
| `processing_time_ms` | `INTEGER` | Server processing time | create_tables.sql:11; supabase_client.py:103 |
| `error_message` | `TEXT` | Failure reason | create_tables.sql:12; supabase_client.py:105 |
| `created_at` | `TIMESTAMPTZ` NOT NULL default `NOW()` | Insert time | create_tables.sql:13 |
| `updated_at` | `TIMESTAMPTZ` NOT NULL default `NOW()` | Auto-updated via trigger | create_tables.sql:14, 69-71; supabase_client.py:99 |

Indexes: `idx_analysis_sessions_user_id` on `user_id`, `idx_analysis_sessions_created_at` on `created_at DESC` (create_tables.sql:42-43). RLS enabled with an "allow all" policy (create_tables.sql:52, 56). An `update_updated_at_column()` trigger keeps `updated_at` fresh (create_tables.sql:60-71).

#### Table 2 — `analysis_results`

Defined in `Scalpify-ML/api/migrations/create_tables.sql:18-39`. Stores the computed metrics for one image, linked to a session.

| Column | Type | Notes | Source |
|---|---|---|---|
| `id` | `UUID` PK default `gen_random_uuid()` | Primary key | create_tables.sql:19 |
| `session_id` | `UUID` NOT NULL, FK → `analysis_sessions(id)` `ON DELETE CASCADE` | Foreign key | create_tables.sql:20; supabase_client.py:113 |
| `filename` | `TEXT` NOT NULL | Uploaded file name | create_tables.sql:21; supabase_client.py:114 |
| `file_size` | `INTEGER` NOT NULL | Bytes | create_tables.sql:22; supabase_client.py:115 |
| `mime_type` | `TEXT` NOT NULL | e.g. image/jpeg | create_tables.sql:23; supabase_client.py:116 |
| `image_width` | `INTEGER` | Px width | create_tables.sql:24; supabase_client.py:117 |
| `image_height` | `INTEGER` | Px height | create_tables.sql:25; supabase_client.py:118 |
| `bald_regions` | `INTEGER` default 0 | Count of detected bald regions | create_tables.sql:26; supabase_client.py:119 |
| `hair_regions` | `INTEGER` default 0 | Count of detected hair regions | create_tables.sql:27; supabase_client.py:120 |
| `baldness_ratio` | `DECIMAL(5,2)` | % bald | create_tables.sql:28; supabase_client.py:121 |
| `hair_coverage` | `DECIMAL(5,2)` | % hair | create_tables.sql:29; supabase_client.py:122 |
| `bald_area_cm2` | `DECIMAL(10,2)` | Bald area cm² | create_tables.sql:30; supabase_client.py:123 |
| `hair_area_cm2` | `DECIMAL(10,2)` | Hair area cm² | create_tables.sql:31; supabase_client.py:124 |
| `total_area_cm2` | `DECIMAL(10,2)` | Total head area cm² | create_tables.sql:32; supabase_client.py:125 |
| `severity` | `TEXT` | Severity level | create_tables.sql:33; supabase_client.py:126 |
| `norwood_scale` | `TEXT` | Norwood class | create_tables.sql:34; supabase_client.py:127 |
| `original_image_path` | `TEXT` | Storage path of original | create_tables.sql:35; supabase_client.py:128 |
| `annotated_image_path` | `TEXT` | Storage path of annotated | create_tables.sql:36; supabase_client.py:129 |
| `metadata` | `JSONB` | Free-form JSON (stored as `json.dumps(...)`) | create_tables.sql:37; supabase_client.py:130 |
| `created_at` | `TIMESTAMPTZ` NOT NULL default `NOW()` | Insert time | create_tables.sql:38 |

Indexes: `idx_analysis_results_session_id`, `idx_analysis_results_created_at` (create_tables.sql:44-45). RLS enabled + allow-all policy (create_tables.sql:53, 57).

#### Table 3 — `hair_journey_sessions`

Defined in `Scalpify-ML/api/migrations/create_hair_journey_table.sql:2-25`. Stores the AI "8-month recovery preview" generation runs.

| Column | Type | Notes | Source |
|---|---|---|---|
| `id` | `UUID` PK default `uuid_generate_v4()` | Primary key | create_hair_journey_table.sql:3; hair_journey_service.py:277 |
| `user_id` | `TEXT` (nullable) | Optional user id | create_hair_journey_table.sql:4 |
| `created_at` | `TIMESTAMP WITH TIME ZONE` default `NOW()` | Insert time | create_hair_journey_table.sql:5; hair_journey_service.py:278 |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` default `NOW()` | Trigger-updated | create_hair_journey_table.sql:6, 43-46 |
| `original_image_url` | `TEXT` NOT NULL | Input image URL | create_hair_journey_table.sql:9; hair_journey_service.py:279 |
| `final_result_url` | `TEXT` NOT NULL | Final generated image URL | create_hair_journey_table.sql:10; hair_journey_service.py:280 |
| `iterations_count` | `INTEGER` NOT NULL default 0 | Number of editing iterations | create_hair_journey_table.sql:13; hair_journey_service.py:281 |
| `view_type` | `TEXT` NOT NULL CHECK in `('front','back')` | Photo angle | create_hair_journey_table.sql:14; hair_journey_service.py:282 |
| `processing_time_ms` | `NUMERIC` NOT NULL default 0 | Total time | create_hair_journey_table.sql:15; hair_journey_service.py:283 |
| `quality_mode` | `TEXT` default `'balanced'` | Quality preset | create_hair_journey_table.sql:16 |
| `iterations_data` | `JSONB` default `'[]'` | Per-iteration array (number, image_url, mask_url, time, timestamp) | create_hair_journey_table.sql:19; hair_journey_service.py:284-293 |
| `status` | `TEXT` default `'completed'` CHECK in `('processing','completed','failed')` | Run status | create_hair_journey_table.sql:22 |
| `error_message` | `TEXT` | Failure reason | create_hair_journey_table.sql:23 |
| `metadata` | `JSONB` default `'{}'` | Free-form JSON | create_hair_journey_table.sql:24 |

Indexes: on `user_id`, `created_at DESC`, `status`, `view_type` (create_hair_journey_table.sql:28-31). Has its own `updated_at` trigger (create_hair_journey_table.sql:42-46).

> Note: `quality_mode`, `status`, `error_message`, and `metadata` columns exist in the migration but are not populated by the insert in `save_journey_to_db` (`hair_journey_service.py:276-294`) — they fall back to their SQL defaults.

### 7.3 Storage buckets (object storage)

Supabase Storage buckets (Postgres-backed object storage) are used to hold image files. Three buckets are referenced:

| Bucket | Public? | Purpose | Source |
|---|---|---|---|
| `uploads` | `true` | Original / standardized 512×512 uploaded images | create_tables.sql:48; config.py:45 (`STORAGE_BUCKET_UPLOADS`); analysis.py:143, 152; supabase_client.py:164 |
| `processed` | `true` | Annotated result images | create_tables.sql:49; config.py:46 (`STORAGE_BUCKET_PROCESSED`); analysis.py:168 |
| `hair-journey` | `true` | Generated hair-journey preview PNGs | create_hair_journey_table.sql:49-51; hair_journey_service.py:237, 260 |

Upload mechanics: files are uploaded with the **service-role admin client** and a public URL is fetched immediately (`supabase_client.py:148-158`). The upload path convention is `uploads/{session_id}/{filename}` for originals and `processed/{session_id}/annotated_{filename}` for annotated images (`analysis.py:132, 164`). Storage RLS policies for the `hair-journey` bucket are permissive (anyone can select/insert/update/delete) (create_hair_journey_table.sql:55-65).

There is also a **separate, non-Supabase bucket** used only for ML model files: an **AWS S3** bucket named `gasp-ai-models` (default), used by the model download script (`scripts/download_models_from_aws.py:14, 40`; `config.py:62` `AWS_S3_BUCKET`). This is not application data — it is for distributing the `best.pt` YOLO weights to the server.

### 7.4 CRUD operations performed

| Operation | Table | Code location |
|---|---|---|
| **Create** session | `analysis_sessions` | `.insert(data)` — supabase_client.py:52 |
| **Update** session status/time/error | `analysis_sessions` | `.update(data).eq("id", session_id)` — supabase_client.py:74-77 |
| **Read** session ids (health check) | `analysis_sessions` | `.select("id").limit(1)` — health.py:30, 137 |
| **Read** expired sessions (cleanup) | `analysis_sessions` | `.select("id").lt("created_at", ...)` — supabase_client.py:214-217 |
| **Create** result | `analysis_results` | `.insert(data)` — supabase_client.py:133 |
| **Read** result + joined session | `analysis_results` | `.select("*, analysis_sessions(*)").eq("session_id",...).single()` — supabase_client.py:176-180 |
| **Read** user history (inner join) | `analysis_results` | `.select("*, analysis_sessions!inner(*)").eq("analysis_sessions.user_id",...).order(...).limit(...)` — supabase_client.py:193-198 |
| **Create** journey | `hair_journey_sessions` | `.insert(journey_data)` — hair_journey_service.py:297 |
| **Read** journey history/session | `hair_journey_sessions` | `.select("*")...` — hair_journey_service.py:444; hair_journey.py:191 |
| **Delete** journey session | `hair_journey_sessions` | `.delete()...` — hair_journey.py:233-234 |
| **Upload / get public URL** | Storage buckets | `.storage.from_(bucket).upload(...)` / `.get_public_url(...)` — supabase_client.py:150-157 |

There is no full Delete on `analysis_*` tables in code (cleanup is stubbed — see comment "would need additional implementation", supabase_client.py:221-222). The DB-level `ON DELETE CASCADE` means deleting a session would auto-delete its results.

### 7.5 Relationships and text ERD

The only explicit foreign key is `analysis_results.session_id → analysis_sessions.id` (one session → many results). The `hair_journey_sessions` table is standalone (no FK). All three tables link to users only loosely via a nullable `user_id` text column (no `users` table exists in the codebase).

```
┌─────────────────────────────┐
│      analysis_sessions       │
│ id (PK, UUID)                │
│ user_id (TEXT, nullable)     │◄──────────┐
│ ip_address, user_agent       │           │ (joined on user_id in
│ status, processing_time_ms   │           │  user-history query;
│ error_message                │           │  not an FK)
│ created_at, updated_at       │           │
└──────────────┬──────────────┘           │
               │ 1                          │
               │                            │
               │ * (FK session_id,          │
               │    ON DELETE CASCADE)      │
┌──────────────▼──────────────┐           │
│       analysis_results       │           │
│ id (PK, UUID)                │           │
│ session_id (FK ─► sessions)  │           │
│ filename, file_size, mime    │           │
│ image_width/height           │           │
│ bald_regions, hair_regions   │           │
│ baldness_ratio, hair_coverage│           │
│ *_area_cm2, severity         │           │
│ norwood_scale                │           │
│ original/annotated_image_path│           │
│ metadata (JSONB), created_at │           │
└─────────────────────────────┘           │
                                            │
┌─────────────────────────────┐           │
│     hair_journey_sessions    │           │
│ id (PK, UUID)                │           │
│ user_id (TEXT, nullable) ────┼───────────┘ (independent table,
│ original_image_url           │              no FK to sessions)
│ final_result_url             │
│ iterations_count, view_type  │
│ processing_time_ms           │
│ quality_mode, status         │
│ iterations_data (JSONB)      │
│ error_message, metadata      │
│ created_at, updated_at       │
└─────────────────────────────┘

Storage buckets (Supabase): uploads, processed, hair-journey
Model storage (AWS S3): gasp-ai-models  (not app data)
```

---

## Phase 9 — Dependency Analysis

### 9.1 Frontend dependencies (`Scalpify-App/package.json`)

Runtime dependencies (`package.json:11-32`):

| Dependency | Version | Why used / where | Essential or optional |
|---|---|---|---|
| `expo` | `~54.0.33` | Core Expo SDK; the whole app is built on Expo (app.json, scripts use `expo start`) | Essential |
| `react` | `19.1.0` | UI library; base of all components | Essential |
| `react-native` | `0.81.5` | Native runtime for iOS/Android | Essential |
| `@react-navigation/native` | `^7.2.4` | Navigation container | Essential |
| `@react-navigation/native-stack` | `^7.14.14` | Stack navigation between screens | Essential |
| `@react-navigation/bottom-tabs` | `^7.15.13` | Bottom tab bar navigation | Essential |
| `react-native-screens` | `~4.16.0` | Native screen primitives (required by react-navigation) | Essential (peer of navigation) |
| `react-native-safe-area-context` | `~5.6.0` | Safe-area insets (required by react-navigation) | Essential (peer of navigation) |
| `react-native-gesture-handler` | `~2.28.0` | Gesture handling (e.g. draggable zoom on camera per Scalpify-App/README.md:29) | Essential |
| `expo-camera` | `~17.0.10` | Camera capture (Scalpify-App/README.md:29) | Essential (core feature) |
| `expo-image-picker` | `~17.0.11` | Pick images from gallery to analyze | Essential |
| `expo-image-manipulator` | `~14.0.8` | Resize/crop captured images before upload | Essential |
| `expo-haptics` | `~15.0.8` | Tactile feedback on interactions | Optional (UX polish) |
| `expo-linear-gradient` | `~15.0.8` | Gradient backgrounds in UI | Optional (styling) |
| `expo-notifications` | `~0.32.17` | Local/push notifications; configured as plugin (app.json:29-35) | Essential (medication reminders feature) |
| `expo-status-bar` | `~3.0.9` | Status bar styling | Optional (UX) |
| `@react-native-async-storage/async-storage` | `2.2.0` | Local persistence of user/meds/scans/daily logs (Scalpify-App/README.md:33) | Essential (the app's only persistence) |
| `@react-native-community/datetimepicker` | `8.4.4` | Date/time picking (e.g. medication schedules); registered as plugin (app.json:36) | Essential |
| `@expo/vector-icons` | `^15.0.3` | Icon set used throughout UI | Essential (UI) |
| `react-native-svg` | `15.12.1` | SVG rendering (charts/graphics) | Essential (likely for progress charts) |

Dev dependencies (`package.json:33-36`):

| Dependency | Version | Why used | Essential or optional |
|---|---|---|---|
| `typescript` | `~5.9.2` | Type checking; project is TS (`main: index.ts`, tsconfig.json) | Essential (dev) |
| `@types/react` | `~19.1.0` | React type definitions | Essential (dev) |

TypeScript config extends `expo/tsconfig.base` with `strict: true` (`tsconfig.json:2-4`).

### 9.2 Backend dependencies (`Scalpify-ML/requirements.txt`)

Versions are **not pinned** — the file lists bare package names only (`requirements.txt:1-15`). `uvicorn` is listed twice (lines 7 and 14 — a harmless duplicate).

| Dependency | Version | Why used / where in project | Essential or optional |
|---|---|---|---|
| `fastapi` | unpinned | Web framework for the REST API (entry `app.main:app`, all endpoints) | Essential |
| `uvicorn` | unpinned (listed twice) | ASGI server to run FastAPI (Scalpify-ML/README.md:115, 134) | Essential |
| `pydantic-settings` | unpinned | `BaseSettings` config loading from `.env` (config.py:1) | Essential |
| `python-dotenv` | unpinned | Loads `.env` in scripts (download_models_from_aws.py:20, 27) | Essential |
| `python-multipart` | unpinned | Required by FastAPI to parse multipart/form-data file uploads (`/analyze`) | Essential |
| `supabase` | unpinned | Supabase Postgres + Storage client (supabase_client.py:1) | Essential (when DB enabled); optional at runtime (graceful fallback) |
| `ultralytics` | unpinned | YOLOv11 segmentation model (core ML engine, Scalpify-ML/README.md:13) | Essential |
| `torch` | unpinned | Deep-learning backend powering Ultralytics/YOLO inference | Essential |
| `opencv-python` | unpinned | Image processing / annotation drawing (overlays, contours) | Essential |
| `Pillow` | unpinned | Image I/O and conversion (e.g. `image.save(..., format="PNG")`, hair_journey_service.py:247, 253) | Essential |
| `numpy` | unpinned | Numerical/array ops for masks and area calculations | Essential |
| `replicate` | unpinned | Calls the `google/nano-banana-2` hair-journey model on Replicate (README.md:7, 13; needs `REPLICATE_API_TOKEN`) | Essential (hair-journey feature) |
| `openai` | unpinned | Powers the in-app Scalpify chat assistant (config.py:70-72 `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`) | Essential (chat feature); optional otherwise |
| `boto3` | unpinned | AWS S3 client to download model weights from `gasp-ai-models` bucket (download_models_from_aws.py:30, 50) | Optional (deployment/model-fetch only) |

> Reproducibility note: because no versions are pinned in `requirements.txt`, builds are not deterministic. For a production FYP this is a known weakness — pinning (e.g. `fastapi==0.x`) would be recommended.

---

## Phase 13 — Deployment Analysis (evidence)

### 13.1 What deployment info IS present

**Backend (FastAPI / Scalpify-ML):**

- **Run commands** are documented: dev `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`, production `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4` (`Scalpify-ML/README.md:130-141`). Defaults `HOST=0.0.0.0`, `PORT=8000`, `WORKERS=2` are in config (`config.py:75-77`).
- **A live deployed host exists**: the Postman collection's `baseUrl` is `http://51.21.1.14` (a raw AWS-style IP, no domain, HTTP only) — see the endpoints JSON `variable` block. This is the only concrete "where it's hosted" hint and points to a self-managed VM (the AWS region defaults — `us-east-1` in config.py:59 and `ap-south-1`/Mumbai in download_models_from_aws.py:13,39 — suggest an AWS EC2 instance).
- **Manual server deployment guide** (Ubuntu): system package install, venv setup, `pip install -r requirements.txt`, optional **systemd service** (`gaspai.service`) and optional **Nginx reverse proxy** (`Scalpify-ML/README.md:429-469`).
- **Model distribution at deploy time**: `scripts/download_models_from_aws.py` pulls the trained weights from an **AWS S3** bucket (`gasp-ai-models`, default region Mumbai) to the server "during deployment or server startup" (download_models_from_aws.py:1-14, 37-55). Companion upload script `scripts/upload_models_to_supabase.py` is referenced (Scalpify-ML/README.md:303-306).
- **External hosted services used in production**: Supabase (DB + Storage), Replicate (`google/nano-banana-2`), OpenAI (chat), AWS S3 (model weights) — all configured via env vars (config.py).

**Frontend (Expo app / Scalpify-App):**

- **Dev run**: `EXPO_PUBLIC_DEV_LAN_IP=<LAN-IP> npx expo start --lan` (Scalpify-App/README.md:8-12); npm scripts `expo start` / `--android` / `--ios` / `--web` (package.json:5-10).
- **Production build hint**: README explicitly mentions **EAS** — "set `EXPO_PUBLIC_API_BASE_URL` to your deployed FastAPI URL in your `.env` / EAS env before building" (Scalpify-App/README.md:25; package.json line note in config.ts:16-24 enforces this at runtime). New Architecture is enabled (`app.json:9 newArchEnabled: true`). App identity/icons/splash defined in app.json.
- The frontend points at the backend purely by URL (`API_BASE_URL`), defaulting to `http://10.0.2.2:8000` (Android emulator) or `localhost:8000` in dev, and requiring `EXPO_PUBLIC_API_BASE_URL` for release builds (config.ts:9-26).

### 13.2 What deployment info is NOT present

- **No Dockerfile, no docker-compose, no Procfile, no fly.toml/render.yaml.** A search across both projects (excluding `node_modules`) found none — the only `.toml` files are inside React Native's `node_modules`. The README even says Docker is "Coming Soon" (`Scalpify-ML/README.md:471-476`), confirming containerization is not implemented.
- **No `eas.json`** in the Expo project — EAS is mentioned in prose but there is no committed EAS build profile/config. No native build config beyond `app.json`.
- **No CI/CD** configuration (no `.github/workflows`, no pipeline files found).
- **No managed-PaaS config** (no Heroku/Vercel/Railway files).
- **The systemd service file and Nginx config are described but not committed** (they are inline instructions in the README, not actual files).
- Backend is served over **plain HTTP at a bare IP** (`http://51.21.1.14`); no TLS/HTTPS or domain is evidenced.

### 13.3 Summary

Deployment is **manual / self-hosted**, not containerized or automated. The backend runs as a Uvicorn process (optionally behind systemd + Nginx) on what appears to be an AWS EC2 VM, pulling model weights from AWS S3 at startup and relying on Supabase, Replicate, and OpenAI as external services. The mobile app is built and distributed via Expo/EAS, pointed at the backend through the `EXPO_PUBLIC_API_BASE_URL` environment variable. Container and CI/CD tooling is documented as aspirational but absent from the codebase.

---

### Environment Variables

Keys discovered across `Scalpify-App/.env.example`, `Scalpify-App/.env`, and `Scalpify-ML/api/.env.example` (note: `Scalpify-ML/.env.example` and `Scalpify-ML/api/.env` do not exist; the active backend env is `Scalpify-ML/.env`, whose key names are `REPLICATE_API_TOKEN` and `OPENAI_API_KEY`). **No secret values are shown.**

| Key | Which file | Purpose | Sensitive? |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Scalpify-App/.env.example | Production FastAPI base URL for release builds (config.ts:6) | No (public-prefixed) |
| `EXPO_PUBLIC_DEV_LAN_IP` | Scalpify-App/.env.example, Scalpify-App/.env | Dev: laptop LAN IP so device reaches local backend (config.ts:7) | No |
| `APP_NAME` | Scalpify-ML/api/.env.example | API display name (config.py:8) | No |
| `VERSION` | Scalpify-ML/api/.env.example | API version (config.py:9) | No |
| `DEBUG` | Scalpify-ML/api/.env.example | Debug mode toggle (config.py:10) | No |
| `API_V1_STR` | Scalpify-ML/api/.env.example | API path prefix (config.py:11) | No |
| `HOST` | Scalpify-ML/api/.env.example | Bind host (config.py:75) | No |
| `PORT` | Scalpify-ML/api/.env.example | Bind port (config.py:76) | No |
| `WORKERS` | Scalpify-ML/api/.env.example | Uvicorn worker count (config.py:77) | No |
| `CORS_ORIGINS` | Scalpify-ML/api/.env.example | Allowed CORS origins (config.py:18) | No |
| `ALLOWED_HOSTS` | Scalpify-ML/api/.env.example | Allowed hosts (config.py:17) | No |
| `MAX_FILE_SIZE` | Scalpify-ML/api/.env.example | Max upload bytes (config.py:26) | No |
| `ALLOWED_EXTENSIONS` | Scalpify-ML/api/.env.example | Allowed file extensions (config.py:27) | No |
| `ALLOWED_MIME_TYPES` | Scalpify-ML/api/.env.example | Allowed MIME types (config.py:28) | No |
| `SUPABASE_URL` | Scalpify-ML/api/.env.example | Supabase project URL (config.py:21) | Yes (endpoint) |
| `SUPABASE_ANON_KEY` | Scalpify-ML/api/.env.example | Public/anon Supabase key (config.py:22) | Yes |
| `SUPABASE_SERVICE_KEY` | Scalpify-ML/api/.env.example | Service-role key (admin, full DB/storage access) (config.py:23) | **Yes — highly sensitive** |
| `SUPABASE_SESSIONS_TABLE` | Scalpify-ML/api/.env.example | Sessions table name (config.py:80) | No |
| `SUPABASE_RESULTS_TABLE` | Scalpify-ML/api/.env.example | Results table name (config.py:81) | No |
| `MODEL_PATH` | Scalpify-ML/api/.env.example | Path to YOLO `best.pt` (config.py:40) | No |
| `DEVICE` | Scalpify-ML/api/.env.example | Inference device cpu/cuda/mps (config.py:84) | No |
| `MODEL_CONFIDENCE` | Scalpify-ML/api/.env.example | Confidence threshold (config.py:85) | No |
| `MODEL_IOU` | Scalpify-ML/api/.env.example | IoU/NMS threshold (config.py:86) | No |
| `UPLOAD_DIR` | Scalpify-ML/api/.env.example | Local upload dir (config.py:89) | No |
| `OUTPUT_DIR` | Scalpify-ML/api/.env.example | Local output dir (config.py:90) | No |
| `MAX_STORAGE_PER_USER` | Scalpify-ML/api/.env.example | Per-user storage cap MB (config.py:91) | No |
| `LOG_LEVEL` | Scalpify-ML/api/.env.example | Logging level (config.py:94) | No |
| `LOG_FILE` | Scalpify-ML/api/.env.example | Log file path | No |
| `ENABLE_METRICS` | Scalpify-ML/api/.env.example | Metrics toggle (config.py:97) | No |
| `REDIS_URL` | Scalpify-ML/api/.env.example | Optional Redis URL (cache/rate-limit) | Yes (may contain creds) |
| `CACHE_TTL` | Scalpify-ML/api/.env.example | Cache TTL seconds (config.py:98) | No |
| `SMTP_HOST` | Scalpify-ML/api/.env.example | SMTP server (email) | No |
| `SMTP_PORT` | Scalpify-ML/api/.env.example | SMTP port (config.py:101) | No |
| `SMTP_USER` | Scalpify-ML/api/.env.example | SMTP username | Yes |
| `SMTP_PASSWORD` | Scalpify-ML/api/.env.example | SMTP password | **Yes** |
| `SMTP_TLS` | Scalpify-ML/api/.env.example | SMTP TLS toggle (config.py:102) | No |
| `FROM_EMAIL` | Scalpify-ML/api/.env.example | Sender address (config.py:103) | No |
| `RATE_LIMIT_PER_MINUTE` | Scalpify-ML/api/.env.example | Rate limit (config.py:106) | No |
| `MAX_CONCURRENT_REQUESTS` | Scalpify-ML/api/.env.example | Concurrency cap (config.py:107) | No |
| `JWT_SECRET_KEY` | Scalpify-ML/api/.env.example | JWT signing key (config.py:110) | **Yes** |
| `JWT_EXPIRATION_HOURS` | Scalpify-ML/api/.env.example | JWT lifetime (config.py:111) | No |
| `ENABLE_API_KEY_AUTH` | Scalpify-ML/api/.env.example | API-key auth toggle (config.py:56) | No |
| `API_KEYS` | Scalpify-ML/api/.env.example | Valid API keys list | **Yes** |
| `AWS_ACCESS_KEY_ID` | Scalpify-ML/api/.env.example | AWS S3 access key (config.py:60; download_models_from_aws.py:37) | **Yes** |
| `AWS_SECRET_ACCESS_KEY` | Scalpify-ML/api/.env.example | AWS S3 secret (config.py:61; download_models_from_aws.py:38) | **Yes** |
| `AWS_S3_BUCKET` | Scalpify-ML/api/.env.example | Model weights bucket (config.py:62) | No |
| `AWS_REGION` | Scalpify-ML/api/.env.example | AWS region (config.py:59) | No |
| `SENTRY_DSN` | Scalpify-ML/api/.env.example | Sentry error-tracking DSN | Yes |
| `DEBUG_RESPONSES` | Scalpify-ML/api/.env.example | Verbose error responses (config.py:65) | No |
| `ENABLE_DOCS` | Scalpify-ML/api/.env.example | Swagger/ReDoc toggle (config.py:13) | No |
| `ENABLE_PROFILING` | Scalpify-ML/api/.env.example | Profiling middleware (config.py:14) | No |
| `REPLICATE_API_TOKEN` | Scalpify-ML/.env (active) | Auth for Replicate `google/nano-banana-2` (config.py:68) | **Yes** |
| `OPENAI_API_KEY` | Scalpify-ML/.env (active) | Auth for OpenAI chat assistant (config.py:71) | **Yes** |

> Discrepancy worth noting for the report: the backend's `Settings.Config.env_file` points at `"../.env"` (config.py:114), i.e. the **`Scalpify-ML/.env`** file (which contains only `REPLICATE_API_TOKEN` and `OPENAI_API_KEY`), **not** the much larger `Scalpify-ML/api/.env.example`. So most documented keys in `api/.env.example` are defaults defined in `config.py` and are not actually supplied via the active `.env`. Several `.env.example` keys (e.g. `AWS_*`, `OPENAI_CHAT_MODEL`) are not found in code: `OPENAI_CHAT_MODEL` exists in config.py:72 but is "Not found in `api/.env.example`".

---

## Phase 10 — Execution Flow

### App startup

1. `index.ts` calls `registerRootComponent(App)` (`index.ts:8`).
2. `App.tsx` hydrates all stores in parallel — user, meds, scans, daily log, chat — and flips `ready` only when done; until then an `ActivityIndicator` shows (`App.tsx:40-66`).
3. Notifications are configured: foreground behaviour (`configureNotifications()`), action buttons registered (`registerMedNotifications()`), and tap listeners + cold-start check wired (`App.tsx:18-52`).
4. Providers mount (`GestureHandlerRootView` → `SafeAreaProvider`, `StatusBar`, `GlobalBackground`) (`App.tsx:54-59`).
5. `SplashScreen` runs a 2.6 s animation, then routes: returning user (persisted `user`) → `MainTabs`, else → `Welcome` (`SplashScreen.tsx:30-32`).

### User sign-up / login

- **Sign up:** form collects name/email/password/confirm/optional surgery date/consent; validates (`SignUpScreen.tsx:28-35`); `signUp()` wipes prior user-scoped data, mints `u_<id>`, persists, never stores password; `nav.reset` → `OnbTreatment` (`userStore.ts:137-151`, `SignUpScreen.tsx:38-41`).
- **Sign in:** `signIn(email)` returns the stored user only if email matches, else "Account not found"; on success `nav.reset` → `MainTabs` (`userStore.ts:153-160`, `SignInScreen.tsx:27-33`).

### Onboarding completion

1. Start at `OnbTreatment` ("Have you had a transplant?") — the branch selector (`onboardingFlow.ts:7-23`).
2. DONE branch: Treatment, Age, Sex, Onset, Ethnicity, Family, Surgery, Routine, Adherence, Reminders. NOT-DONE branch: Treatment, Age, Sex, Onset, Ethnicity, Family, Goals, Intent, Reminders.
3. Each screen reads existing value from `useUser()`, edits local state, calls `updateMedical({...})`, then `advance(...)`.
4. Final `OnbReminders` optionally calls `ensureNotificationPermission()`; either path then `nav.reset` into `MainTabs` (`onboardingFlow.ts:40-56`, `OnboardingRemindersScreen.tsx:34`).

### Uploading / capturing a scalp photo

1. From Home/Scan tab the user opens `Camera` (fullScreenModal).
2. `CameraScreen` shows a `CameraView` with reticle, zoom slider, lighting hint; user shoots or picks from gallery.
3. `PreScanModal` collects optional context (stress, sleep, shedding, pregnancy if female) (`CameraScreen.tsx:286`).
4. Image is JPEG-converted/downscaled in `toJpeg` (`api.ts:73-83`).

### Running AI analysis

1. `analyzePhoto(uri, user.id ?? 'guest')` → `POST /api/v1/analyze` (`CameraScreen.tsx:110`, `api.ts:118-139`).
2. Endpoint validates file, parses options, creates a Supabase session, re-checks size (`analysis.py:86-118`).
3. `AnalysisService.process_full_analysis` → `validate_image` (dimensions + quality gate) → `analyze_image`: load YOLO (lazy), resize 512², `model.predict(iou=0.4)`, extract masks (`>0.5`), compute bald/hair pixels → `baldness_ratio`, cm²/inch² (15 cm reference), area-weighted confidence, `_classify_severity` (Norwood bucket), problem severity, hair health, coordinate extraction (`analysis_service.py:348-583`).
4. Upload standardized original + annotated to Storage; save result row; mark session completed (`analysis.py:131-192`).
5. Return `AnalysisResponse`; client `setLatestScan(...)` and `nav.reset` to Scan tab; treats `coverage+baldness < 1` as no-detection (`CameraScreen.tsx:111-122`).

### Generating the recovery-preview / hair-journey

1. From `ScanResultsScreen` or `JourneyScreen`, `generateHairJourney(photoUri)` → `POST /hair-journey/generate` (timeout 10 min) (`api.ts:163-180`).
2. If `REPLICATE_API_TOKEN` missing → 503. Else validate image, write temp file, build `HairJourneyOptions(iterations=6, ...)` (`hair_journey.py:36-112`).
3. `HairJourneyService.generate_hair_journey`: pad+resize 512², upload original, `ground_bald_region` (YOLO → region phrase), then loop six stages (15d→8mo) pacing ≥11 s, each `editor.edit_image` (prompt + identity block + region phrase + original anchor for chained stages), upload + append `IterationResult` (`hair_journey_service.py:306-436`).
4. Last stage = final; persist row to `hair_journey_sessions`; API absolutizes `/journey-files/...` URLs; return `HairJourneyResponse` (`hair_journey.py:20-33`).

### Chat

1. `ChatScreen` builds a `ChatContext` snapshot (name, recovery day/phase, age, sex, latest scan summary, med names, adherence) (`ChatScreen.tsx:66-87`).
2. `sendChatMessage(turns, context)` → `POST /chat` (`api.ts:143-161`).
3. If `OPENAI_API_KEY` missing → 503. Else `chat_service.reply` builds grounded system prompt, caps to last 20 turns, calls `chat.completions.create` (gpt-4o-mini, temp 0.5, max 600 tokens) (`chat_service.py:110-137`).
4. Reply returned; `appendMessage` persists (cap 100) and the typing bubble is replaced.

### Response returning to the app

All responses carry `X-Process-Time` and `X-Request-ID`. The client stores analysis in `scanStore` (max 60), chat in `chatStore` (max 100), and renders the relevant screen.

#### ASCII sequence — Login

```
Patient        SignInScreen        userStore        AsyncStorage
  │  enter email/pw  │                  │                  │
  │─────────────────►│  signIn(email)   │                  │
  │                  │─────────────────►│  read user.v1    │
  │                  │                  │─────────────────►│
  │                  │                  │◄── stored user ──│
  │                  │  email match?    │                  │
  │                  │◄── user | null ──│                  │
  │  reset→MainTabs  │  (or "not found")│                  │
  │◄─────────────────│                  │                  │
```

#### ASCII sequence — Scan + analysis

```
Camera   api.ts   /analyze   Supabase   AnalysisService   YOLO   Storage
  │ shoot │        │           │            │              │       │
  │ toJpeg│        │           │            │              │       │
  │──────►│ POST   │           │            │              │       │
  │       │───────►│ create session ───────►│              │       │
  │       │        │◄── session_id ─────────│              │       │
  │       │        │ process_full_analysis ►│              │       │
  │       │        │            │           │ predict(512²)│       │
  │       │        │            │           │─────────────►│       │
  │       │        │            │           │◄── masks ────│       │
  │       │        │            │ upload orig+annot ──────────────►│
  │       │        │            │ save_result            │         │
  │       │◄── AnalysisResponse JSON ──────────────────────────────│
  │◄ store in scanStore, render report
```

#### ASCII sequence — Hair-journey generation

```
App   /hair-journey   HairJourneyService   YOLO(ground)   Replicate   Supabase
 │ POST image  │            │                   │             │           │
 │────────────►│ generate() │                   │             │           │
 │             │───────────►│ ground_bald_region│             │           │
 │             │            │──────────────────►│             │           │
 │             │            │◄── region phrase ─│             │           │
 │             │   loop[6 stages] (pace ≥11s):  │             │           │
 │             │            │ edit_image(prompt+region+anchor)│           │
 │             │            │────────────────────────────────►│          │
 │             │            │◄────────── stage PNG ───────────│           │
 │             │            │ upload stage ──────────────────────────────►│
 │             │            │ save_journey_to_db ─────────────────────────►│
 │◄── HairJourneyResponse (iterations[]) ───────│             │           │
```

---

## Phase 11 — Important Files

| File | Why it matters |
|------|----------------|
| `Scalpify-App/index.ts` | True entry point; registers the root component. |
| `Scalpify-App/App.tsx` | Orchestrates startup: store hydration gate + notification wiring; nothing renders until ready. |
| `Scalpify-App/src/api.ts` | The only bridge to the backend — defines the entire client/server contract (3 endpoints, types, timeouts). |
| `Scalpify-App/src/config.ts` | Determines which backend the app talks to; throws in prod if `EXPO_PUBLIC_API_BASE_URL` is unset. |
| `Scalpify-App/src/navigation.tsx` | Defines all routes and the tab/stack structure; central to understanding the UX. |
| `Scalpify-App/src/userStore.ts` | The authoritative user/medical record (local-only) and the auth lifecycle. |
| `Scalpify-App/src/medsStore.ts` | Most feature-rich store; couples adherence logic with the notification scheduler. |
| `Scalpify-ML/api/app/main.py` | Backend entry point; wires middleware, routers, handlers, static mounts, and the Uvicorn run command. |
| `Scalpify-ML/api/app/core/config.py` | Single source of truth for all backend configuration; `get_settings()` is used everywhere. |
| `Scalpify-ML/api/app/core/supabase_client.py` | Data/storage layer; its graceful-degradation logic lets the whole API run without a DB. |
| `Scalpify-ML/api/app/services/analysis_service.py` | Core analysis business logic (the headline feature). |
| `Scalpify-ML/api/app/services/hair_journey_service.py` | Generative recovery-preview pipeline. |
| `Scalpify-ML/src/components/bald_area_calculation_service.py` | The shared YOLO segmentation engine used by API and CLI. |
| `Scalpify-ML/scripts/grounded_hair_journey.py` | The reusable region-grounding library imported by all journey generators. |
| `Scalpify-ML/scripts/download_models_from_aws.py` | Deployment-critical: fetches `.pt` weights from S3 at startup. |
| `Scalpify-ML/api/migrations/*.sql` | Canonical DB schema (tables, indexes, RLS, triggers, buckets). |
| `Scalpify-ML/api/app/models/schemas.py` | All Pydantic request/response shapes; drives validation and docs. |
| **Config/env files** | `Scalpify-App/.env(.example)` (`EXPO_PUBLIC_*`), `Scalpify-ML/.env` (active: `REPLICATE_API_TOKEN`, `OPENAI_API_KEY`), `Scalpify-ML/api/.env.example` (extensive documented keys), `app.json`, `package.json`, `requirements.txt`, `tsconfig.json`. |
| **Deployment files** | None committed (no Dockerfile, no `eas.json`, no CI). `Scalpify-ML/README.md` documents manual Uvicorn/systemd/Nginx steps; `download_models_from_aws.py` provisions weights. |

---

## Phase 12 — Security Analysis

### Authentication

No server-side authentication exists. The API is explicitly "Currently open" (`main.py:57`), `ENABLE_API_KEY_AUTH` defaults `False` (`config.py:56`), and no route attaches an auth dependency. Client "auth" is cosmetic and local-only: `signIn(email)` matches against the single stored user on the device (`userStore.ts:153-160`); passwords are validated but never stored or sent.

### Authorization

There is no authorization layer. Any client can call any endpoint. `user_id` is an unauthenticated free-text label passed in form data; one user could fetch another's history simply by guessing/passing their `user_id` (`/history`, `/hair-journey/history`). Supabase RLS policies are "allow all" (`create_tables.sql:52-57`, hair-journey bucket policies permit anyone to select/insert/update/delete — `create_hair_journey_table.sql:55-65`).

### API security

- **CORS** is wide open: `allow_origins=["*"]` with `allow_credentials=True` and all methods/headers (`main.py:65-72`) — permissive and flagged as dev-only in config comments (`config.py:17-18`).
- **TrustedHostMiddleware** is only added when **not** in debug (`main.py:75-79`), so in debug any Host is accepted.
- Upload validation is enforced (size ≤10 MB, MIME, extension) via `validate_upload_file` and custom exceptions (`analysis.py:33-53`).
- Request-ID tracing exists (`main.py:82-97`) but there is **no rate limiting** wired (rate-limit settings are declared but unused), and no API keys.
- Backend is served over **plain HTTP at a bare IP** (`http://51.21.1.14`) — no TLS evidenced.

### Secrets / env management

Secrets are loaded from `.env` via pydantic-settings; the active `Scalpify-ML/.env` holds `REPLICATE_API_TOKEN` and `OPENAI_API_KEY`. `.env.example` files document many sensitive keys (`SUPABASE_SERVICE_KEY`, `AWS_*`, `JWT_SECRET_KEY`, `SMTP_PASSWORD`, `API_KEYS`) without values. The default `JWT_SECRET_KEY = "your-super-secret-jwt-key-here"` is a placeholder that would be insecure if unset in production (`config.py:110`). Frontend `EXPO_PUBLIC_*` vars are public by design (bundled into the app).

### Data protection

User medical/profile data never leaves the device except as a transient `ChatContext` snapshot and the scan photo itself. Server-side, images and analysis rows are stored in Supabase under permissive RLS. The service-role key (full DB/storage access) is used server-side for uploads (`supabase_client.py:148-158`) — appropriate location, but its leakage would be catastrophic given allow-all RLS.

### Security Strengths

- No raw SQL at runtime (Supabase client + parameterized inserts) reduces SQL-injection surface.
- Strong input validation on uploads (size/MIME/extension/dimensions) and a quality gate (`analysis.py`, `analysis_service.py`).
- Pydantic schema validation on all structured requests (`schemas.py`).
- Secrets kept out of source via `.env`; only `EXPO_PUBLIC_*` (intentionally public) ship in the app.
- Graceful degradation avoids leaking stack traces in prod (generic 500 message unless `DEBUG`) (`analysis.py:278-307`).
- Service-role key confined to the backend; frontend never holds DB credentials.

### Security Weaknesses

- **No authentication or authorization** anywhere on the backend (`main.py:57`, `config.py:56`).
- **Open CORS** (`*` + credentials) (`main.py:65-72`).
- **Allow-all Supabase RLS** and public buckets (`create_tables.sql:52-57`, `create_hair_journey_table.sql:55-65`).
- **Plain HTTP, bare IP, no TLS** (`http://51.21.1.14`).
- **IDOR risk**: history endpoints trust an unauthenticated `user_id`.
- **No rate limiting** despite declared settings — abuse of paid Replicate/OpenAI calls is possible.
- **Placeholder JWT secret default** and many unused security settings (scaffolding only).
- **Unpinned backend dependencies** (`requirements.txt`) — non-deterministic, supply-chain risk.
- `facial-recognition` always echoes the raw error message even outside DEBUG (`facial_recognition.py:182`).

### Recommended Improvements

- Add real authentication (Supabase Auth or signed JWTs) and bind `user_id` to the authenticated identity.
- Tighten Supabase RLS to per-user row ownership; make buckets private with signed URLs.
- Restrict CORS to the app's known origins and drop `allow_credentials` with `*`.
- Serve over HTTPS behind Nginx with a real domain + certificate.
- Add rate limiting / concurrency caps (the settings already exist) to protect paid AI endpoints.
- Pin dependency versions in `requirements.txt`.
- Replace the placeholder `JWT_SECRET_KEY` and fail fast if unset in production.
- Gate facial-recognition error detail on `DEBUG` like the analysis endpoint.

---

## Phase 13 — Deployment Analysis

### What is present

- **Backend run commands**: dev `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`; prod with `--workers 4` (`Scalpify-ML/README.md:130-141`). Defaults `HOST=0.0.0.0`, `PORT=8000`, `WORKERS=2` (`config.py:75-77`).
- **A live host**: the Postman collection `baseUrl` is `http://51.21.1.14` — a raw IP, HTTP only — indicating a self-managed AWS-style VM. AWS region defaults (`us-east-1` in `config.py:59`; `ap-south-1` in `download_models_from_aws.py`) suggest EC2.
- **Manual deployment guide** (Ubuntu): apt packages, venv, `pip install -r requirements.txt`, optional systemd service (`gaspai.service`) and optional Nginx reverse proxy (`Scalpify-ML/README.md:429-469`).
- **Model distribution**: `scripts/download_models_from_aws.py` pulls `best.pt`/`selfie_model.pt`/`bald_back_model.pt` from S3 (`gasp-ai-models`) at deploy/startup, with size verification and resume logic.
- **External services**: Supabase (DB+Storage), Replicate (`google/nano-banana-pro`), OpenAI (chat), AWS S3 (weights) — all via env vars.
- **Frontend**: dev `EXPO_PUBLIC_DEV_LAN_IP=<ip> npx expo start --lan` (`Scalpify-App/README.md:8-12`); prod build via **EAS** with `EXPO_PUBLIC_API_BASE_URL` set (`config.ts:16-24`); New Architecture enabled (`app.json`).

### What is NOT present

- No Dockerfile/docker-compose/Procfile/fly.toml/render.yaml — Docker is "Coming Soon" in the README only.
- No committed `eas.json` (EAS is mentioned in prose only).
- No CI/CD (`.github/workflows` absent).
- No committed systemd/Nginx files (inline README instructions only).
- No TLS/HTTPS or domain — backend exposed over plain HTTP at a bare IP.

### Summary

Deployment is **manual and self-hosted**: a Uvicorn process (optionally behind systemd + Nginx) on what appears to be an AWS EC2 instance, pulling YOLO weights from S3 at startup and relying on Supabase/Replicate/OpenAI. The mobile app is built and distributed via Expo/EAS, pointed at the backend through `EXPO_PUBLIC_API_BASE_URL`. Containerization and CI/CD are documented as aspirational but absent.

---

## Phase 14 — Executive Summary

**What the project does.** Scalpify is a mobile hair-loss and transplant-recovery companion. Users photograph their scalp; an AI pipeline measures baldness (a pixel ratio of bald-to-hair-bearing scalp), grades severity and Norwood stage, tracks progression over time, generates an AI recovery-preview "journey," manages medication adherence with reminders, logs daily recovery, and answers questions through a grounded chat assistant.

**Main technologies.** Frontend: Expo / React Native / TypeScript with custom `useSyncExternalStore` stores and AsyncStorage. Backend: FastAPI / Python / Uvicorn. ML: YOLOv11 (Ultralytics + PyTorch) for segmentation; OpenCV/Pillow/NumPy for measurement. Generative AI: Replicate `google/nano-banana-pro`. Chat: OpenAI gpt-4o-mini. Data: Supabase (Postgres + Storage); model weights on AWS S3; facial landmarks via AWS Rekognition.

**Main workflows.** (1) Onboarding → local profile; (2) capture/upload → analyze → Scalp Report; (3) progression tracking; (4) hair-journey generation; (5) medication tracking + recovery calendar; (6) chat.

**AI/ML workflow.** Photo standardized to 512×512 → YOLOv11 segmentation (iou=0.4, mask>0.5) → bald/hair pixel areas → `baldness_ratio` → cm² estimate (15 cm head reference) → severity + Norwood bucket → OpenCV coordinate extraction → optional grounded generative journey (6 chained stages 15 d→8 mo on nano-banana-pro).

**User workflow.** Splash → (returning→MainTabs / new→Welcome→Onboarding→SignUp) → branched questionnaire → Home dashboard → Scan/Camera → Scalp Report → Track meds / Recovery calendar / Journey / Chat / Profile.

**Backend workflow.** FastAPI receives multipart/JSON → validates (Pydantic + upload checks) → creates Supabase session → service layer runs YOLO or calls Replicate/OpenAI/Rekognition → uploads images to Storage → persists rows → returns uniform JSON with tracing headers; degrades gracefully when providers are unconfigured.

**Database workflow.** `analysis_sessions` (1)→`analysis_results` (N) on each analyze; standalone `hair_journey_sessions` per journey; images in `uploads`/`processed`/`hair-journey` buckets; users linked loosely by nullable `user_id`; the canonical user lives only in the app's AsyncStorage.

---

## Phase 15 — Presentation Ready Notes

### Project Introduction
Scalpify is an AI-powered mobile app that quantifies hair loss from a single scalp photo and helps users track and visualise hair-transplant recovery, combining computer vision, generative AI, and a grounded chat assistant.

### Problem Statement
Objective at-home measurement of baldness and recovery is unavailable to most users; Norwood grading is subjective and clinic-bound. Scalpify provides a repeatable pixel-based baldness metric, progression tracking, and a realistic recovery preview from a phone.

### Motivation
Hair loss affects self-image; transplant patients want to see expected progress. Existing tools lack quantitative measurement and personalised, data-grounded guidance. Scalpify fills that gap with on-device tracking plus AI analysis.

### Objectives
- Measure baldness ratio and estimate severity/Norwood from a photo.
- Track progression over time with charts and history.
- Generate a realistic AI recovery-preview journey.
- Support adherence with medication reminders and a recovery calendar.
- Offer a grounded AI assistant using the user's own data.

### Technology Stack
Expo/React Native/TypeScript; FastAPI/Python/Uvicorn; YOLOv11 (Ultralytics/PyTorch); OpenCV/Pillow/NumPy; Replicate (nano-banana-pro); OpenAI (gpt-4o-mini); AWS Rekognition; Supabase (Postgres+Storage); AWS S3 (weights). (See Phase 1 table.)

### System Architecture
Five-layer client-server with embedded ML and external SaaS (Phase 2, `diagrams/fig2_architecture.png`): offline-first mobile client → FastAPI service layer → YOLO/Replicate/OpenAI/Rekognition processing → Supabase/S3 storage, with Pydantic validation and request tracing cross-cutting.

### Methodology
Service-layer backend; custom external-store frontend; transfer-learned YOLOv11 (inference-only `best.pt`); prompt-engineered, region-grounded generative pipeline iterated across four generations (Qwen → grounded nano-banana-2 → FLUX inpainting → chained nano-banana-pro).

### Application Workflow
Splash/auth → branched onboarding → dashboard → camera → analysis → report → tracking (meds, calendar, Norwood trends) → journey → chat (Phase 10).

### Machine Learning Workflow
512² standardization → YOLOv11 segmentation → bald/hair areas → baldness ratio + cm² estimate → severity/Norwood → coordinate extraction → optional 6-stage grounded generative journey (Phase 5/2 pipeline diagram).

### Key Features
Baldness analysis; progression tracking; AI hair-journey; medication adherence + reminders; recovery calendar + daily log; grounded chat; heuristic risk score; facial-landmark endpoint.

### Results
No quantitative evaluation metrics (accuracy, IoU, precision/recall) were found in the codebase. The onboarding copy references "98% detection accuracy" and "YOLO-powered computer vision" as marketing text (`OnboardingScreen.tsx`), but no test set, benchmark, or measured result is present in the files. **No validated results found in code.**

### Challenges (grounded)
- Estimating real-world cm² without a scale reference (mitigated by a 15 cm head-width heuristic — explicitly an approximation, `calculate_bald_area.py:27`).
- Generative drift / identical-looking late stages (solved by chaining + original-anchor reference, `nano_pro_journey.py`).
- Replicate rate limits (handled via ≥11 s pacing + exponential backoff, `hair_journey_service.py`).
- Running without optional providers (solved by graceful degradation, `supabase_client.py`).
- Aligning overlays to the photo (solved by a shared 512² coordinate space).

### Future Improvements
Add real authentication + per-user authorization; tighten CORS and Supabase RLS; serve over HTTPS; add rate limiting; pin dependencies; containerize + CI/CD; wire the front/back-view models (`selfie_model.pt`, `bald_back_model.pt`); add an explicit Norwood mapping table server-side; add evaluation metrics.

---

## Questions You Should Be Able To Answer

1. What problem does Scalpify solve, and who are its target users?
2. What are the three (and only three) backend endpoints the mobile app calls, and what does each do?
3. Why is the app described as "offline-first," and where does user data actually live?
4. How is global state managed on the frontend, and why was `useSyncExternalStore` chosen over Redux/Zustand?
5. Walk through what happens from `index.ts` to the first rendered screen at app startup.
6. How does the onboarding flow branch, and what drives the branch?
7. How does local "authentication" work, and why is there no auth server?
8. Why does `signUp` wipe all user-scoped data, and what could go wrong if it didn't?
9. Describe the full analyze pipeline from photo capture to rendered Scalp Report.
10. How is `baldness_ratio` computed, and why does it ignore background pixels?
11. How are cm²/inch² areas estimated without a scale reference, and how reliable are they?
12. What is the role of the YOLOv11 `best.pt` model, and how do we know it's fine-tuned (transfer-learned)?
13. What does "grounding" mean in this project, and how is it implemented without GroundingDINO/SAM?
14. Explain the four generations of the hair-journey generator and what each one fixed.
15. Why is there an ≥11 s pacing and exponential backoff in the journey pipeline?
16. How does the chat assistant stay "grounded" in the user's data?
17. What are the three database tables, their relationships, and the one real foreign key?
18. Why is there no `users` table on the backend, and how are records linked to a user?
19. What are the three storage buckets, and which client uploads to them?
20. How does the backend behave when Supabase/OpenAI/Replicate credentials are missing?
21. What middleware does the FastAPI app register, and what do `X-Request-ID` / `X-Process-Time` provide?
22. Under what condition are `/docs` and `/redoc` exposed?
23. List the security weaknesses around CORS, RLS, TLS, and authentication.
24. What is an IDOR risk in the history endpoints, and how would you fix it?
25. How are secrets managed, and which `.env` file is actually active for the backend?
26. How is the API base URL resolved differently for Android emulator, iOS simulator, and production?
27. How are medication reminders scheduled, snoozed, and cancelled, and how do they survive edits?
28. How does the recovery calendar compute the current phase and milestone dates?
29. What is the difference between `app.py` (CLI) and the FastAPI analysis service, and what do they share?
30. How is the analysis result confidence computed (vs. the old hardcoded value)?
31. What is the quality gate, and what causes a "no-detection" result on the client?
32. How is the before/after overlay kept aligned with the photo (coordinate space)?
33. What deployment artifacts are present vs. absent (Docker, eas.json, CI/CD, TLS)?
34. How are the YOLO model weights distributed to the server at deploy time?
35. What evaluation metrics exist in the codebase, and what does the "98% accuracy" copy actually represent?

---

## Appendix — Existing Project Diagrams (transcribed)

This appendix transcribes the seven required UML/architecture diagrams (plus the optional class diagram) that ship in the repository under `diagrams/`. Each entry records the diagram's exact title as printed, what it depicts, and a faithful text transcription of every box, actor, arrow, and label that is visually legible in the image. Only content actually visible in the images is reported; where a label is partially obscured or ambiguous, this is noted explicitly.

---

### Figure 1 — Use Case Diagram

- **File:** `diagrams/fig1_use_case.png`
- **Printed title:** "Figure 1: Scalpify System Use Case Diagram"
- **What it shows:** A standard UML use case diagram. A large rectangular **system boundary** labelled **"Scalpify"** contains seven use case ovals. Two stick-figure actors sit outside the boundary: **Patient** on the left and **Admin** on the right.

**Actors (visible):**
| Actor | Position |
|-------|----------|
| Patient | Left of system boundary |
| Admin | Right of system boundary |

**Use cases inside the "Scalpify" boundary:**
| ID | Use case label |
|----|----------------|
| UC-1 | Local Profile & Sign-In |
| UC-2 | Capture or Upload Scalp Photo |
| UC-3 | Baldness Analysis (YOLOv11) |
| UC-4 | Hair Journey Preview Generation |
| UC-5 | Review Recovery Timeline |
| UC-6 | Medication Tracking |
| UC-7 | View Norwood Reference |

**Relationships visible:**
- The **Patient** actor has association lines fanning out to multiple use cases on the left/lower side (UC-1, UC-2, UC-4, UC-5, UC-6, UC-7 — lines radiate from the Patient figure to the cluster of ovals).
- The **Admin** actor has association line(s) reaching across to use cases on the right (lines extend from Admin toward the upper/right ovals such as UC-3 and others).
- **«include»** dependency arrows (dashed, stereotyped) are drawn between the upper use cases: UC-2 (Capture or Upload Scalp Photo) → UC-3 (Baldness Analysis (YOLOv11)) is labelled **«include»**, and there is a second **«include»** dashed relationship running from UC-3 / UC-2 area down toward UC-4 (Hair Journey Preview Generation). Two `«include»` labels are visible in the upper-middle region of the diagram.

---

### Figure 2 — High-Level System Architecture (Layered View)

- **File:** `diagrams/fig2_architecture.png`
- **Printed title:** "Figure 2: High-Level System Architecture (Layered View)"
- **What it shows:** A layered architecture stack. Five horizontal coloured bands, each a named layer containing several component boxes, stacked top to bottom, plus a sixth band for cross-cutting concerns.

**Layer 1 — Presentation Layer (blue band):**
| Box | Sub-label |
|-----|-----------|
| Expo / React Native Mobile Client | — |
| Zustand Stores | (scan / meds / user) |
| React Navigation | (stack + tabs) |
| expo-camera / expo-image-picker | — |
| AsyncStorage | — |

**Layer 2 — API / Service Layer (teal/green band):**
| Box | Sub-label |
|-----|-----------|
| FastAPI App | (api/app/main.py) |
| Analysis Endpoint | (/analyze) |
| Hair Journey | (/hair-journey/generate) |
| Facial Recognition | (/facial-recognition) |
| Health / Ready / Live | — |

**Layer 3 — Processing & AI Layer (purple band):**
| Box | Sub-label |
|-----|-----------|
| YOLOv11 Segmentation | (Ultralytics) |
| BaldMaskExtractor | — |
| Replicate API | (google/nano-banana-2) |
| FluxFillEditor | (experimental) |
| Severity & Norwood Classification | — |
| Coordinate Extractor | (OpenCV contours) |
| Area Calculator | (15 cm head-width ref) |
| AWS Rekognition | (landmarks) |

**Layer 4 — Data & Storage Layer (orange band):**
| Box | Sub-label |
|-----|-----------|
| Supabase Postgres | (analysis_sessions, hair_journey_sessions) |
| Supabase Storage | (uploads, processed, hair-journey buckets) |
| Local Filesystem | outputs/ (transient) |
| Model Registry | (model/best.pt) |

**Layer 5 — Cross-Cutting Concerns (grey band):**
| Box | Sub-label |
|-----|-----------|
| Pydantic Validation & Error Mapping | — |
| Request-ID Tracing | X-Process-Time |
| Quality Gate | (blur / brightness) |
| CORS · CI/CD · Logging · Backups | — |

**Relationships:** The diagram is a layered stack; no explicit inter-box arrows are drawn — layering (top = client, bottom = cross-cutting) implies the call/dependency direction from Presentation down through API, Processing/AI, and Data/Storage.

---

### Figure 3 — Entity-Relationship Diagram (Supabase / FastAPI Data Model)

- **File:** `diagrams/fig3_erd.png`
- **Printed title:** "Figure 3: Entity-Relationship Diagram (Supabase / FastAPI Data Model)"
- **What it shows:** A crow's-foot/UML-style ERD with six entity tables and their attributes and cardinalities.

**Entities and attributes (as listed in each box):**

**User** (note beneath box: *local-only (AsyncStorage)*)
- id (PK)
- email
- full_name
- surgery_date
- created_at

**AnalysisSession**
- session_id (PK)
- user_id (FK → User)
- filename
- uploaded_at
- status

**AnalysisResult**
- id (PK)
- session_id (FK)
- baldness_ratio
- norwood_scale
- severity_level
- confidence
- annotated_image_url

**Medication** (note: *id (PK → local)*)
- id (PK → local)
- name
- type
- reminder_time
- icon, color

**HairJourneySession**
- session_id (PK)
- user_id (FK → User)
- original_image_url
- final_result_url
- status
- created_at

**IterationResult**
- id (PK)
- session_id (FK)
- iteration_number
- stage_name (15d / 1m / 3m / 4m)
- image_url
- processing_time_ms

**Relationships (cardinalities visible):**
| From | To | Cardinality | Label |
|------|----|-------------|-------|
| User | AnalysisSession | 1 — N | *owns* |
| AnalysisSession | AnalysisResult | 1 — 1 | *produces* |
| User | HairJourneySession | 1 — N | *starts* |
| HairJourneySession | IterationResult | 1 — 4 | *has* |

(The "1 — 4" on HairJourneySession → IterationResult corresponds to the four journey stages noted as 15d / 1m / 3m / 4m.)

---

### Figure 4 — Class Diagram (optional, included)

- **File:** `diagrams/fig4_class.png`
- **Printed title:** "Figure 4: Class Diagram — Scalpify Core Domain"
- **What it shows:** A UML class diagram of the backend's core domain classes, grouped into entry-point/config, service classes, and external-system wrappers.

**Classes, stereotypes and members (as legible):**

**FastAPI app** «entry-point»
- + title, version
- + settings
- + add_middleware()
- + include_router()

**APIRouter (v1)**
- + prefix = /api/v1
- + analyze()
- + /hair-journey/generate
- + /facial-recognition
- + /health, /model/info

**Settings (pydantic)**
- + MODEL_PATH
- + REPLICATE_API_TOKEN
- + SUPABASE_URL, SUPABASE_*_KEY
- + AWS_REGION, AWS_*_KEY
- + get_settings() «lru_cache»

**AnalysisService**
- - model: YOLO
- - confidence_threshold
- + analyze_image(file, opts)
- + classify_norwood(ratio)
- - compute_areas(masks)

**HairJourneyService**
- - nano_editor
- - flux_editor (optional)
- - mask_extractor
- - stages: list[tuple]
- + generate(image, opts)
- - upload_to_supabase()
- - save_journey_to_db()

**FacialRecognitionService**
- - rekognition_client
- + detect_faces(file)
- - normalise_landmarks()

**YOLO (Ultralytics)** «external»
- + names: dict
- + predict(img, iou=0.4)

**BaldMaskExtractor**
- - model: YOLO
- - bald_class_id
- + extract(image, dilate_px)

**NanoBananaEditor** «external»
- - model = google/nano-banana-2
- + retry policy
- + edit_image(img, prompt)
- + _wait_for_throttle()

**SupabaseClient** «external»
- + url, anon_key, service_key
- + upload(bucket, path, bytes)
- + insert(table, payload)
- + create_session(user_id, metadata)

**Replicate (PaaS)** «external»
- + run(model_id, input)

**Relationships visible:**
- FastAPI app → APIRouter (v1): include_router / «delegates».
- APIRouter (v1) → AnalysisService, HairJourneyService, FacialRecognitionService: **«delegates»** dependency arrows.
- AnalysisService → YOLO (Ultralytics): **«uses»**; AnalysisService → SupabaseClient: **«persists»**.
- HairJourneyService → BaldMaskExtractor / NanoBananaEditor: **«uses»**; HairJourneyService → SupabaseClient: **«persists»**.
- FacialRecognitionService → (external recognition): **«uses»**.
- NanoBananaEditor → Replicate (PaaS): **«calls»**.
- Settings is referenced by the services for configuration (config arrows toward services).

---

### Figure 5 — Component Diagram (Scalpify Subsystems and External Services)

- **File:** `diagrams/fig5_components.png`
- **Printed title:** "Figure 5: Component Diagram — Scalpify Subsystems and External Services"
- **What it shows:** A UML component diagram. A **Patient** stick-figure actor at top connects to the Mobile App, which talks to a central FastAPI Backend; the backend connects out to internal sub-components and several external services/stores.

**Components (each marked «component» where shown):**
| Component | Sub-label |
|-----------|-----------|
| Mobile App | Expo / React Native |
| FastAPI Backend | api/app (Python 3.12) |
| Replicate | google/nano-banana-2 |
| AWS Rekognition | boto3 client |
| Local Outputs | outputs/ folder |
| YOLOv11 | model/best.pt |
| Supabase Postgres | session tables |
| Supabase Storage | image buckets |

Three small internal sub-component boxes sit under the FastAPI Backend with endpoint labels (overlapping/partially obscured): **Analysis** (/analyze), **Journey** (/hair-journey), and **Facial-recog** (/facial-recog).

**Connections / arrows visible:**
| From | To | Label |
|------|----|-------|
| Patient | Mobile App | (association) |
| Mobile App | FastAPI Backend | HTTPS / JSON |
| FastAPI Backend | Replicate | REST |
| FastAPI Backend | AWS Rekognition | REST |
| FastAPI Backend | Local Outputs | writes (transient) |
| FastAPI Backend | Supabase Storage | uploads / fetches |
| FastAPI Backend | (sub-components) | loads / calls (to /analyze, /hair-journey, /facial-recog) |

The internal endpoint boxes link the backend to YOLOv11 (model/best.pt) and the external stores; some connector labels (e.g., "persists") near the Supabase Postgres box are partially overlapped by other shapes.

---

### Figure 6 — Sequence Diagram (Hair Journey Pipeline, 4-stage timeline)

- **File:** `diagrams/fig6_sequence.png`
- **Printed title:** "Figure 6: Sequence Diagram — Hair Journey Pipeline (4-stage timeline)"
- **What it shows:** A UML sequence diagram with six lifelines and a `loop [4 stages]` combined fragment covering the per-stage generation work.

**Lifelines (left to right):**
1. Patient
2. Mobile App
3. FastAPI / `/hair-journey`
4. YOLOv11 + Mask Extractor
5. Replicate (nano-banana-2)
6. Supabase

**Message sequence (top to bottom, as visible):**
1. Patient → Mobile App: **tap Generate Journey**
2. Mobile App → FastAPI: **POST /hair-journey/generate (image)**
3. FastAPI → YOLOv11 + Mask Extractor: **YOLOv11.predict() — extract bald mask**
4. YOLOv11 + Mask Extractor → FastAPI: **mask 512×512 (L-channel)** (return)
5. **loop [4 stages]** fragment (annotated with stage labels along the right edge, e.g. "15d / 1m / 3m / 4m"):
   - FastAPI → Replicate: **edit image with stage-specific prompt**
   - Replicate → FastAPI: **stage PNG (512×512)** (return)
   - FastAPI → Supabase: **upload stage to hair-journey bucket**
   - Supabase → FastAPI: **public URL** (return)
   - FastAPI self-message: **sleep 11 s (Replicate throttle)** (a self-loop arrow on the FastAPI lifeline)
6. After the loop: FastAPI → Supabase: **(loop) INSERT hair_journey_sessions row**
7. FastAPI → Mobile App: **HairJourneyResponse (iterations[])** (return)
8. Mobile App → Patient: **render timeline**

---

### Figure 7 — Activity Diagram (Scan Upload to Baldness Analysis)

- **File:** `diagrams/fig7_activity.png`
- **Printed title:** "Figure 7: Activity Diagram — Scan Upload to Baldness Analysis"
- **What it shows:** A UML activity diagram with a start node (filled circle), a vertical flow of action rectangles, two decision diamonds (each with rejection branches to the left), and an end node (encircled dot).

**Flow (top to bottom):**
1. **(Start node)** → 
2. **Patient opens Camera screen**
3. **Capture photo or pick from gallery**
4. **expo-image-manipulator → re-encode to JPEG, ≤ 1600 px**
5. **POST /api/v1/analyze (multipart)**
6. **Decision: valid JPEG/PNG ≤ 10 MB ?**
   - **no →** *reject 422 to client* (branch to left, red box)
   - **yes →** continue
7. **Open + validate image (224² – 4096²)**
8. **Decision: Quality OK? (brightness / contrast / blur)**
   - **no →** *reject 400 — re-upload* (branch to left, red box)
   - **yes →** continue
9. **Resize 512 × 512 (LANCZOS) → YOLOv11 predict**
10. **Compute pixel areas → cm² / inch² (15 cm reference)**
11. **Norwood classification + confidence calibration**
12. **Extract bald-region coordinates (OpenCV contours)**
13. **Upload original + annotated → Supabase**
14. **Return AnalysisResponse JSON**
15. **(End node)**

---

### Figure 8 — State Diagram (Scan Lifecycle: analysis + hair-journey)

- **File:** `diagrams/fig8_state.png`
- **Printed title:** "Figure 8: State Diagram — Scan Lifecycle (analysis + hair-journey)"
- **What it shows:** A UML state machine diagram tracking a scan/session through analysis and the optional hair-journey pipeline. Initial state (filled dot) at far left; final state (encircled dot) at far lower right.

**States (with their internal/descriptive notes):**
| State | Note inside / under box |
|-------|--------------------------|
| uploading | *multipart POST in flight* |
| validating | *file-type & quality gates* |
| analyzing | *YOLO segmentation* |
| analysis_complete | *norwood, ratio, confidence persisted* |
| failed | *error_message logged* |
| journey_pending | *loop 4 stages via Replicate* |
| journey_complete | *4 stage URLs available* |
| journey_failed | *Replicate 429 or timeout* |
| purged | *retention policy applied* |

**Transitions (labels on arrows):**
| From | To | Trigger / guard |
|------|----|-----------------|
| (initial) | uploading | — |
| uploading | validating | upload ok |
| validating | analyzing | pass gates |
| validating | failed | reject |
| analyzing | analysis_complete | YOLO ok |
| analyzing | failed | exception |
| analysis_complete | journey_pending | Generate Journey (orange/highlighted transition) |
| analysis_complete | journey_complete | (skip) |
| journey_pending | journey_complete | 4 stages ok |
| journey_pending | journey_failed | Replicate err |
| journey_complete | purged | retention purge |
| purged | (final) | retention policy applied |

The "Generate Journey" transition from **analysis_complete** to **journey_pending** is drawn in an orange/highlighted colour distinct from the other (grey/teal) transition arrows. The **failed** and **journey_failed** states are terminal-ish error sinks; **purged** leads to the final state.
