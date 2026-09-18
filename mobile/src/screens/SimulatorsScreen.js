/**
 * SimulatorsScreen.js
 * ---------------------------------------------------------------------
 * The simulators are real and they already run on the web — a logic
 * canvas, probability, calculus, discrete maths and physics. Rather than
 * reimplement five interactive tools in React Native, this lists what
 * each one is for and opens it, and offers to hand the topic to MoeAI.
 *
 * Linking rather than a WebView on purpose: a WebView means a new native
 * dependency, and a tab that fails to build is worse than a tab that
 * opens the browser.
 * ---------------------------------------------------------------------
 */
import React, { useCallback } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { ArrowTopRightOnSquareIcon, CpuChipIcon } from 'react-native-heroicons/solid';
import Card from '../components/Card';
import ElasticPressable from '../components/ElasticPressable';
import ScreenContainer from '../components/ScreenContainer';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { API_BASE_URL } from '../ai/config';

const SIMULATORS = [
  { id: 'logic', tab: 'logic', titleKey: 'simLogic', bodyKey: 'simLogicBody' },
  { id: 'probability', tab: 'prob', titleKey: 'simProbability', bodyKey: 'simProbabilityBody' },
  { id: 'calculus', tab: 'calc', titleKey: 'simCalculus', bodyKey: 'simCalculusBody' },
  { id: 'discrete', tab: 'dm', titleKey: 'simDiscrete', bodyKey: 'simDiscreteBody' },
  { id: 'physics', tab: 'phys', titleKey: 'simPhysics', bodyKey: 'simPhysicsBody' },
];

export default function SimulatorsScreen() {
  const { colors, type, t, isRTL } = usePreferences();

  const open = useCallback(async (tab) => {
    const url = `${API_BASE_URL}/simulators#${tab}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch (_) {
      Alert.alert(t('simulators'), t('couldNotOpenLink'));
    }
  }, [t]);

  return (
    <ScreenContainer>
      <Card>
        <Text style={[styles.title, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(16, 'bold')]}>{t('availableSimulators')}</Text>
        <Text style={[{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}>{t('simulatorsIntro')}</Text>
      </Card>

      {SIMULATORS.map((item) => (
        <ElasticPressable key={item.id} shape="pill" pressableStyle={styles.hit} onPress={() => open(item.tab)} accessibilityRole="button">
          <Card style={styles.row}>
            <View style={[styles.rowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.glyph, { backgroundColor: colors.cardButton }]}>
                <CpuChipIcon size={19} color={colors.accent} />
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
