// assets/js/form.js
import { supabase } from './supabase.js';

// Kamus Konversi Standar (untuk mengisi otomatis jika faktor_konversi kosong)
const KONVERSI_STANDAR = {
    "kg_g": 1000,
    "L_ml": 1000,
    "ons_g": 100
    // Tambahkan konversi standar umum Anda di sini (misal: "box_pcs": 12)
};

// Fungsi Utama untuk Menghitung HPP
function hitungHPP(jumlahBeli, hargaTotal, satuanStok, faktorKonversi) {
    const data = {};
    
    // Perbaikan 1: Pastikan HPP Satuan Awal aman dari pembagian nol
    if (jumlahBeli > 0 && hargaTotal >= 0) {
        data.hpp_per_satuan_awal = hargaTotal / jumlahBeli;
    } else {
        // Mengembalikan 0 jika input tidak valid (untuk memuaskan NOT NULL constraint)
        data.hpp_per_satuan_awal = 0; 
    }

    // 2. Cek apakah ada konversi (Satuan Kedua diisi)
    if (satuanStok) {
        // 2a. Tentukan Faktor Konversi Final (menggunakan input user atau default)
        let finalFaktorKonversi = faktorKonversi;
        if (!finalFaktorKonversi) {
            // Coba ambil dari kamus standar jika input kosong
            const konversiKey = `${document.getElementById('satuanBeli').value}_${satuanStok}`;
            finalFaktorKonversi = KONVERSI_STANDAR[konversiKey];

            if (!finalFaktorKonversi) {
                // Jika tidak ada faktor dan user tidak mengisi, ini adalah error fatal
                return { error: 'Konversi tidak valid. Faktor konversi harus diisi manual atau definisikan faktor default.' };
            }
        }

        // 2b. Hitung HPP Final
        // HPP Final hanya dihitung jika HPP Satuan Awal > 0
        if (data.hpp_per_satuan_awal > 0) {
            data.harga_pokok_final = data.hpp_per_satuan_awal / finalFaktorKonversi;
        } else {
            data.harga_pokok_final = 0;
        }

        // 2c. Hitung Stok Akhir
        data.stok_saat_ini = jumlahBeli * finalFaktorKonversi;
        data.faktor_konversi = finalFaktorKonversi; // Simpan faktor yang digunakan

    } else {
        // Jika tidak ada konversi (Satuan Stok kosong)
        data.harga_pokok_final = null; 
        data.faktor_konversi = null;
        data.stok_saat_ini = jumlahBeli; // Stok adalah jumlah beli
    }

    // Pembulatan dan validasi terakhir (memastikan tidak ada NaN)
    data.hpp_per_satuan_awal = isNaN(data.hpp_per_satuan_awal) ? 0 : parseFloat(data.hpp_per_satuan_awal.toFixed(4));
    data.harga_pokok_final = isNaN(data.harga_pokok_final) ? null : parseFloat(data.harga_pokok_final.toFixed(4));
    data.stok_saat_ini = isNaN(data.stok_saat_ini) ? 0 : parseFloat(data.stok_saat_ini.toFixed(4));

    return { data };
}


