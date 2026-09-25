import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckIcon, ChevronRightIcon } from 'react-native-heroicons/outline';
import { Cog8ToothIcon, MoonIcon, SunIcon } from 'react-native-heroicons/solid';
import Card from '../components/Card';
import ElasticPressable from '../components/ElasticPressable';
import { AccentPresets, MORE_ACCENTS, Surfaces, makeColors } from '../constants/colors';
import { FontFamily } from '../constants/fonts';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { LANGUAGE_META, SUPPORTED_LANGUAGES } from '../localization/translations';
import { useAccount } from '../account/AccountContext';

const FONT_OPTIONS = ['small', 'default', 'large', 'extraLarge'];
const ACCENTS = ['orange', 'green', 'blue', 'red', 'purple'];
const SWATCH_SIZE = 28;
const SWATCH_GAP = 7;
const SWATCH_STEP = SWATCH_SIZE + SWATCH_GAP;
const THEME_OPTIONS = [
  { value: 'light', label: 'light', Icon: SunIcon },
  { value: 'dark', label: 'dark', Icon: MoonIcon },
  { value: 'system', label: 'auto', Icon: Cog8ToothIcon },
];
const FLAG_IMAGES = {
  en: require('../../assets/twemoji/en.png'),
  ar: require('../../assets/twemoji/ar.png'),
  es: require('../../assets/twemoji/es.png'),
  fr: require('../../assets/twemoji/fr.png'),
  de: require('../../assets/twemoji/de.png'),
  zh: require('../../assets/twemoji/zh.png'),
  hi: require('../../assets/twemoji/hi.png'),
};

const clamp = (value, min=0, max=1) => Math.max(min, Math.min(max, value));

function Section({ title, children }) {
  const { colors, type, isRTL } = usePreferences();
  return <Card style={[s.section,{backgroundColor:colors.card}]}><Text style={[{color:colors.textPrimary,textAlign:isRTL?'right':'left'},type(17,'bold'),s.sectionTitle]}>{title}</Text><View style={s.sectionBody}>{children}</View></Card>;
}

function Inner({ title, description, children, onPress, danger=false, stack=false }) {
  const { colors, type, isRTL } = usePreferences();
  const content = <View style={[s.inner,stack&&s.innerStack,{backgroundColor:colors.cardButton,flexDirection:stack?'column':(isRTL?'row-reverse':'row')}]}><View style={stack?s.stackCopy:s.copy}><Text numberOfLines={2} style={[{color:danger?colors.danger:colors.textPrimary,textAlign:isRTL?'right':'left'},type(14,'semiBold')]}>{title}</Text>{description?<Text style={[{color:colors.textMuted,textAlign:isRTL?'right':'left'},type(12,'regular',16)]}>{description}</Text>:null}</View>{children}{onPress&&!stack?<ChevronRightIcon size={18} color={colors.textMuted} style={{transform:[{scaleX:isRTL?-1:1}]}}/>:null}</View>;
  return onPress?<ElasticPressable style={s.full} pressableStyle={s.full} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>{content}</ElasticPressable>:content;
}

function Segmented({ value, options, onChange }) {
  const { colors, type, t, isRTL, motion } = usePreferences();
  const normalized = options.map((option) => typeof option === 'string' ? { value: option, label: option } : option);
  const selectedIndex = Math.max(0, normalized.findIndex((option) => option.value === value));
  const visualIndex = isRTL ? normalized.length - 1 - selectedIndex : selectedIndex;
  const [width, setWidth] = useState(0);
  const indicator = useRef(new Animated.Value(visualIndex)).current;
  useEffect(() => {
    Animated.spring(indicator, { toValue: visualIndex, friction: 12, tension: 180, useNativeDriver: false, isInteraction: false }).start();
    if (!motion) indicator.setValue(visualIndex);
  }, [visualIndex, motion, indicator]);
  // The indicator lives inside the 3 px inset on both sides. Using the
  // content width (rather than the outer layout width) keeps Auto's pill
  // from hanging outside the track.
  const unit = normalized.length ? Math.max(0, (width - 6) / normalized.length) : 0;
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[s.segmented,{backgroundColor:colors.cardButtonPressed,flexDirection:isRTL?'row-reverse':'row'}]}>
    <Animated.View pointerEvents="none" style={[s.segmentIndicator,{backgroundColor:colors.accent,width:unit,transform:[{translateX:indicator.interpolate({inputRange:[0,Math.max(1,normalized.length-1)],outputRange:[0,unit*Math.max(0,normalized.length-1)]})}]}]}/>
    {normalized.map((option)=>{const selected=value===option.value;const OptionIcon=option.Icon;return <ElasticPressable key={option.value} style={s.segmentWrap} pressableStyle={s.segment} onPress={()=>onChange(option.value)} accessibilityRole="button" accessibilityLabel={t(option.label)} accessibilityState={{selected}}>{OptionIcon?<OptionIcon size={18} color={colors.white}/>:<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[{color:selected?colors.white:colors.textSecondary,textAlign:'center'},type(11,'semiBold')]}>{t(option.label)}</Text>}</ElasticPressable>;})}
  </View>;
}

