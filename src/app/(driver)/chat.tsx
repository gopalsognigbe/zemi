import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ChatConversation } from '@/components/chat/ChatConversation';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/constants/theme';
import type { ChatThreadType } from '@/lib/chat/chatApi';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function DriverChatScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    threadType?: string | string[];
    threadId?: string | string[];
    receiverId?: string | string[];
    name?: string | string[];
    avatarUrl?: string | string[];
  }>();

  const threadType = param(params.threadType) as ChatThreadType | undefined;
  const threadId = param(params.threadId);
  const receiverId = param(params.receiverId);
  const name = param(params.name);
  const avatarUrl = param(params.avatarUrl);

  const valid =
    (threadType === 'ride' || threadType === 'delivery') &&
    Boolean(threadId) &&
    Boolean(receiverId) &&
    Boolean(name?.trim());

  if (!valid) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.bg,
          padding: theme.spacing.xl,
          gap: theme.spacing.md,
        }}>
        <Text
          style={{
            fontFamily: theme.fonts.jakartaRegular,
            color: theme.colors.textSecondary,
            textAlign: 'center',
          }}>
          Conversation introuvable.
        </Text>
        <Button label="Retour" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ChatConversation
      threadType={threadType!}
      threadId={threadId!}
      receiverId={receiverId!}
      receiverName={name!.trim()}
      receiverAvatarUrl={avatarUrl}
      contextLabel={
        threadType === 'ride' ? 'Course en cours' : 'Livraison en cours'
      }
    />
  );
}
