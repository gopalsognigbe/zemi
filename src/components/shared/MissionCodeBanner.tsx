import { Text, View } from 'react-native';

import { useTheme } from '@/constants/theme';

export interface MissionCodeBannerProps {
  label: string;
  code: string;
  hint: string;
}

/**
 * Encadré code de départ / livraison (côté client ou expéditeur uniquement).
 */
export function MissionCodeBanner({
  label,
  code,
  hint,
}: MissionCodeBannerProps) {
  const theme = useTheme();
  const digits = code.replace(/\D/g, '').padStart(4, '0').slice(0, 4);

  return (
    <View
      style={{
        backgroundColor: theme.colors.amber100,
        borderWidth: 1.5,
        borderColor: theme.colors.amber300,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        alignItems: 'center',
      }}>
      <Text
        style={{
          fontFamily: theme.fonts.jakartaMedium,
          fontSize: theme.layout.codeLabelSize,
          letterSpacing: theme.layout.codeLabelLetterSpacing,
          textTransform: 'uppercase',
          color: theme.colors.amber900,
          marginBottom: theme.spacing.sm,
        }}>
        {label}
      </Text>

      <Text
        style={{
          fontFamily: theme.fonts.poppinsBold,
          fontSize: theme.layout.codeDigitSize,
          lineHeight: theme.layout.codeDigitSize + theme.spacing.sm,
          letterSpacing: theme.spacing.lg,
          color: theme.colors.green900,
          marginBottom: theme.spacing.sm,
        }}>
        {digits.split('').join(' ')}
      </Text>

      <Text
        style={{
          fontFamily: theme.fonts.jakartaRegular,
          fontSize: theme.layout.homeCaption,
          lineHeight: theme.typography.caption.lineHeight + 2,
          color: theme.colors.amber900,
          textAlign: 'center',
        }}>
        {hint}
      </Text>
    </View>
  );
}
