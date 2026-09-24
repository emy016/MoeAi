/**
 * Voice mode: a hands-free conversation with MoeAI.
 *
 * Listen → the student pauses → the question is sent into the same chat →
 * MoeAI's answer is read aloud → listen again. Tap the orb while it talks to
 * interrupt; pause to think; end to go back to the chat, where everything
 * that was said is already written down. Speech recognition is the device's
 * (Web Speech in browsers, the native recognizer on phones) and so is the
 * voice, so nothing extra is sent anywhere.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicrophoneIcon, PauseIcon, XMarkIcon } from 'react-native-heroicons/solid';
import useHoldToDictate from './useHoldToDictate';
import { speak, speechAvailable, stop as stopSpeaking } from './speech';
import { colorWithAlpha } from '../constants/colors';
import { usePreferences } from '../context/AppPreferences';

const SILENCE_MS = 1400;

export default function VoiceMode({ visible, messages, onSend, onClose, title }) {
  const { colors, type, t, language, motion } = usePreferences();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('idle'); // listening | thinking | speaking | paused | unavailable
  const [transcript, setTranscript] = useState('');
  const [caption, setCaption] = useState('');
  const phaseRef = useRef(phase);
  const sentAt = useRef(0);
  const silence = useRef(null);
  const transcriptRef = useRef('');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const unavailable = useCallback(() => setPhase('unavailable'), []);
  const { listening, start, stop } = useHoldToDictate({ value: '', onChange: setTranscript, language, onUnavailable: unavailable });

  const listen = useCallback(() => {
    stopSpeaking();
    setTranscript('');
    setPhase('listening');
    start();
  }, [start]);

  const send = useCallback((text) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    clearTimeout(silence.current);
    stop();
    sentAt.current = Date.now();
    setCaption(clean);
    setTranscript('');
    setPhase('thinking');
    onSend(clean);
  }, [onSend, stop]);

  // Open → start listening. Close → silence everything.
  useEffect(() => {
    if (visible) { setCaption(''); listen(); }
    return () => { clearTimeout(silence.current); stop(); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // A pause after speech means the question is finished.
  useEffect(() => {
    if (phase !== 'listening' || !transcript.trim()) return undefined;
    clearTimeout(silence.current);
    silence.current = setTimeout(() => send(transcriptRef.current), SILENCE_MS);
    return () => clearTimeout(silence.current);
  }, [phase, send, transcript]);

  // Browsers end recognition on their own after a quiet stretch: send what was heard, or keep listening.
  useEffect(() => {
    if (listening || phaseRef.current !== 'listening') return undefined;
    const id = setTimeout(() => {
      if (phaseRef.current !== 'listening') return;
      if (transcriptRef.current.trim()) send(transcriptRef.current);
      else start();
    }, 350);
    return () => clearTimeout(id);
  }, [listening, send, start]);

  // The answer to what was just asked: read it aloud once it is complete.
  const last = messages[messages.length - 1];
  useEffect(() => {
    if (phase !== 'thinking' || !last || last.role !== 'assistant') return;
    if (last.status === 'pending' || last.status === 'streaming') return;
    if (Date.parse(last.createdAt || 0) < sentAt.current - 2000) return;
    setCaption(last.text);
    setPhase('speaking');
    const spoke = speak(last.text, {
      language,
      onDone: () => { if (phaseRef.current === 'speaking') listen(); },
    });
    if (!spoke) listen();
  }, [language, last, listen, phase]);

  const togglePause = useCallback(() => {
    if (phase === 'paused') { listen(); return; }
    clearTimeout(silence.current);
    stop();
    stopSpeaking();
    setPhase('paused');
  }, [listen, phase, stop]);

  const tapOrb = useCallback(() => {
    if (phase === 'speaking' || phase === 'paused' || phase === 'unavailable') listen();
    else if (phase === 'listening' && transcript.trim()) send(transcript);
  }, [listen, phase, send, transcript]);

  const end = useCallback(() => {
    clearTimeout(silence.current);
    stop();
    stopSpeaking();
    setPhase('idle');
    onClose();
  }, [onClose, stop]);

  // The orb breathes while listening, pulses while speaking, shimmers while thinking.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (!motion || phase === 'paused' || phase === 'unavailable') return undefined;
    const speed = phase === 'speaking' ? 420 : phase === 'thinking' ? 900 : 1300;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion, phase, pulse]);

  const label = {
    listening: transcript ? t('voiceHeard') : t('voiceListening'),
    thinking: t('voiceThinking'),
    speaking: t('voiceSpeaking'),
    paused: t('voicePaused'),
    unavailable: t('voiceUnavailableShort'),
    idle: '',
  }[phase];
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, phase === 'speaking' ? 1.12 : 1.06] });
  const halo = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={end} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.top}>
          <Text style={[{ color: colors.textMuted }, type(12, 'bold', 16)]}>{t('voiceMode')}</Text>
          {title ? <Text numberOfLines={1} style={[{ color: colors.textSecondary }, type(13, 'semiBold', 18)]}>{title}</Text> : null}
        </View>

        <Pressable onPress={tapOrb} accessibilityRole="button" accessibilityLabel={label} style={styles.orbWrap}>
          <Animated.View style={[styles.halo, { backgroundColor: colors.accent, opacity: halo, transform: [{ scale: Animated.multiply(scale, 1.25) }] }]} />
          <Animated.View style={[styles.orb, { backgroundColor: colors.accent, transform: [{ scale }], opacity: phase === 'thinking' ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) : 1 }]}>
            <View style={[styles.orbCore, { backgroundColor: colorWithAlpha('#FFFFFF', phase === 'speaking' ? 0.28 : 0.16) }]} />
          </Animated.View>
        </Pressable>

        <View style={styles.captionBox} accessibilityLiveRegion="polite">
          <Text style={[styles.center, { color: colors.textPrimary }, type(17, 'bold', 24)]}>{label}</Text>
          <Text numberOfLines={5} style={[styles.center, { color: colors.textSecondary, marginTop: 8 }, type(14, 'regular', 21)]}>
            {phase === 'listening' ? transcript : phase === 'speaking' ? caption.replace(/```[\s\S]*?```/g, '').replace(/[#*_`$]/g, '').slice(0, 360) : phase === 'thinking' ? `“${caption}”` : phase === 'unavailable' ? t('voiceUnavailableDesc') : ''}
          </Text>
          {phase === 'speaking' ? <Text style={[styles.center, { color: colors.textMuted, marginTop: 10 }, type(12, 'semiBold', 16)]}>{t('voiceTapToInterrupt')}</Text> : null}
          {!speechAvailable() ? <Text style={[styles.center, { color: colors.textMuted, marginTop: 10 }, type(12, 'regular', 16)]}>{t('voiceNoSpeech')}</Text> : null}
        </View>

        <View style={styles.controls}>
          <Pressable onPress={togglePause} accessibilityRole="button" accessibilityLabel={phase === 'paused' ? t('voiceResume') : t('voicePause')} style={[styles.control, { backgroundColor: colors.cardButton }]}>
            {phase === 'paused' ? <MicrophoneIcon size={24} color={colors.textPrimary} /> : <PauseIcon size={24} color={colors.textPrimary} />}
          </Pressable>
          <Pressable onPress={end} accessibilityRole="button" accessibilityLabel={t('voiceEnd')} style={[styles.control, { backgroundColor: colors.danger }]}>
            <XMarkIcon size={26} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  top: { alignItems: 'center', gap: 4, maxWidth: 520 },
  orbWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  orb: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbCore: { width: 120, height: 120, borderRadius: 60, transform: [{ translateX: -18 }, { translateY: -18 }] },
  captionBox: { width: '100%', maxWidth: 560, minHeight: 150, alignItems: 'center' },
  center: { textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 28, alignItems: 'center' },
  control: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
