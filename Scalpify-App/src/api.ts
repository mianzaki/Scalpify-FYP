import * as ImageManipulator from 'expo-image-manipulator';
import { API_BASE_URL } from './config';

export type BoundaryPoint = { x: number; y: number };

type Segment = { simplified_boundary?: BoundaryPoint[]; boundary_points?: BoundaryPoint[] };

export type ScanCoordinates = {
  // Boundary polygons of the detected regions, in coordinate_space pixels.
  bald_segments?: Segment[];
  hair_segments?: Segment[];
  coordinate_space?: { width: number; height: number };
} | null;

export type AnalyzeResponse = {
  success: boolean;
  session_id: string;
  measurements: {
    percentage: { baldness_ratio: number; hair_coverage: number };
    cm2: { bald: number; hair: number; total_head: number };
  };
  classification: {
    severity: string;
    norwood_scale: string;
    confidence: number;
  };
  coordinates?: ScanCoordinates;
};

export type HairJourneyResponse = {
  success: boolean;
  status: string;
  session_id: string;
  result?: {
    original_image_url: string;
    final_result_url: string;
    iterations: Array<{
      iteration_number: number;
      image_url: string;
      processing_time_ms: number;
    }>;
  };
  error_message?: string;
};

const MAX_DIM = 1600;
const REQUEST_TIMEOUT_MS = 90_000;
const HAIR_JOURNEY_TIMEOUT_MS = 600_000; // 10 min — 8 stages × ~13s + 11s pacing + retries

async function toJpeg(uri: string): Promise<string> {
  // Re-encode to JPEG (HEIC -> JPEG conversion). Only downscale if the image
  // is larger than MAX_DIM — otherwise pass through untouched to keep
  // sharpness intact for the server's blur-detection quality gate.
  const actions: ImageManipulator.Action[] = [{ resize: { width: MAX_DIM } }];
  const out = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return out.uri;
}

function jpegFormPart(uri: string) {
  return { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.text();
    try {
      const json = JSON.parse(body);
      return json?.error?.message || json?.detail || body;
    } catch {
      return body;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`Request timed out after ${ms / 1000}s — check Wi-Fi / server`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzePhoto(
  photoUri: string,
  userId: string,
): Promise<AnalyzeResponse> {
  const jpegUri = await toJpeg(photoUri);
  const form = new FormData();
  form.append('file', jpegFormPart(jpegUri));
  form.append('user_id', userId);
  form.append('save_annotated', 'false');
  form.append('include_coordinates', 'false');

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/analyze`,
    { method: 'POST', body: form },
    REQUEST_TIMEOUT_MS,
  );
  if (!res.ok) {
    const msg = await readErrorBody(res);
    throw new Error(`Analyze failed (HTTP ${res.status}): ${msg}`);
  }
  return res.json();
}

export async function generateHairJourney(
  photoUri: string,
): Promise<HairJourneyResponse> {
  const jpegUri = await toJpeg(photoUri);
  const form = new FormData();
  form.append('image', jpegFormPart(jpegUri));

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/hair-journey/generate`,
    { method: 'POST', body: form },
    HAIR_JOURNEY_TIMEOUT_MS,
  );
  if (!res.ok) {
    const msg = await readErrorBody(res);
    throw new Error(`Hair journey failed (HTTP ${res.status}): ${msg}`);
  }
  return res.json();
}
