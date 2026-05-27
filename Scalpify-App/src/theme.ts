// Scalpify clinical-light theme.
// Light, calm, medical-grade. Cards float on a pale sky background.
export const colors = {
  // Surfaces
  bg: '#EEF4FB',
  bgElev: '#F6FAFE',
  card: '#FFFFFF',
  cardElev: '#F1F6FC',
  cardSubtle: '#F4F8FD',
  border: '#E5ECF4',
  borderSoft: '#EDF2F8',

  // Brand
  primary: '#0E5AC8',
  primaryDeep: '#0848A4',
  primaryDim: '#5D8FE0',
  primarySoft: '#E3EEFB',
  primaryGlow: 'rgba(14,90,200,0.16)',

  // Status / accents
  success: '#16A34A',
  successSoft: '#D7F3DE',
  successText: '#0F7A37',

  warning: '#E07A1F',
  warningSoft: '#FCE5C9',

  danger: '#DC2626',
  dangerSoft: '#FDE2E2',
  dangerText: '#B02323',

  // Text
  text: '#0E1B2C',
  textStrong: '#06101C',
  textMuted: '#5D6B7C',
  textDim: '#94A3B8',
  textFaint: '#B7C2CE',
  onPrimary: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, color: colors.textStrong },
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.textStrong },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.textStrong },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  bodyMuted: { fontSize: 15, color: colors.textMuted },
  small: { fontSize: 13, color: colors.textMuted },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
};

// Soft elevation profile for white cards on the pale-blue background.
export const shadow = {
  card: {
    shadowColor: '#0E1B2C',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardStrong: {
    shadowColor: '#0E1B2C',
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};
