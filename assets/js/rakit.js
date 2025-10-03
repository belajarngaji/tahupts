// assets/js/rakit.js
import { supabase } from './supabase.js';

let masterData = {
    produkAkhir: {}, // Map: { 'Nama Produk': {id: UUID, satuan: 'porsi'}, ... }
    resepDetail: {}, // Map: { 'UUID Produk Akhir': [ {bahan_id, jml, satuan, tipe}, ... ], ... }
    bahanBakuStok: {}, // Map: { 'UUID Bahan Baku': {hpp, stok}, ... }
    produkIntermedietStok: {}, // Map: { 'UUID Intermediet': {hpp, stok}, ... }
};

document.addEventListener('DOMContentLoaded', async () => {
    const formPerakitan = document.getElementById('formPerakitan');
    const namaProdukAkhirInput = document.getElementById('namaProdukAkhir');
    const datalistAkhir = document.getElementById('produkAkhirList');
    const resepDetailDiv = document.getElementById('resepDetail');
    const message = document.getElementById('message');

    // --- 1. MEMUAT DATA MASTER ---
    const loadMasterData = async () => {
        // ... Logika pengambilan data bahan baku inti (bahanBakuStok)
        // ... Logika pengambilan data produk intermediet (produkIntermedietStok)
        // ... Logika pengambilan data produk akhir (produkAkhir)
        // ... Logika pengambilan data resep akhir (resepDetail)
        
        // (Untuk simplifikasi, anggap data sudah dimuat ke masterData)
        // Anda perlu menulis fungsi fetch data 4 tabel di sini, mirip dengan produksi.js
        // Pastikan datalistAkhir terisi dari masterData.produkAkhir
        
        // Sementara itu, kita akan fokus pada logika submit
    };
    
    // Panggil saat input nama produk diubah
    namaProdukAkhirInput.addEventListener('input', () => {
        const nama = namaProdukAkhirInput.value.trim();
        const resep = masterData.resepDetail[masterData.produkAkhir[nama]?.id];
        resepDetailDiv.innerHTML = ''; // Kosongkan
        
        if (resep) {
            resepDetailDiv.innerHTML = '<h4>Resep Ditemukan:</h4><ul>' + 
                resep.map(item => `<li>- ${item.jumlah_dipakai} ${item.satuan_dipakai} ${item.tipe === 'bahan' ? masterData.bahanBakuStok[item.bahan_id]?.nama_bahan : masterData.produkIntermedietStok[item.produk_intermediet_id]?.nama_intermediet}</li>`).join('') +
                '</ul>';
        } else {
             resepDetailDiv.innerHTML = '<p style="color: orange;">Resep belum didefinisikan di tabel resep_akhir.</p>';
        }
    });

    // --- 2. LOGIKA SUBMIT PERAKITAN ---
    formPerakitan.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = 'Memproses perakitan dan menghitung COGS...';
        message.className = '';

        const jumlahRakit = parseFloat(document.getElementById('jumlahRakit').value);
        const namaProduk = namaProdukAkhirInput.value.trim();
        
        // 1. Dapatkan ID Produk Akhir dan Resep
        const produkInfo = masterData.produkAkhir[namaProduk];
        if (!produkInfo) {
            message.textContent = '❌ Produk tidak ditemukan/belum dibuat di master data.';
            message.className = 'error';
            return;
        }
        const resep = masterData.resepDetail[produkInfo.id];
        if (!resep || resep.length === 0) {
            message.textContent = '❌ Resep untuk produk ini belum didefinisikan.';
            message.className = 'error';
            return;
        }

        let totalCOGSPerUnit = 0;
        const updatePromises = [];
        
        // 2. Hitung COGS dan Kurangi Stok Bahan/Intermediet
        resep.forEach(item => {
            const jumlahDigunakanTotal = item.jumlah_dipakai * jumlahRakit;
            let biayaUnit = 0;
            let currentStok = 0;
            let tableName = '';
            let idField = '';
            let stokMap = null;

            if (item.tipe === 'bahan') {
                const bahan = masterData.bahanBakuStok[item.bahan_id];
                biayaUnit = bahan.hpp_per_unit;
                currentStok = bahan.stok_saat_ini;
                tableName = 'bahan_baku_inti';
                idField = 'id';
                stokMap = masterData.bahanBakuStok;
            } else if (item.tipe === 'intermediet') {
                const produkInt = masterData.produkIntermedietStok[item.produk_intermediet_id];
                biayaUnit = produkInt.hpp_per_unit;
                currentStok = produkInt.stok_saat_ini;
                tableName = 'produk_intermediet';
                idField = 'id';
                stokMap = masterData.produkIntermedietStok;
            }
            
            // Tambahkan biaya ke COGS total
            totalCOGSPerUnit += item.jumlah_dipakai * biayaUnit;
            
            // Perbarui Stok
            const stokBaru = currentStok - jumlahDigunakanTotal;
            if (stokBaru < 0) {
                 // Throw error untuk menghentikan Promise.all
                throw new Error(`Stok ${item.nama} tidak cukup! Kurang ${Math.abs(stokBaru).toFixed(2)} ${item.satuan_dipakai}.`);
            }
            
            // Masukkan promise update stok ke array
            updatePromises.push(
                supabase.from(tableName).update({ stok_saat_ini: stokBaru }).eq(idField, item.id)
            );
            
            // Update map lokal
            stokMap[item.id].stok_saat_ini = stokBaru;
        });

        try {
            // 3. Jalankan Semua Pengurangan Stok
            await Promise.all(updatePromises);
            
            // 4. Update Stok & HPP Produk Akhir (menggunakan HPP LIFO/FIFO Sederhana)
            // (Kita asumsikan HPP Final produk akhir hanya dihitung dari resep)
            
            // Dapatkan stok lama produk akhir
            const { data: oldProduk, error: fetchError } = await supabase
                .from('produk_akhir')
                .select('stok_saat_ini')
                .eq('id', produkInfo.id)
                .single();
            
            if (fetchError) throw new Error('Gagal mengambil data produk akhir lama.');

            const stokBaru = oldProduk.stok_saat_ini + jumlahRakit;
            
            // Kirim update stok dan HPP (COGS)
            const { error: updateError } = await supabase
                .from('produk_akhir')
                .update({ 
                    stok_saat_ini: stokBaru, 
                    hpp_per_unit: totalCOGSPerUnit // COGS/porsi dihitung dari resep saat ini
                })
                .eq('id', produkInfo.id);

            if (updateError) throw new Error('Gagal update stok produk akhir.');
            
            message.textContent = `✅ Perakitan ${namaProduk} (${jumlahRakit} porsi) berhasil! COGS/unit: Rp${totalCOGSPerUnit.toFixed(2)}.`;
            message.className = 'success';
            
            formPerakitan.reset();
            await loadMasterData(); // Muat ulang data
            
        } catch (error) {
            message.textContent = `❌ Gagal Perakitan: ${error.message}`;
            message.className = 'error';
        }
    });
    
    await loadMasterData();
});