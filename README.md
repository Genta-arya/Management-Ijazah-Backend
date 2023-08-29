# Management-Ijazah-Backend
# Dokumentasi API Management Ijazah Backend

Selamat datang di dokumentasi API untuk backend Management Ijazah. Berikut ini adalah penjelasan mengenai API yang dapat diakses serta cara penggunaannya.

## Persiapan

Pastikan Anda memiliki Node.js dan dependensi yang diperlukan diinstal di komputer Anda sebelum menjalankan backend ini.

1. Instal Node.js: [https://nodejs.org/](https://nodejs.org/)

2. Install dependensi dengan menjalankan perintah berikut pada terminal di direktori root repositori:

   ```bash
   npm install
   

Server akan berjalan di port yang telah ditentukan (biasanya port 3001).

## Endpoint

Berikut adalah daftar endpoint API yang dapat diakses:

- **PUT /auth/update-profile-image/:id**
  Mengganti gambar profil pengguna.

  **Request:**
  - Method: PUT
  - Parameter URL: `:id` (ID pengguna)
  - Body: Form data berisi file gambar dengan key `profileImage`

  **Response:**
  - Status Code 200: Berhasil mengganti gambar profil
  - Status Code 500: Error server

- **POST /upload**
  Mengunggah file PDF ijazah siswa dan data siswa terkait.

  **Request:**
  - Method: POST
  - Body: Form data berisi nama siswa dan NISN dengan key `namaSiswa` dan `nisn`, serta file PDF dengan key `pdfFile`

  **Response:**
  - Status Code 200: Berhasil mengunggah file dan data siswa
  - Status Code 400: Nama siswa dan NISN harus diisi
  - Status Code 500: Error server

- **POST /cek-nisn**
  Memeriksa apakah NISN sudah terdaftar.

  **Request:**
  - Method: POST
  - Body: JSON berisi NISN dengan key `nisn`

  **Response:**
  - Status Code 200: Berhasil, respons berisi status apakah NISN sudah terdaftar atau belum
  - Status Code 400: NISN harus diisi
  - Status Code 500: Error server

...

## Penggunaan Auth Token
Beberapa endpoint memerlukan autentikasi menggunakan JWT (JSON Web Token). Setelah Anda berhasil login dan mendapatkan token, sertakan token tersebut pada setiap request dengan menambahkan header Authorization: Bearer <token>.
Misalnya:
  ```bash
 Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
