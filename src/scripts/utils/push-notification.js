import { convertBase64ToUint8Array } from './index';
import * as CityCareAPI from '../data/api';
import { getAccessToken } from './auth';

const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';


if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === 'MASUKKAN_VAPID_PUBLIC_KEY_DARI_API_DICODING_DI_SINI') {
  console.warn(
    'PERHATIAN: VAPID_PUBLIC_KEY belum diatur dengan benar di src/scripts/utils/push-notification.js. Fitur Push Notification mungkin tidak akan berfungsi.',
  );
}

const requestNotificationPermission = async () => {
  try {
    const permissionResult = await Notification.requestPermission();
    if (permissionResult === 'granted') {
      console.log('Izin notifikasi diberikan.');
      return true;
    }
    console.log('Izin notifikasi ditolak.');
    return false;
  } catch (error) {
    console.error('Kesalahan saat meminta izin notifikasi:', error);
    return false;
  }
};

const getSubscription = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    return existingSubscription;
  } catch (error) {
    console.error('Kesalahan saat mengambil status langganan:', error);
    return null;
  }
};

const subscribePush = async () => {
  // Pengecekan utama apakah VAPID key ada dan valid (tidak kosong atau placeholder)
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === 'MASUKKAN_VAPID_PUBLIC_KEY_DARI_API_DICODING_DI_SINI') {
    alert('Konfigurasi Push Notification belum lengkap (VAPID Key). Harap hubungi administrator.');
    console.error('VAPID_PUBLIC_KEY tidak diatur atau masih placeholder.');
    return null;
  }

  if (!('PushManager' in window)) {
    console.warn('Push messaging tidak didukung di browser ini.');
    alert('Push messaging tidak didukung di browser ini.');
    return null;
  }

  if (!getAccessToken()) {
    console.log('Pengguna belum login, lewati proses langganan push.');
    return null;
  }

  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    alert('Anda tidak mengizinkan notifikasi. Fitur notifikasi tidak dapat diaktifkan.');
    return null;
  }

  let subscription = await getSubscription();
  if (subscription) {
    console.log('Pengguna SUDAH berlangganan.');
    return subscription;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    console.log('Pengguna berhasil berlangganan:', subscription.toJSON());

    const response = await CityCareAPI.subscribePushNotification(subscription.toJSON());
    if (!response.ok) {
      console.error('Gagal mengirim langganan ke server:', response.message);
      // Pertimbangkan untuk membatalkan langganan lokal jika gagal mengirim ke server
      // agar UI tetap konsisten.
      // await subscription.unsubscribe();
      // alert(`Gagal menyimpan langganan notifikasi di server: ${response.message}. Silakan coba lagi.`);
      // return null;
    } else {
      console.log('Langganan berhasil dikirim ke server.');
      alert('Anda berhasil berlangganan notifikasi!');
    }
    return subscription;
  } catch (error) {
    console.error('Gagal melakukan subscribe pengguna: ', error);
    if (error.name === 'NotAllowedError') {
      alert('Anda telah memblokir notifikasi. Harap izinkan dari pengaturan browser Anda.');
    } else if (error.name === 'AbortError') {
      // Ini bisa terjadi jika pengguna menutup dialog izin terlalu cepat atau ada masalah lain.
      console.warn('Proses subscribe dibatalkan atau gagal:', error.message);
      alert('Proses berlangganan notifikasi dibatalkan atau gagal. Silakan coba lagi.');
    } else {
      alert(`Gagal berlangganan notifikasi: ${error.message}`);
    }
    return null;
  }
};

const unsubscribePush = async () => {
  const subscription = await getSubscription();
  if (subscription) {
    try {
      const successful = await subscription.unsubscribe();
      if (successful) {
        console.log('Pengguna berhasil berhenti berlangganan.');
        const response = await CityCareAPI.unsubscribePushNotification({ endpoint: subscription.endpoint });
         if (!response.ok) {
            console.error('Gagal mengirim status unsubscribe ke server:', response.message);
         } else {
            console.log('Status unsubscribe berhasil dikirim ke server.');
         }
        alert('Anda telah berhenti berlangganan notifikasi.');
        return true;
      }
      // Jika `unsubscribe()` mengembalikan false tanpa error
      console.warn('Gagal berhenti berlangganan (operasi unsubscribe tidak berhasil).');
      alert('Gagal berhenti berlangganan notifikasi. Silakan coba lagi.');
      return false;
    } catch (error) {
      console.error('Gagal melakukan unsubscribe pengguna: ', error);
      alert(`Gagal berhenti berlangganan: ${error.message}`);
      return false;
    }
  }
  console.log('Pengguna belum berlangganan, tidak perlu unsubscribe.');
  return false; // Atau true jika dianggap "sudah tidak subscribe"
};

const setupPushNotificationButton = async () => {
  const pushNotificationToolsContainer = document.getElementById('push-notification-tools');
  if (!pushNotificationToolsContainer) {
    // console.warn('Elemen "push-notification-tools" tidak ditemukan.');
    return;
  }

  if (!('serviceWorker' in navigator && 'PushManager' in window) || !getAccessToken()) {
    pushNotificationToolsContainer.innerHTML = '';
    return;
  }

  const existingSubscription = await getSubscription();

  if (existingSubscription) {
    pushNotificationToolsContainer.innerHTML = `
      <button id="unsubscribe-push-button" class="btn btn-outline btn-transparent" title="Berhenti berlangganan notifikasi">
        <i class="fas fa-bell-slash"></i> Unsubscribe
      </button>
    `;
    const unsubButton = document.getElementById('unsubscribe-push-button');
    if (unsubButton) {
        unsubButton.addEventListener('click', async () => {
          await unsubscribePush();
          setupPushNotificationButton(); // Refresh tampilan tombol
        });
    }
  } else {
    pushNotificationToolsContainer.innerHTML = `
      <button id="subscribe-push-button" class="btn btn-outline btn-transparent" title="Berlangganan notifikasi">
        <i class="fas fa-bell"></i> Subscribe
      </button>
    `;
    const subButton = document.getElementById('subscribe-push-button');
    if (subButton) {
        subButton.addEventListener('click', async () => {
          await subscribePush();
          setupPushNotificationButton(); // Refresh tampilan tombol
        });
    }
  }
};

export {
  requestNotificationPermission,
  subscribePush,
  unsubscribePush,
  getSubscription,
  setupPushNotificationButton,
};