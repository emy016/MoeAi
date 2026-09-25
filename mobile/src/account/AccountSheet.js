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
  const { account, sync, sheetOpen, closeAccount, signIn, signInWithGoogle, signInWithApple, signInWithUniversity, signOut, openSite } = useAccount();
  const [identifier, setIdentifier] = useState('');
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
  const line = syncLine(sync, t);
  const SyncIcon = line.icon;
  const submit = () => run('email', () => signIn(identifier.trim(), password));

  return (
    <SwipeableBottomSheet visible={sheetOpen} title={signedIn ? t('yourAccount') : t('signIn')} onClose={closeAccount}>
      {signedIn ? (
        <View style={styles.body}>
          <View style={[styles.profile, { backgroundColor: colors.cardButton }]}>
            <UserCircleIcon size={40} color={colors.accent} />
            <View style={styles.profileText}>
              <Text style={[{ color: colors.textPrimary }, type(15, 'bold', 20)]} numberOfLines={1}>{account.name}</Text>
              <Text style={[{ color: colors.textMuted }, type(12, 'regular', 16)]} numberOfLines={1}>{account.handle ? `@${account.handle} · ` : ''}{account.email}</Text>
            </View>
          </View>
          {!account.onboarded ? (
            <>
              <Text style={[{ color: colors.textSecondary }, type(12, 'semiBold', 17)]}>{t('setupPending')}</Text>
              <Button label={t('finishSetup')} onPress={() => openSite('/start/continue?next=/moeai')} />
            </>
          ) : null}
          <View style={styles.syncRow}>
            <SyncIcon size={16} color={sync.state === 'offline' ? colors.danger : colors.accent} />
            <Text style={[{ color: colors.textSecondary, flex: 1 }, type(12, 'semiBold', 16)]}>{line.text}</Text>
          </View>
          {account.org ? <Text style={[{ color: colors.textSecondary }, type(12, 'semiBold', 17)]}>{t('universityLinked')}</Text> : null}
          <Text style={[{ color: colors.textMuted }, type(12, 'regular', 17)]}>{t('syncExplain')}</Text>
          {account.org?.role === 'teacher' || account.org?.role === 'admin' ? <Button label={t('openTutorPage')} onPress={() => openSite('/organizer')} /> : null}
          {!account.org ? <Button label={t('accountSettings')} ghost onPress={() => openSite('/account')} /> : null}
          <Button label={t('signOut')} ghost busy={busy === 'out'} onPress={() => run('out', async () => { await signOut(); closeAccount(); })} />
        </View>
      ) : (
        <View style={styles.body}>
          <Button label={t('signInUniversity')} busy={busy === 'uni'} onPress={() => run('uni', async () => signInWithUniversity())} />
          <Text style={[{ color: colors.textMuted, textAlign: 'center' }, type(12, 'regular', 16)]}>{t('orPersonal')}</Text>
          <Text style={[{ color: colors.textSecondary }, type(13, 'regular', 18)]}>{t('accountPitch')}</Text>
          <View style={styles.oauthRow}>
            <View style={styles.oauthCell}><Button label={t('continueGoogle')} ghost busy={busy === 'google'} onPress={() => run('google', signInWithGoogle)} /></View>
            <View style={styles.oauthCell}><Button label={t('continueApple')} ghost busy={busy === 'apple'} onPress={() => run('apple', signInWithApple)} /></View>
          </View>
          <Field value={identifier} onChangeText={setIdentifier} placeholder={t('emailOrPhone')} keyboardType="email-address" autoComplete="username" />
          <Field value={password} onChangeText={setPassword} placeholder={t('password')} secure autoComplete="current-password" onSubmitEditing={submit} />
          {message ? <Text style={[{ color: message.ok ? colors.accent : colors.danger }, type(12, 'semiBold', 16)]}>{message.text}</Text> : null}
          <Button label={t('signIn')} busy={busy === 'email'} disabled={!identifier.trim() || !password} onPress={submit} />
          <View style={styles.linksRow}>
            <ElasticPressable shape="pill" onPress={() => openSite('/start/forgot?next=/moeai')} accessibilityRole="link">
              <Text style={[styles.switch, { color: colors.textSecondary }, type(12, 'semiBold', 16)]}>{t('forgotPassword')}</Text>
            </ElasticPressable>
            <ElasticPressable shape="pill" onPress={() => openSite('/start?next=/moeai')} accessibilityRole="link">
              <Text style={[styles.switch, { color: colors.accent }, type(12, 'bold', 16)]}>{t('noAccountYet')}</Text>
            </ElasticPressable>
          </View>
          <ElasticPressable shape="pill" onPress={() => openSite('/organizer')} accessibilityRole="link">
            <Text style={[styles.switch, { color: colors.textSecondary }, type(12, 'semiBold', 16)]}>{t('staffLink')}</Text>
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
  oauthRow: { flexDirection: 'row', gap: Spacing.sm },
  oauthCell: { flex: 1 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
});
