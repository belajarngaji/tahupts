// assets/js/produksi.js
import { supabase } from './supabase.js';

let bahanBakuStok = []; // Akan menyimpan daftar Bahan Baku Inti yang tersedia

document.addEventListener('DOMContentLoaded', async () => {
    const formProduksi = document.getElementById('formProduksi');
    const produkSelect = document.getElementById('namaProduk');
    const resepInputs = document.getElementById('resepInputs');
    const tambahBahanBtn = document.getElementById('tambahBahan');
    let bahanCounter = 0; // Untuk ID unik input

    // 1. Ambil Data Master: Bahan Baku Inti dan Produk Intermediet
    const loadMasterData = async () => {
        // Ambil stok dan HPP bahan baku (Tahu, Petis, Gula)
        const { data: bahan, error: bahanError } = await supabase
            .from('bahan_baku_inti')
            .select('id, nama_bahan, harga_pokok_per_unit, satuan_stok, stok_saat_ini');
        
        if (bahanError) {
            console.error('Gagal memuat bahan baku:', bahanError);
            return;
        }
        bahanBakuStok = bahan;

        // Ambil daftar produk intermediet (Saus Petis)
        const { data: produk, error: produkError } = await supabase
            .from('produk_intermediet')
            .select('id, nama_intermediet, satuan');
            
        if (produkError) {
            console.error('Gagal memuat produk intermediet:', produkError);
            return;
        }

        // Isi dropdown Produk Intermediet
        produk.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nama_intermediet;
            option.dataset.satuan = p.satuan;
            produkSelect.appendChild(option);
        });
        
        // Panggil tambahBahan pertama kali
        tambahBahan(); 
    };

    // 2. Fungsi untuk menambah baris input bahan
    const tambahBahan = () => {
        bahanCounter++;
        
        const div = document.createElement('div');
        div.className = 'input-group bahan-row';
        div.dataset.id = bahanCounter;
        
        div.innerHTML = `
            <div style="flex: 2;">
                <label>Bahan #${bahanCounter}:</label>
                <select name="bahanId" required>
                    <option value="">-- Pilih Bahan Baku --</option>
                    ${bahanBakuStok.map(b => `<option value="${b.id}" data-satuan="${b.satuan_stok}">${b.nama_bahan} (${b.satuan_stok})</option>`).join('')}
                </select>
            </div>
            <div style="flex: 1;">
                <label>Jumlah:</label>
                <input type="number" name="jumlahDigunakan" step="any" required>
            </div>
            <button type="button" class="hapus-bahan" style="width: auto; background-color: #dc3545; padding: 10px 5px; margin-top: 25px;">Hapus</button>
        `;
        
        resepInputs.appendChild(div);
    };

    tambahBahanBtn.addEventListener('click', tambahBahan);

    // Hapus baris bahan
    resepInputs.addEventListener('click', (e) => {
        if (e.target.classList.contains('hapus-bahan')) {
            e.target.closest('.bahan-row').remove();
        }
    });

    // 3. Logika Submit Produksi
    formProduksi.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = 'Memproses produksi dan menghitung HPP...';
        message.className = '';

        const hasilProduksi = parseFloat(document.getElementById('volumeHasil').value);
        const intermedietId = produkSelect.value;
        const resepData = [];
        let totalBiayaBahan = 0;

        // Ambil data bahan yang digunakan
        document.querySelectorAll('.bahan-row').forEach(row => {
            const bahanId = row.querySelector('select[name="bahanId"]').value;
            const jumlahDigunakan = parseFloat(row.querySelector('input[name="jumlahDigunakan"]').value);

            if (bahanId && jumlahDigunakan > 0) {
                const bahanInfo = bahanBakuStok.find(b => b.id === bahanId);

                // Hitung biaya bahan ini (jumlah * HPP per unit stok)
                const biayaBahan = jumlahDigunakan * bahanInfo.harga_pokok_per_unit;
                totalBiayaBahan += biayaBahan;

                resepData.push({
                    bahan_id: bahanId,
                    jumlah_digunakan: jumlahDigunakan,
                    hpp_per_unit: bahanInfo.harga_pokok_per_unit, // Simpan HPP saat ini
                    satuan_digunakan: bahanInfo.satuan_stok,
                });
            }
        });
        
        if (resepData.length === 0) {
            message.textContent = 'Mohon masukkan minimal satu bahan baku.';
            message.className = 'error';
            return;
        }

        // 4. Hitung HPP Final Saus Petis
        const hppSausPetisBaru = totalBiayaBahan / hasilProduksi;

        // 5. Update Database (Transaksi Transaksional)
        // Note: Untuk transaksi sejati, ini idealnya dilakukan melalui Supabase Function/Stored Procedure.
        
        // A. Perbarui Stok Bahan Baku Inti
        const updatePromises = resepData.map(async item => {
            const bahanInfo = bahanBakuStok.find(b => b.id === item.bahan_id);
            const stokBaru = bahanInfo.stok_saat_ini - item.jumlah_digunakan;
            
            if (stokBaru < 0) {
                // Ini adalah validasi: stok tidak boleh minus
                throw new Error(`Stok ${bahanInfo.nama_bahan} tidak cukup! Tersisa: ${bahanInfo.stok_saat_ini}`);
            }

            return supabase
                .from('bahan_baku_inti')
                .update({ stok_saat_ini: stokBaru })
                .eq('id', item.bahan_id);
        });

        try {
            await Promise.all(updatePromises);
            
            // B. Update Stok dan HPP Produk Intermediet
            // Perlu mendapatkan stok lama untuk menghitung HPP rata-rata baru.
            const { data: oldProdukData, error: fetchError } = await supabase
                .from('produk_intermediet')
                .select('stok_saat_ini, hpp_per_unit')
                .eq('id', intermedietId)
                .single();

            if (fetchError) throw new Error('Gagal mengambil data produk lama.');
            
            const stokLama = oldProdukData.stok_saat_ini;
            const hppLama = oldProdukData.hpp_per_unit;
            
            // Hitung HPP Rata-Rata Baru
            const totalBiayaLama = stokLama * hppLama;
            const totalBiayaBaru = totalBiayaLama + totalBiayaBahan;
            const totalStokBaru = stokLama + hasilProduksi;
            const hppRataRataBaru = totalBiayaBaru / totalStokBaru;
            
            // Kirim update
            const { error: updateError } = await supabase
                .from('produk_intermediet')
                .update({ 
                    stok_saat_ini: totalStokBaru, 
                    hpp_per_unit: hppRataRataBaru 
                })
                .eq('id', intermedietId);

            if (updateError) throw new Error('Gagal update stok produk intermediet.');
            
            // C. Simpan Resep Produksi (Opsional, tapi penting untuk riwayat)
            // Di sini Anda bisa menyimpan detail resep ke tabel resep_intermediet
            // untuk riwayat produksi batch ini. (Kita skip untuk simplifikasi, tapi disarankan)
            
            message.textContent = `✅ Produksi berhasil! HPP Saus Petis: Rp${hppRataRataBaru.toFixed(2)}/ml. Stok ditambahkan: ${hasilProduksi} ml.`;
            message.className = 'success';
            formProduksi.reset();
            await loadMasterData(); // Muat ulang data untuk menampilkan stok baru

        } catch (error) {
            message.textContent = `❌ Gagal Produksi: ${error.message}`;
            message.className = 'error';
        }

    });
    
    // Inisialisasi: Muat data master saat halaman dimuat
    await loadMasterData();
});