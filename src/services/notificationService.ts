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

// Low Balance Alert Helper
export const triggerLowBalanceNotification = async (
  walletName: string,
  balanceFormatted: string,
  lang: 'id' | 'en' = 'id'
) => {
  const title = lang === 'id'
    ? `⚠️ Saldo Rekening Rendah (${walletName})`
    : `⚠️ Low Balance Warning (${walletName})`;

  const body = lang === 'id'
    ? `Sisa saldo di ${walletName} tinggal ${balanceFormatted}. Segera lakukan top-up atau perhatikan pos pengeluaran Anda.`
    : `Remaining balance in ${walletName} is now ${balanceFormatted}. Consider topping up or monitoring upcoming expenses.`;

  return sendAppNotification({
    title,
    body,
    tag: `low-balance-${walletName}`,
  });
};

// Weekly Summary Notification Helper
export const triggerWeeklySummaryNotification = async (
  totalSpentFormatted: string,
  topCategoryName: string,
  lang: 'id' | 'en' = 'id'
) => {
  const title = lang === 'id'
    ? '📊 Laporan Ringkasan Mingguan FinBag'
    : '📊 FinBag Weekly Financial Summary';

  const body = lang === 'id'
    ? `Total pengeluaran minggu ini: ${totalSpentFormatted}. Pengeluaran terbesar tercatat pada kategori ${topCategoryName}.`
    : `Total spending this week: ${totalSpentFormatted}. Your highest expenditure was in ${topCategoryName}.`;

  return sendAppNotification({
    title,
    body,
    tag: 'weekly-summary-alert',
  });
};

// Transaction Reminder Helper
export const triggerTransactionReminderNotification = async (lang: 'id' | 'en' = 'id') => {
  const title = lang === 'id'
    ? '📝 Sudahkah Anda Mencatat Pengeluaran Hari Ini?'
    : '📝 Have you logged your expenses today?';

  const body = lang === 'id'
    ? 'Catat transaksi hari ini dengan cepat atau gunakan fitur Scan Struk AI untuk menjaga akurasi anggaran Anda.'
    : 'Quickly record today’s expenses or scan receipts with AI to keep your budget accurate.';

  return sendAppNotification({
    title,
    body,
    tag: 'daily-tx-reminder',
  });
};

// Test Notification Helper
export const triggerTestNotification = async (lang: 'id' | 'en' = 'id') => {
  const title = lang === 'id'
    ? '🔔 FinBag: Notifikasi Berhasil Terhubung!'
    : '🔔 FinBag: Notification Connected!';

  const body = lang === 'id'
    ? 'Sistem notifikasi FinBag telah aktif di perangkat Anda. Anda dapat mengatur jenis notifikasi yang ingin diterima di menu Pengaturan.'
    : 'FinBag notification system is active on your device. You can customize which notification types to receive in Settings.';

  return sendAppNotification({
    title,
    body,
    tag: 'finbag-test-ping',
  });
};

