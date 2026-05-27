import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation';
import { colors } from './src/theme';
import { hydrateUser } from './src/userStore';
import { hydrateMeds } from './src/medsStore';
import { hydrateScans } from './src/scanStore';
import { hydrateDailyLog } from './src/dailyLog';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([hydrateUser(), hydrateMeds(), hydrateScans(), hydrateDailyLog()]).finally(() => setReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {ready ? (
          <RootNavigator />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
