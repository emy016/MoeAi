/** Dynamic first-result Noun Project icon with an offline related fallback. */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  AcademicCapIcon,
  BeakerIcon,
  BookOpenIcon,
  CalculatorIcon,
  ChartBarIcon,
  CpuChipIcon,
  GlobeAltIcon,
  LanguageIcon,
  MusicalNoteIcon,
} from 'react-native-heroicons/solid';
import { resolveSubjectIcon } from '../subjects/subjectIconSource';

function fallbackFor(name) {
  const value = String(name || '').toLowerCase();
  if (/math|calculus|algebra|geometry|statistic/.test(value)) return CalculatorIcon;
  if (/chem|biology|science|physics|lab/.test(value)) return BeakerIcon;
  if (/computer|code|program|software|network/.test(value)) return CpuChipIcon;
  if (/language|english|arabic|spanish|french|german|chinese|hindi/.test(value)) return LanguageIcon;
  if (/geography|history|world|social/.test(value)) return GlobeAltIcon;
  if (/music|audio/.test(value)) return MusicalNoteIcon;
  if (/business|econom|finance/.test(value)) return ChartBarIcon;
  if (/education|study|course/.test(value)) return AcademicCapIcon;
  return BookOpenIcon;
}

// Keep optional icon lookups off the interaction path without relying on a
// legacy interaction scheduler API. Native runtimes that expose
// requestIdleCallback use it directly; the timeout fallback remains cancellable.
function scheduleIdle(callback) {
  let cancelled = false;
  const run = () => { if (!cancelled) callback(); };
  if (typeof globalThis?.requestIdleCallback === 'function') {
    const id = globalThis.requestIdleCallback(run, { timeout: 500 });
    return () => {
      cancelled = true;
      if (typeof globalThis.cancelIdleCallback === 'function') globalThis.cancelIdleCallback(id);
    };
  }
  const id = setTimeout(run, 0);
  return () => { cancelled = true; clearTimeout(id); };
}

export default React.memo(function SubjectIcon({ name, query, color, size = 30, style }) {
  const [remote, setRemote] = useState(null);
  const [failed, setFailed] = useState(false);
  const search = query || name;
  const Fallback = useMemo(() => fallbackFor(search), [search]);

  useEffect(() => {
    let alive = true;
    setRemote(null);
    setFailed(false);
    const cancelIdle = scheduleIdle(() => {
      resolveSubjectIcon(search).then((result) => { if (alive) setRemote(result); });
    });
    return () => { alive = false; cancelIdle(); };
  }, [search]);

  return (
    <View style={[styles.box, { width: size, height: size }, style]} accessibilityLabel={remote?.credit || `${name} subject icon`}>
      {remote?.uri && !failed
        ? <Image source={{ uri: remote.uri }} resizeMode="contain" onError={() => setFailed(true)} style={[styles.image, { tintColor: color }]} />
        : <Fallback size={size} color={color} />}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
