const common = require('./webpack.common.js');
const { merge } = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const path = require('path');

module.exports = merge(common, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin(),
    new WorkboxWebpackPlugin.GenerateSW({
      swDest: 'sw.js', // Nama file service worker yang akan dihasilkan
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          // Cache halaman (App Shell) - Dokumen HTML
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages-cache',
            networkTimeoutSeconds: 4, // Fallback ke cache jika jaringan > 4 detik
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Hari
            },
          },
        },
        {
          urlPattern: ({ request }) =>
            request.destination === 'style' ||
            request.destination === 'script' ||
            request.destination === 'worker' ||
            request.destination === 'image' ||
            request.destination === 'font',
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-assets-cache',
            expiration: {
              maxEntries: 200, // Lebih banyak entri untuk aset statis
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Hari
            },
          },
        },
        {
          // Cache Google Fonts (stylesheets)
          urlPattern: /^https:\/\/fonts\.googleapis\.com/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Tahun
            },
          },
        },
        {
          // Cache Google Fonts (webfonts)
          urlPattern: /^https:\/\/fonts\.gstatic\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30, // Biasanya tidak banyak jenis font
              maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Tahun
            },
          },
        },
        {
          // Cache Font Awesome
          urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/,
          handler: 'StaleWhileRevalidate', // Atau CacheFirst jika Anda jarang update versi FontAwesome
          options: {
            cacheName: 'font-awesome-cache',
             expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Tahun
            },
          },
        },
        {
          // Cache API GET requests
          // Sesuaikan BASE_URL jika berbeda dari config.js
          urlPattern: new RegExp(`^${require('./src/scripts/config.js').BASE_URL}/reports`),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-reports-cache',
            networkTimeoutSeconds: 5, // Timeout sebelum fallback ke cache
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 1 * 24 * 60 * 60, // 1 Hari untuk data laporan
            },
            // Plugin untuk menangani header Authorization jika diperlukan oleh API
            // fetchOptions: {
            //   headers: {
            //     'Authorization': `Bearer YOUR_TOKEN_IF_NEEDED_STATICALLY`,
            //   },
            // },
            plugins: [
              // Jika ada update dari network, broadcast ke client
              // Perlu npm install workbox-broadcast-update --save-dev
              // new (require('workbox-broadcast-update').BroadcastUpdatePlugin)(),
            ],
          },
        },
        // Tambahkan rule caching lain jika perlu (misal untuk API komentar)
      ],
      // Jangan melakukan precache pada file manifest.json karena akan di-handle oleh browser
      // dan file service worker custom logic kita (jika ada)
      exclude: [/\.map$/, /manifest\.json$/, /sw-push-logic\.js$/],
      // Jika Anda memiliki file service worker kustom untuk logika tambahan (misal, push notification),
      // Anda bisa mengimpornya di sini.
      importScripts: ['sw-push-logic.js'] // Kita akan buat file ini nanti
    }),
  ],
});