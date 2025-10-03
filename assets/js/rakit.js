// assets/js/rakit.js (Kode Lengkap yang Disesuaikan untuk <select> dengan ID)
import { supabase } from './supabase.js';

let masterData = {
    produkAkhir: {},          // Map: { 'UUID': {id, nama, satuan, stok, hpp}, ... }
    resepDetail: {},          // Map: { 'UUID Produk Akhir': [ {tipe, id, nama, jml, satuan}, ... ], ... }
    bahanBakuStok: {},
    produkIntermedietStok: {},
};

document.addEventListener('DOMContentLoaded', async () => {
    const formPerakitan = document.getElementById('formPerakitan');
    // Ganti nama variabel untuk mencerminkan elemen <select> di HTML
    const namaProdukAkhirSelect = document.getElementById('namaProdukAkhir');
    const resepDetailDiv = document.getElementById('resepDetail');
    const message = document.getElementById('message');

    // --- 1. MEMUAT DATA MASTER (Lengkap) ---
    const loadMasterData = async () => {
        message.textContent = 'Memuat data HPP, Stok, dan Resep...';

        // A. Ambil Bahan Baku Inti
        const { data: bahan, error: bahanError } = await supabase
            .from('bahan_baku_inti')
            .select('id, nama_bahan, harga_pokok_per_unit, satuan_stok, stok_saat_ini');
        if (bahanError) return console.error('Gagal memuat bahan baku inti:', bahanError);
        bahan.forEach(b => { masterData.bahanBakuStok[b.id] = { nama: b.nama_bahan, hpp_per_unit: b.harga_pokok_per_unit, stok_saat_ini: b.stok_saat_ini, satuan: b.satuan_stok }; });

        // B. Ambil Produk Intermediet
        const { data: intermediet, error: intError } = await supabase
            .from('produk_intermediet')
            .select('id, nama_intermediet, hpp_per_unit, satuan, stok_saat_ini');
        if (intError) return console.error('Gagal memuat produk intermediet:', intError);
        intermediet.forEach(i => { masterData.produkIntermedietStok[i.id] = { nama: i.nama_intermediet, hpp_per_unit: i.hpp_per_unit, stok_saat_ini: i.stok_saat_ini, satuan: i.satuan }; });

        // C. Ambil Produk Akhir (Mengisi <select> dengan ID)
        const { data: produkAkhir, error: paError } = await supabase
            .from('produk_akhir')
            .select('id, nama_produk, satuan_jual, stok_saat_ini, hpp_per_unit');

        if (paError) return console.error('Gagal memuat produk akhir:', paError);
        namaProdukAkhirSelect.innerHTML = '<option value="">-- Pilih Produk Akhir --</option>';
        masterData.produkAkhir = {};

        produkAkhir.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id; // VALUE ADALAH ID
            option.textContent = p.nama_produk;
            namaProdukAkhirSelect.appendChild(option);
            masterData.produkAkhir[p.id] = p; // Map Key ADALAH ID
        });
        
        // D. Ambil Detail Resep Akhir
        const { data: resep, error: resepError } = await supabase
            .from('resep_akhir')
            .select('produk_akhir_id, bahan_baku_id, produk_intermediet_id, jumlah_dipakai, satuan_dipakai');
        if (resepError) return console.error('Gagal memuat resep akhir:', resepError);
        masterData.resepDetail = {};

        resep.forEach(r => {
            if (!masterData.resepDetail[r.produk_akhir_id]) {
                masterData.resepDetail[r.produk_akhir_id] = [];
            }
            const tipe = r.bahan_baku_id ? 'bahan' : 'intermediet';
            const id = r.bahan_baku_id || r.produk_intermediet_id;
            const itemMap = tipe === 'bahan' ? masterData.bahanBakuStok : masterData.produkIntermedietStok;
            
            masterData.resepDetail[r.produk_akhir_id].push({
                tipe, id,
                nama: itemMap[id]?.nama || 'Unknown Item',
                bahan_id: r.bahan_baku_id, // Tetap gunakan key lama untuk kompatibilitas
                produk_intermediet_id: r.produk_intermediet_id, // Tetap gunakan key lama
                jumlah_dipakai: r.jumlah_dipakai,
                satuan_dipakai: r.satuan_dipakai
            });
        });
        message.textContent = 'Data HPP siap. Pilih produk untuk merakit.';
    };

    // Panggil saat dropdown (select) diubah - MENGGANTIKAN event 'input'
    namaProdukAkhirSelect.addEventListener('change', () => {
        const produkId = namaProdukAkhirSelect.value;
        const resep = masterData.resepDetail[produkId];
        resepDetailDiv.innerHTML = ''; // Kosongkan
        
        if (resep) {
            resepDetailDiv.innerHTML = '<h4>Resep Ditemukan (per 1 unit):</h4><ul>' + 
                resep.map(item => `<li>- ${item.jumlah_dipakai} ${item.satuan_dipakai} ${item.nama}</li>`).join('') +
                '</ul>';
        } else if (produkId) {
             resepDetailDiv.innerHTML = '<p style="color: orange;">Resep belum didefinisikan untuk produk ini.</p>';
        }
    });

    // --- 2. LOGIKA SUBMIT PERAKITAN ---
    formPerakitan.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = 'Memproses perakitan dan menghitung COGS...';
        message.className = '';

        const produkAkhirId = namaProdukAkhirSelect.value; // Ambil ID dari <select>
        const jumlahRakit = parseFloat(document.getElementById('jumlahRakit').value);
        
        // 1. Dapatkan Produk Info dan Resep menggunakan ID
        const produkInfo = masterData.produkAkhir[produkAkhirId]; // Lookup berdasarkan ID
        if (!produkInfo) {
            message.textContent = '❌ Pilih produk yang valid dari daftar.';
            message.className = 'error';
            return;
        }
        
        const namaProduk = produkInfo.nama_produk; // Ambil nama produk dari info
        const resep = masterData.resepDetail[produkAkhirId];
        if (!resep || resep.length === 0) {
            message.textContent = '❌ Resep untuk produk ini belum didefinisikan.';
            message.className = 'error';
            return;
        }

        let totalCOGSPerUnit = 0;
        const updatePromises = [];
        
        // 2. Hitung COGS dan Kurangi Stok Bahan/Intermediet
        try {
            resep.forEach(item => {
                const jumlahDigunakanTotal = item.jumlah_dipakai * jumlahRakit;
                let biayaUnit = 0;
                let currentStok = 0;
                let tableName = '';
                let idField = '';
                let stokMap = null;
                let itemId = null;
                let itemName = item.nama; 

                if (item.tipe === 'bahan') {
                    itemId = item.bahan_id;
                    const bahan = masterData.bahanBakuStok[itemId];
                    biayaUnit = bahan.hpp_per_unit;
                    currentStok = bahan.stok_saat_ini;
                    tableName = 'bahan_baku_inti';
                    stokMap = masterData.bahanBakuStok;
                } else if (item.tipe === 'intermediet') {
                    itemId = item.produk_intermediet_id;
                    const produkInt = masterData.produkIntermedietStok[itemId];
                    biayaUnit = produkInt.hpp_per_unit;
                    currentStok = produkInt.stok_saat_ini;
                    tableName = 'produk_intermediet';
                    stokMap = masterData.produkIntermedietStok;
                }

                // Tambahkan biaya ke COGS total
                totalCOGSPerUnit += item.jumlah_dipakai * biayaUnit;

                // Perbarui Stok
                const stokBaru = currentStok - jumlahDigunakanTotal;
                if (stokBaru < 0) {
                    throw new Error(`Stok ${itemName} tidak cukup! Kurang ${Math.abs(stokBaru).toFixed(2)} ${item.satuan_dipakai}.`);
                }

                // Masukkan promise update stok ke array
                updatePromises.push(
                    supabase.from(tableName).update({ stok_saat_ini: stokBaru }).eq('id', itemId)
                );

                // Update map lokal
                stokMap[itemId].stok_saat_ini = stokBaru;
            });
        
            // 3. Jalankan Semua Pengurangan Stok
            await Promise.all(updatePromises);

            // 4. Update Stok & HPP Produk Akhir
            
            // Dapatkan stok lama produk akhir
            const { data: oldProduk, error: fetchError } = await supabase
                .from('produk_akhir')
                .select('stok_saat_ini')
                .eq('id', produkAkhirId) // Cari berdasarkan ID
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
                .eq('id', produkAkhirId); // Update berdasarkan ID

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