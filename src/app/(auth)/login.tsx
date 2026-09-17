import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';

import { ZemiLogo } from '@/components/shared/ZemiLogo';
import { theme, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { validatePassword, validatePhone } from '@/lib/auth/validation';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setSubmitting(true);
    const result = await signIn({ phone, password });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <ZemiLogo size="title" />

        <Text style={styles.label}>Numéro de téléphone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Ex. 97 00 00 00"
          placeholderTextColor={theme.colors.grey}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Votre mot de passe"
          placeholderTextColor={theme.colors.grey}
          secureTextEntry
          autoCapitalize="none"
          editable={!submitting}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={theme.colors.ink} />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.linkWrap} disabled={submitting}>
            <Text style={styles.link}>Pas encore de compte ? S&apos;inscrire</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  label: {
    ...typography('caption'),
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    ...typography('body'),
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + theme.spacing.xs,
    color: theme.colors.ink,
    backgroundColor: theme.colors.bg,
    marginBottom: theme.spacing.sm,
  },
  error: {
    ...typography('body'),
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.amber,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography('subtitle'),
    color: theme.colors.ink,
  },
  linkWrap: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  link: {
    ...typography('body'),
    color: theme.colors.green,
  },
});
