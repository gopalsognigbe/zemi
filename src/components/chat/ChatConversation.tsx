import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage, ChatThreadType } from '@/lib/chat/chatApi';

export interface ChatConversationProps {
  threadType: ChatThreadType;
  threadId: string;
  receiverId: string;
  receiverName: string;
  receiverAvatarUrl?: string;
  contextLabel?: string;
}

const CLIENT_QUICK = [
  'Je suis prêt',
  "J'arrive dans 2 minutes",
  'Où êtes-vous ?',
  'Merci !',
] as const;

const DRIVER_QUICK = [
  'Je suis arrivé',
  "J'arrive dans 5 minutes",
  "Je ne trouve pas l'adresse",
  'En route',
] as const;

type ListItem =
  | { kind: 'date'; id: string; label: string }
  | {
      kind: 'message';
      id: string;
      message: ChatMessage;
      mine: boolean;
      showTime: boolean;
      isLastOutgoing: boolean;
    };

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

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startMsg.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';

  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function SkeletonBubbles() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const widths: Array<`${number}%`> = ['55%', '70%', '45%'];

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        gap: theme.spacing.md,
      }}>
      {widths.map((w, i) => (
        <Animated.View
          key={i}
          style={{
            opacity,
            alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
            width: w,
            height: theme.spacing.xxl + theme.spacing.md,
            borderRadius: theme.layout.chatBubbleRadius,
            backgroundColor: theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Conversation partagée client / zem (bulles, réponses rapides, saisie).
 */
export function ChatConversation({
  threadType,
  threadId,
  receiverId,
  receiverName,
  receiverAvatarUrl,
  contextLabel,
}: ChatConversationProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const {
    messages,
    loading,
    sending,
    send,
    error,
    clearError,
    retryPayload,
  } = useChat(threadType, threadId, receiverId, profile?.id);

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ListItem>>(null);
  const screenWidth = Dimensions.get('window').width;
  const bubbleMax = screenWidth * theme.layout.chatBubbleMaxRatio;

  const quickReplies =
    profile?.role === 'driver' ? DRIVER_QUICK : CLIENT_QUICK;

  const listItems = useMemo((): ListItem[] => {
    const chronological = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const lastOutgoingId = [...chronological]
      .reverse()
      .find((m) => m.senderId === profile?.id)?.id;

    const items: ListItem[] = [];
    let prevDay: string | null = null;

    chronological.forEach((message, index) => {
      const key = dayKey(message.createdAt);
      if (key !== prevDay) {
        items.push({
          kind: 'date',
          id: `date-${key}`,
          label: formatDateLabel(message.createdAt),
        });
        prevDay = key;
      }

      const next = chronological[index + 1];
      const sameNext =
        Boolean(next) &&
        next!.senderId === message.senderId &&
        dayKey(next!.createdAt) === key;
      const showTime = !sameNext;
      const mine = message.senderId === profile?.id;

      items.push({
        kind: 'message',
        id: message.id,
        message,
        mine,
        showTime,
        isLastOutgoing: message.id === lastOutgoingId,
      });
    });

    // FlatList inversée : les plus récents en premier
    return items.reverse();
  }, [messages, profile?.id]);

  const handleSend = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || sending) return;
      setDraft('');
      clearError();
      await send(trimmed);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    },
    [send, sending, clearError],
  );

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      {/* En-tête */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        }}>
        <View
          style={{
            minHeight: theme.layout.chatHeaderHeight,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: Math.max(
                theme.layout.chatBackBtn,
                theme.layout.touchMin,
              ),
              height: Math.max(
                theme.layout.chatBackBtn,
                theme.layout.touchMin,
              ),
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.bg,
              opacity: pressed ? 0.75 : 1,
            })}>
            <ArrowLeft
              size={theme.icon.size}
              color={theme.colors.textPrimary}
              strokeWidth={theme.icon.strokeWidth}
            />
          </Pressable>

          {receiverAvatarUrl ? (
            <Image
              source={{ uri: receiverAvatarUrl }}
              style={{
                width: theme.layout.chatAvatar,
                height: theme.layout.chatAvatar,
                borderRadius: theme.radius.pill,
                marginLeft: theme.spacing.md,
                backgroundColor: theme.colors.green100,
              }}
            />
          ) : (
            <View
              style={{
                width: theme.layout.chatAvatar,
                height: theme.layout.chatAvatar,
                borderRadius: theme.radius.pill,
                marginLeft: theme.spacing.md,
                backgroundColor: theme.colors.green100,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  fontFamily: theme.fonts.poppinsSemiBold,
                  fontSize: theme.layout.homeCaption,
                  color: theme.colors.green700,
                }}>
                {initials(receiverName)}
              </Text>
            </View>
          )}

          <View style={{ flex: 1, marginLeft: theme.spacing.md, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts.poppinsSemiBold,
                fontSize: theme.layout.chatNameSize,
                lineHeight: theme.layout.chatNameSize + theme.spacing.sm,
                color: theme.colors.textPrimary,
              }}>
              {receiverName}
            </Text>
            {contextLabel ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: theme.fonts.jakartaRegular,
                  fontSize: theme.layout.chatContextSize,
                  color: theme.colors.textSecondary,
                }}>
                {contextLabel}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Erreur d'envoi */}
      {error && retryPayload ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.amber100,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.brick,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            gap: theme.spacing.md,
          }}>
          <Text
            style={{
              flex: 1,
              fontFamily: theme.fonts.jakartaMedium,
              fontSize: theme.typography.caption.fontSize,
              color: theme.colors.brick,
            }}>
            Message non envoyé. Réessayez.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleSend(retryPayload)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaSemiBold,
                fontSize: theme.typography.caption.fontSize,
                color: theme.colors.green700,
                textDecorationLine: 'underline',
              }}>
              Réessayer
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <SkeletonBubbles />
      ) : (
        <FlatList
          ref={listRef}
          data={listItems}
          inverted
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            flexGrow: 1,
            justifyContent:
              listItems.length === 0 ? 'center' : 'flex-start',
          }}
          ListEmptyComponent={
            <View
              style={{
                alignItems: 'center',
                paddingVertical: theme.spacing.xxl,
                transform: [{ scaleY: -1 }],
              }}>
              <MessageCircle
                size={theme.layout.chatEmptyIcon}
                color={theme.colors.textSecondary}
                strokeWidth={theme.icon.strokeWidth}
              />
              <Text
                style={{
                  marginTop: theme.spacing.md,
                  fontFamily: theme.fonts.poppinsSemiBold,
                  fontSize: theme.typography.label.fontSize,
                  color: theme.colors.textPrimary,
                  textAlign: 'center',
                }}>
                Aucun message pour l&apos;instant
              </Text>
              <Text
                style={{
                  marginTop: theme.spacing.sm,
                  fontFamily: theme.fonts.jakartaRegular,
                  fontSize: theme.typography.caption.fontSize,
                  color: theme.colors.textSecondary,
                  textAlign: 'center',
                  paddingHorizontal: theme.spacing.xl,
                }}>
                Écrivez pour échanger avec votre correspondant.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            if (item.kind === 'date') {
              return (
                <View
                  style={{
                    alignItems: 'center',
                    marginVertical: theme.spacing.md,
                  }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.green100,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.xs,
                    }}>
                    <Text
                      style={{
                        fontFamily: theme.fonts.jakartaMedium,
                        fontSize: theme.layout.chatContextSize,
                        color: theme.colors.green700,
                      }}>
                      {item.label}
                    </Text>
                  </View>
                </View>
              );
            }

            const nextItem = listItems[index + 1];
            const tight =
              nextItem?.kind === 'message' &&
              nextItem.message.senderId === item.message.senderId;

            return (
              <View
                style={{
                  alignItems: item.mine ? 'flex-end' : 'flex-start',
                  marginBottom: tight
                    ? theme.spacing.xs
                    : theme.spacing.md,
                }}>
                <View
                  style={{
                    maxWidth: bubbleMax,
                    backgroundColor: item.mine
                      ? theme.colors.green700
                      : theme.colors.surface,
                    borderWidth: item.mine ? 0 : 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.layout.chatBubbleRadius,
                    borderBottomRightRadius: item.mine
                      ? theme.layout.chatBubbleTail
                      : theme.layout.chatBubbleRadius,
                    borderBottomLeftRadius: item.mine
                      ? theme.layout.chatBubbleRadius
                      : theme.layout.chatBubbleTail,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm + 2,
                  }}>
                  <Text
                    style={{
                      fontFamily: theme.fonts.jakartaRegular,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                      color: item.mine
                        ? theme.colors.white
                        : theme.colors.textPrimary,
                    }}>
                    {item.message.body}
                  </Text>
                </View>
                {item.showTime ? (
                  <Text
                    style={{
                      marginTop: theme.spacing.xs,
                      fontFamily: theme.fonts.jakartaRegular,
                      fontSize: theme.layout.chatTimeSize,
                      color: theme.colors.textSecondary,
                      opacity: item.mine
                        ? theme.layout.splashTaglineOpacity
                        : 1,
                    }}>
                    {formatTime(item.message.createdAt)}
                    {item.isLastOutgoing
                      ? item.message.readAt
                        ? ' · Lu'
                        : ' · Envoyé'
                      : ''}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
      )}

      {/* Réponses rapides */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.sm,
        }}
        style={{
          flexGrow: 0,
          backgroundColor: theme.colors.bg,
        }}>
        {quickReplies.map((label) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            disabled={sending}
            onPress={() => void handleSend(label)}
            style={({ pressed }) => ({
              minHeight: theme.layout.touchMin,
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.green100,
              opacity: sending ? 0.5 : pressed ? 0.8 : 1,
            })}>
            <Text
              style={{
                fontFamily: theme.fonts.jakartaMedium,
                fontSize: theme.layout.homeCaption,
                color: theme.colors.green700,
              }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Zone de saisie */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.sm,
        }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Écrire un message…"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={1000}
          style={{
            flex: 1,
            minHeight: theme.layout.chatSendBtn,
            maxHeight: theme.layout.chatSendBtn + theme.spacing.xxl,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.bg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            fontFamily: theme.fonts.jakartaRegular,
            fontSize: theme.typography.body.fontSize,
            lineHeight: theme.typography.body.lineHeight,
            color: theme.colors.textPrimary,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          disabled={!canSend}
          onPress={() => void handleSend(draft)}
          style={({ pressed }) => ({
            width: theme.layout.chatSendBtn,
            height: theme.layout.chatSendBtn,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.amber500,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canSend ? 0.4 : pressed ? 0.85 : 1,
          })}>
          {sending ? (
            <ActivityIndicator color={theme.colors.green900} />
          ) : (
            <Send
              size={theme.icon.size}
              color={theme.colors.green900}
              strokeWidth={theme.icon.strokeWidth}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
