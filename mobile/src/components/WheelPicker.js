/** Native-scrolling wheel whose center band reveals the full-size selection. */
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreferences } from '../context/AppPreferences';

const ITEM_HEIGHT = 46;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_TOP = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

function WheelPicker({ items, value, onChange, accessibilityLabel, flex = 1 }) {
  const { colors, type } = usePreferences();
  const listRef = useRef(null);
  const selectedIndex = useMemo(() => Math.max(0, items.findIndex((item) => Object.is(item.value, value))), [items, value]);
  const scrollY = useRef(new Animated.Value(selectedIndex * ITEM_HEIGHT)).current;
  const lastIndex = useRef(selectedIndex);
  const interacting = useRef(false);
  const overlayItems = useMemo(() => {
    const first = Math.max(0, selectedIndex - 4);
    return items.slice(first, Math.min(items.length, selectedIndex + 5)).map((item, offset) => ({ item, index: first + offset }));
  }, [items, selectedIndex]);

  const selectIndex = useCallback((index) => {
    const bounded = Math.max(0, Math.min(items.length - 1, index));
    if (lastIndex.current === bounded) return;
    lastIndex.current = bounded;
    onChange(items[bounded].value);
  }, [items, onChange]);

  useLayoutEffect(() => {
    lastIndex.current = selectedIndex;
    if (interacting.current) return undefined;
    scrollY.setValue(selectedIndex * ITEM_HEIGHT);
    const frame = requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_HEIGHT, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [scrollY, selectedIndex]);

  const handleScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      // FlatList reports its temporary zero offset while initialScrollIndex is
      // being applied. Only a real drag/tap may commit a value; otherwise a
      // minute wheel briefly writes 00 back into the editor and visibly flashes.
      listener: (event) => {
        if (interacting.current) selectIndex(Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT));
      },
    },
  ), [scrollY, selectIndex]);

  const renderItem = useCallback(({ item, index }) => (
    <Pressable
      onPress={() => { interacting.current = true; selectIndex(index); listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true }); }}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={String(item.label)}
    >
      <Text numberOfLines={1} style={[styles.baseText, { color: colors.textMuted }, type(14, 'bold', 18)]}>{item.label}</Text>
    </Pressable>
  ), [colors.textMuted, selectIndex, type]);

  return (
    <View style={[styles.picker, { flex }]} accessibilityLabel={accessibilityLabel}>
      <Animated.FlatList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.value)}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={selectedIndex}
        onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false })}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollBeginDrag={() => { interacting.current = true; }}
        onMomentumScrollEnd={(event) => {
          if (interacting.current) selectIndex(Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT));
          interacting.current = false;
        }}
        onScrollEndDrag={(event) => {
          // Web and low-velocity native drags may end without momentum.
          if (interacting.current) selectIndex(Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT));
        }}
        removeClippedSubviews={false}
        initialNumToRender={7}
        maxToRenderPerBatch={7}
        windowSize={5}
      />
      <View pointerEvents="none" style={[styles.centerMask, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {overlayItems.map(({ item, index }) => (
          <Animated.Text
            key={String(item.value)}
            numberOfLines={1}
            style={[
              styles.selectedText,
              { color: colors.textPrimary, top: index * ITEM_HEIGHT, transform: [{ translateY: Animated.multiply(scrollY, -1) }] },
              type(19, 'bold', 23),
            ]}
          >
            {item.label}
          </Animated.Text>
        ))}
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
  selectedText: { position: 'absolute', left: 0, right: 0, height: ITEM_HEIGHT, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
});
