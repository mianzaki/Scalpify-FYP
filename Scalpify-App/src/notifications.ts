import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const MED_CATEGORY = 'MED_REMINDER';
const ANDROID_CHANNEL = 'med-reminders';

type MedLike = { id: string; name: string; type: string; time: string };

/** Foreground behaviour: show the banner + play a sound even while the app is open. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Register the "Taken ✓ / Snooze" action buttons + the Android channel. Call once at startup. */
export async function registerMedNotifications() {
  try {
    await Notifications.setNotificationCategoryAsync(MED_CATEGORY, [
      { identifier: 'TAKEN', buttonTitle: 'Taken ✓', options: { opensAppToForeground: true } },
      { identifier: 'SNOOZE', buttonTitle: 'Snooze 15m', options: { opensAppToForeground: true } },
    ]);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Medication reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch {
    // notifications unsupported (e.g. Expo Go limitation) — fail soft
  }
}

/** Ask for permission (returns true if granted). Call when the user enables a reminder. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/** Schedule a daily repeating reminder at the med's time. Returns the notification id. */
export async function scheduleDailyMedReminder(med: MedLike): Promise<string | null> {
  const [hh, mm] = med.time.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Treatment reminder',
        body: `Time for ${med.name}${med.type ? ` · ${med.type}` : ''}`,
        categoryIdentifier: MED_CATEGORY,
        data: { medId: med.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hh,
        minute: mm,
        channelId: ANDROID_CHANNEL,
      },
    });
  } catch {
    return null;
  }
}

/** Cancel a previously-scheduled reminder. */
export async function cancelMedReminder(notificationId: string | null | undefined) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already gone — ignore
  }
}

/** Fire a one-off test reminder ~5 seconds from now. Returns false if not permitted. */
export async function sendTestReminder(): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Test reminder',
        body: 'If you can see this, reminders are working! 🎉',
        categoryIdentifier: MED_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
        channelId: ANDROID_CHANNEL,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** One-off reminder N minutes from now (used by the Snooze action). */
export async function snoozeMedReminder(med: MedLike, minutes = 15) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Treatment reminder',
        body: `Snoozed: ${med.name}${med.type ? ` · ${med.type}` : ''}`,
        categoryIdentifier: MED_CATEGORY,
        data: { medId: med.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60,
        repeats: false,
        channelId: ANDROID_CHANNEL,
      },
    });
  } catch {
    // ignore
  }
}
