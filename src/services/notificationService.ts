// FinBag Notification Service (PWA Web Notifications & Service Worker Integration)

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface AppNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionStatus;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return Notification.permission as NotificationPermissionStatus;
  }
};

export const sendAppNotification = async ({
  title,
  body,
  icon = '/pwa-192x192.png',
  badge = '/pwa-192x192.png',
  tag,
  data,
}: AppNotificationOptions): Promise<boolean> => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    // 1. Prefer Service Worker registration for native PWA notifications
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          data,
          // Vibration pattern for mobile devices (200ms on, 100ms off, 200ms on)
          vibrate: [200, 100, 200],
        } as NotificationOptions);
        return true;
      }
    }

    // 2. Direct Window Notification fallback
    new Notification(title, {
      body,
      icon,
      tag,
      data,
    });
    return true;
  } catch (err) {
    console.warn('Failed to dispatch web notification:', err);
    return false;
  }
};

// Budget Alert Notification Helper
export const triggerBudgetAlertNotification = async (
  categoryName: string,
  percentage: number,
  spentFormatted: string,
  limitFormatted: string,
  lang: 'id' | 'en' = 'id'
) => {
  const isOver = percentage >= 100;
  const title = isOver
    ? lang === 'id' 
      ? `🚨 Pagu Anggaran Terlampaui (${categoryName})` 
      : `🚨 Budget Limit Exceeded (${categoryName})`
    : lang === 'id'
      ? `⚠️ Peringatan Anggaran Mendekati Batas (${categoryName})`
      : `⚠️ Budget Warning Near Limit (${categoryName})`;

  const body = isOver
    ? lang === 'id'
      ? `Pengeluaran ${categoryName} telah mencapai ${Math.round(percentage)}% (${spentFormatted} dari batas ${limitFormatted}).`
      : `Spending for ${categoryName} has reached ${Math.round(percentage)}% (${spentFormatted} of ${limitFormatted} limit).`
    : lang === 'id'
      ? `Pengeluaran ${categoryName} sudah ${Math.round(percentage)}% dari batas bulanan (${spentFormatted} / ${limitFormatted}).`
      : `Spending for ${categoryName} is at ${Math.round(percentage)}% of monthly limit (${spentFormatted} / ${limitFormatted}).`;

  return sendAppNotification({
    title,
    body,
    tag: `budget-alert-${categoryName}`,
  });
};

// Goal Milestone Notification Helper
export const triggerGoalAchievedNotification = async (
  goalTitle: string,
  targetFormatted: string,
  lang: 'id' | 'en' = 'id'
) => {
  const title = lang === 'id'
    ? `🎉 Target Tabungan Tercapai: ${goalTitle}!`
    : `🎉 Savings Goal Reached: ${goalTitle}!`;

  const body = lang === 'id'
    ? `Selamat! Target tabungan Anda sebesar ${targetFormatted} telah tercapai 100%. Kerja bagus!`
    : `Congratulations! Your savings goal target of ${targetFormatted} is 100% complete. Outstanding!`;

  return sendAppNotification({
    title,
    body,
    tag: `goal-achieved-${goalTitle}`,
  });
};

// Test Notification Helper
export const triggerTestNotification = async (lang: 'id' | 'en' = 'id') => {
  const title = lang === 'id'
    ? '🔔 FinBag: Notifikasi Berhasil Terhubung!'
    : '🔔 FinBag: Notification Connected!';

  const body = lang === 'id'
    ? 'Sistem notifikasi FinBag telah aktif di perangkat Anda. Anda akan menerima peringatan anggaran dan progres tabungan.'
    : 'FinBag notification system is active on your device. You will receive budget alerts and savings milestones.';

  return sendAppNotification({
    title,
    body,
    tag: 'finbag-test-ping',
  });
};
