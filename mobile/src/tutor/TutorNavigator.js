/**
 * Tutor mode: what a university staff account opens instead of the student
 * app. Same shell as the student side (Header, the swipeable pager, the
 * floating tab bar, the profile menu, Settings for customization) with the
 * staff tabs: Courses, Calendar, People, Simulators. "Student view" in the
 * profile menu opens the student app to see what students see.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AcademicCapIcon, CalendarDaysIcon, CpuChipIcon, UsersIcon, Cog6ToothIcon, UserIcon, ArrowsRightLeftIcon } from 'react-native-heroicons/outline';
import {
  AcademicCapIcon as AcademicCapSolid, CalendarDaysIcon as CalendarDaysSolid, CpuChipIcon as CpuChipSolid, UsersIcon as UsersSolid,
} from 'react-native-heroicons/solid';
import Header from '../components/Header';
import ProfileMenu from '../components/ProfileMenu';
import SettingsScreen from '../screens/SettingsScreen';
import CustomTabBar from '../navigation/CustomTabBar';
import { Pager } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { useAccount } from '../account/AccountContext';
import TutorCoursesScreen from './TutorCoursesScreen';
import TutorCalendarScreen from './TutorCalendarScreen';
import TutorPeopleScreen from './TutorPeopleScreen';
import TutorSimulatorsScreen from './TutorSimulatorsScreen';

const TABS = {
  Courses: { Outline: AcademicCapIcon, Solid: AcademicCapSolid, label: 'Courses' },
  Calendar: { Outline: CalendarDaysIcon, Solid: CalendarDaysSolid, label: 'Calendar' },
  People: { Outline: UsersIcon, Solid: UsersSolid, label: 'People' },
  Simulators: { Outline: CpuChipIcon, Solid: CpuChipSolid, label: 'Simulators' },
};
const ORDER = Object.keys(TABS);
const SCREENS = { Courses: TutorCoursesScreen, Calendar: TutorCalendarScreen, People: TutorPeopleScreen, Simulators: TutorSimulatorsScreen };
const MENU = [
  { id: 'studentView', key: 'studentView', Icon: ArrowsRightLeftIcon },
  { id: 'profile', key: 'profile', Icon: UserIcon },
  { id: 'settings', key: 'settings', Icon: Cog6ToothIcon },
];
const LAST = ORDER.length - 1;
const horizontal = ({ dx, dy }) => Math.abs(dx) > Pager.SWIPE_MIN_DX && Math.abs(dx) > Math.abs(dy) * Pager.SWIPE_DIRECTION_LOCK;

export default function TutorNavigator({ onStudentView }) {
  const { width } = useWindowDimensions();
  const { colors, t, motion } = usePreferences();
  const { openAccount } = useAccount();
  const [tab, setTab] = useState(0);
  const [direction, setDirection] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);

  const spring = useCallback((to) => Animated.spring(progress, { toValue: to, friction: Pager.FRICTION, tension: Pager.TENSION, overshootClamping: to === 0 || to === LAST, useNativeDriver: true, isInteraction: false }).start(), [progress]);
  useEffect(() => { progress.stopAnimation(); if (!motion) progress.setValue(tab); else spring(tab); }, [tab, motion, progress, spring]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuOpen) { setMenuOpen(false); return true; }
      if (settings) { setSettings(false); return true; }
      return false;
    });
    return () => sub.remove();
  }, [menuOpen, settings]);
  const select = useCallback((next) => { if (next !== tab) { setDirection(next > tab ? 1 : -1); setTab(next); } }, [tab]);
  const swipe = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => !settings && horizontal(g),
    onPanResponderGrant: () => { progress.stopAnimation(); dragStart.current = tab; progress.setValue(tab); },
    onPanResponderMove: (_, g) => progress.setValue(Math.max(0, Math.min(LAST, dragStart.current - g.dx / width))),
    onPanResponderRelease: (_, g) => {
      const threshold = Math.max(Pager.SWIPE_THRESHOLD_PX, width * Pager.SWIPE_THRESHOLD_FRACTION);
      const flick = Math.abs(g.vx) > Pager.SWIPE_FLICK_VELOCITY && Math.abs(g.dx) > Pager.SWIPE_FLICK_MIN_DX;
      if ((g.dx < -threshold || (flick && g.vx < 0)) && tab < LAST) select(tab + 1);
      else if ((g.dx > threshold || (flick && g.vx > 0)) && tab > 0) select(tab - 1);
      else spring(tab);
    },
    onPanResponderTerminate: () => spring(tab),
    onPanResponderTerminationRequest: () => false,
  }), [width, tab, settings, progress, select, spring]);
  const translateX = progress.interpolate({ inputRange: [0, LAST], outputRange: [0, -LAST * width], extrapolate: 'clamp' });
  const pick = useCallback((id) => {
    setMenuOpen(false);
    if (id === 'settings') setSettings(true);
    else if (id === 'profile') openAccount();
    else if (id === 'studentView') onStudentView?.();
  }, [openAccount, onStudentView]);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <Header title={settings ? t('settings') : t(ORDER[tab].toLowerCase())} subtitle={settings ? null : t('tutorMode')} direction={direction} menuOpen={menuOpen} settings={settings} onBack={() => setSettings(false)} onPillPress={() => setMenuOpen((o) => !o)} />
      <View pointerEvents={settings ? 'none' : 'auto'} style={[s.viewport, settings && s.hidden]} {...swipe.panHandlers}>
        <Animated.View style={[s.strip, { width: width * ORDER.length, transform: [{ translateX }] }]}>
          {ORDER.map((name, index) => {
            const Screen = SCREENS[name];
            return <View key={name} style={[s.page, { width }]}><Screen active={!settings && index === tab} /></View>;
          })}
        </Animated.View>
      </View>
      {settings ? <View style={s.viewport}><SettingsScreen /></View> : <CustomTabBar index={tab} onSelect={select} tabs={TABS} />}
      <ProfileMenu visible={menuOpen && !settings} onClose={() => setMenuOpen(false)} onSelect={pick} options={MENU} />
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1 }, viewport: { flex: 1, overflow: 'hidden' }, hidden: { display: 'none' }, strip: { flex: 1, flexDirection: 'row' }, page: { flex: 1 } });