function Toggle({ value, onChange, label }) {
  const { colors, motion } = usePreferences();
  const progress=useRef(new Animated.Value(value?1:0)).current;
  useEffect(()=>{progress.stopAnimation();Animated.timing(progress,{toValue:value?1:0,duration:motion?180:0,useNativeDriver:false,isInteraction:false}).start();},[value,motion,progress]);
  return <ElasticPressable onPress={()=>onChange(!value)} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{checked:value}}><View style={[s.switchTrack,{backgroundColor:value?colors.accent:colors.track}]}><Animated.View style={[s.switchThumb,{backgroundColor:colors.white,transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[2,22]})}]}]}/></View></ElasticPressable>;
}

function AccentCheck({ selected }) {
  const { colors, motion }=usePreferences();
  const pop=useRef(new Animated.Value(selected?1:0)).current;
  useEffect(()=>{
    pop.stopAnimation();
    if(!selected){pop.setValue(0);return;}
    if(!motion){pop.setValue(1);return;}
    pop.setValue(0);
    Animated.spring(pop,{toValue:1,friction:5,tension:220,useNativeDriver:true,isInteraction:false}).start();
  },[selected,motion,pop]);
  return <Animated.View style={{opacity:pop.interpolate({inputRange:[0,1],outputRange:[0,1],extrapolate:'clamp'}),transform:[{scale:pop}]}}><CheckIcon size={14} color={colors.white}/></Animated.View>;
}

function AccentSelector({ value, onChange }) {
  const { colors, effectiveTheme, motion, t }=usePreferences();
  const selectedIndex=Math.max(0,ACCENTS.indexOf(value));
  const position=useRef(new Animated.Value(selectedIndex)).current;
  const stretch=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    position.stopAnimation(); stretch.stopAnimation();
    if(!motion){position.setValue(selectedIndex);stretch.setValue(1);return;}
    stretch.setValue(1);
    Animated.sequence([
      Animated.timing(stretch,{toValue:1.36,duration:85,easing:Easing.out(Easing.quad),useNativeDriver:true,isInteraction:false}),
      Animated.parallel([
        Animated.timing(position,{toValue:selectedIndex,duration:125,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false}),
        Animated.sequence([
          Animated.timing(stretch,{toValue:.9,duration:75,easing:Easing.inOut(Easing.quad),useNativeDriver:true,isInteraction:false}),
          Animated.spring(stretch,{toValue:1,friction:5,tension:200,useNativeDriver:true,isInteraction:false}),
        ]),
      ]),
    ]).start();
  },[selectedIndex,motion,position,stretch]);
  return <View style={s.swatches}>
    <Animated.View pointerEvents="none" style={[s.swatchSelectionPosition,{transform:[{translateX:position.interpolate({inputRange:[0,ACCENTS.length-1],outputRange:[0,SWATCH_STEP*(ACCENTS.length-1)]})}]}]}><Animated.View style={[s.swatchSelectionCircle,{backgroundColor:colors.white,opacity:ACCENTS.includes(value)?1:0,transform:[{scaleX:stretch}]}]}/></Animated.View>
    {ACCENTS.map(name=>{const selected=value===name;return <ElasticPressable key={name} style={s.swatchSlot} shape="circle" onPress={()=>onChange(name)} accessibilityLabel={t(name)} accessibilityState={{selected}}><View style={[s.swatch,{backgroundColor:AccentPresets[name][effectiveTheme]}]}><AccentCheck selected={selected}/></View></ElasticPressable>;})}
  </View>;
}

