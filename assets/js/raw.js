// assets/js/raw.js

import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const message = document.getElementById('message');
    const bbTbody = document.getElementById('bahanBakuTable').querySelector('tbody');

    const loadBahanMentahData = async () => {
        message.textContent = 'Mengambil data Bahan Mentah dan Stok...';
        
        // 1. Ambil Bahan Baku Inti dan kolom stok
        // PERHATIAN: Pastikan kolom 'stok_saat_ini' tersedia di tabel Anda.
        const { data: bbData, error: bbError } = await supabase
            .from('bahan_baku_inti')
            .select('id, nama_bahan, satuan_stok, harga_pokok_per_unit, stok_saat_ini'); // <-- Kolom Stok Ditambahkan

        if (bbError) {
            message.textContent = '❌ Gagal memuat data bahan mentah. Cek koneksi atau kolom Stok Saat Ini.';
            console.error("Bahan Baku Error:", bbError);
            return;
        }

        // --- Tampilkan Bahan Baku Inti (Bahan Mentah) ---
        bbTbody.innerHTML = ''; 
        if (bbData.length > 0) {
            bbData.forEach(item => {
                const row = bbTbody.insertRow();
                row.insertCell().textContent = item.id.substring(0, 8); 
                row.insertCell().textContent = item.nama_bahan;
                row.insertCell().textContent = item.satuan_stok;
                
                // Kolom HPP
                const hppCell = row.insertCell();
                hppCell.textContent = `Rp${(item.harga_pokok_per_unit || 0).toLocaleString('id-ID')}`;
                hppCell.classList.add('numeric-col');
                
                // Kolom Stok Saat Ini
                const stokCell = row.insertCell();
                // Menggunakan format angka dengan 2 desimal jika stok ada, atau 0
                const stokValue = item.stok_saat_ini !== null ? parseFloat(item.stok_saat_ini) : 0;
                stokCell.textContent = stokValue.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                stokCell.classList.add('numeric-col', 'stock-col');
            });
        } else {
            const row = bbTbody.insertRow();
            row.insertCell(0).colSpan = 5;
            row.cells[0].textContent = 'Tidak ada data Bahan Mentah di database.';
        }
        
        message.textContent = `✅ Daftar ${bbData.length} Bahan Mentah dan status stok berhasil dimuat.`;
        message.classList.remove('loading-message');
    };

    loadBahanMentahData();
});