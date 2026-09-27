/**
 * CommunityScreen.js
 * ---------------------------------------------------------------------
 * Placeholder Community tab (user-group icon). This is the tab that
 * triggers the tab bar's special "spread + FAB" animation — see
 * CustomTabBar.js. The FAB's onPress is still a TODO; wire it to
 * whatever the "create" action should be (new post, new thread, etc.)
 * once that flow exists.
 * ---------------------------------------------------------------------
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import Card from '../components/Card';
import { usePreferences } from '../context/AppPreferences';

export default function CommunityScreen() {
  const {colors,type,t,isRTL}=usePreferences(); const title=[styles.cardTitle,{color:colors.textPrimary,textAlign:isRTL?'right':'left'},type(16,'bold')]; const body=[{color:colors.textSecondary,textAlign:isRTL?'right':'left'},type(14,'regular',20)];
  return (
    <ScreenContainer>
      <Card>
        <Text style={title}>{t('studyGroups')}</Text><Text style={body}>{t('groupsBody')}</Text>
      </Card>
      <Card>
        <Text style={title}>{t('discussionFeed')}</Text><Text style={body}>{t('discussionBody')}</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardTitle: { marginBottom: 4 },
});