function Sheet({ visible, title, onClose, children, sheetStyle, fixedTitle=false }) {
  const { colors, type, motion }=usePreferences();
  const anim=useRef(new Animated.Value(0)).current; const dragY=useRef(new Animated.Value(0)).current; const dragStart=useRef(0); const sheetHeight=useRef(360); const [mounted,setMounted]=useState(visible);
  useEffect(()=>{anim.stopAnimation();if(visible){dragY.setValue(0);setMounted(true);if(!motion){anim.setValue(1);return;}anim.setValue(0);Animated.spring(anim,{toValue:1,friction:8,tension:90,useNativeDriver:true,isInteraction:false}).start();return;}if(!motion){anim.setValue(0);setMounted(false);return;}Animated.timing(anim,{toValue:0,duration:110,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false}).start(({finished})=>{if(finished)setMounted(false);});},[visible,motion,anim,dragY]);
  const handlePan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:(_,g)=>g.dy>0,onPanResponderGrant:()=>{dragY.stopAnimation(value=>{dragStart.current=value;});},onPanResponderMove:(_,g)=>{dragY.setValue(Math.max(0,dragStart.current+g.dy));},onPanResponderRelease:(_,g)=>{const current=Math.max(0,dragStart.current+g.dy);if(current>84||g.vy>0.7){const target=Math.max(sheetHeight.current+32,current+180);const duration=motion?Math.round(clamp((target-current)/target,.55,1)*220):0;Animated.parallel([Animated.timing(dragY,{toValue:target,duration,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false}),Animated.timing(anim,{toValue:0,duration:motion?90:0,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false})]).start(({finished})=>{if(finished){setMounted(false);onClose();}});}else Animated.spring(dragY,{toValue:0,friction:10,tension:180,useNativeDriver:true,isInteraction:false}).start();},onPanResponderTerminate:()=>Animated.spring(dragY,{toValue:0,friction:10,tension:180,useNativeDriver:true,isInteraction:false}).start()}),[anim,dragY,onClose,motion]);
  if(!mounted&&!visible)return null;
  return <Modal transparent visible={mounted||visible} animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}><View style={s.modalRoot}><Animated.View style={[s.backdrop,{backgroundColor:colors.overlay,opacity:anim}]}><Pressable style={s.backdrop} onPress={onClose}/></Animated.View><Animated.View onLayout={event=>{sheetHeight.current=event.nativeEvent.layout.height;}} style={[s.sheet,sheetStyle,{backgroundColor:colors.card,opacity:anim,transform:[{translateY:Animated.add(anim.interpolate({inputRange:[0,1],outputRange:[360,0]}),dragY)},{scale:anim.interpolate({inputRange:[0,1],outputRange:[.96,1]})}]}]}><View style={s.handleHit} {...handlePan.panHandlers}><View style={[s.handle,{backgroundColor:colors.track}]}/></View><Text includeFontPadding={false} numberOfLines={fixedTitle?1:2} adjustsFontSizeToFit={fixedTitle} minimumFontScale={.75} style={[{color:colors.textPrimary},fixedTitle?s.fixedSheetTitleText:type(18,'bold'),s.sheetTitle]}>{title}</Text>{children}</Animated.View></View></Modal>;
}

