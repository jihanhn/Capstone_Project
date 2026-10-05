# System Design & Data Model Document
## Sistem Business Intelligence Pengelolaan Risiko Finansial (Kontrakan Buti)

---

## 1. Perancangan Basis Data (Entity Relationship Diagram - ERD)

### 1.1 Struktur Tabel & Kamus Data

#### A. Tabel `tbl_kontrakan` (Master Unit)
* `kode_kontrakan` (PK, VARCHAR): Kode unik unit (contoh: K1, K2, K1A).
* `nama_kontrakan` (VARCHAR): Nama unit fisik.
* `harga_saat_ini` (DECIMAL): Tarif sewa bulanan saat ini.
* `status_unit` (VARCHAR): Status huni (Terisi / Kosong).

#### B. Tabel `tbl_penyewa` (Master Penyewa)
* `id_penyewa` (PK, VARCHAR): ID unik penyewa (contoh: P001).
* `nama_penyewa` (VARCHAR): Nama lengkap penyewa.
* `no_hp` (VARCHAR): Nomor kontak penyewa.
* `asal_ktp` (VARCHAR): Kota/kabupaten asal KTP.
* `tgl_mulai_sewa` (DATE): Tanggal awal kontrak.
* `tgl_selesai_sewa` (DATE): Tanggal akhir kontrak.

#### C. Tabel `tbl_riwayat_harga`
* `id_riwayat` (PK, INT, Auto Increment): ID catatan.
* `kode_kontrakan` (FK, VARCHAR): Referensi ke `tbl_kontrakan`.
* `harga_lama` (DECIMAL): Tarif sebelum penyesuaian.
* `harga_baru` (DECIMAL): Tarif setelah penyesuaian.
* `tgl_berlaku` (DATE): Tanggal penyesuaian tarif.

#### D. Tabel `tbl_transaksi_pembayaran` (Transaksional)
* `id_transaksi` (PK, INT, Auto Increment): ID unik transaksi.
* `kode_kontrakan` (FK, VARCHAR): Referensi ke `tbl_kontrakan`.
* `id_penyewa` (FK, VARCHAR): Referensi ke `tbl_penyewa`.
* `periode_bulan_tahun` (VARCHAR): Periode tagihan (contoh: "2024-01").
* `status_pembayaran` (VARCHAR): Status (Lunas, Cicil, Belum Lunas).
* `tgl_lunas` (DATE, Nullable): Tanggal pelunasan.
* `cicilan_1_rp` (DECIMAL, Nullable): Nominal cicilan pertama.
* `cicilan_2_rp` (DECIMAL, Nullable): Nominal cicilan kedua.
* `total_terbayar` (DECIMAL): Total akumulasi uang masuk.
* `harga_sewa_periode` (DECIMAL): Tarif sewa yang berlaku pada periode tersebut.

---

## 2. Aturan Bisnis & Algoritma Analisis Risiko (*Business Rules*)

### 2.1 Perhitungan Gap Pendapatan
$$\text{Potensi Pendapatan} = \sum (\text{Harga Sewa Unit Terisi})$$
$$\text{Pendapatan Realisasi} = \sum (\text{Total Terbayar pada Periode } t)$$
$$\text{Gap Finansial} = \text{Potensi Pendapatan} - \text{Pendapatan Realisasi}$$

### 2.2 Algoritma Penilaian Risiko (*Risk Score*)
Skor risiko penyewa ($S$) dihitung berdasarkan tiga indikator utama:
1. **Keterlambatan Tanggal (*Payment Lag* - $L$):**
   * Tepat waktu / $\le 0$ hari: Bobot $0$
   * Terlambat $1\text{--}7$ hari: Bobot $1$
   * Terlambat $> 7$ hari: Bobot $3$
2. **Frekuensi Cicilan ($C$):**
   * Lunas sekali bayar: Bobot $0$
   * Dicicil $\ge 2$ kali: Bobot $2$
3. **Status Tunggakan ($T$):**
   * Tidak ada tunggakan: Bobot $0$
   * Menunggak $> 1$ bulan: Bobot $5$

**Formula Risk Score:** $S = L + C + T$
* **Kategori Risiko:**
  * $S \le 1$: **Low Risk** (Hijau)
  * $2 \le S \le 4$: **Medium Risk** (Kuning)
  * $S \ge 5$: **High Risk** (Merah - Masuk ke *Early Warning System*)

---

## 3. Perancangan Antarmuka (*UI/UX Layout Specification*)

### 3.1 Tata Letak Executive Dashboard
1. **Header & Filter Panel:** Filter berdasarkan tahun/bulan dan unit kontrakan.
2. **KARTU KPI Utama (Top Bar):**
   * Total Realisasi Pendapatan Bulan Ini.
   * Total *Gap* Pendapatan (Defisit).
   * Tingkat Okupansi (*Occupancy Rate* %).
   * Jumlah Penyewa *High Risk*.
3. **Baris Grafik (Main Analytics View):**
   * *Chart 1 (Left):* Tren Pendapatan vs Potensi (Line Chart Multi-Tahun).
   * *Chart 2 (Right):* Distribusi Kategori Risiko Penyewa (Donut Chart).
4. **Tabel Early Warning System (Bottom Panel):**
   * Menampilkan daftar penyewa status *High/Medium Risk* beserta histori keterlambatan dan tombol opsi aksi mitigasi.