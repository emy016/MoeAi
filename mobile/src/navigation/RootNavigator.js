import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import Header from '../components/Header';
import ProfileMenu from '../components/ProfileMenu';
import CommunityScreen from '../screens/CommunityScreen';
import HomeScreen from '../screens/HomeScreen';
import PracticeScreen from '../screens/PracticeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SimulatorsScreen from '../screens/SimulatorsScreen';
import { Pager } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { useAccount } from '../account/AccountContext';
import CustomTabBar, { TAB_ORDER } from './CustomTabBar';

const COMPONENTS={Home:React.memo(HomeScreen),Practice:React.memo(PracticeScreen),Simulators:React.memo(SimulatorsScreen),Community:React.memo(CommunityScreen)};
const TITLE_KEYS={Home:'home',Practice:'practice',Simulators:'simulators',Community:'community'};
const LAST_INDEX=TAB_ORDER.length-1;
const horizontal=({dx,dy})=>Math.abs(dx)>Pager.SWIPE_MIN_DX&&Math.abs(dx)>Math.abs(dy)*Pager.SWIPE_DIRECTION_LOCK;

export default function RootNavigator(){
 const {width}=useWindowDimensions(); const {colors,t,motion}=usePreferences(); const [tabIndex,setTabIndex]=useState(0); const [direction,setDirection]=useState(1); const [menuOpen,setMenuOpen]=useState(false); const [route,setRoute]=useState('tabs');
 const progress=useRef(new Animated.Value(0)).current; const dragStart=useRef(0); const homeResetRef=useRef(null);
 const registerHomeReset=useCallback((reset)=>{homeResetRef.current=reset;},[]);
 const closeSettings=useCallback(()=>{setRoute('tabs');if(tabIndex===0)requestAnimationFrame(()=>homeResetRef.current?.());},[tabIndex]);
 useEffect(()=>{progress.stopAnimation();if(!motion){progress.setValue(tabIndex);return;}Animated.spring(progress,{toValue:tabIndex,friction:Pager.FRICTION,tension:Pager.TENSION,overshootClamping:tabIndex===0||tabIndex===LAST_INDEX,useNativeDriver:true,isInteraction:false}).start();},[tabIndex,progress,motion]);
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(menuOpen){setMenuOpen(false);return true;}if(route==='settings'){closeSettings();return true;}return false;});return()=>sub.remove();},[menuOpen,route,closeSettings]);
 const select=useCallback((next)=>{if(next!==tabIndex){setDirection(next>tabIndex?1:-1);setTabIndex(next);if(next===0)requestAnimationFrame(()=>homeResetRef.current?.());}},[tabIndex]);
 const snap=useCallback(()=>Animated.spring(progress,{toValue:tabIndex,friction:Pager.FRICTION,tension:Pager.TENSION,overshootClamping:tabIndex===0||tabIndex===LAST_INDEX,useNativeDriver:true,isInteraction:false}).start(),[progress,tabIndex]);
 const swipe=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>false,onMoveShouldSetPanResponder:(_,g)=>route==='tabs'&&horizontal(g),onMoveShouldSetPanResponderCapture:()=>false,onPanResponderGrant:()=>{progress.stopAnimation();dragStart.current=tabIndex;progress.setValue(tabIndex);},onPanResponderMove:(_,g)=>{const next=Math.max(0,Math.min(LAST_INDEX,dragStart.current-g.dx/width));progress.setValue(next);},onPanResponderRelease:(_,g)=>{const threshold=Math.max(Pager.SWIPE_THRESHOLD_PX,width*Pager.SWIPE_THRESHOLD_FRACTION);const flick=Math.abs(g.vx)>Pager.SWIPE_FLICK_VELOCITY&&Math.abs(g.dx)>Pager.SWIPE_FLICK_MIN_DX;if((g.dx<-threshold||(flick&&g.vx<0))&&tabIndex<LAST_INDEX)select(tabIndex+1);else if((g.dx>threshold||(flick&&g.vx>0))&&tabIndex>0)select(tabIndex-1);else snap();},onPanResponderTerminate:snap,onPanResponderTerminationRequest:()=>false}),[width,tabIndex,route]);
 const settings=route==='settings'; const translateX=progress.interpolate({inputRange:[0,LAST_INDEX],outputRange:[0,-LAST_INDEX*width],extrapolate:'clamp'});
 const openSettings=useCallback(()=>{setMenuOpen(false);setRoute('settings');},[]);
 const toggleMenu=useCallback(()=>setMenuOpen(open=>!open),[]);
 const closeMenu=useCallback(()=>setMenuOpen(false),[]);
 const {openAccount}=useAccount();
 const selectMenuItem=useCallback((id)=>{if(id==='settings')openSettings();else if(id==='profile')openAccount();},[openAccount,openSettings]);
 return <View style={[s.root,{backgroundColor:colors.background}]}><Header title={settings?t('settings'):t(TITLE_KEYS[TAB_ORDER[tabIndex]])} direction={direction} menuOpen={menuOpen} settings={settings} onBack={closeSettings} onPillPress={toggleMenu}/><View pointerEvents={settings?'none':'auto'} style={[s.viewport,settings&&s.hidden]} {...swipe.panHandlers}><Animated.View style={[s.strip,{width:width*TAB_ORDER.length,transform:[{translateX}]}]}>{TAB_ORDER.map((name,index)=>{const Screen=COMPONENTS[name];return <View key={name} style={[s.page,{width}]}><Screen active={!settings&&index===tabIndex} registerCurrentWeekReset={name==='Home'?registerHomeReset:undefined} onOpenSettings={name==='Home'?openSettings:undefined}/></View>;})}</Animated.View></View>{settings?<View style={s.viewport}><SettingsScreen/></View>:<CustomTabBar index={tabIndex} onSelect={select}/>}<ProfileMenu visible={menuOpen&&!settings} onClose={closeMenu} onSelect={selectMenuItem}/></View>;
}
const s=StyleSheet.create({root:{flex:1},viewport:{flex:1,overflow:'hidden'},hidden:{display:'none'},strip:{flex:1,flexDirection:'row'},page:{flex:1}});
