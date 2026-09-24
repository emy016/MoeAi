/** Dynamic first-result Noun Project icon with an offline related fallback. */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import {
  AcademicCapIcon,
  BanknotesIcon,
  BeakerIcon,
  BookOpenIcon,
  BoltIcon,
  BugAntIcon,
  CalculatorIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  CpuChipIcon,
  GlobeAltIcon,
  HeartIcon,
  LanguageIcon,
  LightBulbIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  RocketLaunchIcon,
  ScaleIcon,
  WrenchScrewdriverIcon,
} from 'react-native-heroicons/solid';
import { resolveSubjectIcon, subjectIconSourceSupportsPlatform } from '../subjects/subjectIconSource';

function fallbackFor(name) {
  const value = String(name || '').toLowerCase();
  if (/math|calculus|algebra|geometry|statistic/.test(value)) return CalculatorIcon;
  // Keep specific subjects ahead of broad terms such as "science" so
  // "Computer Science" never falls through to the laboratory icon.
  if (/computer|computing|code|program|software|network|algorithm|data/.test(value)) return CpuChipIcon;
  if (/physics|mechanic|electric|electronic|quantum/.test(value)) return BoltIcon;
  if (/chem|laboratory|lab/.test(value)) return BeakerIcon;
  if (/biology|ecology|zoology|botany|genetic/.test(value)) return BugAntIcon;
  if (/medicine|medical|nursing|anatomy|health/.test(value)) return HeartIcon;
  if (/engineering|mechanical|civil|manufactur/.test(value)) return WrenchScrewdriverIcon;
  if (/law|legal|jurisprudence/.test(value)) return ScaleIcon;
  if (/psychology|philosophy|logic/.test(value)) return LightBulbIcon;
  if (/art|design|drawing|paint/.test(value)) return PaintBrushIcon;
  if (/astronomy|space|aerospace/.test(value)) return RocketLaunchIcon;
  if (/language|english|arabic|spanish|french|german|chinese|hindi/.test(value)) return LanguageIcon;
  if (/geography|history|world|social/.test(value)) return GlobeAltIcon;
  if (/music|audio/.test(value)) return MusicalNoteIcon;
  if (/finance|accounting|banking/.test(value)) return BanknotesIcon;
  if (/business|econom|marketing|management/.test(value)) return ChartBarIcon;
  if (/communication|media|journal/.test(value)) return ChatBubbleLeftRightIcon;
  if (/web|development|technology/.test(value)) return CodeBracketIcon;
  if (/science/.test(value)) return BeakerIcon;
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
    // The default Noun Project resolver reads a search-result HTML page.
    // Native fetch can do that, while browsers correctly block it with CORS.
    // Web therefore uses the deterministic local icon immediately unless the
    // app configures an explicitly web-compatible proxy/custom resolver.
    if (!subjectIconSourceSupportsPlatform(Platform.OS)) return undefined;
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
