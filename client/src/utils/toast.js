/**
 * Global Toast Notification Dispatcher
 * @param {'success' | 'error' | 'warning' | 'info'} type
 * @param {string} message
 * @param {string} [title]
 */
export const showToast = (type, message, title = '') => {
  const titles = {
    success: 'Berhasil',
    error: 'Gagal',
    warning: 'Peringatan',
    info: 'Informasi'
  };

  const event = new CustomEvent('kb_toast_notification', {
    detail: {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: type || 'info',
      message: message || '',
      title: title || titles[type] || 'Notifikasi'
    }
  });

  window.dispatchEvent(event);
};
