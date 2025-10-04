// assets/js/form.js

import { supabase } from './supabase.js';

// Kamus Konversi Standar (untuk mengisi otomatis jika faktor_konversi kosong)
const KONVERSI_STANDAR = {
    "kg_g": 1000,
    "L_ml": 1000,
    "ons_g": 100
    // Tambahkan konversi standar umum Anda di sini
};

// Fungsi Utama untuk Menghitung HPP
// Sekarang menggunakan 'satuanKonversi' sebagai parameter yang jelas
function hitungHPP(jumlahBeli, hargaTotal, satuanBeli, satuanKonversi, faktorKonversi) {
    const data = {};
    let hppAwal = 0;

    // 1. Hitung HPP Satuan Awal
    if (jumlahBeli > 0 && hargaTotal >= 0) {
        hppAwal = hargaTotal / jumlahBeli;
    } 
    data.hpp_per_satuan_awal = hppAwal;

    // 2. Cek apakah ada konversi
    if (satuanKonversi) { // Jika Satuan Kedua/Konversi diisi
        
        let finalFaktorKonversi = faktorKonversi;
        if (!finalFaktorKonversi) {
            // Coba ambil dari konversi standar jika faktor kosong
            const konversiKey = `${satuanBeli}_${satuanKonversi}`;
            finalFaktorKonversi = KONVERSI_STANDAR[konversiKey];

            if (!finalFaktorKonversi) {
                return { error: 'Konversi tidak valid. Faktor konversi harus diisi manual atau tersedia di standar.' };
            }
        }
        
        // 2b. Hitung HPP Final (HPP per Unit Konversi)
        data.harga_pokok_final = (hppAwal > 0) ? (hppAwal / finalFaktorKonversi) : 0;

        // 2c. Hitung Stok Akhir
        data.stok_saat_ini = jumlahBeli * finalFaktorKonversi;
        data.faktor_konversi = finalFaktorKonversi;
        data.satuan_kedua = satuanKonversi; // <--- Mengembalikan Satuan Konversi

    } else {
        // Jika tidak ada konversi (HPP Final = HPP Awal)
        data.harga_pokok_final = hppAwal; 
        data.faktor_konversi = 1;
        data.stok_saat_ini = jumlahBeli; 
        data.satuan_kedua = null; // Tidak ada satuan kedua
    }

    // 3. Pembulatan dan Penyesuaian Tipe
    data.hpp_per_satuan_awal = parseFloat(data.hpp_per_satuan_awal.toFixed(4));
    data.harga_pokok_final = parseFloat(data.harga_pokok_final.toFixed(4));
    data.stok_saat_ini = parseFloat(data.stok_saat_ini.toFixed(4));

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
    toggleKonversiSection();

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
            // Mengambil nilai dari input id="satuanStok" dan dinamai lebih jelas
            satuan_konversi_input: document.getElementById('satuanStok').value || null, 
            faktor_konversi: parseFloat(document.getElementById('faktorKonversi').value) || null,
        };

        // Validasi Keras
        if (!formData.tanggal || !formData.nama_item || !formData.kategori || 
            !formData.jumlah_beli || formData.jumlah_beli <= 0 || 
            !formData.satuan_beli || !formData.harga_total) 
        {
            message.textContent = 'Pastikan semua kolom wajib diisi dengan benar.';
            message.className = 'error';
            return;
        }

        // 2. Jalankan Perhitungan HPP
        const { data: hppData, error: hppError } = hitungHPP(
            formData.jumlah_beli,
            formData.harga_total,
            formData.satuan_beli,
            formData.satuan_konversi_input, // <-- Meneruskan Satuan Konversi Input
            formData.faktor_konversi
        );

        if (hppError) {
            message.textContent = `Error perhitungan: ${hppError.error}`;
            message.className = 'error';
            return;
        }

        // 3. Tentukan Tabel dan Objek Data Final
        let tableName;
        let dataToInsert = {};

        if (formData.kategori === 'Bahan Baku Inti') {
            tableName = 'bahan_baku_inti';
            
            dataToInsert = {
                tanggal_pembelian: formData.tanggal, 
                nama_bahan: formData.nama_item,
                kategori: formData.kategori,
                
                // Data Pembelian Asli
                jumlah_beli: formData.jumlah_beli,
                satuan_beli: formData.satuan_beli,
                harga_total: formData.harga_total,
                hpp_per_satuan_awal: hppData.hpp_per_satuan_awal,

                // Data HPP dan Stok (KONVERSI)
                harga_pokok_per_unit: hppData.harga_pokok_final, // HPP per unit konversi/final
                
                // SATUAN UTAMA (Satuan Beli)
                satuan_stok: formData.satuan_beli, 

                // SATUAN KONVERSI (Satuan Kedua/Konversi)
                satuan_konversi: hppData.satuan_kedua || null, // <--- JALUR YANG BENAR KE KOLOM BARU

                // FAKTOR KONVERSI & STOK AKHIR
                faktor_konversi: hppData.faktor_konversi || 1, 
                stok_saat_ini: hppData.stok_saat_ini, // Stok total dalam satuan konversi
                
                batas_minimum: 0 
            };

        } else {
            // Jika bukan Bahan Baku Inti, simpan ke Transaksi Belanja
            tableName = 'transaksi_belanja';
            
            dataToInsert = {
                tanggal: formData.tanggal,
                nama_item: formData.nama_item,
                kategori: formData.kategori,
                jumlah_beli: formData.jumlah_beli,
                satuan_beli: formData.satuan_beli,
                harga_total: formData.harga_total,
                hpp_per_satuan_awal: hppData.hpp_per_satuan_awal,
            };
        }

        // 4. Kirim Data ke Supabase
        const { error } = await supabase
            .from(tableName)
            .insert([dataToInsert]);

        if (error) {
            message.textContent = `❌ Gagal menyimpan transaksi ke ${tableName}: ${error.message}`;
            message.className = 'error';
        } else {
            message.textContent = `✅ Transaksi berhasil disimpan ke tabel ${tableName}!`;
            message.className = 'success';
            formBelanja.reset(); 
            toggleKonversiSection();
        }
    });
});