/**
 * Compat. : réexporte le logo UI pour les imports `@/components/shared/ZemiLogo`.
 */
import { ZemiLogo as UiZemiLogo } from '@/components/ui/ZemiLogo';

interface LegacyProps {
  size?: 'display' | 'title';
}

export function ZemiLogo({ size = 'display' }: LegacyProps) {
  return <UiZemiLogo legacySize={size} variant="onLight" showTagline />;
}
