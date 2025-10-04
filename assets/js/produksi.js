// assets/js/produksi.js

import { supabase } from './.js';

let masterData = {
    produkIntermediet: [],
    resepIntermediet: {}, // Menyimpan resep PI: {PI_ID: [{bahan_baku_id, jumlah_dipakai, satuan_dipakai}, ...]}
};

const produkIntermedietSelect = document.getElementById('produkIntermedietSelect');
const satuanProduksiDisplay = document.getElementById('satuanProduksiDisplay');
const jumlahProduksiInput = document.getElementById('jumlahProduksi');
const hppInfoDiv = document.getElementById('hppInfo');
const message = document.getElementById('message');
const formProduksi = document.getElementById('formProduksiIntermediet');

// --- Fungsi Pengurangan Stok BBI (Mirip reduceBahanBakuStock dari admin_resep_akhir.js) ---
// CATATAN: Fungsi ini HARUS mendapatkan data HPP Bahan Baku yang benar (hpp_per_unit, faktor_konversi, satuan konversi)
const reduceBahanBakuStock = async (bahanBakuList) => {
    let success = true;

    for (const item of bahanBakuList) {
        // 1. Ambil data HPP dan Konversi dari Bahan Baku Inti
        const { data: itemData, error: hppError } = await supabase
            .from('bahan_baku_inti')
            .select('hpp_per_unit, satuan_konversi, faktor_konversi, satuan_stok, stok_saat_ini, jumlah_beli')
            .eq('id', item.bahan_baku_id)
            .single();

        if (hppError || !itemData) {
            console.error(`Gagal ambil data BBI ID ${item.bahan_baku_id}:`, hppError?.message);
            success = false;
            continue;
        }

        let jumlahReduksiKonversi = 0;
        
        // 2. Hitung jumlah reduksi dalam satuan konversi
        if (item.satuan_dipakai === itemData.satuan_stok) {
            // Jika satuan dipakai adalah Satuan Utama (Beli)
            jumlahReduksiKonversi = item.jumlah_dipakai * itemData.faktor_konversi;
        } else if (item.satuan_dipakai === itemData.satuan_konversi) {
            // Jika satuan dipakai adalah Satuan Konversi (Unit Terkecil)
            jumlahReduksiKonversi = item.jumlah_dipakai;
        } else {
            console.warn(`Satuan BBI tidak dikenali: ${item.satuan_dipakai} ID: ${item.bahan_baku_id}`);
            success = false;
            continue;
        }
        
        // 3. Hitung Stok Baru
        const newStokSaatIni = itemData.stok_saat_ini - jumlahReduksiKonversi;
        const newJumlahBeli = newStokSaatIni / itemData.faktor_konversi; 

        // 4. Update DB Bahan Baku Inti
        const { error: updateError } = await supabase
            .from('bahan_baku_inti')
            .update({
                stok_saat_ini: newStokSaatIni, // Stok Konversi
                jumlah_beli: newJumlahBeli // Stok Utama
            })
            .eq('id', item.bahan_baku_id);

        if (updateError) {
            console.error(`❌ Gagal update stok BBI ID ${item.bahan_baku_id}:`, updateError?.message);
            success = false;
        }
    }
    return success;
};

// --- Fungsi Utama untuk Memuat Data ---
const loadMasterData = async () => {
    message.textContent = 'Memuat data Produk Intermediet dan Resep...';

    // 1. Ambil semua Produk Intermediet (PI)
    const { data: piData, error: piError } = await supabase
        .from('produk_intermediet')
        .select('id, nama_intermediet, satuan, hpp_per_unit, stok_saat_ini');
    
    // 2. Ambil Resep yang ditujukan untuk Produk Intermediet (Resep Akhir yang produk_akhir_id-nya adalah PI ID)
    // Asumsi: Anda menggunakan tabel resep_akhir untuk menyimpan resep PI
    const { data: resepData, error: resepError } = await supabase
        .from('resep_akhir') 
        .select('produk_akhir_id, bahan_baku_id, jumlah_dipakai, satuan_dipakai, produk_intermediet_id');
    
    if (piError || resepError) {
        message.textContent = '❌ Gagal memuat data master.';
        console.error(piError || resepError);
        return;
    }

    masterData.produkIntermediet = piData;
    masterData.resepIntermediet = {};
    
    // 3. Mapping Resep ke Produk Intermediet yang bersangkutan (PI)
    piData.forEach(pi => {
        // Cari resep yang produk_akhir_id-nya sama dengan id PI
        const resepPI = resepData.filter(r => r.produk_akhir_id === pi.id);
        
        // Hanya simpan item yang merupakan Bahan Baku Inti (BBI)
        masterData.resepIntermediet[pi.id] = resepPI.filter(r => r.bahan_baku_id);
    });

    // 4. Isi Dropdown
    produkIntermedietSelect.innerHTML = '<option value="">-- Pilih Produk Intermediet --</option>';
    piData.forEach(pi => {
        if (masterData.resepIntermediet[pi.id] && masterData.resepIntermediet[pi.id].length > 0) {
            // Hanya tampilkan PI yang sudah memiliki resep
            const option = document.createElement('option');
            option.value = pi.id;
            option.textContent = `${pi.nama_intermediet} (${pi.satuan})`;
            produkIntermedietSelect.appendChild(option);
        }
    });

    message.textContent = 'Data siap. Pilih Produk Intermediet yang akan diproduksi.';
};

