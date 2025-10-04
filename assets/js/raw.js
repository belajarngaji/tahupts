// assets/js/raw.js (Logic Diperbarui)

import { supabase } from './supabase.js';

// Fungsi untuk membuat elemen card bahan
const createBahanCard = (item) => {
    // Pastikan faktor konversi dan stok adalah angka
    const faktorKonversi = parseFloat(item.faktor_konversi) || 1;
    const stokSaatIni = parseFloat(item.stok_saat_ini) || 0;
    
    // Satuan Utama dan Satuan Konversi (LANGSUNG DARI DB)
    const satuanUtama = item.satuan_stok; 
    const satuanKonversi = item.satuan_konversi; // <-- Menggunakan kolom baru dari DB

    // Logika perhitungan Stok Utama (e.g., pcs)
    const stokUtama = stokSaatIni / faktorKonversi; 
    
    // Deskripsi Konversi (e.g., 5 potong)
    const deskripsiKonversi = (faktorKonversi > 1 && satuanKonversi) 
        ? `${faktorKonversi.toLocaleString('id-ID', { maximumFractionDigits: 0 })} ${satuanKonversi}`
        : null;

    const card = document.createElement('div');
    card.className = 'item-card';

    card.innerHTML = `
        <h3>${item.nama_bahan}</h3>
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
        <small>HPP Unit Konversi: Rp${(item.harga_pokok_per_unit || 0).toLocaleString('id-ID')}</small>
    `;

    return card;
};


document.addEventListener('DOMContentLoaded', async () => {
    const message = document.getElementById('message');
    const bbList = document.getElementById('bahanBakuList');
    const blList = document.getElementById('bahanBelanjaList');

    const loadBahanMentahData = async () => {
        message.textContent = 'Mengambil data Bahan Mentah dan Stok...';

        // --- 1. Ambil data dari Bahan Baku Inti ---
        // MEMASTIKAN KOLOM 'kategori' dan 'satuan_konversi' diambil
        const { data: bbData, error: bbError } = await supabase
            .from('bahan_baku_inti')
            .select('id, nama_bahan, satuan_stok, stok_saat_ini, faktor_konversi, harga_pokok_per_unit, kategori, satuan_konversi'); 

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
            
            // Logika Pemisahan Tampilan: Menggunakan kolom 'kategori' dari DB
            // Asumsi: 'Bahan Baku Inti' masuk ke bagian Bahan Baku
            const isBahanBaku = (item.kategori === 'Bahan Baku Inti');

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
                // Semua kategori lain (Bumbu/Pelengkap, Overhead/Operasional) dianggap "Bahan Belanja"
                blList.appendChild(card);
                countBelanja++;
            }
        });


        // --- 3. Update Status Pesan ---
        if (bbData.length === 0) {
            bbList.innerHTML = '<p>Tidak ada data Bahan Baku Inti di database.</p>';
            blList.innerHTML = '<p>Tidak ada data Bahan Belanja di database.</p>';
        }
        
        message.textContent = `✅ Daftar bahan berhasil dimuat. Bahan Baku Inti: ${countBaku}, Bahan Belanja/Lainnya: ${countBelanja}.`;
        message.classList.remove('loading-message');
    };

    loadBahanMentahData();
});