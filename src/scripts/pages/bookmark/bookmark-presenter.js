// src/scripts/pages/bookmark/bookmark-presenter.js
import * as BookmarkDB from '../../utils/bookmark-db';

export default class BookmarkPresenter {
  #view;
  #bookmarkDbModel;

  constructor({ view }) {
    this.#view = view;
    this.#bookmarkDbModel = BookmarkDB; // Menggunakan BookmarkDB secara langsung
  }

  async showBookmarkedReports() {
    this.#view.showLoading();
    try {
      const reports = await this.#bookmarkDbModel.getAllBookmarks();
      if (reports && reports.length > 0) {
        this.#view.populateBookmarkedReports(reports, `Menampilkan ${reports.length} laporan yang Anda simpan.`);
      } else {
        this.#view.populateBookmarkedReports([], 'Anda belum memiliki laporan yang disimpan.');
      }
    } catch (error) {
      console.error('showBookmarkedReports: error:', error);
      this.#view.populateBookmarkedReportsError(`Gagal memuat laporan tersimpan: ${error.message}`);
    } finally {
      this.#view.hideLoading();
    }
  }

  async removeBookmark(reportId) {
    this.#view.showLoading();
    try {
      const success = await this.#bookmarkDbModel.deleteBookmark(reportId);
      if (success) {
        alert(`Laporan dengan ID ${reportId} telah dihapus dari simpanan.`);
      } else {
        alert(`Gagal menghapus laporan dengan ID ${reportId} dari simpanan.`);
      }
      // Refresh daftar bookmark setelah menghapus
      await this.showBookmarkedReports();
    } catch (error) {
      console.error(`removeBookmark for ${reportId}: error:`, error);
      alert(`Gagal menghapus bookmark: ${error.message}`);
      // Pastikan loading dihide jika ada error dan tidak direfresh
      this.#view.hideLoading(); 
    }
    // Tidak perlu finally hideLoading() jika showBookmarkedReports sudah menghandlenya,
    // tapi jika ada error sebelum showBookmarkedReports, perlu dihide.
  }
}