// --- Listener untuk Update Satuan dan HPP ---
produkIntermedietSelect.addEventListener('change', () => {
    const selectedId = produkIntermedietSelect.value;
    const pi = masterData.produkIntermediet.find(p => p.id === selectedId);
    
    if (pi) {
        satuanProduksiDisplay.textContent = `(${pi.satuan})`;
        hppInfoDiv.innerHTML = `
            <p>HPP per unit (${pi.satuan}) adalah: <strong>Rp${(pi.hpp_per_unit || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</strong></p>
            <p>Stok Saat Ini: <strong>${(pi.stok_saat_ini || 0).toFixed(2)} ${pi.satuan}</strong></p>
        `;
    } else {
        satuanProduksiDisplay.textContent = '(Satuan)';
        hppInfoDiv.innerHTML = '';
    }
});

// --- Listener Submit Form ---
formProduksi.addEventListener('submit', async (e) => {
    e.preventDefault();

    const piId = produkIntermedietSelect.value;
    const jumlahProduksi = parseFloat(jumlahProduksiInput.value);
    const tanggalProduksi = document.getElementById('tanggalProduksi').value;
    
    if (!piId || jumlahProduksi <= 0) {
        message.textContent = '❌ Harap lengkapi semua input dengan benar.';
        message.className = 'error';
        return;
    }

    const pi = masterData.produkIntermediet.find(p => p.id === piId);
    const resep = masterData.resepIntermediet[piId];

    if (!resep || resep.length === 0) {
        message.textContent = `❌ Resep untuk ${pi.nama_intermediet} tidak ditemukan.`;
        message.className = 'error';
        return;
    }

    message.textContent = 'Memulai proses produksi dan pengurangan stok BBI...';
    message.className = '';

    // 1. Hitung total kebutuhan BBI berdasarkan Jumlah Produksi
    const bahanBakuYangDikonsumsi = resep.map(item => ({
        bahan_baku_id: item.bahan_baku_id,
        jumlah_dipakai: item.jumlah_dipakai * jumlahProduksi,
        satuan_dipakai: item.satuan_dipakai // Satuan yang digunakan di resep
    }));

    // 2. Kurangi Stok BBI
    const reductionSuccess = await reduceBahanBakuStock(bahanBakuYangDikonsumsi);

    if (!reductionSuccess) {
        message.textContent = `⚠️ Gagal mengurangi sebagian stok Bahan Baku Inti. Produksi PI DIBATALKAN. Cek log konsol.`;
        message.className = 'warning';
        return;
    }
    
    // 3. Ambil Stok PI Saat Ini
    const { data: currentPI, error: fetchPIError } = await supabase
        .from('produk_intermediet')
        .select('stok_saat_ini')
        .eq('id', piId)
        .single();
    
    const newPIStock = (currentPI?.stok_saat_ini || 0) + jumlahProduksi;

    // 4. Tambah Stok PI (Saus Matang)
    const { error: updatePIError } = await supabase
        .from('produk_intermediet')
        .update({ stok_saat_ini: newPIStock })
        .eq('id', piId);

    if (updatePIError) {
        message.textContent = `❌ Stok BBI berhasil dikurangi, tetapi GAGAL menambahkan stok PI. Cek log konsol.`;
        message.className = 'warning';
        return;
    }

    // 5. Catat Transaksi Produksi (Opsional tapi Direkomendasikan untuk Audit)
    // Jika Anda ingin mencatat ini, buat tabel baru 'transaksi_produksi' dan insert log di sini.

    message.textContent = `✅ Produksi ${jumlahProduksi} ${pi.satuan} ${pi.nama_intermediet} berhasil dicatat. Stok BBI dikurangi, Stok PI kini ${newPIStock.toFixed(2)} ${pi.satuan}.`;
    message.className = 'success';

    // Reset dan reload
    formProduksi.reset();
    await loadMasterData();
});


document.addEventListener('DOMContentLoaded', loadMasterData);