// webpack.common.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'src/scripts/index.js'),
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Bagus! Ini akan membersihkan direktori 'dist' sebelum setiap build.
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i, // Menambahkan svg sudah baik.
        type: 'asset/resource',
        generator: { // Ini akan menempatkan gambar di dalam folder 'images' di direktori 'dist'
          filename: 'images/[hash][ext][query]'
        }
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      favicon: path.resolve(__dirname, 'src/public/favicon.png'), // Konfigurasi favicon sudah benar.
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/public/'),
          to: path.resolve(__dirname, 'dist/'),
          globOptions: {
            // Anda bisa menambahkan 'ignore' di sini jika ada file di src/public
            // yang tidak ingin Anda copy, misalnya jika index.html ada di src/public
            // tapi karena index.html Anda di src/, ini sudah baik.
            // ignore: ['**/index.html'], // Contoh jika index.html ada di src/public
          },
        },
        { 
          from: path.resolve(__dirname, 'src/sw-push-logic.js'),
          to: path.resolve(__dirname, 'dist/sw-push-logic.js'), // Menyalin sw-push-logic.js ke root 'dist' sudah benar.
        },
      ],
    }),
  ],
};