// assets/js/raw.js (Logic Diperbarui)

import { supabase } from './supabase.js';

// Fungsi untuk membuat elemen card bahan
const createBahanCard = (item) => {
    const card = document.createElement('div');
    card.className = 'item-card';

    card.innerHTML = `
        <h3>${item.nama_bahan}</h3>
        <div class="stock-info">
            Stok: ${item.stok_saat_ini.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${item.satuan_stok} 
            ${item.konversi && item.konversi.nilai && item.konversi.satuan ? 
                `≈ ${(item.stok_saat_ini * item.konversi.nilai).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${item.konversi.satuan}` 
                : ''}
        </div>
        ${item.konversi && item.konversi.nilai && item.konversi.satuan ? 
            `<div class="conversion-alert">
                ( ! ) 1 ${item.satuan_stok} = ${item.konversi.nilai} ${item.konversi.satuan}
            </div>` 
            : ''}
        <small>HPP: Rp${(item.harga_pokok_per_unit || 0).toLocaleString('id-ID')}</small>
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
        // Anda harus menambahkan kolom konversi dan stok di sini
        const { data: bbData, error: bbError } = await supabase
            .from('bahan_baku_inti')
            // ASUMSI: kolom stok dan konversi (nilai/satuan) sudah ada
            .select('id, nama_bahan, satuan_stok, harga_pokok_per_unit, stok_saat_ini, satuan_konversi_nilai, satuan_konversi_satuan'); 

        if (bbError) {
            message.textContent = '❌ Gagal memuat data bahan mentah.';
            console.error("Bahan Baku Error:", bbError);
            return;
        }

        // Kosongkan list
        bbList.innerHTML = '';
        blList.innerHTML = '';

        let countBaku = 0;
        let countBelanja = 0;

        // --- 2. Proses dan Pisahkan Data ---
        bbData.forEach(item => {
            // FORMAT DATA untuk kemudahan display
            const formattedItem = {
                nama_bahan: item.nama_bahan,
                stok_saat_ini: parseFloat(item.stok_saat_ini) || 0,
                satuan_stok: item.satuan_stok,
                harga_pokok_per_unit: item.harga_pokok_per_unit,
                konversi: {
                    nilai: item.satuan_konversi_nilai,
                    satuan: item.satuan_konversi_satuan
                },
                // ASUMSI PEMISAHAN (HARAP SESUAIKAN DENGAN LOGIKA DB/KOLOM 'tipe_bahan' ASLI ANDA)
                // Di sini saya membuat logika sederhana untuk demo:
                tipe: (item.nama_bahan.includes('Tahu') || item.nama_bahan.includes('Petis')) ? 'BAKU' : 'BELANJA' 
            };

            const card = createBahanCard(formattedItem);

            if (formattedItem.tipe === 'BAKU') {
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