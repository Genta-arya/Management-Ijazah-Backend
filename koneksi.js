const mysql = require('mysql');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_smk',
};

function createConnection() {
  const connection = mysql.createConnection(dbConfig);
  function handleDisconnect() {
    connection.on('error', function (err) {
      if (!err.fatal) {
        return;
      }
  
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Koneksi database terputus. Mencoba menghubungkan kembali...');
  
        // Mencoba membuat koneksi ulang setelah beberapa detik
        setTimeout(handleDisconnect, 2000);
      } else if (err.code === 'ER_PARSE_ERROR') {
        console.error('Terjadi kesalahan dalam query SQL:', err.sqlMessage);
        // Mencoba koneksi ulang jika terjadi kesalahan parsing SQL
        setTimeout(handleDisconnect, 2000);
      } else {
        throw err;
      }
    });

    connection.connect(function (err) {
      if (err) {
        console.error('Koneksi database gagal:', err);
        // Mencoba koneksi ulang jika gagal terhubung
        setTimeout(handleDisconnect, 2000);
      } else {
        console.log('Berhasil terhubung ke database');
      }
    });
  }

  // Memanggil fungsi handleDisconnect untuk pertama kali
  handleDisconnect();

  return connection;
}

const db = createConnection();

module.exports = db;
