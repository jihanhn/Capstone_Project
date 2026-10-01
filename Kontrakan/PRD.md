# Product Requirement Document (PRD)
## Sistem Business Intelligence Pengelolaan Risiko Finansial (Kontrakan Buti)

---

## 1. Pendahuluan
### 1.1 Latar Belakang & Fenomena
Tekanan inflasi dan fluktuasi daya beli masyarakat berdampak langsung pada stabilitas ekonomi sektor mikro, termasuk usaha persewaan hunian. Pada **Kontrakan Buti**, potensi risiko finansial timbul akibat keterlambatan pembayaran sewa, pembayaran bertahap (*cicil*), serta kerugian dari unit kosong (*vacancy rate*). Selama ini, pengalokasian dan pemantauan transaksi dilakukan secara konvensional, sehingga pengelola bersikap reaktif dan baru mengetahui defisit ketika kerugian telah terjadi.

### 1.2 Tujuan Produk
Membangun sistem *Business Intelligence* (BI) terintegrasi yang menggabungkan pencatatan operasional harian dengan modul analitis finansial guna memberikan peringatan dini (*early warning system*) dan rekomendasi keputusan bagi pemilik kontrakan.

---

## 2. Target Pengguna & Personas
* **Aktor Utama:** Pengelola / Pemilik Kontrakan.
* **Kebutuhan Pengguna:**
  * Kemudahan dalam mencatat transaksi bulanan dan status keterlambatan.
  * Visibilitas terhadap proyeksi arus kas (*cash flow*) dan selisih (*gap*) pendapatan.
  * Indikator otomatis untuk mengidentifikasi penyewa berisiko tinggi (*high risk*).

---

## 3. Fitur Utama & Kebutuhan Fungsional (Functional Requirements)

| ID Fitur | Nama Fitur | Deskripsi Fungsional | Prioritas |
| :--- | :--- | :--- | :--- |
| **F-01** | Manajemen Master Data | Mengelola data fisik unit kontrakan, profil penyewa, dan riwayat penyesuaian tarif sewa. | Must Have |
| **F-02** | Pencatatan Transaksi | Mencatat status pembayaran bulanan, tanggal pelunasan, nominal cicilan, dan tunggakan. | Must Have |
| **F-03** | Engine Kalkulasi Risiko | Menghitung *Risk Score* keterlambatan penyewa dan estimasi *gap* pendapatan secara otomatis. | Must Have |
| **F-04** | Executive Dashboard | Menyajikan grafik tren pendapatan, *occupancy rate*, dan tabel peringatan dini (*Early Warning*). | Must Have |
| **F-05** | Pelaporan & Ekspor | Mengunduh rekapitulasi laporan keuangan dan laporan risiko bulanan/tahunan. | Should Have |

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)
* **Usability:** Antarmuka *dashboard* yang intuitif, ramah pengguna, serta mudah dibaca oleh pemilik tanpa latar belakang teknis.
* **Performance:** Waktu *loading* halaman *dashboard* dan kalkulasi *risk score* kurang dari dua detik.
* **Data Integrity:** Tidak ada duplikasi transaksi pada unit dan periode bulan yang sama.
* **Reliability:** Data historis terarsip dengan aman dan dapat diakses untuk analisis multi-tahun (2019–2026).