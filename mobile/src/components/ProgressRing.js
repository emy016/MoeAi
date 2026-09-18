/** Animated circular lecture progress indicator based on the supplied reference. */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { usePreferences } from '../context/AppPreferences';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default React.memo(function ProgressRing({ completed, total, active, size = 164, strokeWidth = 10 }) {
  const { colors, type, t, motion } = usePreferences();
  const progressValue = total ? Math.max(0, Math.min(1, completed / total)) : 0;
  const animated = useRef(new Animated.Value(0)).current;
  const wasActive = useRef(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = useMemo(() => animated.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] }), [animated, circumference]);

  useEffect(() => {
    if (!active) {
      wasActive.current = false;
      return undefined;
    }
    animated.stopAnimation();
    if (!wasActive.current) animated.setValue(0);
    wasActive.current = true;
    const animation = Animated.timing(animated, { toValue: progressValue, duration: motion ? 720 : 0, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [active, animated, motion, progressValue]);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.track} strokeWidth={strokeWidth} opacity={0.72} />
        {Platform.OS === 'web' ? (
          // React Native Web cannot reliably animate SVG presentation props
          // through Animated.createAnimatedComponent. Render the current value
          // directly on web; native Expo targets keep the animated path below.
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - progressValue)}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        ) : (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        )}
      </Svg>
      <View style={styles.copy}>
        <Text style={[{ color: colors.textPrimary }, type(28, 'bold', 33)]}>{Math.round(progressValue * 100)}%</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.count, { color: colors.textMuted }, type(12, 'semiBold', 16)]}>{t('lecturesOutOf', { completed, total })}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  copy: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  count: { marginTop: 4, textAlign: 'center' },
});
