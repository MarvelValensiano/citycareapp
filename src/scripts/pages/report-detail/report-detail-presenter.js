import { reportMapper } from '../../data/api-mapper';
import {
  saveDataToReportStore,
  getDataByIdFromReportStore,
} from '../../utils/indexed-db';
import {
  saveBookmark,
  deleteBookmark,
  getBookmarkById,
} from '../../utils/bookmark-db'; // Pastikan impor ini ada dan benar

export default class ReportDetailPresenter {
  #reportId;
  #view;
  #apiModel;
  #currentReportData = null;

  constructor(reportId, { view, apiModel }) {
    this.#reportId = reportId;
    this.#view = view;
    this.#apiModel = apiModel;
  }

  async showReportDetailMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showReportDetailMap: error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async showReportDetail() {
    this.#view.showReportDetailLoading();
    let report;
    let apiMessage = 'Data detail dimuat dari cache offline.';
    let fromCache = false;
    this.#currentReportData = null; // Reset current report data

    if (navigator.onLine) {
      try {
        console.log(`Online: Mencoba mengambil detail laporan ${this.#reportId} dari API...`);
        const response = await this.#apiModel.getReportById(this.#reportId);

        if (response.ok && response.data) {
          report = await reportMapper(response.data);
          this.#currentReportData = report;
          apiMessage = response.message || 'Detail laporan berhasil dimuat dari server.';
          console.log('Detail laporan berhasil diambil dari API, menyimpan ke IndexedDB cache...');
          if (report) { // Pastikan report ada sebelum disimpan
            await saveDataToReportStore(report);
          }
        } else {
          console.warn(`Gagal mengambil detail laporan ${this.#reportId} dari API, mencoba dari cache. Pesan API:`, response.message);
          fromCache = true;
        }
      } catch (networkError) {
        console.error(`Kesalahan jaringan saat mengambil detail laporan ${this.#reportId}, mencoba dari cache:`, networkError);
        fromCache = true;
      }
    } else {
      console.log(`Offline: Mencoba mengambil detail laporan ${this.#reportId} dari IndexedDB cache...`);
      fromCache = true;
    }

    if (fromCache) {
      report = await getDataByIdFromReportStore(this.#reportId);
      this.#currentReportData = report;
      if (report) {
        apiMessage = navigator.onLine ? `Gagal terhubung ke server, detail laporan ${this.#reportId} ditampilkan dari cache.` : `Anda offline, detail laporan ${this.#reportId} ditampilkan dari cache.`;
        console.log(`Detail laporan ${this.#reportId} berhasil dimuat dari IndexedDB cache.`);
      } else {
        apiMessage = navigator.onLine ? `Gagal mengambil detail dari server dan cache untuk laporan ${this.#reportId} kosong.` : `Anda offline dan detail laporan ${this.#reportId} tidak tersimpan di cache.`;
      }
    }
    
    if (report) {
      this.#view.populateReportDetailAndInitialMap(apiMessage, report);
    } else {
      this.#view.populateReportDetailError(apiMessage || `Detail laporan dengan ID ${this.#reportId} tidak ditemukan.`);
    }
    
    // Selalu panggil showSaveButton setelah data (atau ketiadaan data) diketahui
    // dan setelah #currentReportData di-set.
    await this.showSaveButton(); 
    this.#view.hideReportDetailLoading();
  }

  async getCommentsList() {
    this.#view.showCommentsLoading();
    try {
      const response = await this.#apiModel.getAllCommentsByReportId(this.#reportId);
      if (response.ok && response.data) { // Periksa juga response.data
        this.#view.populateReportDetailComments(response.message, response.data);
      } else {
        this.#view.populateCommentsListError(response.message || 'Gagal mengambil komentar.');
        // Jika offline, mungkin tampilkan pesan bahwa komentar tidak bisa dimuat offline
        if (!navigator.onLine) {
            this.#view.populateCommentsListError('Komentar tidak dapat dimuat saat offline.');
        }
      }
    } catch (error) {
      console.error('getCommentsList: error:', error);
      this.#view.populateCommentsListError(error.message);
    } finally {
      this.#view.hideCommentsLoading();
    }
  }

  async postNewComment({ body }) {
    this.#view.showSubmitLoadingButton();
    try {
      // Pastikan online untuk post komentar
      if (!navigator.onLine) {
        alert('Anda harus online untuk mengirim komentar.');
        this.#view.postNewCommentFailed('Tidak ada koneksi internet.');
        return;
      }

      const response = await this.#apiModel.storeNewCommentByReportId(this.#reportId, { body });

      if (!response.ok) {
        console.error('postNewComment: response error:', response);
        this.#view.postNewCommentFailed(response.message);
        return;
      }
      this.#view.postNewCommentSuccessfully(response.message, response.data);
    } catch (error) {
      console.error('postNewComment: error:', error);
      this.#view.postNewCommentFailed(error.message);
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }

  async #isReportBookmarked() {
    if (!this.#reportId) return false;
    const bookmarkedReport = await getBookmarkById(this.#reportId);
    return !!bookmarkedReport;
  }

  async showSaveButton() {
    // Hanya tampilkan tombol jika ada data laporan yang berhasil dimuat (#currentReportData tidak null)
    const saveActionsContainer = document.getElementById('save-actions-container');
    if (!saveActionsContainer) {
        console.warn('Elemen save-actions-container tidak ditemukan.');
        return;
    }

    if (!this.#currentReportData) {
        saveActionsContainer.innerHTML = ''; // Kosongkan jika tidak ada data laporan
        return;
    }

    if (await this.#isReportBookmarked()) {
      this.#view.renderRemoveButton(); // View akan menambahkan event listener
    } else {
      this.#view.renderSaveButton(); // View akan menambahkan event listener
    }
  }

  async handleSaveReport() {
    if (!this.#currentReportData || !this.#currentReportData.id) {
      alert('Tidak ada data laporan yang valid untuk disimpan.');
      console.warn('Attempted to save report without currentReportData or id:', this.#currentReportData);
      return;
    }
    try {
      await saveBookmark(this.#currentReportData);
      alert(`Laporan "${this.#currentReportData.title || 'Tanpa Judul'}" telah disimpan.`);
      await this.showSaveButton(); // Refresh tombol untuk menampilkan status "Remove"
    } catch (error) {
      alert(`Gagal menyimpan laporan: ${error.message}`);
      console.error('Error saving bookmark from presenter:', error);
    }
  }

  async handleRemoveReport() {
    if (!this.#currentReportData || !this.#currentReportData.id) {
      alert('Tidak ada data laporan yang valid untuk dihapus dari simpanan.');
      console.warn('Attempted to remove report without currentReportData or id:', this.#currentReportData);
      return;
    }
    try {
      await deleteBookmark(this.#currentReportData.id);
      alert(`Laporan "${this.#currentReportData.title || 'Tanpa Judul'}" telah dihapus dari simpanan.`);
      await this.showSaveButton(); // Refresh tombol untuk menampilkan status "Save"
    } catch (error) {
      alert(`Gagal menghapus laporan dari simpanan: ${error.message}`);
      console.error('Error removing bookmark from presenter:', error);
    }
  }
}