function FontSheet({ visible, onClose }) {
  const { colors,type,fontSize,setPreference,t,motion }=usePreferences(); const index=Math.max(0,FONT_OPTIONS.indexOf(fontSize)); const dragProgress=useRef(new Animated.Value(index/3)).current; const [sliderWidthState,setSliderWidthState]=useState(0); const sliderRef=useRef(null); const sliderWidth=useRef(1); const sliderPageX=useRef(0); const dragging=useRef(false); const snapping=useRef(false); const currentIndex=useRef(index); const lastProgress=useRef(index/3); const lastPassed=useRef(index);
  useEffect(()=>{if(!dragging.current&&!snapping.current){const next=index/(FONT_OPTIONS.length-1);currentIndex.current=index;lastPassed.current=index;lastProgress.current=next;dragProgress.stopAnimation();dragProgress.setValue(next);}},[dragProgress,index]);
  const pan=useMemo(()=>{
    const pointFromEvent=(event,gesture)=>{const pageX=gesture?.moveX||gesture?.x0||event?.nativeEvent?.pageX;return Number.isFinite(pageX)?clamp((pageX-sliderPageX.current)/Math.max(1,sliderWidth.current)):lastProgress.current;};
    const applyDrag=(progress)=>{const p=clamp(progress);dragProgress.setValue(p);const previous=lastProgress.current;let passed=lastPassed.current;if(p>previous){while(p>=(passed+1)/3&&passed<FONT_OPTIONS.length-1)passed+=1;}else if(p<previous){while(p<=(passed-1)/3&&passed>0)passed-=1;}lastProgress.current=p;if(passed!==lastPassed.current){lastPassed.current=passed;currentIndex.current=passed;setPreference('fontSize',FONT_OPTIONS[passed]);}};
    const snap=(progress)=>{const snapped=clamp(Math.round(clamp(progress)*(FONT_OPTIONS.length-1)),0,FONT_OPTIONS.length-1);const target=snapped/(FONT_OPTIONS.length-1);dragging.current=false;snapping.current=true;currentIndex.current=snapped;lastPassed.current=snapped;lastProgress.current=target;dragProgress.stopAnimation();if(motion)Animated.spring(dragProgress,{toValue:target,stiffness:420,damping:32,mass:0.6,useNativeDriver:false,isInteraction:false}).start(()=>{snapping.current=false;});else{dragProgress.setValue(target);snapping.current=false;}setPreference('fontSize',FONT_OPTIONS[snapped]);};
    return PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:(event,gesture)=>{snapping.current=false;dragProgress.stopAnimation();dragging.current=true;lastPassed.current=currentIndex.current;lastProgress.current=currentIndex.current/(FONT_OPTIONS.length-1);sliderRef.current?.measureInWindow((x)=>{sliderPageX.current=x;});const local=event?.nativeEvent?.locationX;if(Number.isFinite(local))applyDrag(clamp(local/Math.max(1,sliderWidth.current)));},onPanResponderMove:(event,gesture)=>applyDrag(pointFromEvent(event,gesture)),onPanResponderRelease:()=>snap(lastProgress.current),onPanResponderTerminate:()=>snap(lastProgress.current)});
  },[dragProgress,motion,setPreference]);
  const measureSlider=(event)=>{const nextWidth=Math.max(1,event.nativeEvent.layout.width);sliderWidth.current=nextWidth;setSliderWidthState(nextWidth);requestAnimationFrame(()=>sliderRef.current?.measureInWindow((x)=>{sliderPageX.current=x;}));};
  const animatedTrackWidth=dragProgress.interpolate({inputRange:[0,1],outputRange:[5,Math.max(5,sliderWidthState+5)]}); const animatedThumbLeft=dragProgress.interpolate({inputRange:[0,1],outputRange:[0,Math.max(0,sliderWidthState)]});
  return <Sheet visible={visible} title={t('chooseFontSize')} onClose={onClose} sheetStyle={s.fontSheet} fixedTitle><View style={s.sampleBox}><Text includeFontPadding={false} numberOfLines={1} adjustsFontSizeToFit style={[{color:colors.textPrimary},type(22,'bold'),s.sampleText]}>{t('sampleText')}</Text></View><View ref={sliderRef} style={s.slider} onLayout={measureSlider} {...pan.panHandlers}><View style={[s.track,{backgroundColor:colors.cardButtonPressed}]}/><Animated.View style={[s.activeTrack,{backgroundColor:colors.accent,width:animatedTrackWidth}]}/>{FONT_OPTIONS.map((o,i)=><View key={o} style={[s.point,{left:`${i/(FONT_OPTIONS.length-1)*100}%`,backgroundColor:colors.textSecondary}]}/>) }<Animated.View style={[s.dragThumb,{backgroundColor:colors.accent,transform:[{translateX:animatedThumbLeft}]}]}><View style={[s.dragThumbInner,{backgroundColor:colors.white}]}/></Animated.View></View><View style={s.labels}>{FONT_OPTIONS.map((o,i)=><Text key={o} numberOfLines={2} includeFontPadding={false} style={[s.sliderLabel,{left:`${i/(FONT_OPTIONS.length-1)*100}%`,color:o===fontSize?colors.accent:colors.textMuted}]}>{t(o)}</Text>)}</View></Sheet>;
}

