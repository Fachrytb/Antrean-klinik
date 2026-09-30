# QueueCare - Sistem Antrean Poli Umum

Aplikasi web untuk mengelola antrean pasien Poli Umum secara digital.

## 🚀 Fitur

- ✅ Login Admin
- ✅ Input Pasien & Nomor Antrean Otomatis
- ✅ Daftar Antrean Realtime
- ✅ Panggil Pasien Berikutnya
- ✅ Display Antrean + Suara Panggilan (TTS)
- ✅ Status: Menunggu, Dipanggil, Selesai, Batal
- ✅ Statistik Dashboard

## 📁 Struktur File

## 🔧 Setup Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com/)
2. Aktifkan **Firestore Database**
3. Buat collection `users` dengan dokumen:
4. 4. Ganti `firebaseConfig` di `main.js` dengan config project Anda

## 🏃 Cara Menjalankan

1. Clone/download semua file
2. Buka dengan **Live Server** (VS Code extension) atau hosting
3. Login dengan username & password yang sudah dibuat di Firestore
4. Buka `display.html` di tab/monitor terpisah untuk display antrean

## 📊 Struktur Database

### Collection: `users`
| Field | Type |
|-------|------|
| username | string |
| password | string |
| nama | string |
| role | string |

### Collection: `pasien`
| Field | Type |
|-------|------|
| nama | string |
| umur | number |
| jenisKelamin | string |
| createdAt | timestamp |

### Collection: `antrean`
| Field | Type |
|-------|------|
| pasienId | string |
| nama | string |
| umur | number |
| jenisKelamin | string |
| nomor | string |
| tanggal | string (YYYY-MM-DD) |
| status | string |
| waktuDaftar | timestamp |
| waktuPanggil | timestamp |
| waktuSelesai | timestamp |

## 🎯 Alur Sistem

## 📝 Catatan

- Nomor antrean reset otomatis ke `A-001` setiap hari baru
- Display menggunakan **Web Speech API** untuk suara panggilan
- Browser perlu **user interaction** (klik) dulu agar audio bisa berjalan