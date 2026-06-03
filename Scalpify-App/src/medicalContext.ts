import type { MedicalProfile, Medication } from './userStore';
import type { ScanContext } from './scanStore';

export const MED_LABELS: Record<Medication, string> = {
  finasteride: 'finasteride',
  dutasteride: 'dutasteride',
  minoxidil_topical: 'topical minoxidil',
  minoxidil_oral: 'oral minoxidil',
  spironolactone: 'spironolactone',
};

export type RiskLevel = 'low' | 'standard' | 'elevated' | 'high';

export type RiskSummary = {
  level: RiskLevel;
  factors: string[];
};

// Max possible weighted score before treatment offsets (used to project risk pct).
const MAX_RISK_SCORE = 11;

// Weighted heuristic — not a learned model. Calibrated to give:
//   0       → low
//   1–2     → standard
//   3–4     → elevated
//   5+      → high
export function computeRisk(m: MedicalProfile | undefined | null): RiskSummary & { rawScore: number; percent: number } {
  if (!m) return { level: 'standard', factors: [], rawScore: 0, percent: 35 };

  let score = 0;
  const factors: string[] = [];

  // Family history is the strongest predictor of AGA.
  if (m.familyHistory === 'both') { score += 3; factors.push('strong family history'); }
  else if (m.familyHistory === 'maternal') { score += 2; factors.push('maternal family history'); }
  else if (m.familyHistory === 'paternal') { score += 1; factors.push('paternal family history'); }

  // Early onset implies faster trajectory.
  if (m.ageOfOnset !== null && m.ageOfOnset > 0 && m.ageOfOnset < 25) {
    score += 2;
    factors.push('early onset');
  }

  if (m.smoker) { score += 1; factors.push('smoker'); }

  if (m.hasThyroidIssue) { score += 1; factors.push('thyroid issue'); }
  if (m.hasPCOS) { score += 1; factors.push('PCOS'); }
  if (m.recentMajorIllness) { score += 1; factors.push('recent illness'); }
  if (m.highStress) { score += 1; factors.push('high stress'); }
  if (m.vitaminDeficiency) { score += 1; factors.push('vitamin deficiency'); }

  // Treatment reduces effective risk.
  const onMaintenance = m.medications.some(
    med => med === 'finasteride' || med === 'dutasteride' || med === 'spironolactone',
  );
  const onMinoxidil = m.medications.some(
    med => med === 'minoxidil_topical' || med === 'minoxidil_oral',
  );
  if (onMaintenance) score -= 2;
  if (onMinoxidil) score -= 1;

  let level: RiskLevel = 'standard';
  if (score <= 0) level = 'low';
  else if (score <= 2) level = 'standard';
  else if (score <= 4) level = 'elevated';
  else level = 'high';

  // Map raw score (possibly negative after treatment offsets) into 5-95% band.
  const clamped = Math.max(-2, Math.min(MAX_RISK_SCORE, score));
  const norm = (clamped + 2) / (MAX_RISK_SCORE + 2);
  const percent = Math.round(5 + norm * 90);

  return { level, factors, rawScore: score, percent };
}

export function treatmentSummary(m: MedicalProfile | undefined | null): string | null {
  if (!m || m.medications.length === 0) return null;
  const names = m.medications.map(med => MED_LABELS[med]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} + ${names[names.length - 1]}`;
}

// Days to shift the projected regrowth date.
// Positive = later, negative = sooner.
export function recoveryProjectionShiftDays(m: MedicalProfile | undefined | null): number {
  if (!m) return 0;
  let shift = 0;
  if (m.smoker) shift += 14;             // smoking slows wound healing + follicle recovery
  if (m.recentMajorIllness) shift += 7;
  if (m.hasThyroidIssue) shift += 7;
  if (m.highStress) shift += 7;          // stress (telogen effluvium) delays regrowth
  if (m.vitaminDeficiency) shift += 5;   // poor nutrition slows the anagen phase
  if (m.medications.some(x => x === 'finasteride' || x === 'dutasteride')) shift -= 7;
  if (m.medications.some(x => x === 'minoxidil_topical' || x === 'minoxidil_oral')) shift -= 7;
  return shift;
}

export function riskNote(risk: RiskSummary): string | null {
  if (risk.factors.length === 0) return null;
  const list = risk.factors.join(', ');
  switch (risk.level) {
    case 'high':
      return `Risk-adjusted: HIGH — ${list}. Monitor closely and discuss aggressive options with your clinician.`;
    case 'elevated':
      return `Risk-adjusted: elevated — ${list}. Stay consistent with treatment to slow progression.`;
    case 'low':
      return `Risk-adjusted: low — ${list}. Current factors are favourable.`;
    default:
      return `Context: ${list}.`;
  }
}

export function scanContextSummary(ctx: ScanContext | undefined): string | null {
  if (!ctx) return null;
  const bits: string[] = [];
  if (ctx.stressLevel >= 4) bits.push('high stress');
  if (ctx.sleepHours > 0 && ctx.sleepHours < 6) bits.push(`${ctx.sleepHours}h sleep`);
  if (ctx.newSheddingNoticed === 'increased') bits.push('increased shedding noted');
  if (ctx.pregnantOrPostpartum) bits.push('postpartum');
  if (bits.length === 0) return null;
  return bits.join(' · ');
}

export function isProfileComplete(m: MedicalProfile | undefined | null): boolean {
  if (!m) return false;
  return (
    m.age !== null &&
    m.sex !== null &&
    m.familyHistory !== null
  );
}
