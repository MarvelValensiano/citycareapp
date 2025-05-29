import {
  generateLoaderAbsoluteTemplate,
  generateReportItemTemplate,
  generateReportsListEmptyTemplate,
  generateReportsListErrorTemplate,
} from '../../templates';
import BookmarkPresenter from './bookmark-presenter';
// Tidak perlu import BookmarkDB langsung di sini, Presenter yang akan menggunakannya.

export default class BookmarkPage {
  #presenter = null;

  async render() {
    return `
      <section class="container">
        <h1 class="section-title">Laporan Tersimpan</h1>
        <div id="bookmark-info" style="text-align: center; margin-bottom: 20px; min-height: 1.5em;"></div>
        <div class="reports-list__container">
          <div id="bookmarked-reports-list" style="position: relative; min-height: 200px;"></div>
          <div id="bookmarked-reports-list-loading-container"></div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // Presenter akan diinisialisasi di sini
    this.#presenter = new BookmarkPresenter({ view: this });
    await this.#presenter.showBookmarkedReports();
  }

  populateBookmarkedReports(reports, message = 'Daftar laporan yang Anda simpan.') {
    const listContainer = document.getElementById('bookmarked-reports-list');
    const infoContainer = document.getElementById('bookmark-info');

    if (!listContainer) return;

    if (infoContainer) {
      infoContainer.innerHTML = `<p>${message}</p>`;
    }

    if (!reports || reports.length <= 0) {
      listContainer.innerHTML = generateReportsListEmptyTemplate(
        'Anda belum menyimpan laporan apapun.',
      );
      return;
    }

    let html = '';
    reports.forEach((report) => {
      // Pastikan properti yang dibutuhkan oleh generateReportItemTemplate tersedia
      const reportDataForTemplate = {
        id: report.id,
        title: report.title || 'Tanpa Judul',
        description: report.description || 'Tidak ada deskripsi.',
        evidenceImages: report.photoUrl ? report.photoUrl : 'images/placeholder-image.jpg',
        reporterName: report.reporter?.name || 'N/A',
        createdAt: report.createdAt || new Date().toISOString(),
        placeNameLocation:
          report.location?.placeName ||
          `${report.location?.latitude || 'N/A'}, ${report.location?.longitude || 'N/A'}`,
      };
      const reportItemHtml = generateReportItemTemplate(reportDataForTemplate);

      // Tambahkan tombol hapus ke dalam item laporan
      // Kita cari penutup dari elemen report-item, biasanya </div> yang paling akhir sebelum link Selengkapnya.
      // Ini mungkin perlu disesuaikan berdasarkan struktur generateReportItemTemplate Anda.
      // Cara yang lebih aman adalah memodifikasi generateReportItemTemplate untuk menerima opsi tombol tambahan.
      // Untuk sekarang, kita coba modifikasi string:
      const readMoreLink = `<a class="btn report-item__read-more" href="#/reports/${report.id}">`;
      const deleteButtonHtml = `
        <div style="padding: 0px 20px 15px;">
          <button class="btn btn-outline btn-danger" data-removebookmarkid="${report.id}" style="font-size: 0.9em; padding: 8px 15px;">
            <i class="fas fa-trash-alt"></i> Hapus dari Simpanan
          </button>
        </div>`;

      // Masukkan tombol hapus sebelum link "Selengkapnya"
      let modifiedReportItemHtml = reportItemHtml;
      const readMoreIndex = modifiedReportItemHtml.indexOf(readMoreLink);
      if (readMoreIndex !== -1) {
        modifiedReportItemHtml =
          modifiedReportItemHtml.substring(0, readMoreIndex) +
          deleteButtonHtml +
          modifiedReportItemHtml.substring(readMoreIndex);
      } else {
        // Fallback jika link tidak ditemukan, tambahkan di akhir
        const closingDivIndex = modifiedReportItemHtml.lastIndexOf('</div>');
        if (closingDivIndex !== -1) {
          modifiedReportItemHtml =
            modifiedReportItemHtml.substring(0, closingDivIndex) +
            deleteButtonHtml +
            modifiedReportItemHtml.substring(closingDivIndex);
        } else {
          modifiedReportItemHtml += deleteButtonHtml; // Tambah di akhir jika tidak ada div penutup
        }
      }
      html += modifiedReportItemHtml;
    });

    listContainer.innerHTML = `<div class="reports-list">${html}</div>`;

    listContainer.querySelectorAll('button[data-removebookmarkid]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation(); // Hindari navigasi jika tombol ada di dalam item yang bisa diklik
        const reportId = event.currentTarget.dataset.removebookmarkid;
        const reportTitle = reports.find((r) => r.id.toString() === reportId)?.title || reportId;
        if (confirm(`Anda yakin ingin menghapus laporan "${reportTitle}" dari simpanan?`)) {
          if (this.#presenter) {
            await this.#presenter.removeBookmark(reportId);
          }
        }
      });
    });
  }

  populateBookmarkedReportsError(message) {
    const listContainer = document.getElementById('bookmarked-reports-list');
    if (listContainer) {
      listContainer.innerHTML = generateReportsListErrorTemplate(message);
    }
    const infoContainer = document.getElementById('bookmark-info');
    if (infoContainer) {
      infoContainer.innerHTML = `<p class="error-message">${message}</p>`;
    }
  }

  showLoading() {
    const loadingContainer = document.getElementById('bookmarked-reports-list-loading-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = generateLoaderAbsoluteTemplate();
    }
  }

  hideLoading() {
    const loadingContainer = document.getElementById('bookmarked-reports-list-loading-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = '';
    }
  }
}
