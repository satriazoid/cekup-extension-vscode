# PRD: Cekup - VS Code Lightweight System Monitor

## 1. Ringkasan Eksekutif
**Cekup** adalah extension Visual Studio Code yang bertujuan untuk menyediakan pemantauan sistem (CPU, RAM, dan Disk) secara *real-time* dengan fokus utama pada **efisiensi resource** dan **integrasi UI yang bersih**. Extension ini dirancang khusus untuk developer yang mengutamakan performa IDE dan preferensi antarmuka minimalis tanpa elemen visual yang berlebihan.

## 2. Tujuan & Sasaran
*   **Ringan (Lightweight):** Penggunaan CPU dan RAM oleh extension itu sendiri harus di bawah 1% saat idle.
*   **Integrasi Sidebar:** Menampilkan data di panel navigasi kiri (Activity Bar/Explorer) agar tidak mengganggu area coding atau status bar yang disembunyikan.
*   **Real-time Update:** Memperbarui data setiap 2–3 detik untuk keseimbangan antara akurasi dan performa.
*   **Minimalis:** Tanpa animasi berat, hanya menggunakan ikon statis dan teks berwarna untuk indikator status.

## 3. Fitur Utama (MVP)
| Fitur | Deskripsi | Prioritas |
| :--- | :--- | :--- |
| **CPU Monitoring** | Menampilkan persentase penggunaan CPU rata-rata. | High |
| **RAM Monitoring** | Menampilkan persentase penggunaan RAM dari total memori fisik. | High |
| **Disk Space** | Menampilkan sisa kapasitas penyimpanan pada drive utama. | Medium |
| **Sidebar View** | Tampilan berbasis Tree View di Activity Bar VS Code. | High |
| **Auto-Refresh** | Pembaruan data otomatis dengan interval yang dapat dikonfigurasi. | High |

## 4. Spesifikasi Teknis
*   **Nama Project:** Cekup
*   **Bahasa:** TypeScript.
*   **API VS Code:** `vscode.window.createTreeView`, `vscode.TreeDataProvider`.
*   **Library Sistem:** 
    *   `os` (bawaan Node.js) untuk CPU dan RAM.
    *   `diskusage` (library kecil pihak ketiga) untuk informasi disk yang akurat lintas platform.
*   **Interval Update:** Default 2000ms (2 detik).

## 5. Desain Antarmuka (UI/UX)
*   **Lokasi:** Ikon baru di Activity Bar (kiri paling luar). Saat diklik, muncul panel "Cekup Stats".
*   **Tampilan Data:**
    *   Menggunakan format list sederhana (seperti struktur folder).
    *   **Indikator Warna:** 
        *   🟢 Hijau: < 50% penggunaan.
        *   🟡 Kuning: 50% - 80% penggunaan.
        *   🔴 Merah: > 80% penggunaan.
*   **Animasi:** Tidak ada animasi transisi atau loading spinner. Perubahan angka terjadi secara instan (*hard cut*).

## 6. Kriteria Kinerja (Non-Functional)
*   **Memory Footprint:** Maksimal 10-15 MB saat berjalan.
*   **Startup Time:** Harus aktif dalam waktu kurang dari 1 detik setelah VS Code dibuka.
*   **Kompatibilitas:** Windows 10/11, Linux (Arch/Ubuntu), dan macOS.

## 7. Rencana Pengembangan
1.  **Setup Project:** Inisialisasi `yo code` dengan nama `cekup` dan konfigurasi `package.json`.
2.  **Core Logic:** Implementasi pengambilan data CPU/RAM via `os` module.
3.  **UI Integration:** Pembuatan `TreeDataProvider` untuk sidebar.
4.  **Disk Module:** Integrasi library `diskusage` untuk data storage.
5.  **Testing:** Pengujian beban (load test) untuk memastikan extension tidak memperlambat typing di editor.