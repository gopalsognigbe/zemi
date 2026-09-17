import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ShieldCheck, Star } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/constants/theme';

export interface RatingBlockProps {
  title: string;
  onSubmit: (stars: number, remark: string) => void;
  submitting: boolean;
  submitted: boolean;
  error?: string | null;
  onGoHome: () => void;
}

/**
 * Bloc de notation post-mission (étoiles Lucide + remarque).
 */
export function RatingBlock({
  title,
  onSubmit,
  submitting,
  submitted,
  error,
  onGoHome,
}: RatingBlockProps) {
  const theme = useTheme();
  const [stars, setStars] = useState(0);
  const [remark, setRemark] = useState('');

  if (submitted) {
    return (
      <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
        <ShieldCheck
          size={theme.spacing.xxl + theme.spacing.sm}
          color={theme.colors.green500}
          strokeWidth={theme.icon.strokeWidth}
        />
        <Text
          style={{
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.layout.panelTitle,
            color: theme.colors.textPrimary,
            textAlign: 'center',
          }}>
          Merci pour votre retour !
        </Text>
        <Button label="Retour à l'accueil" onPress={onGoHome} />
      </View>
    );
  }

  return (
    <View>
      <Text
        style={{
          fontFamily: theme.fonts.poppinsSemiBold,
          fontSize: theme.layout.panelTitle,
          lineHeight: theme.layout.panelTitle + theme.spacing.sm,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.md,
          textAlign: 'center',
        }}>
        {title}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
        }}>
        {[1, 2, 3, 4, 5].map((value) => {
          const on = value <= stars;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => setStars(value)}
              style={({ pressed }) => ({
                minWidth: theme.layout.touchMin,
                minHeight: theme.layout.touchMin,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}>
              <Star
                size={theme.layout.ratingStarSize}
                color={
                  on ? theme.colors.amber500 : theme.colors.textSecondary
                }
                fill={on ? theme.colors.amber500 : 'transparent'}
                strokeWidth={theme.icon.strokeWidth}
              />
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Laisser une remarque (facultatif)"
        value={remark}
        onChangeText={setRemark}
        placeholder="Ex. Trajet agréable, ponctuel…"
        multiline
        editable={!submitting}
      />

      {error ? (
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            color: theme.colors.brick,
            marginBottom: theme.spacing.sm,
            textAlign: 'center',
          }}>
          {error}
        </Text>
      ) : null}

      <Button
        label="Envoyer ma note"
        variant="amber"
        loading={submitting}
        disabled={stars < 1 || submitting}
        onPress={() => onSubmit(stars, remark.trim())}
      />
    </View>
  );
}
