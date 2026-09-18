/**
 * SimulatorsScreen.js
 * ---------------------------------------------------------------------
 * Placeholder Simulators tab (cpu-chip icon). Intended home for
 * interactive lab/simulation tools (e.g. circuit builders, virtual
 * labs). Follows the same ScreenContainer/Card pattern as every other
 * screen.
 * ---------------------------------------------------------------------
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import Card from '../components/Card';
import { usePreferences } from '../context/AppPreferences';

export default function SimulatorsScreen() {
  const {colors,type,t,isRTL}=usePreferences();
  return (
    <ScreenContainer>
      <Card>
        <Text style={[styles.cardTitle,{color:colors.textPrimary,textAlign:isRTL?'right':'left'},type(16,'bold')]}>{t('availableSimulators')}</Text><Text style={[{color:colors.textSecondary,textAlign:isRTL?'right':'left'},type(14,'regular',20)]}>{t('simulatorsBody')}</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardTitle: { marginBottom: 4 },
});
