/** Original solid push-pin glyph used by the chat-history actions. */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function SolidPinIcon({ size = 20, color = 'currentColor' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path
        fill={color}
        d="M8.25 2.75h7.5l-1.17 5.18 2.67 2.82v2.05a.7.7 0 0 1-.7.7h-3.8v7.05c0 .3-.12.58-.33.79L12 21.76l-.42-.42a1.12 1.12 0 0 1-.33-.79V13.5h-3.8a.7.7 0 0 1-.7-.7v-2.05l2.67-2.82L8.25 2.75Z"
      />
    </Svg>
  );
}
