import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { MapPin, MessageCircle, Phone } from 'lucide-react-native';

import { Amount } from '@/components/ui/Amount';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/constants/theme';
import { callNumber } from '@/lib/contact/contact';

export interface ActiveMissionClient {
  id: string;
  fullName: string;
  phone?: string | null;
}

export interface ActiveMissionPanelProps {
  kind: 'ride' | 'delivery';
  express?: boolean;
  payout: number;
  fromLabel: string;
  toLabel: string;
  client: ActiveMissionClient | null;
  clientLoading?: boolean;
  packagePhotoUrl?: string | null;
  packageDescription?: string | null;
  recipientPhone?: string | null;
  primaryLabel: string;
  busy?: boolean;
  requiresConfirm?: boolean;
  onPrimaryAction: () => void;
  onMessage: () => void;
  onCall?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const a = parts[0]?.[0] ?? '';
  const b =
    parts.length > 1
      ? (parts[parts.length - 1]?.[0] ?? '')
      : (parts[0]?.[1] ?? '');
  return `${a}${b}`.toUpperCase();
}

/**
 * Panneau exclusif pendant une mission active.
 */
export function ActiveMissionPanel({
  kind,
  express = false,
  payout,
  fromLabel,
  toLabel,
  client,
  clientLoading = false,
  packagePhotoUrl,
  packageDescription,
  recipientPhone,
  primaryLabel,
  busy = false,
  requiresConfirm = false,
  onPrimaryAction,
  onMessage,
  onCall,
}: ActiveMissionPanelProps) {
  const theme = useTheme();
  const canCallClient = Boolean(client?.phone?.trim()) && Boolean(onCall);

  function handlePrimary() {
    if (requiresConfirm) {
      Alert.alert('Confirmer', `Confirmer : ${primaryLabel.toLowerCase()} ?`, [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: onPrimaryAction,
        },
      ]);
      return;
    }
    onPrimaryAction();
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
        ...theme.shadow.soft,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}>
          <Badge
            label={kind === 'ride' ? 'Course' : 'Colis'}
            variant={kind === 'ride' ? 'success' : 'amber'}
          />
          {express ? <Badge label="Express" variant="amberSolid" /> : null}
        </View>
        <Amount
          value={payout}
          size="mission"
          tone="green"
          currencySuffix="F"
        />
      </View>

      {/* Client */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: theme.layout.driverActionBtn,
            height: theme.layout.driverActionBtn,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.green100,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}>
          <Text
            style={{
              fontFamily: theme.fonts.poppinsSemiBold,
              fontSize: theme.typography.label.fontSize,
              color: theme.colors.green700,
            }}>
            {clientLoading ? '…' : initials(client?.fullName ?? 'Client')}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: theme.fonts.poppinsSemiBold,
            fontSize: theme.layout.chatNameSize,
            color: theme.colors.textPrimary,
            marginRight: theme.spacing.md,
          }}>
          {clientLoading
            ? 'Chargement…'
            : (client?.fullName ?? 'Client ZEMi')}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Message"
          onPress={onMessage}
          style={({ pressed }) => ({
            width: theme.layout.driverActionBtn,
            height: theme.layout.driverActionBtn,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.green100,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: canCallClient ? theme.spacing.sm : 0,
            opacity: pressed ? 0.85 : 1,
          })}>
          <MessageCircle
            size={theme.icon.size + 2}
            color={theme.colors.green700}
            strokeWidth={theme.icon.strokeWidth}
          />
        </Pressable>

        {canCallClient ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Appeler le client"
            onPress={onCall}
            style={({ pressed }) => ({
              width: theme.layout.driverActionBtn,
              height: theme.layout.driverActionBtn,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.amber500,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}>
            <Phone
              size={theme.icon.size + 2}
              color={theme.colors.green900}
              strokeWidth={theme.icon.strokeWidth}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Trajet */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: theme.spacing.md,
              height: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.green500,
              marginRight: theme.spacing.md,
            }}
          />
          <Text
            numberOfLines={2}
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
            width: 2,
            height: theme.spacing.lg,
            borderStyle: 'dashed',
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginLeft: theme.spacing.sm - 1,
            marginVertical: theme.spacing.xs,
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
            numberOfLines={2}
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

      {/* Colis */}
      {kind === 'delivery' ? (
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            {packagePhotoUrl ? (
              <Image
                source={{ uri: packagePhotoUrl }}
                style={{
                  width: theme.layout.driverPackageThumb,
                  height: theme.layout.driverPackageThumb,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.border,
                }}
              />
            ) : null}
            <Text
              numberOfLines={3}
              style={{
                flex: 1,
                fontFamily: theme.fonts.jakartaRegular,
                fontSize: theme.typography.body.fontSize,
                color: theme.colors.textPrimary,
              }}>
              {packageDescription?.trim() || 'Colis sans description'}
            </Text>
          </View>

          {recipientPhone ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.colors.bg,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
              <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                <Text
                  style={{
                    fontFamily: theme.fonts.jakartaMedium,
                    fontSize: theme.layout.tabLabel,
                    color: theme.colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>
                  Destinataire
                </Text>
                <Text
                  style={{
                    marginTop: theme.spacing.xs,
                    fontFamily: theme.fonts.poppinsSemiBold,
                    fontSize: theme.typography.label.fontSize,
                    color: theme.colors.textPrimary,
                  }}>
                  {recipientPhone}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Appeler le destinataire"
                onPress={() => void callNumber(recipientPhone)}
                style={({ pressed }) => ({
                  width: theme.layout.driverActionBtn,
                  height: theme.layout.driverActionBtn,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.amber500,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}>
                <Phone
                  size={theme.icon.size + 2}
                  color={theme.colors.green900}
                  strokeWidth={theme.icon.strokeWidth}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={handlePrimary}
        style={({ pressed }) => ({
          minHeight: theme.layout.driverPrimaryHeight,
          height: theme.layout.driverPrimaryHeight,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.green700,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy ? 0.6 : pressed ? 0.9 : 1,
        })}>
        {busy ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <Text
            style={{
              fontFamily: theme.fonts.poppinsBold,
              fontSize: theme.layout.driverPrimaryLabel,
              color: theme.colors.white,
              textTransform: 'uppercase',
              textAlign: 'center',
              paddingHorizontal: theme.spacing.md,
            }}>
            {primaryLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
