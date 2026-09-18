/**
 * PracticeScreen.js
 * ---------------------------------------------------------------------
 * Placeholder Practice tab (book-open icon). Intended home for quiz
 * sets, flashcards, and problem drills. Follows the same
 * ScreenContainer/Card pattern as every other screen.
 * ---------------------------------------------------------------------
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import Card from '../components/Card';
import { usePreferences } from '../context/AppPreferences';

export default function PracticeScreen() {
  const {colors,type,t,isRTL}=usePreferences(); const title=[styles.cardTitle,{color:colors.textPrimary,textAlign:isRTL?'right':'left'},type(16,'bold')]; const body=[{color:colors.textSecondary,textAlign:isRTL?'right':'left'},type(14,'regular',20)];
  return (
    <ScreenContainer>
      <Card>
        <Text style={title}>{t('practiceSets')}</Text><Text style={body}>{t('practiceBody')}</Text>
      </Card>
      <Card>
        <Text style={title}>{t('flashcards')}</Text><Text style={body}>{t('flashcardsBody')}</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardTitle: { marginBottom: 4 },
});
