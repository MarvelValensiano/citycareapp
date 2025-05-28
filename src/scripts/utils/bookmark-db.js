// src/scripts/utils/bookmark-db.js
import { DB_NAME, DB_VERSION, BOOKMARK_STORE_NAME, openDB as openMainDB } from './indexed-db';
// Kita bisa re-use openDB dari indexed-db.js untuk memastikan konsistensi versi dan upgrade.
// Atau buat fungsi openDB sendiri di sini jika ingin isolasi yang lebih ketat (tapi pastikan versi sinkron).
// Untuk saat ini, mari kita re-use openMainDB dan pastikan onupgradeneeded di indexed-db.js sudah membuat BOOKMARK_STORE_NAME.

/**
 * Menyimpan satu data laporan ke object store 'bookmarked_reports'.
 * @param {object} reportData - Data laporan yang akan di-bookmark.
 */
const saveBookmark = async (reportData) => {
  if (!reportData || !reportData.id) {
    console.warn('Data laporan tidak valid untuk di-bookmark (membutuhkan id):', reportData);
    return false;
  }
  try {
    const db = await openMainDB(); // Menggunakan openDB dari indexed-db.js
    const transaction = db.transaction(BOOKMARK_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BOOKMARK_STORE_NAME);
    store.put(reportData);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('Laporan berhasil di-bookmark:', reportData.id);
        resolve(true);
      };
      transaction.onerror = (event) => {
        console.error('Kesalahan saat menyimpan bookmark:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Gagal membuka DB untuk menyimpan bookmark:', error);
    return false;
  }
};

/**
 * Mengambil semua data laporan dari object store 'bookmarked_reports'.
 * @returns {Promise<Array>} - Array berisi semua laporan yang di-bookmark.
 */
const getAllBookmarks = async () => {
  try {
    const db = await openMainDB();
    const transaction = db.transaction(BOOKMARK_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BOOKMARK_STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = (event) => {
        console.error('Kesalahan saat mengambil semua bookmark:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Gagal membuka DB untuk mengambil semua bookmark:', error);
    return [];
  }
};

/**
 * Mengambil satu data laporan yang di-bookmark berdasarkan ID.
 * @param {string} id - ID laporan yang akan diambil.
 * @returns {Promise<object|undefined>} - Data laporan atau undefined jika tidak ditemukan.
 */
const getBookmarkById = async (id) => {
  try {
    const db = await openMainDB();
    const transaction = db.transaction(BOOKMARK_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BOOKMARK_STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = (event) => {
        console.error(`Kesalahan saat mengambil bookmark by id ${id}:`, event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Gagal membuka DB untuk mengambil bookmark by id:', error);
    return undefined;
  }
};

/**
 * Menghapus satu laporan yang di-bookmark berdasarkan ID.
 * @param {string} id - ID laporan yang akan dihapus dari bookmark.
 */
const deleteBookmark = async (id) => {
  try {
    const db = await openMainDB();
    const transaction = db.transaction(BOOKMARK_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BOOKMARK_STORE_NAME);
    store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('Bookmark berhasil dihapus:', id);
        resolve(true);
      };
      transaction.onerror = (event) => {
        console.error('Kesalahan saat menghapus bookmark:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Gagal membuka DB untuk menghapus bookmark:', error);
    return false;
  }
};

export { saveBookmark, getAllBookmarks, getBookmarkById, deleteBookmark };