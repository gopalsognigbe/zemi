/**
 * ZEMi — charte graphique (source unique de vérité).
 * Valeurs exactes du design validé. Aucune couleur / taille en dur ailleurs.
 */

import { useContext } from 'react';
import { useColorScheme } from 'react-native';

import { ThemePreferenceContext } from '@/context/ThemePreferenceContext';

/** Noms de familles chargés via useFonts (voir src/app/_layout.tsx). */
export const fonts = {
  balooBold: 'Baloo2-Bold',
  balooSemiBold: 'Baloo2-SemiBold',
  poppinsMedium: 'Poppins-Medium',
  poppinsSemiBold: 'Poppins-SemiBold',
  poppinsBold: 'Poppins-Bold',
  jakartaRegular: 'PlusJakartaSans-Regular',
  jakartaMedium: 'PlusJakartaSans-Medium',
  jakartaSemiBold: 'PlusJakartaSans-SemiBold',
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

const radius = {
  sm: 9,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
  /** Alias compat. */
  full: 999,
} as const;

const shadow = {
  soft: {
    shadowColor: '#20241F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Alias compat. */
  card: {
    shadowColor: '#20241F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

/** Tailles de composition (splash, accueil, onglets). */
const layout = {
  splashMark: 180,
  splashTitle: 52,
  splashTaglineOpacity: 0.7,
  splashFooterOpacity: 0.45,
  homeAvatar: 48,
  homeGreeting: 20,
  homeGreetingSubOpacity: 0.75,
  homeWalletAmount: 30,
  homeMapHeight: 150,
  homeActionHeight: 155,
  homeActionIcon: 26,
  homeActionTitle: 17,
  homeActionSubtitle: 12,
  homeCaption: 13,
  touchMin: 48,
  tabLabel: 11,
  skeletonHeight: 36,
  locationRowHeight: 52,
  paymentOptionHeight: 56,
  confirmButtonHeight: 56,
  backFab: 44,
  panelTopRadius: 26,
  panelTitle: 18,
  rideMapRatio: 0.42,
  deliveryMapRatio: 0.32,
  photoThumb: 90,
  polylineWidth: 3,
  statusPillHeight: 40,
  driverAvatar: 52,
  driverActionBtn: 52,
  driverNameSize: 17,
  ratingStarSize: 36,
  packageThumbSmall: 56,
  mapPanelClearance: 220,
  chatHeaderHeight: 64,
  chatAvatar: 40,
  chatBackBtn: 40,
  chatBubbleMaxRatio: 0.78,
  chatBubbleRadius: 16,
  chatBubbleTail: 4,
  chatSendBtn: 48,
  chatEmptyIcon: 40,
  chatTimeSize: 11,
  chatNameSize: 16,
  chatContextSize: 12,
  driverToggleHeight: 92,
  driverToggleIcon: 28,
  driverToggleTitle: 20,
  driverStatsValue: 24,
  driverMissionPayout: 22,
  driverAcceptHeight: 60,
  driverAcceptLabel: 16,
  driverPrimaryHeight: 64,
  driverPrimaryLabel: 17,
  driverPackageThumb: 64,
  driverTouchMain: 56,
  driverEmptyIcon: 40,
  driverMissionTitle: 17,
  balanceAmount: 34,
  balanceActionHeight: 52,
  balanceLabelSize: 11,
  balanceLabelLetterSpacing: 1.6,
  emptyIconCircle: 72,
  emptyIcon: 28,
  emptyTitle: 16,
  txIconCircle: 44,
  profileAvatar: 72,
  ratingsAvg: 40,
  sectionTitle: 17,
  activityTitle: 22,
  routeDot: 12,
  routeDashHeight: 16,
  statusPillMinHeight: 24,
  appearanceOptionHeight: 48,
  overlayOpacity: 0.4,
  codeDigitSize: 32,
  codeDigitBox: 56,
  codeDigitGap: 10,
  codeLabelSize: 11,
  codeLabelLetterSpacing: 1.4,
} as const;

/** Icônes Lucide — style par défaut du design. */
export const iconDefaults = {
  size: 22,
  strokeWidth: 2,
} as const;

type ColorPalette = {
  green100: string;
  green300: string;
  green500: string;
  green700: string;
  green900: string;
  amber100: string;
  amber300: string;
  amber500: string;
  amber700: string;
  amber900: string;
  orange: string;
  brick: string;
  bg: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  white: string;
  black: string;
  // Alias compat. écrans existants
  green: string;
  greenDark: string;
  amber: string;
  amberSoft: string;
  ink: string;
  grey: string;
  line: string;
  danger: string;
  dangerSoft: string;
};

const lightColors: ColorPalette = {
  green100: '#D8ECE0',
  green300: '#4FA37B',
  green500: '#1A6E4A',
  green700: '#0F4D33',
  green900: '#06301F',
  amber100: '#FDF0C9',
  amber300: '#FAD65E',
  amber500: '#F5B301',
  amber700: '#D9930A',
  amber900: '#A66A00',
  orange: '#F26A1B',
  brick: '#C23A22',
  bg: '#F7F3EA',
  surface: '#FFFFFF',
  border: '#E6E0D3',
  textPrimary: '#20241F',
  textSecondary: '#5B6158',
  white: '#FFFFFF',
  black: '#000000',
  // Alias → tokens clairs
  green: '#0F4D33',
  greenDark: '#06301F',
  amber: '#F5B301',
  amberSoft: '#FDF0C9',
  ink: '#20241F',
  grey: '#5B6158',
  line: '#E6E0D3',
  danger: '#C23A22',
  dangerSoft: '#FCE8E4',
};

const darkColors: ColorPalette = {
  green100: '#D8ECE0',
  green300: '#4FA37B',
  green500: '#1A6E4A',
  green700: '#0F4D33',
  green900: '#06301F',
  amber100: '#FDF0C9',
  amber300: '#FAD65E',
  amber500: '#F5B301',
  amber700: '#D9930A',
  amber900: '#A66A00',
  orange: '#F26A1B',
  brick: '#C23A22',
  bg: '#0B1712',
  surface: '#1E3529',
  border: '#245B43',
  textPrimary: '#F4F4F1',
  textSecondary: '#A2A79B',
  white: '#FFFFFF',
  black: '#000000',
  // Alias → tokens sombres (verts/ambres vifs)
  green: '#4FA37B',
  greenDark: '#D8ECE0',
  amber: '#F5B301',
  amberSoft: '#1E3529',
  ink: '#F4F4F1',
  grey: '#A2A79B',
  line: '#245B43',
  danger: '#C23A22',
  dangerSoft: '#3A221E',
};

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'caption'
  | 'amount'
  | 'button';

function buildTypography(colors: ColorPalette) {
  return {
    display: {
      fontFamily: fonts.balooBold,
      fontSize: 28,
      lineHeight: 34,
      color: colors.textPrimary,
    },
    title: {
      fontFamily: fonts.poppinsSemiBold,
      fontSize: 21,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    subtitle: {
      fontFamily: fonts.poppinsSemiBold,
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    body: {
      fontFamily: fonts.jakartaRegular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    label: {
      fontFamily: fonts.jakartaMedium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    caption: {
      fontFamily: fonts.jakartaRegular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    amount: {
      fontFamily: fonts.poppinsBold,
      fontSize: 26,
      lineHeight: 32,
      color: colors.textPrimary,
    },
    button: {
      fontFamily: fonts.poppinsSemiBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
  } as const;
}

function createTheme(colors: ColorPalette, mode: 'light' | 'dark') {
  return {
    mode,
    colors,
    fonts,
    spacing,
    radius,
    shadow,
    layout,
    icon: iconDefaults,
    typography: buildTypography(colors),
  } as const;
}

export const lightTheme = createTheme(lightColors, 'light');
export const darkTheme = createTheme(darkColors, 'dark');

/** Alias thème clair — ne casse pas les écrans existants. */
export const theme = lightTheme;

export type Theme = typeof lightTheme;

/**
 * Renvoie le thème selon la préférence (système / clair / sombre).
 * Par défaut « system » — même comportement qu’avant.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const { preference } = useContext(ThemePreferenceContext);
  const mode =
    preference === 'light'
      ? 'light'
      : preference === 'dark'
        ? 'dark'
        : scheme === 'dark'
          ? 'dark'
          : 'light';
  return mode === 'dark' ? darkTheme : lightTheme;
}

/**
 * Helper StyleSheet : styles typographiques du thème clair
 * (compat. avec les écrans qui appellent typography('body')).
 */
export function typography(variant: TypographyVariant) {
  const style = lightTheme.typography[variant];
  const { color: _c, ...rest } = style;
  return rest;
}
