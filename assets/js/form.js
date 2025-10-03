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

    // 1. Hitung HPP Satuan Awal (HPP_per_satuan_awal)
    data.hpp_per_satuan_awal = hargaTotal / jumlahBeli;

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
        data.harga_pokok_final = data.hpp_per_satuan_awal / finalFaktorKonversi;
        
        // 2c. Hitung Stok Akhir
        data.stok_saat_ini = jumlahBeli * finalFaktorKonversi;
        
        data.faktor_konversi = finalFaktorKonversi; // Simpan faktor yang digunakan
        
    } else {
        // Jika tidak ada konversi (Satuan Stok kosong)
        data.harga_pokok_final = null; 
        data.faktor_konversi = null;
        data.stok_saat_ini = jumlahBeli; // Stok adalah jumlah beli
    }
    
    // Pembulatan untuk mencegah angka desimal yang terlalu panjang
    data.hpp_per_satuan_awal = parseFloat(data.hpp_per_satuan_awal.toFixed(4));
    if (data.harga_pokok_final) {
        data.harga_pokok_final = parseFloat(data.harga_pokok_final.toFixed(4));
    }
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

        // Cek input wajib
        if (!formData.tanggal || !formData.nama_item || !formData.kategori || !formData.jumlah_beli || !formData.satuan_beli || !formData.harga_total) {
            message.textContent = 'Semua kolom bertanda wajib harus diisi.';
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
                tanggal: formData.tanggal,
                nama_bahan: formData.nama_item,
                kategori: formData.kategori,
                jumlah_beli: formData.jumlah_beli,
                satuan_beli: formData.satuan_beli,
                harga_total: formData.harga_total,
                satuan_stok: hppData.satuan_stok || formData.satuan_beli, // Gunakan Satuan Beli jika Satuan Stok NULL
                faktor_konversi: hppData.faktor_konversi || 1, // Jika NULL, faktornya adalah 1
                hpp_per_satuan_awal: hppData.hpp_per_satuan_awal,
                harga_pokok_final: hppData.harga_pokok_final || hppData.hpp_per_satuan_awal, // Gunakan HPP awal jika final null
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