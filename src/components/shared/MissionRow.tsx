import { Pressable, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { Amount } from '@/components/ui/Amount';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/constants/theme';

export interface MissionRowProps {
  kind: 'ride' | 'delivery';
  fromLabel: string;
  toLabel: string;
  amount: number;
  status: string;
  statusLabel: string;
  date: string;
  badge?: string;
  onPress: () => void;
}

function formatMissionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(d);
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${day} · ${time}`;
}

function statusTone(
  status: string,
  statusLabel: string,
): 'done' | 'active' | 'bad' {
  const raw = `${status} ${statusLabel}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    raw.includes('termine') ||
    raw.includes('livree') ||
    raw.includes('livre') ||
    raw.includes('completed') ||
    raw.includes('delivered')
  ) {
    return 'done';
  }

  if (
    raw.includes('annul') ||
    raw.includes('echou') ||
    raw.includes('cancelled') ||
    raw.includes('failed')
  ) {
    return 'bad';
  }

  return 'active';
}

/**
 * Rangée mission (course / livraison) pour l'activité client.
 */
export function MissionRow({
  kind,
  fromLabel,
  toLabel,
  amount,
  status,
  statusLabel,
  date,
  badge,
  onPress,
}: MissionRowProps) {
  const theme = useTheme();
  const tone = statusTone(status, statusLabel);

  const pillBg =
    tone === 'done'
      ? theme.colors.green100
      : tone === 'bad'
        ? theme.colors.dangerSoft
        : theme.colors.amber100;
  const pillColor =
    tone === 'done'
      ? theme.colors.green700
      : tone === 'bad'
        ? theme.colors.brick
        : theme.colors.amber900;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        opacity: pressed ? 0.92 : 1,
      })}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
            alignItems: 'center',
          }}>
          <Badge
            label={kind === 'ride' ? 'Course' : 'Colis'}
            variant={kind === 'ride' ? 'success' : 'amber'}
          />
          {badge ? <Badge label={badge} variant="amberSolid" /> : null}
        </View>
        <Amount value={amount} size="md" tone="green" currencySuffix="F" />
      </View>

      <View style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: theme.layout.routeDot,
              height: theme.layout.routeDot,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.green500,
              marginRight: theme.spacing.md,
            }}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textPrimary,
            }}>
            {fromLabel}
          </Text>
        </View>

        <View
          style={{
            width: 1,
            height: theme.layout.routeDashHeight,
            borderStyle: 'dashed',
            borderLeftWidth: 1,
            borderColor: theme.colors.border,
            marginLeft: theme.layout.routeDot / 2 - 0.5,
            marginVertical: theme.spacing.xs / 2,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MapPin
            size={theme.icon.size}
            color={theme.colors.brick}
            strokeWidth={theme.icon.strokeWidth}
            style={{ marginRight: theme.spacing.sm }}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textPrimary,
            }}>
            {toLabel}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
        }}>
        <Text
          style={{
            flex: 1,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.layout.chatContextSize,
            color: theme.colors.textSecondary,
          }}>
          {formatMissionDate(date)}
        </Text>
        <View
          style={{
            backgroundColor: pillBg,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs / 2,
            minHeight: theme.layout.statusPillMinHeight,
            justifyContent: 'center',
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: theme.layout.chatContextSize,
              color: pillColor,
            }}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
