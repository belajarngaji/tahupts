// assets/js/raw.js

import { supabase } from './supabase.js';

// Fungsi untuk membuat elemen card bahan (tidak diubah dari perbaikan sebelumnya)
const createBahanCard = (item) => {
    // Pastikan faktor konversi dan stok adalah angka
    const faktorKonversi = parseFloat(item.faktor_konversi) || 1;
    const stokSaatIni = parseFloat(item.stok_saat_ini) || 0;
    
    // Satuan Utama dan Satuan Konversi (LANGSUNG DARI DB)
    const satuanUtama = item.satuan_stok; 
    const satuanKonversi = item.satuan_konversi; 
    const hppFinal = item.harga_pokok_per_unit || item.harga_pokok_final || 0; // Ambil dari salah satu kolom HPP yang ada

    // Logika perhitungan Stok Utama (e.g., pcs)
    const stokUtama = stokSaatIni / faktorKonversi; 
    
    // Deskripsi Konversi (e.g., 5 potong)
    const deskripsiKonversi = (faktorKonversi > 1 && satuanKonversi) 
        ? `${faktorKonversi.toLocaleString('id-ID', { maximumFractionDigits: 0 })} ${satuanKonversi}`
        : null;

    const card = document.createElement('div');
    card.className = 'item-card';

    card.innerHTML = `
        <h3>${item.nama_bahan || item.nama_item}</h3>
        <div class="stock-info">
            Stok: ${stokUtama.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${satuanUtama} 
            ${deskripsiKonversi ? 
                `≈ ${stokSaatIni.toLocaleString('id-ID', { maximumFractionDigits: 0 })} ${satuanKonversi}` 
                : ''}
        </div>
        ${deskripsiKonversi ? 
            `<div class="conversion-alert">
                ( ! ) 1 ${satuanUtama} = ${deskripsiKonversi}
            </div>` 
            : ''}
        <small>HPP Unit Konversi: Rp${hppFinal.toLocaleString('id-ID', { maximumFractionDigits: 4 })}</small>
    `;

    return card;
};


document.addEventListener('DOMContentLoaded', async () => {
    const message = document.getElementById('message');
    const bbList = document.getElementById('bahanBakuList');
    const blList = document.getElementById('bahanBelanjaList');

    const loadBahanMentahData = async () => {
        message.textContent = 'Mengambil data Bahan Mentah dan Stok...';

        // --- 1. Ambil Data Bahan Baku Inti ---
        const { data: bbData, error: bbError } = await supabase
            .from('bahan_baku_inti')
            // Ambil semua kolom yang relevan dari tabel Bahan Baku Inti
            .select('id, nama_bahan, satuan_stok, stok_saat_ini, faktor_konversi, harga_pokok_per_unit, kategori, satuan_konversi'); 

        // --- 2. Ambil Data Transaksi Belanja (untuk Bumbu/Overhead) ---
        // Kita hanya mengambil item yang BUKAN 'Bahan Baku Inti'
        const { data: blData, error: blError } = await supabase
            .from('transaksi_belanja')
            .select('id, nama_item, satuan_beli, jumlah_beli, kategori, faktor_konversi, hpp_per_satuan_awal, harga_pokok_final, stok_saat_ini')
            .neq('kategori', 'Bahan Baku Inti') // Filter: Ambil Bumbu, Overhead, dll.
            .order('tanggal', { ascending: false }); // Urutkan untuk mendapatkan yang terbaru

        if (bbError || blError) {
            message.textContent = '❌ Gagal memuat data. Cek tabel dan koneksi Supabase.';
            console.error("Bahan Baku Error:", bbError);
            console.error("Transaksi Belanja Error:", blError);
            return;
        }

        bbList.innerHTML = '';
        blList.innerHTML = '';
        let countBaku = 0;
        let countBelanja = 0;
        
        // Map untuk melacak item 'Belanja' yang sudah ditampilkan (ambil yang paling baru)
        const processedBelanjaItems = new Set(); 

        // --- 3. Tampilkan Bahan Baku Inti (BB) ---
        bbData.forEach(item => {
            const card = createBahanCard(item);
            bbList.appendChild(card);
            countBaku++;
        });

        // --- 4. Tampilkan Transaksi Belanja (BL) ---
        // Kita loop melalui transaksi_belanja dan hanya menampilkan yang paling baru
        blData.forEach(item => {
            const itemName = item.nama_item;
            
            // Cek apakah item ini sudah diproses (sudah ada yang lebih baru)
            if (processedBelanjaItems.has(itemName)) {
                return; // Lewati item lama
            }

            // Jika item ini dari transaksi_belanja, kita harus menyesuaikan struktur itemnya
            const normalizedItem = {
                nama_bahan: itemName,
                satuan_stok: item.satuan_beli, // Satuan pembelian
                satuan_konversi: item.satuan_stok, // Satuan kedua di transaksi_belanja
                faktor_konversi: item.faktor_konversi,
                harga_pokok_per_unit: item.harga_pokok_final, // HPP Final
                stok_saat_ini: item.stok_saat_ini || item.jumlah_beli, // Gunakan stok_saat_ini jika ada, kalau tidak pakai jumlah_beli
            };

            const card = createBahanCard(normalizedItem);
            blList.appendChild(card);
            processedBelanjaItems.add(itemName);
            countBelanja++;
        });

        // --- 5. Update Status Pesan ---
        if (countBaku === 0) bbList.innerHTML = '<p>Tidak ada data Bahan Baku Inti.</p>';
        if (countBelanja === 0) blList.innerHTML = '<p>Tidak ada data Bahan Belanja (Bumbu/Overhead) terbaru.</p>';
        
        message.textContent = `✅ Daftar bahan berhasil dimuat. Bahan Baku Inti: ${countBaku}, Bahan Belanja/Lainnya: ${countBelanja}.`;
        message.classList.remove('loading-message');
    };

    loadBahanMentahData();
});