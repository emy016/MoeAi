/**
 * The MoeAI mark (the two-peak M), transparent, in the student's accent colour.
 * Same paths as the website's Logo (components/brand/Logo.tsx): the outline
 * layer is drawn as a soft shade of the accent so it works on any theme.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colorWithAlpha } from '../constants/colors';

const INK = 'M35.5 15.6L0 92.3L0 105L60.1 73.3L119.8 105.1L120 92.2L84.3 14.9L60 51.4L35.9 14.9ZM36.6 29.8L5.6 95.9L52.9 69.9L38.5 50.2L20.2 84.9L9.8 91.1L37.4 36.6L60.1 68.5L82.9 36.6L110.2 90.9L100.1 85.4L81.6 50.2L67.2 69.9L114.3 95.7L83.2 29.5L60.1 63.7L36.9 29.5Z';
const MARK = 'M35.7 17.2L1 92.5L1 103.4L60.3 72.4L119 103.6L119 92.5L84.2 16.8L60.1 53L36.1 16.9ZM36.5 27.9L3.8 97.8L39.4 78.7L54.2 70.1L38.3 48.5L19.4 84.5L12 88.7L37.6 38.4L59.9 70L82.8 38.4L108 88.8L100.8 84.6L81.7 48.5L65.9 70.1L116.2 97.8L83.5 27.7L60.1 62.1L36.8 27.6Z';

export default function MoeAIMark({ size = 56, color = '#ea4349' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="MoeAI">
      <Path d={INK} fill={colorWithAlpha(color, 0.35)} fillRule="evenodd" />
      <Path d={MARK} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
