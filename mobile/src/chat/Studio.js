/**
 * Studio: turn the lecture into something else in one tap — a study guide,
 * a mind map, flashcards, a practice quiz, slides, or an audio overview
 * MoeAI reads aloud. Each tool is an ordinary message to MoeAI, so the result
 * lands in the chat, grounded in the course material, and can be followed up.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AcademicCapIcon, DocumentTextIcon, PresentationChartBarIcon, RectangleStackIcon, ShareIcon, SpeakerWaveIcon } from 'react-native-heroicons/outline';
import ElasticPressable from '../components/ElasticPressable';
import { Radius } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export const STUDIO_TOOLS = [
  { id: 'guide', Icon: DocumentTextIcon, label: 'studioGuide', prompt: 'studioGuidePrompt', tint: '#4F8CFF' },
  { id: 'mindmap', Icon: ShareIcon, label: 'studioMindmap', prompt: 'studioMindmapPrompt', tint: '#22B573' },
  { id: 'flashcards', Icon: RectangleStackIcon, label: 'studioFlashcards', prompt: 'studioFlashcardsPrompt', tint: '#F59E0B' },
  { id: 'quiz', Icon: AcademicCapIcon, label: 'studioQuiz', prompt: 'studioQuizPrompt', tint: '#EF4B5F' },
  { id: 'slides', Icon: PresentationChartBarIcon, label: 'studioSlides', prompt: 'studioSlidesPrompt', tint: '#9B5CF6' },
  { id: 'audio', Icon: SpeakerWaveIcon, label: 'studioAudio', prompt: 'studioAudioPrompt', tint: '#06B6D4', speak: true },
];

/** A row of Studio tools; `onPick(text, { speak })` sends the request. */
export default function Studio({ onPick, compact }) {
  const { colors, type, t, isRTL } = usePreferences();
  const { width } = useWindowDimensions();
  // The empty chat centers its content, so the row needs a real width or it grows past the screen.
  return (
    <View style={[styles.wrap, !compact && { width: Math.min(width - 32, 720) }]}>
      <Text style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(11, 'bold', 14)]}>{t('studioTitle')}</Text>
      <ScrollView horizontal style={styles.scroll} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}>
        {STUDIO_TOOLS.map((tool) => (
          <ElasticPressable key={tool.id} shape="pill" onPress={() => onPick(t(tool.prompt), { speak: Boolean(tool.speak), studio: tool.id })} accessibilityRole="button" accessibilityLabel={t(tool.label)}>
            <View style={[compact ? styles.chip : styles.tile, { backgroundColor: compact ? colors.cardButton : colors.card }]}>
              <View style={[styles.icon, { backgroundColor: `${tool.tint}22` }]}><tool.Icon size={compact ? 15 : 18} color={tool.tint} /></View>
              <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(12, 'semiBold', 16)]}>{t(tool.label)}</Text>
            </View>
          </ElasticPressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, alignSelf: 'stretch' },
  scroll: { width: '100%', flexGrow: 0 },
  row: { gap: 8, paddingRight: 8 },
  tile: { width: 108, borderRadius: Radius.md, padding: 12, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
