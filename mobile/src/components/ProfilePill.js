import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { UserIcon } from 'react-native-heroicons/outline';
import { ProfilePill as M, Radius } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { accountLabels, useAccount } from '../account/AccountContext';

function ProfilePill({displayName:nameProp,handle:handleProp,backgroundColor,arena=false,arenaStats}){
 const {colors,type,isRTL,t,motion}=usePreferences();
 const {account}=useAccount(); const labels=accountLabels(account,t); const displayName=nameProp??labels.displayName; const handle=handleProp??labels.handle;
 const expansion=useRef(new Animated.Value(arena?1:0)).current;
 const xp=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(motion)Animated.spring(expansion,{toValue:arena?1:0,stiffness:280,damping:26,mass:0.7,useNativeDriver:false,isInteraction:false}).start();else expansion.setValue(arena?1:0);},[arena,expansion,motion]);
 useEffect(()=>{Animated.timing(xp,{toValue:arena?Math.max(0,Math.min(1,Number(arenaStats?.xp||0)%100/100)):0,duration:motion?520:0,useNativeDriver:false,isInteraction:false}).start();},[arena,arenaStats?.xp,motion,xp]);
 const rating=Number(arenaStats?.rating);
 const rank=Number.isFinite(rating)&&rating>0?(rating>=1800?'Legend':rating>=1500?'Elite':rating>=1300?'Challenger':rating>=1100?'Contender':'Rookie'):'Unranked';
 return <Animated.View style={[s.pill,{backgroundColor:backgroundColor||colors.card,flexDirection:isRTL?'row-reverse':'row',paddingLeft:isRTL?4:M.PILL_PADDING_LEFT,paddingRight:isRTL?10:M.PILL_PADDING_RIGHT}]}><View style={[s.copy,isRTL&&s.rtlCopy]}><Text includeFontPadding={false} numberOfLines={1} style={[{color:colors.textPrimary,textAlign:'left'},type(M.NAME_SIZE,'semiBold',15)]}>{displayName}</Text>{arena?<Animated.View style={{opacity:expansion,maxHeight:expansion.interpolate({inputRange:[0,1],outputRange:[0,24]}),overflow:'hidden'}}><Text includeFontPadding={false} numberOfLines={1} style={[{color:colors.textMuted,textAlign:'left'},type(M.HANDLE_SIZE,'regular',12)]}>{rank} · {arenaStats?.xp||0} XP</Text><View style={[s.xpTrack,{backgroundColor:colors.track}]}><Animated.View style={[s.xpFill,{backgroundColor:colors.accent,width:xp.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}]}/></View></Animated.View>:<Text includeFontPadding={false} numberOfLines={1} style={[{color:colors.textMuted,textAlign:'left'},type(M.HANDLE_SIZE,'regular',12)]}>{handle}</Text>}</View><View style={[s.avatar,{backgroundColor:backgroundColor?colors.cardButtonPressed:colors.cardButton}]}><UserIcon size={M.AVATAR_ICON} color={colors.textMuted}/></View></Animated.View>;
}
export default React.memo(ProfilePill);
const s=StyleSheet.create({pill:{borderRadius:Radius.pill,paddingVertical:M.PILL_PADDING_VERTICAL,alignItems:'center',gap:M.TEXT_GAP},copy:{flexShrink:1},rtlCopy:{paddingLeft:2},xpTrack:{height:3,borderRadius:2,marginTop:3,overflow:'hidden'},xpFill:{height:3,borderRadius:2},avatar:{width:M.AVATAR_SIZE,height:M.AVATAR_SIZE,borderRadius:Radius.pill,alignItems:'center',justifyContent:'center',flexShrink:0}});
