import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cog6ToothIcon, CreditCardIcon, UserIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileMenu as M, ProfilePill as P, Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

const OPTIONS=[{id:'profile',key:'profile',Icon:UserIcon},{id:'plan',key:'planUsage',Icon:CreditCardIcon},{id:'settings',key:'settings',Icon:Cog6ToothIcon}];
const PILL_HEIGHT=P.AVATAR_SIZE+P.PILL_PADDING_VERTICAL*2;

function MenuItem({ Icon, label, onPress }) {
  const { colors, type, isRTL, motion } = usePreferences();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const animate = (toValue) => {
    scale.stopAnimation();
    return motion ? Animated.spring(scale, { toValue, friction: 10, tension: 180, useNativeDriver: true, isInteraction: false }).start() : scale.setValue(1);
  };
  return <Pressable style={s.item} onPress={onPress} onPressIn={() => { setPressed(true); animate(.975); }} onPressOut={() => { setPressed(false); animate(1); }} accessibilityRole="menuitem" accessibilityLabel={label}>
    <Animated.View pointerEvents="none" style={[s.itemHighlight,{backgroundColor:pressed?colors.cardButton:'transparent',transform:[{scaleX:scale}]}]} />
    <View style={[s.itemInner,{flexDirection:isRTL?'row-reverse':'row'}]}><Icon size={M.ICON_SIZE} color={pressed?colors.accent:colors.textSecondary}/><Text style={[{color:pressed?colors.accent:colors.textPrimary},type(M.LABEL_SIZE,'semiBold')]} numberOfLines={1}>{label}</Text></View>
  </Pressable>;
}

function ProfileMenu({visible,onClose,onSelect,placement='below',positionStyle}){
 const insets=useSafeAreaInsets(); const {colors,type,t,isRTL,motion}=usePreferences(); const anim=useRef(new Animated.Value(0)).current; const [mounted,setMounted]=useState(false);
 useEffect(()=>{anim.stopAnimation();if(visible){setMounted(true);anim.setValue(motion?0:1);Animated.timing(anim,{toValue:1,duration:motion?M.ANIMATION_DURATION_MS:0,easing:Easing.out(Easing.back(2)),useNativeDriver:true,isInteraction:false}).start();}else if(mounted){Animated.timing(anim,{toValue:0,duration:motion?M.ANIMATION_DURATION_MS:0,easing:Easing.out(Easing.back(2)),useNativeDriver:true,isInteraction:false}).start(({finished})=>finished&&setMounted(false));}},[visible,motion,anim]);
 if(!mounted&&!visible)return null;
 const resolvedPosition=positionStyle||(isRTL?{left:insets.left+Spacing.md}:{right:insets.right+Spacing.md});
 return <><Pressable pointerEvents={visible?'auto':'none'} style={s.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('closeMenu')}/><Animated.View pointerEvents={visible?'auto':'none'} accessibilityRole="menu" style={[s.menu,placement==='above'?{bottom:insets.bottom+Spacing.sm+PILL_HEIGHT+M.GAP}:{top:insets.top+Spacing.sm+PILL_HEIGHT+M.GAP},resolvedPosition,{backgroundColor:colors.card,shadowColor:colors.black,opacity:anim,transform:[{translateY:anim.interpolate({inputRange:[0,1],outputRange:[placement==='above'?-M.POP_TRANSLATE_Y:M.POP_TRANSLATE_Y,0]})},{scale:anim.interpolate({inputRange:[0,1],outputRange:[M.POP_SCALE_FROM,1]})}]}]}>{OPTIONS.map(({id,key,Icon},index)=><React.Fragment key={id}>{index>0?<View style={[s.divider,{backgroundColor:colors.border}]}/>:null}<MenuItem Icon={Icon} label={t(key)} onPress={()=>{onSelect?.(id);onClose?.();}} /></React.Fragment>)}</Animated.View></>;
}

export default React.memo(ProfileMenu);

const s=StyleSheet.create({backdrop:{position:'absolute',left:0,right:0,top:0,bottom:0,elevation:8,zIndex:1},menu:{position:'absolute',minWidth:168,maxWidth:260,borderRadius:Radius.md,padding:M.PADDING,shadowOffset:{width:0,height:4},shadowOpacity:.3,shadowRadius:8,elevation:9,zIndex:2},divider:{height:StyleSheet.hairlineWidth,marginVertical:2},item:{alignSelf:'stretch',borderRadius:Radius.md,overflow:'hidden'},itemHighlight:{position:'absolute',left:0,right:0,top:4,bottom:4,borderRadius:Radius.md},itemInner:{alignItems:'center',gap:Spacing.sm,paddingVertical:M.ITEM_PADDING_VERTICAL,paddingHorizontal:M.ITEM_PADDING_HORIZONTAL,borderRadius:Radius.md}});