function LanguageSheet({ visible, onClose }) {
  const { colors,type,language,setPreference,t,isRTL }=usePreferences();
  return <Sheet visible={visible} title={t('chooseLanguage')} onClose={onClose}><ScrollView style={s.languageList}>{SUPPORTED_LANGUAGES.map(code=>{const selected=code===language;const meta=LANGUAGE_META[code];return <ElasticPressable key={code} style={s.languageButton} pressableStyle={[s.languageRow,{backgroundColor:colors.cardButton,flexDirection:isRTL?'row-reverse':'row'}]} onPress={()=>{setPreference('language',code);onClose();}} accessibilityRole="button" accessibilityState={{selected}}><Image source={FLAG_IMAGES[meta.flag]} style={s.languageFlag} resizeMode="contain"/><View style={s.copy}><Text style={[{color:selected?colors.accent:colors.textPrimary,textAlign:isRTL?'right':'left'},type(15,'semiBold')]}>{meta.nativeName}</Text><Text style={[{color:selected?colors.accent:colors.textMuted,textAlign:isRTL?'right':'left'},type(12)]}>{meta.names[language]}</Text></View>{selected?<CheckIcon size={20} color={colors.accent}/>:null}</ElasticPressable>;})}</ScrollView></Sheet>;
}

/** The rest of the palette, below Youssef's animated row. */
function MoreAccents({ value, onChange }) {
  const { effectiveTheme, colors, t } = usePreferences();
  return <View style={s.moreAccents}>{MORE_ACCENTS.map(name=>{const selected=value===name;return <ElasticPressable key={name} shape="circle" onPress={()=>onChange(name)} accessibilityLabel={t(name)} accessibilityState={{selected}}><View style={[s.swatch,{backgroundColor:AccentPresets[name][effectiveTheme],borderWidth:selected?3:0,borderColor:colors.white}]}>{selected?<CheckIcon size={14} color={colors.white}/>:null}</View></ElasticPressable>;})}</View>;
}

/** Background styles, each previewed with the current accent. */
function SurfacePicker({ value, onChange }) {
  const { effectiveTheme, colors, type, t, accent: accentName } = usePreferences();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.surfaceRow}>{Object.keys(Surfaces).map(name=>{const selected=(value||'default')===name;const preview=makeColors(effectiveTheme,accentName,name);return <ElasticPressable key={name} shape="pill" onPress={()=>onChange(name)} accessibilityRole="button" accessibilityLabel={t(Surfaces[name].label)} accessibilityState={{selected}}><View style={[s.surfaceTile,{backgroundColor:preview.background,borderColor:selected?colors.accent:preview.border}]}><View style={[s.surfaceCard,{backgroundColor:preview.card}]}><View style={[s.surfaceLine,{backgroundColor:preview.accent,width:'60%'}]}/><View style={[s.surfaceLine,{backgroundColor:preview.track,width:'85%'}]}/></View><Text numberOfLines={1} style={[{color:preview.textPrimary},type(11,'semiBold',14)]}>{t(Surfaces[name].label)}</Text></View></ElasticPressable>;})}</ScrollView>;
}

