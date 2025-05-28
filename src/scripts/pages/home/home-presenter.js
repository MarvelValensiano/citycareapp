import { reportMapper } from '../../data/api-mapper';
import {
  saveDataToReportStore,
  getAllDataFromReportStore,
} from '../../utils/indexed-db';

export default class HomePresenter {
  #view;
  #model; // Ini adalah CityCareAPI

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async showReportsListMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showReportsListMap: error:', error);
      // Pertimbangkan untuk menampilkan pesan error di UI peta jika gagal load
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async initialGalleryAndMap() {
    this.#view.showLoading();
    try {
      // Inisialisasi peta bisa berjalan paralel dengan fetch data
      // await this.showReportsListMap(); // Kita panggil nanti setelah data ada jika perlu marker

      let reports = [];
      let apiMessage = 'Data dimuat dari cache offline.';
      let fromCache = false;

      if (navigator.onLine) {
        try {
          console.log('Online: Mencoba mengambil data laporan dari API...');
          const response = await this.#model.getAllReports();

          if (response.ok && response.data) {
            reports = await Promise.all(response.data.map(reportMapper));
            apiMessage = response.message || 'Data laporan berhasil dimuat dari server.';
            console.log('Data laporan berhasil diambil dari API, menyimpan ke IndexedDB...');
            for (const report of reports) {
              await saveDataToReportStore(report);
            }
          } else {
            console.warn('Gagal mengambil data dari API, mencoba dari cache. Pesan API:', response.message);
            fromCache = true;
          }
        } catch (networkError) {
          console.error('Kesalahan jaringan saat mengambil data API, mencoba dari cache:', networkError);
          fromCache = true;
        }
      } else {
        console.log('Offline: Mencoba mengambil data laporan dari IndexedDB...');
        fromCache = true;
      }

      if (fromCache) {
        reports = await getAllDataFromReportStore();
        if (reports.length > 0) {
          apiMessage = navigator.onLine ? 'Gagal terhubung ke server, data ditampilkan dari cache.' : 'Anda offline, data ditampilkan dari cache.';
          console.log('Data laporan berhasil dimuat dari IndexedDB cache.');
        } else {
          apiMessage = navigator.onLine ? 'Gagal mengambil data dari server dan cache kosong.' : 'Anda offline dan tidak ada data laporan tersimpan di cache.';
        }
      }
      
      // Panggil initialMap di sini agar peta siap sebelum reports di-populate (jika ada marker)
      await this.showReportsListMap();

      if (reports && reports.length > 0) {
        this.#view.populateReportsList(apiMessage, reports);
      } else {
        // Jika tidak ada laporan baik dari API maupun cache
        this.#view.populateReportsListEmpty(apiMessage); // Kirim pesan ke populateReportsListEmpty
      }
    } catch (error) {
      console.error('initialGalleryAndMap: Kesalahan umum:', error);
      this.#view.populateReportsListError(error.message);
      // Coba tampilkan dari cache jika terjadi error yang tidak terduga
      try {
        const cachedReports = await getAllDataFromReportStore();
        if (cachedReports.length > 0) {
          this.#view.populateReportsList('Terjadi kesalahan, menampilkan data dari cache.', cachedReports);
        }
      } catch (cacheError) {
        console.error('Gagal memuat dari cache setelah error utama:', cacheError);
      }
    } finally {
      this.#view.hideLoading();
    }
  }
}