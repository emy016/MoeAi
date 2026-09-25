/**
 * A wheel of values (hours, minutes, …) whose center band shows the selection
 * full-size.
 *
 * The value is committed only once the wheel has come to rest and snapped to
 * a row, never while it is still moving: committing mid-scroll made the parent
 * re-render and re-seek the wheel, which is why long scrolls landed on the
 * wrong number. The web has no native snap or momentum events, so there the
 * wheel waits for the scroll to go quiet, then glides to the nearest row. The
 * enlarged numbers in the center band follow the scroll position on every
 * frame (the native driver is not available on the web, so it is only used on
 * phones).
 *
 * Both layers are windowed around the row passing the center: the muted list
 * keeps a stretch of rows either side (spacers hold the rest of the height)
 * and the bright band keeps that row and four neighbors on each side, so a
 * long year list never mounts hundreds of text nodes while every number that
 * slides through the band is still drawn, cropped by its edges.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreferences } from '../context/AppPreferences';

const ITEM_HEIGHT = 46;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_TOP = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);
const WEB = Platform.OS === 'web';
const SETTLE_MS = 110;
const BAND_WINDOW = 4;
const LIST_WINDOW = 14;

function WheelPicker({ items, value, onChange, accessibilityLabel, flex = 1 }) {
  const { colors, type } = usePreferences();
  const scrollRef = useRef(null);
  const indexOf = useCallback((v) => Math.max(0, items.findIndex((item) => Object.is(item.value, v))), [items]);
  const scrollY = useRef(new Animated.Value(indexOf(value) * ITEM_HEIGHT)).current;
  const offset = useRef(indexOf(value) * ITEM_HEIGHT);
  const committed = useRef(indexOf(value));
  const touching = useRef(false);
  const settleTimer = useRef(null);
  const programmatic = useRef(false);
  const [center, setCenter] = useState(() => indexOf(value));
  const centerRef = useRef(center);
  const follow = useCallback((y) => {
    const index = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_HEIGHT)));
    if (index !== centerRef.current) { centerRef.current = index; setCenter(index); }
  }, [items.length]);

  const scrollTo = useCallback((index, animated) => {
    programmatic.current = true;
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
    setTimeout(() => { programmatic.current = false; }, animated ? 320 : 30);
  }, []);

  // Rest on the nearest row and commit it.
  const settle = useCallback(() => {
    clearTimeout(settleTimer.current);
    const index = Math.max(0, Math.min(items.length - 1, Math.round(offset.current / ITEM_HEIGHT)));
    if (Math.abs(offset.current - index * ITEM_HEIGHT) > 1) scrollTo(index, true);
    if (committed.current !== index) {
      committed.current = index;
      onChange(items[index].value);
    }
  }, [items, onChange, scrollTo]);

  // A value set from outside (a preset chip, the other wheel clamping) moves the wheel.
  useEffect(() => {
    const index = indexOf(value);
    if (index === committed.current && Math.abs(offset.current - index * ITEM_HEIGHT) < 1) return;
    committed.current = index;
    if (touching.current) return;
    offset.current = index * ITEM_HEIGHT;
    scrollY.setValue(offset.current);
    follow(offset.current);
    requestAnimationFrame(() => scrollTo(index, false));
  }, [follow, indexOf, scrollTo, scrollY, value]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: !WEB,
    listener: (event) => {
      offset.current = event.nativeEvent.contentOffset.y;
      follow(offset.current);
      if (!WEB || programmatic.current) return;
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, SETTLE_MS);
    },
  });

  const clampIndex = (i) => Math.max(0, Math.min(items.length - 1, i));
  const listFrom = clampIndex(center - LIST_WINDOW);
  const listTo = clampIndex(center + LIST_WINDOW);
  const bandFrom = clampIndex(center - BAND_WINDOW);
  const bandTo = clampIndex(center + BAND_WINDOW);

  return (
    <View style={[styles.picker, { flex }]} accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} accessibilityValue={{ text: String(items[committed.current]?.label ?? '') }}>
      <Animated.ScrollView
        ref={scrollRef}
        contentOffset={{ x: 0, y: indexOf(value) * ITEM_HEIGHT }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={WEB ? undefined : ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => { touching.current = true; }}
        onScrollEndDrag={() => { touching.current = false; if (!WEB) settleTimer.current = setTimeout(settle, 60); }}
        onMomentumScrollBegin={() => clearTimeout(settleTimer.current)}
        onMomentumScrollEnd={() => { touching.current = false; if (!WEB) settle(); }}
        onLayout={() => scrollTo(indexOf(value), false)}
        nestedScrollEnabled
      >
        <View style={{ height: listFrom * ITEM_HEIGHT }} />
        {items.slice(listFrom, listTo + 1).map((item, i) => { const index = listFrom + i; return (
          <Pressable
            key={String(item.value)}
            onPress={() => { offset.current = index * ITEM_HEIGHT; scrollTo(index, true); settle(); }}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={String(item.label)}
          >
            <Text numberOfLines={1} style={[styles.baseText, { color: colors.textMuted }, type(14, 'bold', 18)]}>{item.label}</Text>
          </Pressable>
        ); })}
        <View style={{ height: (items.length - 1 - listTo) * ITEM_HEIGHT }} />
      </Animated.ScrollView>
      {/* Every label is drawn in the band too and slides with the scroll, so a number enlarges as it enters the center. */}
      <View pointerEvents="none" style={[styles.centerMask, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Animated.View style={{ transform: [{ translateY: Animated.multiply(scrollY, -1) }] }}>
          {items.slice(bandFrom, bandTo + 1).map((item, i) => (
            <Text key={String(item.value)} numberOfLines={1} style={[{ color: colors.textPrimary }, type(19, 'bold', 23), styles.selectedText, { top: (bandFrom + i) * ITEM_HEIGHT }]}>{item.label}</Text>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

export const WheelPickerGeometry = { ITEM_HEIGHT, PICKER_HEIGHT };

export default React.memo(WheelPicker);

const styles = StyleSheet.create({
  picker: { height: PICKER_HEIGHT, overflow: 'hidden' },
  listContent: { paddingVertical: CENTER_TOP },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  baseText: { opacity: 0.58, transform: [{ scale: 0.8 }], textAlign: 'center' },
  centerMask: { position: 'absolute', left: 0, right: 0, top: CENTER_TOP, height: ITEM_HEIGHT, overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  selectedText: { position: 'absolute', left: 0, right: 0, height: ITEM_HEIGHT, lineHeight: ITEM_HEIGHT, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
});