export default function SettingsScreen(){
  const p=usePreferences(); const {colors,t,type,setPreference,isRTL}=p;
  // Account actions live on the site (export, deletion, re-authentication); guests sign in first.
  const {account,openSite,openAccount}=useAccount(); const signedIn=account.status==='signedIn';
  const accountPage=(path)=>signedIn?openSite(path):openAccount(); const [fontOpen,setFontOpen]=useState(false); const [languageOpen,setLanguageOpen]=useState(false); const lang=LANGUAGE_META[p.language];
  return <View style={[s.root,{backgroundColor:colors.background}]}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <Section title={t('appearance')}>
      <Inner title={t('theme')} description={t('themeDesc')}><Segmented value={p.theme} options={THEME_OPTIONS} onChange={v=>setPreference('theme',v)}/></Inner>
      <Inner title={t('accentColor')} description={t('accentDesc')} stack><View style={s.accentBlock}><AccentSelector value={p.accent} onChange={value=>setPreference('accent',value)}/></View><MoreAccents value={p.accent} onChange={value=>setPreference('accent',value)}/></Inner>
      <Inner title={t('surfaceTitle')} description={t('surfaceDesc')} stack><SurfacePicker value={p.surface} onChange={value=>setPreference('surface',value)}/></Inner>
      <Inner title={t('tintTitle')} description={t('tintDesc')}><Toggle value={!!p.tint} onChange={v=>setPreference('tint',v)} label={t('tintTitle')}/></Inner>
      <Inner title={t('appLanguage')} description={t('languageDesc')} onPress={()=>setLanguageOpen(true)}><View style={s.valueWrap}><Text numberOfLines={1} style={[{color:colors.accent,textAlign:isRTL?'left':'right'},type(13,'semiBold')]}>{lang.nativeName}</Text><Text numberOfLines={1} style={[{color:colors.textMuted,textAlign:isRTL?'left':'right'},type(10)]}>{lang.names[p.language]}</Text></View></Inner>
    </Section>
    <Section title={t('accessibility')}>
      <Inner title={t('fontSize')} description={t('fontSizeDesc')} onPress={()=>setFontOpen(true)}><Text style={[{color:colors.accent},type(12,'semiBold')]}>{t(p.fontSize)}</Text></Inner>
      <Inner title={t('textWeight')} description={t('textWeightDesc')}><Segmented value={p.textWeight} options={['regular','bold']} onChange={v=>setPreference('textWeight',v)}/></Inner>
      <Inner title={t('motion')} description={t('motionDesc')}><Toggle value={p.motion} onChange={v=>setPreference('motion',v)} label={t('motion')}/></Inner>
    </Section>
    <Section title={t('notifications')}>{['studyReminders','quizReminders','sessionReminders'].map(key=><Inner key={key} title={t(key)} description={t(`${key}Desc`)}><Toggle value={p[key]} onChange={v=>setPreference(key,v)} label={t(key)}/></Inner>)}</Section>
    <Section title={t('privacyData')}><Inner title={t('dataAiUsage')} description={t('dataAiUsageDesc')} onPress={()=>openSite('/legal#privacy')}/><Inner title={t('downloadData')} description={t('downloadDataDesc')} onPress={()=>accountPage('/api/account')}/><Inner title={t('deleteData')} description={t('deleteDataDesc')} onPress={()=>accountPage('/account#delete')} danger/></Section>
    <Section title={t('information')}><Inner title={t('whatsNew')} description={t('whatsNewDesc')} onPress={()=>openSite('/showcase#whats-new')}/><Inner title={t('terms')} description={t('termsDesc')} onPress={()=>openSite('/legal#terms')}/><Inner title={t('privacyPolicy')} description={t('privacyPolicyDesc')} onPress={()=>openSite('/legal#privacy')}/><Inner title={t('licenses')} description={t('licensesDesc')} onPress={()=>openSite('/legal#licenses')}/><Inner title={t('version')}><Text style={[{color:colors.textMuted},type(13,'semiBold')]}>{t('currentVersion')}</Text></Inner></Section>
  </ScrollView><FontSheet visible={fontOpen} onClose={()=>setFontOpen(false)}/><LanguageSheet visible={languageOpen} onClose={()=>setLanguageOpen(false)}/></View>;
}