document.addEventListener('DOMContentLoaded', () => {
    const formBelanja = document.getElementById('formBelanja');
    const kategoriSelect = document.getElementById('kategori');
    const konversiSection = document.getElementById('konversiSection');
    const message = document.getElementById('message');

    // --- A. Logika Tampilan: Tampilkan/Sembunyikan Konversi ---
    const toggleKonversiSection = () => {
        konversiSection.style.display = (kategoriSelect.value === 'Bahan Baku Inti') ? 'block' : 'none';
    };
    kategoriSelect.addEventListener('change', toggleKonversiSection);
    toggleKonversiSection(); // Panggil saat memuat halaman

    // --- B. Logika Submit Form ---
    formBelanja.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = 'Memproses data...';
        message.className = '';

        // 1. Ambil Data Dasar dari Formulir
        const formData = {
            tanggal: document.getElementById('tanggal').value,
            nama_item: document.getElementById('namaItem').value,
            kategori: kategoriSelect.value,
            jumlah_beli: parseFloat(document.getElementById('jumlahBeli').value),
            satuan_beli: document.getElementById('satuanBeli').value,
            harga_total: parseFloat(document.getElementById('hargaTotal').value),
            satuan_stok: document.getElementById('satuanStok').value || null,
            faktor_konversi: parseFloat(document.getElementById('faktorKonversi').value) || null,
        };

        // Perbaikan 3: Validasi Keras untuk mencegah input 0 atau kosong masuk ke perhitungan
        if (!formData.tanggal || !formData.nama_item || !formData.kategori || 
            !formData.jumlah_beli || formData.jumlah_beli <= 0 || 
            !formData.satuan_beli || !formData.harga_total) 
        {
            message.textContent = 'Pastikan Tanggal, Nama, Kategori, Jumlah Beli (>0), Satuan, dan Harga diisi.';
            message.className = 'error';
            return;
        }

        // 2. Jalankan Perhitungan HPP
        const { data: hppData, error: hppError } = hitungHPP(
            formData.jumlah_beli,
            formData.harga_total,
            formData.satuan_stok,
            formData.faktor_konversi
        );

        if (hppError) {
            message.textContent = `Error perhitungan: ${hppError}`;
            message.className = 'error';
            return;
        }

        // 3. Tentukan Tabel dan Objek Data Final
        let tableName;
        let dataToInsert = {};

        if (formData.kategori === 'Bahan Baku Inti') {
            tableName = 'bahan_baku_inti';
            // Masukkan semua data ke bahan_baku_inti (semua kolom terisi)
            dataToInsert = {
                // Perbaikan 4: Nama kolom yang sesuai dengan skema DB
                tanggal_pembelian: formData.tanggal, // Sesuai dengan skema DB
                nama_bahan: formData.nama_item,
                kategori: formData.kategori,
                jumlah_beli: formData.jumlah_beli,
                satuan_beli: formData.satuan_beli,
                harga_total: formData.harga_total,
                satuan_stok: hppData.satuan_stok || formData.satuan_beli,
                faktor_konversi: hppData.faktor_konversi || 1, 
                hpp_per_satuan_awal: hppData.hpp_per_satuan_awal,
                
                // Perbaikan 5: Menggunakan 'harga_pokok_per_unit'
                harga_pokok_per_unit: hppData.harga_pokok_final || hppData.hpp_per_satuan_awal, 
                
                stok_saat_ini: hppData.stok_saat_ini, // Ini adalah nilai stok total
            };

        } else {
            tableName = 'transaksi_belanja';
            // Masukkan data ke transaksi_belanja (kolom stok di-NULL-kan)
            dataToInsert = {
                tanggal: formData.tanggal,
                nama_item: formData.nama_item,
                kategori: formData.kategori,
                jumlah_beli: formData.jumlah_beli,
                satuan_beli: formData.satuan_beli,
                harga_total: formData.harga_total,
                hpp_per_satuan_awal: hppData.hpp_per_satuan_awal,

                // Kolom Opsional/Final (Bisa NULL)
                satuan_stok: hppData.satuan_stok,
                faktor_konversi: hppData.faktor_konversi,
                harga_pokok_final: hppData.harga_pokok_final,
                stok_saat_ini: null, // Kolom placeholder diabaikan
            };
        }

        // 4. Kirim Data ke Supabase
        const { error } = await supabase
            .from(tableName)
            .insert([dataToInsert]);

        if (error) {
            message.textContent = `Gagal menyimpan transaksi ke ${tableName}: ${error.message}`;
            message.className = 'error';
        } else {
            message.textContent = `✅ Transaksi berhasil disimpan ke tabel ${tableName}!`;
            message.className = 'success';
            formBelanja.reset(); // Kosongkan formulir setelah sukses
            toggleKonversiSection(); // Atur ulang tampilan
        }
    });
});