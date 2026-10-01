# Architecture Specification Document
## Sistem Business Intelligence Pengelolaan Risiko Finansial (Kontrakan Buti)

---

## 1. Arsitektur Sistem (High-Level Architecture)
Sistem dirancang menggunakan arsitektur **3-Tier Architecture** yang memisahkan antara lapisan antarmuka, logika bisnis/analitis, dan penyimpanan data untuk memastikan skalabilitas, kemudahan pemeliharaan, serta keamanan data.

```
+-------------------------------------------------------------------+
|               Presentation Tier (Frontend Client)                 |
|   - React.js + Tailwind CSS + Lucide Icons                        |
|   - Recharts / Visualisasi Tren Multi-Tahun & Donut Chart         |
|   - Executive Dashboard, Early Warning Mitigasi, Transaksi, Master |
+---------------------------------+---------------------------------+
                                  | REST API (HTTP/JSON)
                                  v
+-------------------------------------------------------------------+
|            Application & Analytics Tier (Backend API)             |
|   - Node.js + Express.js Framework                                |
|   - Risk Engine: Skor Risiko (S = L + C + T) & Gap Finansial      |
|   - Transaction Integrity: Validasi anti-duplikasi & State Sync   |
|   - Export Service: Rekapitulasi CSV/Laporan Keuangan             |
+---------------------------------+---------------------------------+
                                  | SQLite Native Driver (ACID)
                                  v
+-------------------------------------------------------------------+
|                     Data Tier (Database)                          |
|   - SQLite Database (kontrakan_buti.db)                           |
|   - Master Unit, Master Penyewa, Riwayat Harga, Transaksi         |
+-------------------------------------------------------------------+
```

---

## 2. Rincian Lapisan Arsitektur (Tier Details)

### 2.1 Presentation Tier (Frontend Client)
* **Teknologi:** React (Vite SPA), Tailwind CSS, Lucide React, Charting Library (Recharts).
* **Tanggung Jawab:**
  * Menyajikan *Executive Dashboard* interaktif dengan filter multi-periode (tahun dan bulan).
  * Menampilkan 4 kartu KPI utama (Realisasi Pendapatan, Defisit/Gap, Okupansi %, Jumlah Risiko Tinggi).
  * Visualisasi grafik tren multi-tahun (Potensi vs Realisasi) dan donut chart sebaran risiko penyewa.
  * Antarmuka *Early Warning System* untuk deteksi dini tunggakan serta shortcut mitigasi (pengingat WhatsApp otomatis).
  * Manajemen CRUD master data kontrakan, penyewa, pencatatan transaksi cicilan/lunas, dan ekspor laporan.

### 2.2 Application & Logic Tier (Backend REST API)
* **Teknologi:** Node.js (Express.js), CORS, Router modular.
* **Tanggung Jawab:**
  * Menyediakan endpoint RESTful JSON untuk frontend.
  * Menjalankan **Engine Analisis Risiko**: menghitung *Payment Lag* ($L$), *Frekuensi Cicilan* ($C$), dan *Status Tunggakan* ($T$) untuk menghasilkan *Risk Score* ($S$).
  * Menghitung metrik agregat: Potensi Pendapatan, Realisasi Pembayaran, *Financial Gap*, serta rasio okupansi unit.
  * Menerapkan aturan integritas data: mencegah duplikasi tagihan pada unit yang sama di periode yang sama.
  * Mengolah data rekapitulasi untuk kebutuhan unduh berkas (.csv).

### 2.3 Data Tier (Persistence Layer)
* **Teknologi:** SQLite Database (`kontrakan_buti.db`).
* **Karakteristik:**
  * Penyimpanan data relasional lokal tanpa membutuhkan server eksternal mandiri, menjaga portabilitas data.
  * Mendukung integritas relasional melalui *Foreign Keys* antara tabel unit, penyewa, riwayat harga, dan transaksi.
  * Didukung seeder data realistis multi-tahun (2023–2026) untuk analisis historis.

---

## 3. Protokol & Kontrak Komunikasi API

| Metode | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats?bulan=&tahun=` | Mendapatkan KPI Cards (Realisasi, Gap, Okupansi, High Risk) |
| `GET` | `/api/dashboard/trend?tahun=` | Mendapatkan data tren per bulan (Potensi vs Realisasi) |
| `GET` | `/api/dashboard/risk-distribution` | Mendapatkan proporsi kategori risiko (Low, Medium, High) |
| `GET` | `/api/dashboard/early-warning` | Mendapatkan daftar penyewa berisiko tinggi beserta detail skor |
| `GET/POST/PUT/DELETE` | `/api/kontrakan` | Operasi CRUD master unit kontrakan |
| `GET/POST/PUT/DELETE` | `/api/penyewa` | Operasi CRUD data penyewa |
| `GET/POST/PUT/DELETE` | `/api/transaksi` | Operasi pencatatan dan pengelolaan transaksi pembayaran |
| `GET` | `/api/laporan/export` | Mengunduh file CSV rekap transaksi & risiko |