import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArrowLeftIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import ElasticPressable from './ElasticPressable';
import ProfilePill from './ProfilePill';

export default function Header({ title, subtitle, direction=1, menuOpen=false, onPillPress, settings=false, onBack, arenaStats }) {
  const insets=useSafeAreaInsets(); const {width}=useWindowDimensions(); const {colors,type,motion,t,isRTL}=usePreferences();
  const [displayed,setDisplayed]=useState(title); const [titleWidth,setTitleWidth]=useState(0); const target=useRef(title); const displayedRef=useRef(title);
  const swap=useRef(new Animated.Value(1)).current; const mode=useRef(new Animated.Value(settings?1:0)).current;
  const innerSwap=useRef(new Animated.Value(1)).current;
  const [displayedSubtitle,setDisplayedSubtitle]=useState(subtitle);
  useEffect(()=>{if(subtitle===displayedSubtitle)return;innerSwap.stopAnimation();if(!motion){setDisplayedSubtitle(subtitle);innerSwap.setValue(1);return;}Animated.timing(innerSwap,{toValue:0,duration:90,useNativeDriver:true,isInteraction:false}).start(()=>{setDisplayedSubtitle(subtitle);Animated.timing(innerSwap,{toValue:1,duration:150,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false}).start();});},[subtitle,displayedSubtitle,motion,innerSwap]);
  useEffect(()=>{target.current=title;if(title===displayedRef.current)return;displayedRef.current=title;setDisplayed(title);swap.stopAnimation();if(!motion){swap.setValue(1);return;}swap.setValue(0);Animated.timing(swap,{toValue:1,duration:HeaderTitle.DURATION_MS,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false}).start();},[title,motion,swap]);
  useEffect(()=>{mode.stopAnimation();if(!motion){mode.setValue(settings?1:0);return;}Animated.spring(mode,{toValue:settings?1:0,friction:8,tension:125,useNativeDriver:true,isInteraction:false}).start();},[settings,motion,mode]);
  const edge = isRTL ? insets.right + Spacing.md : insets.left + Spacing.md;
  const oppositeEdge = isRTL ? insets.left + Spacing.md : insets.right + Spacing.md;
  const left = insets.left + Spacing.md;
  const centerTravel=Math.max(0,(width-titleWidth)/2-edge);
  const travel=direction*(isRTL?-1:1)*HeaderTitle.SLIDE_DISTANCE;
  const titlePosition = isRTL ? { right: edge } : { left: edge };
  const centeredShift = isRTL ? -centerTravel : centerTravel;
  return <View style={[s.container,{minHeight:insets.top+62,backgroundColor:colors.background,paddingTop:insets.top+Spacing.sm,paddingLeft:left,paddingRight:insets.right+Spacing.md}]}> 
    <Animated.View pointerEvents={settings?'auto':'none'} style={[s.backSlot,isRTL?{right:oppositeEdge}:{left:edge},{opacity:mode,transform:[{scale:mode},{translateX:mode.interpolate({inputRange:[0,1],outputRange:[isRTL?10:-10,0]})}]}]}><ElasticPressable shape="circle" onPress={onBack} accessibilityRole="button" accessibilityLabel={t('back')}><View style={[s.backCircle,{backgroundColor:colors.card}]}><ArrowLeftIcon size={22} color={colors.textPrimary} style={{transform:[{scaleX:isRTL?-1:1}]}}/></View></ElasticPressable></Animated.View>
    <Animated.View onLayout={e=>setTitleWidth(e.nativeEvent.layout.width)} style={[s.titleWrap,titlePosition,{transform:[{translateX:Animated.add(mode.interpolate({inputRange:[0,1],outputRange:[0,centeredShift]}),swap.interpolate({inputRange:[0,.49,.51,1],outputRange:[0,-travel,travel,0]}))}]}]}><Animated.Text includeFontPadding={false} numberOfLines={1} style={[{color:colors.textPrimary,opacity:swap,textAlign:isRTL?'right':'left'},type(20,'bold',24)]}>{displayed}</Animated.Text>{!settings&&title===t('practice')&&displayedSubtitle?<Animated.Text style={[{color:colors.textMuted,opacity:innerSwap,marginLeft:6,transform:[{translateY:innerSwap.interpolate({inputRange:[0,1],outputRange:[displayedSubtitle==='Arena'?-9:9,0]})}]},type(11,'semiBold',15)]}>{displayedSubtitle}</Animated.Text>:null}</Animated.View>
    <Animated.View pointerEvents={settings?'none':'auto'} style={[s.right,isRTL?{left:insets.left+Spacing.md}:{right:insets.right+Spacing.md},{opacity:mode.interpolate({inputRange:[0,1],outputRange:[1,0]}),transform:[{scale:mode.interpolate({inputRange:[0,1],outputRange:[1,.85]})}]}]}><ElasticPressable onPress={onPillPress} accessibilityRole="button" accessibilityLabel={t('profileMenu')} accessibilityState={{expanded:menuOpen}} hitSlop={8}><ProfilePill arena={title===t('practice')&&subtitle==='Arena'} arenaStats={arenaStats}/></ElasticPressable></Animated.View>
  </View>;
}

const s=StyleSheet.create({container:{paddingBottom:Spacing.md,justifyContent:'center'},titleWrap:{position:'absolute',bottom:Spacing.md,flexDirection:'row',alignItems:'baseline'},right:{position:'absolute',bottom:Spacing.sm},backSlot:{position:'absolute',bottom:Spacing.sm},backCircle:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'}});
