import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { usePreferences } from '../context/AppPreferences';

/** Shared tactile feedback: pills compress horizontally; circles scale uniformly. */
export default function ElasticPressable({ shape = 'pill', style, pressableStyle, children, onPressIn, onPressOut, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const { motion } = usePreferences();
  const animate = (toValue) => {
    if (!motion) { scale.setValue(1); return; }
    // Keep the tactile response elastic, but short and restrained enough
    // that labels/icons never look like they jump.
    scale.stopAnimation();
    Animated.spring(scale, { toValue, friction: 10, tension: 180, useNativeDriver: true, isInteraction: false }).start();
  };
  return (
    <Animated.View style={[style, { transform: shape === 'circle' ? [{ scale }] : [{ scaleX: scale }] }]}>
      <Pressable
        {...props}
        onPressIn={(event) => { animate(shape === 'circle' ? 0.95 : 0.975); onPressIn?.(event); }}
        onPressOut={(event) => { animate(1); onPressOut?.(event); }}
        style={pressableStyle}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
