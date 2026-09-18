import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserIcon } from 'react-native-heroicons/outline';
import { ProfilePill as M, Radius } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

function ProfilePill({displayName='DisplayName',handle='@handle',backgroundColor}){
 const {colors,type,isRTL}=usePreferences();
 return <View style={[s.pill,{backgroundColor:backgroundColor||colors.card,flexDirection:isRTL?'row-reverse':'row',paddingLeft:isRTL?4:M.PILL_PADDING_LEFT,paddingRight:isRTL?10:M.PILL_PADDING_RIGHT}]}><View style={[s.copy,isRTL&&s.rtlCopy]}><Text includeFontPadding={false} numberOfLines={1} style={[{color:colors.textPrimary,textAlign:'left'},type(M.NAME_SIZE,'semiBold',15)]}>{displayName}</Text><Text includeFontPadding={false} numberOfLines={1} style={[{color:colors.textMuted,textAlign:'left'},type(M.HANDLE_SIZE,'regular',12)]}>{handle}</Text></View><View style={[s.avatar,{backgroundColor:backgroundColor?colors.cardButtonPressed:colors.cardButton}]}><UserIcon size={M.AVATAR_ICON} color={colors.textMuted}/></View></View>;
}
export default React.memo(ProfilePill);
const s=StyleSheet.create({pill:{borderRadius:Radius.pill,paddingVertical:M.PILL_PADDING_VERTICAL,alignItems:'center',gap:M.TEXT_GAP},copy:{flexShrink:1},rtlCopy:{paddingLeft:2},avatar:{width:M.AVATAR_SIZE,height:M.AVATAR_SIZE,borderRadius:Radius.pill,alignItems:'center',justifyContent:'center',flexShrink:0}});