const s=StyleSheet.create({
 root:{flex:1},
 moreAccents:{flexDirection:'row',flexWrap:'wrap',gap:SWATCH_GAP,marginTop:10},
 surfaceRow:{gap:8,paddingVertical:2},
 surfaceTile:{width:92,borderRadius:14,padding:8,gap:6,borderWidth:2},
 surfaceCard:{borderRadius:8,padding:6,gap:4},
 surfaceLine:{height:4,borderRadius:2},
 scroll:{padding:Spacing.md,paddingBottom:Spacing.xl},
 section:{padding:Spacing.md,marginBottom:Spacing.md},sectionTitle:{marginBottom:Spacing.md},sectionBody:{gap:Spacing.sm},
 full:{width:'100%'},inner:{minHeight:68,borderRadius:Radius.md,padding:Spacing.md,alignItems:'center',gap:Spacing.sm},innerStack:{alignItems:'stretch'},copy:{flex:1,minWidth:0},stackCopy:{width:'100%',minWidth:0,flexGrow:0,flexShrink:0},
 segmented:{borderRadius:Radius.pill,padding:3,maxWidth:210,minWidth:136,position:'relative'},segmentIndicator:{position:'absolute',top:3,bottom:3,left:3,borderRadius:Radius.pill},segmentWrap:{flex:1,zIndex:1,alignSelf:'stretch'},segment:{flex:1,width:'100%',minHeight:32,paddingHorizontal:6,borderRadius:Radius.pill,alignItems:'center',justifyContent:'center',backgroundColor:'transparent'},
 accentBlock:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'flex-start'},swatches:{flexDirection:'row',gap:SWATCH_GAP,flexShrink:0,position:'relative'},swatchSlot:{width:SWATCH_SIZE,height:SWATCH_SIZE,zIndex:1},swatch:{width:SWATCH_SIZE,height:SWATCH_SIZE,borderRadius:SWATCH_SIZE/2,alignItems:'center',justifyContent:'center'},swatchSelectionPosition:{position:'absolute',left:-2,top:-2,width:SWATCH_SIZE+4,height:SWATCH_SIZE+4,zIndex:0},swatchSelectionCircle:{width:'100%',height:'100%',borderRadius:(SWATCH_SIZE+4)/2},
 valueWrap:{maxWidth:118},switchTrack:{width:48,height:28,borderRadius:14,justifyContent:'center'},switchThumb:{width:24,height:24,borderRadius:12},
 modalRoot:{flex:1,justifyContent:'flex-end'},backdrop:{position:'absolute',left:0,right:0,top:0,bottom:0},sheet:{borderTopLeftRadius:Radius.lg,borderTopRightRadius:Radius.lg,padding:Spacing.lg,paddingBottom:0,maxHeight:'82%'},fontSheet:{height:300},handleHit:{height:24,alignItems:'center',justifyContent:'center',marginTop:-Spacing.sm,marginBottom:Spacing.sm},handle:{width:42,height:5,borderRadius:3},sheetTitle:{textAlign:'center',marginBottom:Spacing.md},fixedSheetTitleText:{fontSize:18,lineHeight:22,fontFamily:FontFamily.bold,fontWeight:'700'},
 sampleBox:{height:64,alignItems:'center',justifyContent:'center',marginBottom:Spacing.sm},sampleText:{textAlign:'center'},
 slider:{height:48,justifyContent:'center',marginHorizontal:12},track:{position:'absolute',left:-5,right:-5,top:18,height:12,borderRadius:6},activeTrack:{height:12,borderRadius:6,position:'absolute',left:-5,top:18},point:{position:'absolute',top:20,width:8,height:8,borderRadius:4,marginLeft:-4,zIndex:2},dragThumb:{position:'absolute',left:0,top:12,width:24,height:24,borderRadius:12,marginLeft:-12,alignItems:'center',justifyContent:'center',zIndex:3},dragThumbInner:{width:19,height:19,borderRadius:9.5},labels:{height:38,position:'relative',marginHorizontal:12},sliderLabel:{position:'absolute',top:0,width:82,marginLeft:-41,textAlign:'center',fontSize:10,lineHeight:12,fontFamily:FontFamily.semiBold,fontWeight:'600'},
 languageList:{maxHeight:430},languageButton:{marginBottom:Spacing.sm},languageRow:{padding:Spacing.md,borderRadius:Radius.md,alignItems:'center',gap:Spacing.sm},languageFlag:{width:28,height:28}
});
