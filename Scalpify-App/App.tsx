import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import RootNavigator, { navigationRef } from './src/navigation';
import { colors } from './src/theme';
import { GlobalBackground } from './src/components/GlobalBackground';
import { hydrateUser } from './src/userStore';
import { hydrateMeds, markDone, getMedById } from './src/medsStore';
import { hydrateScans } from './src/scanStore';
import { hydrateDailyLog } from './src/dailyLog';
import { hydrateChat } from './src/chatStore';
import { configureNotifications, registerMedNotifications, snoozeMedReminder } from './src/notifications';

// Set the foreground notification behaviour before anything can fire.
configureNotifications();

// Handle a tap / action button on a medication reminder.
function handleMedNotification(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as { medId?: string };
  const medId = data?.medId ? String(data.medId) : null;
  const action = response.actionIdentifier;

  if (action === 'TAKEN' && medId) {
    void markDone(medId, true); // → adherence updates immediately
  } else if (action === 'SNOOZE' && medId) {
    const med = getMedById(medId);
    if (med) void snoozeMedReminder(med, 15);
  } else if (navigationRef.isReady()) {
    // Body tap → open the Track tab so they can mark it done.
    (navigationRef as any).navigate('MainTabs', { screen: 'Track' });
  }
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([hydrateUser(), hydrateMeds(), hydrateScans(), hydrateDailyLog(), hydrateChat()]).finally(() => setReady(true));
  }, []);

  // Register reminder action buttons + listen for taps (foreground, background, cold-start).
  useEffect(() => {
    registerMedNotifications();
    const sub = Notifications.addNotificationResponseReceivedListener(handleMedNotification);
    Notifications.getLastNotificationResponseAsync().then(r => {
      if (r) handleMedNotification(r);
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {/* Global radial-glow background sits behind every screen */}
        <GlobalBackground />
        {ready ? (
          <RootNavigator />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
