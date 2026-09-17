import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/constants/theme';

/**
 * Symbole ZEMi : deux points, une trajectoire (ancrage → nœud en mouvement).
 */
export function ZemiTrajectoryMark() {
  const theme = useTheme();
  const size = theme.layout.splashMark;

  return (
    <Svg width={size} height={size} viewBox="0 0 180 180" accessibilityRole="image">
      {/* Disque de fond discret */}
      <Circle
        cx="90"
        cy="90"
        r="78"
        fill={theme.colors.green500}
        opacity={0.28}
      />
      {/* Point d'ancrage (départ) */}
      <Circle cx="46" cy="132" r="9" fill={theme.colors.green500} />
      {/* Trajectoire ambre */}
      <Path
        d="M 46 132 C 70 95, 95 48, 138 52"
        stroke={theme.colors.amber500}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      {/* Nœud en mouvement */}
      <Circle cx="138" cy="52" r="11" fill={theme.colors.amber500} />
    </Svg>
  );
}
