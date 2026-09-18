/**
 * Card.js
 * ---------------------------------------------------------------------
 * Generic "surface" container — anything that needs to visually float
 * above the screen background (lesson tiles, list rows, stat blocks...)
 * should be wrapped in this instead of styling a raw View each time.
 * Uses Colors.card per the app's palette spec.
 *
 * STYLE: rounded rectangle with NO outline/border — the card reads via
 * fill contrast against Colors.background, not via a stroke.
 * Buttons that sit ON cards should use Colors.cardButton (see note).
 * ---------------------------------------------------------------------
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export default function Card({ style, children }) {
  const { colors } = usePreferences();
  return <View style={[styles.card, { backgroundColor: colors.card }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md, // curved corners, still a rect — NOT pill
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0, // no outline — fill contrast only
  },
});
