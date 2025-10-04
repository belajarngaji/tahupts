// assets/js/raw.js (Logic Diperbarui)

import { supabase } from './supabase.js';

// Fungsi untuk membuat elemen card bahan
const createBahanCard = (item) => {
    // Stok utama (berdasarkan jumlah beli, dihitung dari stok_saat_ini / faktor_konversi)
    const stokUtama = item.stok_saat_ini / item.faktor_konversi; 
    const satuanUtama = item.satuan_stok; 

    // Stok konversi (sudah ada di kolom stok_saat_ini)
    const stokKonversi = item.stok_saat_ini;
    const satuanKonversi = (item.faktor_konversi && item.faktor_konversi !== 1) ? "potong" : item.satuan_stok; // ASUMSI: Konversi Tahu adalah 'potong'

    // Tentukan satuan konversi yang lebih deskriptif (misalnya: jika pcs=5, maka 5 adalah nilai konversi)
    const deskripsiKonversi = (item.faktor_konversi && item.faktor_konversi !== 1) 
        ? `${item.faktor_konversi} ${satuanKonversi}` // e.g., 5 potong
        : null;

    const card = document.createElement('div');
    card.className = 'item-card';

    card.innerHTML = `
        <h3>${item.nama_bahan}</h3>
        <div class="stock-info">
            Stok: ${stokUtama.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${satuanUtama} 
            ${deskripsiKonversi ? 
                `≈ ${stokKonversi.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${satuanKonversi}` 
                : ''}
        </div>
        ${deskripsiKonversi ? 
            `<div class="conversion-alert">
                ( ! ) 1 ${satuanUtama} = ${deskripsiKonversi}
            </div>` 
            : ''}
        <small>HPP Unit Konversi: Rp${(item.harga_pokok_per_unit || 0).toLocaleString('id-ID')}</small>
    `;

    return card;
};


document.addEventListener('DOMContentLoaded', async () => {
    const message = document.getElementById('message');
    const bbList = document.getElementById('bahanBakuList');
    const blList = document.getElementById('bahanBelanjaList');
    
    // --- 1. Ambil data dari Bahan Baku Inti ---
    const loadBahanMentahData = async () => {
        message.textContent = 'Mengambil data Bahan Mentah dan Stok...';
        
        // Mengambil semua kolom yang relevan dari tabel yang lengkap
        const { data: bbData, error: bbError } = await supabase
            .from('bahan_baku_inti')
            .select('id, nama_bahan, satuan_stok, stok_saat_ini, faktor_konversi, hpp_per_satuan_awal, harga_pokok_per_unit'); 

        if (bbError) {
            message.textContent = '❌ Gagal memuat data bahan mentah.';
            console.error("Bahan Baku Error:", bbError);
            return;
        }

        bbList.innerHTML = '';
        blList.innerHTML = '';
        let countBaku = 0;
        let countBelanja = 0;

        // --- 2. Proses dan Pisahkan Data ---
        bbData.forEach(item => {
            // ASUMSI PEMISAHAN TAMPILAN: Pisahkan berdasarkan nama bahan secara sederhana.
            // Anda harus mengganti logika ini dengan kolom kategori yang ada di tabel Anda.
            // Contoh Logika Asumsi (Diganti jika Anda punya kolom Kategori):
            const isBahanBaku = (item.nama_bahan.toLowerCase().includes('tahu') || item.nama_bahan.toLowerCase().includes('petis'));

            const formattedItem = {
                ...item,
                // Pastikan faktor konversi adalah angka
                faktor_konversi: parseFloat(item.faktor_konversi) || 1,
                // Pastikan stok_saat_ini adalah angka
                stok_saat_ini: parseFloat(item.stok_saat_ini) || 0,
            };

            const card = createBahanCard(formattedItem);

            if (isBahanBaku) {
                bbList.appendChild(card);
                countBaku++;
            } else {
                blList.appendChild(card);
                countBelanja++;
            }
        });


        // --- 3. Update Status Pesan ---
        if (bbData.length === 0) {
            bbList.innerHTML = '<p>Tidak ada data Bahan Baku di database.</p>';
            blList.innerHTML = '<p>Tidak ada data Bahan Belanja di database.</p>';
        }
        
        message.textContent = `✅ Daftar bahan berhasil dimuat. Bahan Baku: ${countBaku}, Bahan Belanja: ${countBelanja}.`;
        message.classList.remove('loading-message');
    };

    loadBahanMentahData();
});