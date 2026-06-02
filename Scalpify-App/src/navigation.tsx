import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import JourneyScreen from './screens/JourneyScreen';
import MedsScreen from './screens/MedsScreen';
import ProfileScreen from './screens/ProfileScreen';
import CameraScreen from './screens/CameraScreen';
import ScanResultsScreen from './screens/ScanResultsScreen';
import NorwoodAnalysisScreen from './screens/NorwoodAnalysisScreen';
import RecoveryCalendarScreen from './screens/RecoveryCalendarScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MedicalProfileScreen from './screens/MedicalProfileScreen';
import OnboardingTreatmentScreen from './screens/OnboardingTreatmentScreen';
import OnboardingAgeScreen from './screens/OnboardingAgeScreen';
import OnboardingEthnicityScreen from './screens/OnboardingEthnicityScreen';
import OnboardingFamilyScreen from './screens/OnboardingFamilyScreen';
import OnboardingSurgeryScreen from './screens/OnboardingSurgeryScreen';
import OnboardingRoutineScreen from './screens/OnboardingRoutineScreen';
import OnboardingAdherenceScreen from './screens/OnboardingAdherenceScreen';
import OnboardingSexScreen from './screens/OnboardingSexScreen';
import OnboardingOnsetScreen from './screens/OnboardingOnsetScreen';
import OnboardingGoalsScreen from './screens/OnboardingGoalsScreen';
import OnboardingIntentScreen from './screens/OnboardingIntentScreen';
import OnboardingRemindersScreen from './screens/OnboardingRemindersScreen';
import { colors } from './theme';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  Camera: undefined;
  Journey: undefined;
  NorwoodAnalysis: undefined;
  RecoveryCalendar: undefined;
  MedicalProfile: { onboarding?: boolean } | undefined;
  // Onboarding questionnaire (branched: treatment done vs not done).
  // `edit: true` opens a single screen from Profile to edit that one answer,
  // returning to Profile on save instead of advancing the flow.
  OnbTreatment: { edit?: boolean } | undefined;
  OnbAge: { edit?: boolean } | undefined;
  OnbSex: { edit?: boolean } | undefined;
  OnbOnset: { edit?: boolean } | undefined;
  OnbEthnicity: { edit?: boolean } | undefined;
  OnbFamily: { edit?: boolean } | undefined;
  OnbSurgery: { edit?: boolean } | undefined;
  OnbRoutine: { edit?: boolean } | undefined;
  OnbAdherence: { edit?: boolean } | undefined;
  OnbGoals: { edit?: boolean } | undefined;
  OnbIntent: { edit?: boolean } | undefined;
  OnbReminders: { edit?: boolean } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Scan: undefined;
  Track: undefined;
  Profile: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const items: { name: keyof TabParamList; icon: TabIcon; iconOn: TabIcon; label: string }[] = [
    { name: 'Home', icon: 'grid-outline', iconOn: 'grid', label: 'Home' },
    { name: 'Scan', icon: 'scan-outline', iconOn: 'scan', label: 'Analysis' },
    { name: 'Track', icon: 'calendar-outline', iconOn: 'calendar', label: 'Calendar' },
    { name: 'Profile', icon: 'person-outline', iconOn: 'person', label: 'Profile' },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.tabSafeArea}>
      <View style={styles.tabBar}>
        {items.map((item, i) => {
          const focused = state.index === i;
          return (
            <Pressable
              key={item.name}
              onPress={() => navigation.navigate(item.name)}
              style={styles.tabBtn}
              hitSlop={4}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapOn]}>
                <Ionicons
                  name={focused ? item.iconOn : item.icon}
                  size={focused ? 20 : 22}
                  color={focused ? '#fff' : colors.textMuted}
                />
              </View>
              <Text style={[styles.tabLabel, focused && styles.tabLabelOn]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scan" component={ScanResultsScreen} />
      <Tab.Screen name="Track" component={MedsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.bg,
          card: colors.bg,
          text: colors.text,
          border: colors.border,
          notification: colors.warning,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Journey" component={JourneyScreen} />
        <Stack.Screen name="NorwoodAnalysis" component={NorwoodAnalysisScreen} />
        <Stack.Screen name="RecoveryCalendar" component={RecoveryCalendarScreen} />
        <Stack.Screen name="MedicalProfile" component={MedicalProfileScreen} />

        {/* Onboarding questionnaire (post sign-up, branched) */}
        <Stack.Screen name="OnbTreatment" component={OnboardingTreatmentScreen} />
        <Stack.Screen name="OnbAge" component={OnboardingAgeScreen} />
        <Stack.Screen name="OnbSex" component={OnboardingSexScreen} />
        <Stack.Screen name="OnbOnset" component={OnboardingOnsetScreen} />
        <Stack.Screen name="OnbEthnicity" component={OnboardingEthnicityScreen} />
        <Stack.Screen name="OnbFamily" component={OnboardingFamilyScreen} />
        <Stack.Screen name="OnbSurgery" component={OnboardingSurgeryScreen} />
        <Stack.Screen name="OnbRoutine" component={OnboardingRoutineScreen} />
        <Stack.Screen name="OnbAdherence" component={OnboardingAdherenceScreen} />
        <Stack.Screen name="OnbGoals" component={OnboardingGoalsScreen} />
        <Stack.Screen name="OnbIntent" component={OnboardingIntentScreen} />
        <Stack.Screen name="OnbReminders" component={OnboardingRemindersScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabSafeArea: {
    backgroundColor: colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgBase,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 6,
    minHeight: 64,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOn: {
    backgroundColor: colors.primary,
  },
  tabLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  tabLabelOn: { color: colors.textStrong, fontWeight: '700' },
});
