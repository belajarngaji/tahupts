// assets/js/produksi.js - Ganti seluruh isi file dengan kode ini

import { supabase } from './supabase.js';

let bahanBakuStok = []; // Menyimpan daftar Bahan Baku Inti yang tersedia
// Map untuk lookup cepat: {'Nama Produk Intermediet': {id: UUID, satuan: 'ml'}, ...}
let produkIntermedietMaster = {}; 

document.addEventListener('DOMContentLoaded', async () => {
    const formProduksi = document.getElementById('formProduksi');
    // MENGGANTI PRODUK SELECT menjadi INPUT TEXT
    const namaProdukInput = document.getElementById('namaProduk'); 
    const datalist = document.getElementById('produkList');
    const satuanStokInput = document.getElementById('satuanStok');
    
    const resepInputs = document.getElementById('resepInputs');
    const tambahBahanBtn = document.getElementById('tambahBahan');
    let bahanCounter = 0; 
    
    // 1. Ambil Data Master: Bahan Baku Inti dan Produk Intermediet
    const loadMasterData = async () => {
        // A. Ambil stok dan HPP bahan baku (Tahu, Petis, Gula)
        const { data: bahan, error: bahanError } = await supabase
            .from('bahan_baku_inti')
            .select('id, nama_bahan, harga_pokok_per_unit, satuan_stok, stok_saat_ini');

        if (bahanError) {
            console.error('Gagal memuat bahan baku:', bahanError);
            return;
        }
        bahanBakuStok = bahan;

        // B. Ambil daftar produk intermediet (Saus Petis) untuk datalist
        const { data: produk, error: produkError } = await supabase
            .from('produk_intermediet')
            .select('id, nama_intermediet, satuan');

        if (produkError) {
            console.error('Gagal memuat produk intermediet:', produkError);
            return;
        }

        // Isi Datalist dan map master data
        datalist.innerHTML = ''; 
        produkIntermedietMaster = {}; // Reset map
        produk.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nama_intermediet; // Value adalah NAMA produk
            datalist.appendChild(option);
            
            produkIntermedietMaster[p.nama_intermediet] = {
                id: p.id,
                satuan: p.satuan
            };
        });

        // Panggil tambahBahan pertama kali
        tambahBahan(); 
    };
    
    // Listener untuk mengisi Satuan Stok (Hanya berfungsi jika produk lama dipilih)
    namaProdukInput.addEventListener('input', () => {
        const nama = namaProdukInput.value.trim();
        const info = produkIntermedietMaster[nama];
        
        if (info) {
            // Jika nama produk ditemukan di master, isi satuan dan set input jadi readonly
            satuanStokInput.value = info.satuan;
            satuanStokInput.readOnly = true; 
        } else {
            // Jika nama produk baru/belum selesai diketik, biarkan user mengisi satuan
            satuanStokInput.value = '';
            satuanStokInput.readOnly = false;
        }
    });

    // 2. Fungsi untuk menambah baris input bahan (TETAP SAMA)
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

    // Hapus baris bahan (TETAP SAMA)
    resepInputs.addEventListener('click', (e) => {
        if (e.target.classList.contains('hapus-bahan')) {
            e.target.closest('.bahan-row').remove();
        }
    });

    // 3. Logika Submit Produksi (Bagian Paling KRITIS)
    formProduksi.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = 'Memproses produksi dan menghitung HPP...';
        message.className = '';

        const hasilProduksi = parseFloat(document.getElementById('volumeHasil').value);
        const namaProduk = namaProdukInput.value.trim();
        const satuanProduk = satuanStokInput.value.trim();
        const resepData = [];
        let totalBiayaBahan = 0;
        let intermedietId = null;

        // Validasi Awal
        if (!hasilProduksi || hasilProduksi <= 0) {
            message.textContent = 'Volume Hasil Jadi harus lebih dari 0.';
            message.className = 'error';
            return;
        }
        if (!namaProduk) {
            message.textContent = 'Nama Produk Intermediet wajib diisi.';
            message.className = 'error';
            return;
        }
        if (!satuanProduk) {
            message.textContent = 'Satuan Stok wajib diisi.';
            message.className = 'error';
            return;
        }


        // Ambil data bahan yang digunakan (TETAP SAMA)
        document.querySelectorAll('.bahan-row').forEach(row => {
            const bahanId = row.querySelector('select[name="bahanId"]').value;
            const jumlahDigunakan = parseFloat(row.querySelector('input[name="jumlahDigunakan"]').value);

            // ... (logika pengambilan resepData tetap sama) ...
            if (bahanId && jumlahDigunakan > 0) {
                const bahanInfo = bahanBakuStok.find(b => b.id === bahanId);
                if (bahanInfo) {
                    const biayaBahan = jumlahDigunakan * bahanInfo.harga_pokok_per_unit;
                    totalBiayaBahan += biayaBahan;

                    resepData.push({
                        bahan_id: bahanId,
                        jumlah_digunakan: jumlahDigunakan,
                        hpp_per_unit: bahanInfo.harga_pokok_per_unit, 
                        satuan_digunakan: bahanInfo.satuan_stok,
                    });
                }
            }
        });

        if (resepData.length === 0) {
            message.textContent = 'Mohon masukkan minimal satu bahan baku.';
            message.className = 'error';
            return;
        }
        
        // 4. PENANGANAN PRODUK LAMA VS BARU (Logika Krusial)
        let produkInfo = produkIntermedietMaster[namaProduk];
        
        if (!produkInfo) {
            // --- SKENARIO 1: PRODUK BARU ---
            message.textContent = `Produk baru: ${namaProduk}. Membuat entri baru di database...`;
            const { data: newProduk, error: insertError } = await supabase
                .from('produk_intermediet')
                .insert([{
                    nama_intermediet: namaProduk,
                    satuan: satuanProduk,
                    stok_saat_ini: 0,
                    hpp_per_unit: 0
                }])
                .select()
                .single();
            
            if (insertError) {
                message.textContent = `❌ Gagal membuat produk baru: ${insertError.message}`;
                message.className = 'error';
                return;
            }
            intermedietId = newProduk.id;
        } else {
            // --- SKENARIO 2: PRODUK LAMA ---
            intermedietId = produkInfo.id;
        }
        
        // Cek ID Produk Intermediet
        if (!intermedietId) {
            message.textContent = 'ID Produk Intermediet tidak ditemukan setelah proses.';
            message.className = 'error';
            return;
        }


        // 5. Update Database (Mulai Transaksional)

        // A. Perbarui Stok Bahan Baku Inti (TETAP SAMA)
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
            // Ambil data stok dan HPP lama (wajib dilakukan setelah memastikan produk sudah ada/baru dibuat)
            const { data: oldProdukData, error: fetchError } = await supabase
                .from('produk_intermediet')
                .select('stok_saat_ini, hpp_per_unit')
                .eq('id', intermedietId)
                .single();

            if (fetchError) throw new Error('Gagal mengambil data produk lama.');

            const stokLama = oldProdukData.stok_saat_ini;
            const hppLama = oldProdukData.hpp_per_unit;

            // Hitung HPP Rata-Rata Baru (Average Cost Method)
            const totalBiayaLama = stokLama * hppLama;
            const totalBiayaBaru = totalBiayaLama + totalBiayaBahan;
            const totalStokBaru = stokLama + hasilProduksi;
            
            // Pencegahan pembagian dengan nol
            const hppRataRataBaru = totalStokBaru > 0 ? totalBiayaBaru / totalStokBaru : 0; 

            // Kirim update
            const { error: updateError } = await supabase
                .from('produk_intermediet')
                .update({ 
                    stok_saat_ini: totalStokBaru, 
                    hpp_per_unit: hppRataRataBaru 
                })
                .eq('id', intermedietId);

            if (updateError) throw new Error('Gagal update stok produk intermediet.');

            // C. Simpan Detail Resep Produksi (Untuk riwayat batch ini)
            // *Opsional:* Anda bisa menyimpan detail resep ke tabel `resep_intermediet` di sini.
            
            message.textContent = `✅ Produksi ${namaProduk} berhasil! HPP/unit: Rp${hppRataRataBaru.toFixed(2)}/${satuanProduk}. Stok total: ${totalStokBaru.toFixed(2)} ${satuanProduk}.`;
            message.className = 'success';
            
            formProduksi.reset();
            satuanStokInput.readOnly = false; // Reset readonly status
            await loadMasterData(); // Muat ulang data untuk menampilkan stok/datalist baru

        } catch (error) {
            message.textContent = `❌ Gagal Produksi: ${error.message}`;
            message.className = 'error';
        }
    });
    
    // Inisialisasi: Muat data master saat halaman dimuat
    await loadMasterData();
});