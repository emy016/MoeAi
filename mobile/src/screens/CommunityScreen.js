/**
 * Community tab.
 *
 * The faculty model has no student community inside MoeAI yet, so the tab
 * says so plainly, links the Telegram channel the cohort already uses, and
 * gives the space to the DM with MoeAI: one permanent conversation that also
 * opens when the student replies to one of MoeAI's notifications.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowTopRightOnSquareIcon, PaperAirplaneIcon } from 'react-native-heroicons/solid';
import ScreenContainer from '../components/ScreenContainer';
import ElasticPressable from '../components/ElasticPressable';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { useAccount } from '../account/AccountContext';
import DMThread from '../dm/DMThread';
import { onOpenDM, takePendingReply } from '../dm/dmBus';

const TELEGRAM_URL = 'https://t.me/CS_Epic_Save';

export default function CommunityScreen({ active }) {
  const { colors, type, isRTL } = usePreferences();
  const { account, openAccount } = useAccount();
  const [replyTo, setReplyTo] = useState('');
  const align = { textAlign: isRTL ? 'right' : 'left' };

  // A notification the student replied to lands here with its text.
  useEffect(() => onOpenDM((pending) => setReplyTo(pending.replyTo || '')), []);
  useEffect(() => { if (active) { const pending = takePendingReply(); if (pending) setReplyTo(pending); } }, [active]);
  const clearReply = useCallback(() => setReplyTo(''), []);

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.top}>
        <Text style={[{ color: colors.textSecondary }, align, type(14, 'regular', 20)]}>
          Seems like your faculty model doesn't have a community here yet :( but you can talk with MoeAI normally :)
        </Text>
        <Pressable onPress={() => Linking.openURL(TELEGRAM_URL).catch(() => {})} style={[styles.telegram, { backgroundColor: colors.cardButton }]} accessibilityRole="link" accessibilityLabel="CS Epic Save on Telegram">
          <View style={[styles.telegramIcon, { backgroundColor: '#2AABEE' }]}><PaperAirplaneIcon size={15} color="#fff" style={{ transform: [{ rotate: '-30deg' }] }} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[{ color: colors.textPrimary }, type(14, 'bold', 19)]}>CS Epic Save</Text>
            <Text style={[{ color: colors.textMuted }, type(12, 'regular', 16)]}>Telegram · t.me/CS_Epic_Save</Text>
          </View>
          <ArrowTopRightOnSquareIcon size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      {account.status === 'signedIn' ? (
        <DMThread replyTo={replyTo} onClearReply={clearReply} />
      ) : (
        <View style={styles.guest}>
          <Text style={[{ color: colors.textSecondary, textAlign: 'center' }, type(14, 'regular', 20)]}>Sign in to get your own DM with MoeAI. It remembers what you study across the whole app.</Text>
          <ElasticPressable shape="pill" onPress={openAccount} accessibilityRole="button">
            <View style={[styles.signIn, { backgroundColor: colors.accent }]}><Text style={[{ color: colors.white }, type(14, 'bold', 18)]}>Sign in</Text></View>
          </ElasticPressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, gap: Spacing.sm },
  telegram: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md },
  telegramIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  guest: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  signIn: { paddingHorizontal: 28, minHeight: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
