const DB_NAME = 'citycare-db';
const DB_VERSION = 1; // Mulai dengan versi 1
const REPORT_STORE_NAME = 'reports'; // Object store untuk cache laporan umum
const BOOKMARK_STORE_NAME = 'bookmarked_reports'; // Object store untuk bookmark

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject('Browser Anda tidak mendukung IndexedDB.');
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(`Kesalahan database: ${event.target.errorCode || event.target.error.name}`);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('Upgrade IndexedDB diperlukan. Versi lama:', event.oldVersion, 'Versi baru:', event.newVersion);

      // Buat object store untuk cache laporan umum jika belum ada
      if (!db.objectStoreNames.contains(REPORT_STORE_NAME)) {
        const reportObjectStore = db.createObjectStore(REPORT_STORE_NAME, { keyPath: 'id' });
        console.log('Object store dibuat:', REPORT_STORE_NAME);
      }

      // Buat object store untuk laporan yang dibookmark jika belum ada
      if (!db.objectStoreNames.contains(BOOKMARK_STORE_NAME)) {
        const bookmarkObjectStore = db.createObjectStore(BOOKMARK_STORE_NAME, { keyPath: 'id' });
        console.log('Object store dibuat:', BOOKMARK_STORE_NAME);
      }
    };
  });
};

/**
 * Menyimpan satu data laporan ke object store 'reports'.
 * Akan meng-update jika data dengan keyPath (id) yang sama sudah ada.
 * @param {object} reportData - Data laporan yang akan disimpan.
 */
const saveDataToReportStore = async (reportData) => {
  if (!reportData || !reportData.id) {
    console.warn('Data laporan tidak valid untuk disimpan (membutuhkan id):', reportData);
    return false;
  }
  try {
    const db = await openDB();
    const transaction = db.transaction(REPORT_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(REPORT_STORE_NAME);
    store.put(reportData);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('Data laporan disimpan/diupdate ke cache:', reportData.id);
        resolve(true);
      };
      transaction.onerror = (event) => {
        console.error('Kesalahan saat menyimpan data laporan ke cache:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Gagal membuka DB untuk menyimpan data laporan ke cache:', error);
    return false;
  }
};

/**
 * Mengambil semua data laporan dari object store 'reports'.
 * @returns {Promise<Array>} - Array berisi semua data laporan.
 */
const getAllDataFromReportStore = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(REPORT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(REPORT_STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || []); // Kembalikan array kosong jika tidak ada hasil
      };
      request.onerror = (event) => {
        console.error('Kesalahan saat mengambil semua data laporan dari cache:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Gagal membuka DB untuk mengambil semua data laporan dari cache:', error);
    return []; // Kembalikan array kosong jika gagal buka DB
  }
};

/**
 * Mengambil satu data laporan berdasarkan ID dari object store 'reports'.
 * @param {string} id
 * @returns {Promise<object|undefined>} 
 */
const getDataByIdFromReportStore = async (id) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(REPORT_STORE_NAME, 'readonly');
    const store = transaction.objectStore(REPORT_STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result); 
      };
      request.onerror = (event) => {
        console.error(`Kesalahan saat mengambil data laporan by id ${id} dari cache:`, event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Gagal membuka DB untuk mengambil data laporan by id dari cache:', error);
    return undefined;
  }
};


export {
  openDB,
  saveDataToReportStore,
  getAllDataFromReportStore,
  getDataByIdFromReportStore,
  REPORT_STORE_NAME, 
  BOOKMARK_STORE_NAME, 
  DB_VERSION, 
  DB_NAME, 
};