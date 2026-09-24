/** Sign in, create an account, or see the account and its sync state — in Youssef's bottom sheet. */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircleIcon, CloudArrowUpIcon, ExclamationTriangleIcon, UserCircleIcon } from 'react-native-heroicons/outline';
import ElasticPressable from '../components/ElasticPressable';
import SwipeableBottomSheet from '../components/SwipeableBottomSheet';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { useAccount } from './AccountContext';

function Field({ value, onChangeText, placeholder, secure, keyboardType, autoComplete, onSubmitEditing }) {
  const { colors, type, isRTL } = usePreferences();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      onSubmitEditing={onSubmitEditing}
      selectionColor={colors.accent}
      style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.cardButton, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}
    />
  );
}

function Button({ label, onPress, busy, ghost, disabled }) {
  const { colors, type } = usePreferences();
  return (
    <ElasticPressable shape="pill" onPress={onPress} disabled={busy || disabled} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.button, { backgroundColor: ghost ? colors.cardButton : colors.accent, opacity: disabled ? 0.5 : 1 }]}>
        {busy ? <ActivityIndicator color={ghost ? colors.textPrimary : colors.white} /> : (
          <Text style={[{ color: ghost ? colors.textPrimary : colors.white }, type(14, 'bold', 18)]}>{label}</Text>
        )}
      </View>
    </ElasticPressable>
  );
}

function syncLine(sync, t) {
  if (sync.state === 'saving') return { icon: CloudArrowUpIcon, text: t('syncSaving') };
  if (sync.state === 'offline') return { icon: ExclamationTriangleIcon, text: t('syncOffline') };
  return { icon: CheckCircleIcon, text: t('syncSaved') };
}

export default function AccountSheet() {
  const { colors, type, t } = usePreferences();
  const { account, sync, sheetOpen, closeAccount, signIn, signUp, signInWithGoogle, signOut } = useAccount();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => { if (!sheetOpen) { setMessage(null); setPassword(''); setBusy(null); } }, [sheetOpen]);

  const run = async (which, action) => {
    setBusy(which);
    setMessage(null);
    try {
      const result = await action();
      if (result?.message) setMessage({ ok: true, text: result.message });
    } catch (error) {
      setMessage({ ok: false, text: error?.message || t('accountError') });
    } finally {
      setBusy(null);
    }
  };

  const signedIn = account.status === 'signedIn';
  const title = signedIn ? t('yourAccount') : mode === 'signin' ? t('signIn') : t('createAccount');
  const line = syncLine(sync, t);
  const SyncIcon = line.icon;

  return (
    <SwipeableBottomSheet visible={sheetOpen} title={title} onClose={closeAccount}>
      {signedIn ? (
        <View style={styles.body}>
          <View style={[styles.profile, { backgroundColor: colors.cardButton }]}>
            <UserCircleIcon size={40} color={colors.accent} />
            <View style={styles.profileText}>
              <Text style={[{ color: colors.textPrimary }, type(15, 'bold', 20)]} numberOfLines={1}>{account.name}</Text>
              <Text style={[{ color: colors.textMuted }, type(12, 'regular', 16)]} numberOfLines={1}>{account.email}</Text>
            </View>
          </View>
          <View style={styles.syncRow}>
            <SyncIcon size={16} color={sync.state === 'offline' ? colors.danger : colors.accent} />
            <Text style={[{ color: colors.textSecondary, flex: 1 }, type(12, 'semiBold', 16)]}>{line.text}</Text>
          </View>
          <Text style={[{ color: colors.textMuted }, type(12, 'regular', 17)]}>{t('syncExplain')}</Text>
          <Button label={t('signOut')} ghost busy={busy === 'out'} onPress={() => run('out', async () => { await signOut(); closeAccount(); })} />
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={[{ color: colors.textSecondary }, type(13, 'regular', 18)]}>{t('accountPitch')}</Text>
          {mode === 'signup' ? <Field value={name} onChangeText={setName} placeholder={t('yourName')} autoComplete="name" /> : null}
          <Field value={email} onChangeText={setEmail} placeholder={t('email')} keyboardType="email-address" autoComplete="email" />
          <Field value={password} onChangeText={setPassword} placeholder={t('password')} secure autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            onSubmitEditing={() => run('email', () => (mode === 'signin' ? signIn(email, password) : signUp(name, email, password)))} />
          {message ? <Text style={[{ color: message.ok ? colors.accent : colors.danger }, type(12, 'semiBold', 16)]}>{message.text}</Text> : null}
          <Button
            label={mode === 'signin' ? t('signIn') : t('createAccount')}
            busy={busy === 'email'}
            disabled={!email.trim() || !password}
            onPress={() => run('email', async () => { const r = mode === 'signin' ? await signIn(email, password) : await signUp(name, email, password); return r; })}
          />
          <Button label={t('continueGoogle')} ghost busy={busy === 'google'} onPress={() => run('google', signInWithGoogle)} />
          <ElasticPressable shape="pill" onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }} accessibilityRole="button">
            <Text style={[styles.switch, { color: colors.accent }, type(12, 'bold', 16)]}>{mode === 'signin' ? t('noAccountYet') : t('haveAccount')}</Text>
          </ElasticPressable>
        </View>
      )}
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.sm, paddingTop: Spacing.sm },
  input: { minHeight: 48, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  button: { minHeight: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.md },
  profileText: { flex: 1, minWidth: 0 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  switch: { textAlign: 'center', paddingVertical: 8 },
});
