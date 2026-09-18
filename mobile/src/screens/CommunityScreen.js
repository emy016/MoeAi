/**
 * CommunityScreen.js
 * ---------------------------------------------------------------------
 * EduMoe's community is not hypothetical and it is not in this app: it
 * is a Telegram channel with a few hundred first-year CS students in it,
 * and the site those students already use. So this tab points at the
 * real thing instead of showing an empty feed that will never fill.
 *
 * The tab bar's Post button opens the channel too — see CustomTabBar.
 * ---------------------------------------------------------------------
 */
import React, { useCallback } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { AcademicCapIcon, ArrowTopRightOnSquareIcon, ChatBubbleLeftRightIcon, SparklesIcon } from 'react-native-heroicons/solid';
import Card from '../components/Card';
import ElasticPressable from '../components/ElasticPressable';
import ScreenContainer from '../components/ScreenContainer';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { API_BASE_URL, TELEGRAM_URL } from '../ai/config';

export default function CommunityScreen() {
  const { colors, type, t, isRTL } = usePreferences();

  const open = useCallback(async (url, label) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch (_) {
      Alert.alert(label, t('couldNotOpenLink'));
    }
  }, [t]);

  const LINKS = [
    { id: 'telegram', icon: ChatBubbleLeftRightIcon, titleKey: 'telegramChannel', bodyKey: 'telegramBody', url: TELEGRAM_URL },
    { id: 'courses', icon: AcademicCapIcon, titleKey: 'coursesOnline', bodyKey: 'coursesOnlineBody', url: `${API_BASE_URL}/courses` },
    { id: 'moeai', icon: SparklesIcon, titleKey: 'moeaiOnWeb', bodyKey: 'moeaiOnWebBody', url: `${API_BASE_URL}/moeai` },
  ];

  return (
    <ScreenContainer>
      <Card>
        <Text style={[styles.title, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(16, 'bold')]}>{t('studyGroups')}</Text>
        <Text style={[{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}>{t('communityIntro')}</Text>
      </Card>

      {LINKS.map((item) => (
        <ElasticPressable key={item.id} shape="pill" pressableStyle={styles.hit} onPress={() => open(item.url, t(item.titleKey))} accessibilityRole="button">
          <Card style={styles.row}>
            <View style={[styles.rowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.glyph, { backgroundColor: colors.cardButton }]}>
                <item.icon size={19} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'bold', 19)]}>{t(item.titleKey)}</Text>
                <Text style={[{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(12, 'regular', 17)]}>{t(item.bodyKey)}</Text>
              </View>
              <ArrowTopRightOnSquareIcon size={16} color={colors.textMuted} />
            </View>
          </Card>
        </ElasticPressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 4 },
  flex: { flex: 1, gap: 2 },
  hit: { borderRadius: Radius.md },
  row: { marginBottom: Spacing.sm },
  rowInner: { alignItems: 'center', gap: Spacing.md },
  glyph: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
