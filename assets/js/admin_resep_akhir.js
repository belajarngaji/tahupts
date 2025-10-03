// assets/js/admin_resep_akhir.js (Kode Lengkap dengan Validasi Pricing)

import { supabase } from './supabase.js';

let masterData = {
    // Tambahkan properti untuk menyimpan HPP bahan baku/intermediet
    produkAkhir: {},
    bahanBaku: [], // Data bahan baku (untuk dropdown)
    produkIntermediet: [], // Data intermediet (untuk dropdown)
    bahanBakuHpp: {}, // Map: { 'UUID': {hpp, satuan}, ... }
    produkIntermedietHpp: {}, // Map: { 'UUID': {hpp, satuan}, ... }
};

// Variabel global untuk menyimpan perhitungan HPP resep saat ini
let currentRecipeHPP = 0; 
let currentRecipeItems = []; // Untuk melacak item yang digunakan dalam resep

// --- FUNGSI VALIDASI PRICING & HPP (BARU) ---

const calculateIdealPrice = (hpp, marginTarget) => {
    if (hpp <= 0) return 0;

    // Jika margin 0% atau kurang, harga jual minimal adalah HPP
    if (marginTarget <= 0 || marginTarget > 99) return hpp; 

    const marginDesimal = marginTarget / 100;

    // Formula: HPP / (1 - Margin Desimal)
    const hargaIdeal = hpp / (1 - marginDesimal);
    return hargaIdeal;
};

const displayPricingFeedback = (hpp, hargaJual, targetMargin) => {
    let feedbackDiv = document.getElementById('pricingFeedback');
    if (!feedbackDiv) {
        feedbackDiv = document.createElement('div');
        feedbackDiv.id = 'pricingFeedback';
        feedbackDiv.style.margin = '15px 0';
        hargaJualInput.parentNode.parentNode.after(feedbackDiv); // Tempatkan setelah input pricing
    }

    const marginActual = (hargaJual > 0) ? ((hargaJual - hpp) / hargaJual) * 100 : -100;
    const hargaIdeal = calculateIdealPrice(hpp, targetMargin);

    let htmlContent = '';
    let color = 'blue';

    if (hpp <= 0) {
        htmlContent = 'HPP Resep (COGS) tidak bisa dihitung. Masukkan bahan/intermediet di bawah.';
        color = 'gray';
    } else if (hargaJual < hpp) {
        htmlContent = `🔴 **KERUGIAN:** HPP **Rp${hpp.toFixed(0)}** lebih tinggi dari Harga Jual **Rp${hargaJual.toFixed(0)}**. Kerugian: Rp${(hpp - hargaJual).toFixed(0)}.`;
        color = 'red';
    } else if (targetMargin > 0 && marginActual < targetMargin) {
        htmlContent = `🟠 **Margin Rendah:** Margin aktual ${marginActual.toFixed(1)}% tidak mencapai target ${targetMargin}%. Harga jual ideal untuk target ini adalah **Rp${hargaIdeal.toFixed(0)}**.`;
        color = 'orange';
    } else {
        htmlContent = `🟢 **Target Tercapai:** HPP Resep: **Rp${hpp.toFixed(0)}**. Laba per unit: Rp${(hargaJual - hpp).toFixed(0)}.`;
        color = 'green';
    }

    feedbackDiv.innerHTML = `<p style="color: ${color}; font-weight: bold;">${htmlContent}</p>`;
};

const recalculateRecipeHPP = () => {
    currentRecipeHPP = 0;
    currentRecipeItems = [];

    // 1. Kumpulkan semua item resep dari formulir
    document.querySelectorAll('.resep-row').forEach(row => {
        const typeSelect = row.querySelector('.item-type-select');
        const itemSelect = row.querySelector('select[name="bahanBakuId"]') || row.querySelector('select[name="produkIntermedietId"]');
        const jumlahInput = row.querySelector('input[name="jumlahDipakai"]');

        const tipe = typeSelect.value;
        const itemId = itemSelect ? itemSelect.value : null;
        const jumlah = parseFloat(jumlahInput.value);

        if (itemId && jumlah > 0) {
            let itemHpp = 0;
            let itemSatuan = '';

            if (tipe === 'bahan_baku') {
                const item = masterData.bahanBakuHpp[itemId];
                itemHpp = item ? item.hpp_per_unit : 0;
                itemSatuan = item ? item.satuan : '';
            } else if (tipe === 'produk_intermediet') {
                const item = masterData.produkIntermedietHpp[itemId];
                itemHpp = item ? item.hpp_per_unit : 0;
                itemSatuan = item ? item.satuan : '';
            }

            // Tambahkan biaya item ke total HPP resep
            currentRecipeHPP += jumlah * itemHpp;

            currentRecipeItems.push({ itemId, jumlah, itemHpp, itemSatuan });
        }
    });

    // 2. Update feedback pricing
    displayPricingFeedback(
        currentRecipeHPP, 
        parseFloat(hargaJualInput.value) || 0, 
        parseFloat(marginInput.value) || 0
    );
};
// --- END FUNGSI VALIDASI PRICING ---


document.addEventListener('DOMContentLoaded', async () => {
    const formResep = document.getElementById('formResepAkhir');

    // ... (Elemen Input DOM tetap sama) ...
    const namaProdukAkhirInput = document.getElementById('namaProdukAkhir'); 
    const datalist = document.getElementById('produkAkhirList');
    const produkAkhirIdHidden = document.getElementById('produkAkhirIdHidden');
    const resepInputs = document.getElementById('resepInputs');
    const tambahBahanBtn = document.getElementById('tambahBahan');
    const satuanJualInput = document.getElementById('satuanJual');
    const hargaJualInput = document.getElementById('hargaJualDefault');
    const marginInput = document.getElementById('targetMargin');
    const message = document.getElementById('message');


    // --- LISTENER PRICING (BARU) ---
    // Update feedback saat harga jual atau margin diubah
    hargaJualInput.addEventListener('input', () => {
        displayPricingFeedback(currentRecipeHPP, parseFloat(hargaJualInput.value) || 0, parseFloat(marginInput.value) || 0);
    });
    marginInput.addEventListener('input', () => {
        // Jika margin diubah, hitung ulang dan update feedback
        hargaJualInput.dispatchEvent(new Event('input')); 
    });


    // --- 1. AMBIL DATA MASTER (Diperbarui dengan HPP) ---
    const loadMasterData = async () => {
        message.textContent = 'Memuat data master...';

        // Ambil data produk akhir
        const { data: pa, error: paError } = await supabase.from('produk_akhir').select('*, hpp_per_unit'); // Ambil HPP terakhir

        // Ambil Bahan Baku (dengan HPP dan satuan stok)
        const { data: bb, error: bbError } = await supabase.from('bahan_baku_inti').select('id, nama_bahan, satuan_stok, harga_pokok_per_unit');

        // Ambil Produk Intermediet (dengan HPP dan satuan)
        const { data: pi, error: piError } = await supabase.from('produk_intermediet').select('id, nama_intermediet, satuan, hpp_per_unit');

        if (paError || bbError || piError) {
            message.textContent = '❌ Gagal memuat data master.';
            console.error(paError || bbError || piError);
            return;
        }

        // Simpan data HPP untuk Kalkulasi Simulasi
        masterData.bahanBakuHpp = {};
        bb.forEach(b => { masterData.bahanBakuHpp[b.id] = { hpp_per_unit: b.harga_pokok_per_unit || 0, satuan: b.satuan_stok }; });

        masterData.produkIntermedietHpp = {};
        pi.forEach(i => { masterData.produkIntermedietHpp[i.id] = { hpp_per_unit: i.hpp_per_unit || 0, satuan: i.satuan }; });

        // Simpan data untuk Dropdown
        masterData.bahanBaku = bb;
        masterData.produkIntermediet = pi;

        // Isi Datalist Produk Akhir
        datalist.innerHTML = ''; 
        masterData.produkAkhir = {};
        pa.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nama_produk;
            datalist.appendChild(option);
            masterData.produkAkhir[p.nama_produk] = p;
        });

        message.textContent = 'Data siap. Pilih atau ketik nama produk.';
    };

    // --- 2. LISTENER FLEKSIBEL PRODUK AKHIR ---
    namaProdukAkhirInput.addEventListener('input', async () => {
        const nama = namaProdukAkhirInput.value.trim();
        const produkInfo = masterData.produkAkhir[nama];

        resepInputs.innerHTML = ''; 
        currentRecipeHPP = 0; // Reset HPP resep saat produk diubah
        document.getElementById('pricingFeedback')?.remove(); // Hapus feedback lama

        if (produkInfo) {
            // --- SKENARIO 1: PRODUK LAMA (Dipilih dari Datalist) ---
            produkAkhirIdHidden.value = produkInfo.id;
            satuanJualInput.value = produkInfo.satuan_jual;
            hargaJualInput.value = produkInfo.harga_jual_default || 0;
            marginInput.value = produkInfo.target_margin || 0;
            satuanJualInput.readOnly = true;

            // Muat Resep Lama, setelah selesai, hitung HPP simulasi
            await loadResep(produkInfo.id);
            recalculateRecipeHPP(); // Hitung HPP dari resep yang baru dimuat


        } else {
            // --- SKENARIO 2: PRODUK BARU (Diketik Manual) ---
            produkAkhirIdHidden.value = '';
            satuanJualInput.value = '';
            hargaJualInput.value = 0;
            marginInput.value = 0;
            satuanJualInput.readOnly = false;

            message.textContent = 'Produk Baru. Tentukan resep dan pricing.';
            tambahBarisResep(); // Tambahkan baris resep kosong

            // Panggil feedback dengan HPP 0
            displayPricingFeedback(0, 0, 0); 
        }
    });

    // --- FUNGSI BARU: MEMUAT RESEP LAMA (Tetap Sama) ---
    const loadResep = async (produkAkhirId) => {
        // ... (Logika loadResep tetap sama) ...
        const { data: resep, error: resepError } = await supabase
            .from('resep_akhir')
            .select('bahan_baku_id, produk_intermediet_id, jumlah_dipakai, satuan_dipakai')
            .eq('produk_akhir_id', produkAkhirId);

        if (resepError) {
            message.textContent = '❌ Gagal memuat resep lama.';
            return;
        }

        if (resep.length > 0) {
            resep.forEach(r => {
                const tipe = r.bahan_baku_id ? 'bahan_baku' : 'produk_intermediet';
                const id = r.bahan_baku_id || r.produk_intermediet_id;
                tambahBarisResep({ 
                    tipe: tipe, 
                    id: id, 
                    jumlah_dipakai: r.jumlah_dipakai, 
                    satuan_dipakai: r.satuan_dipakai 
                });
            });
        } else {
             tambahBarisResep();
        }
    }


    // --- 3. FUNGSI UTILITY (tambahBarisResep Disesuaikan) ---
    const createItemSelect = (name, data, isBahanBaku) => {
        const select = document.createElement('select');
        // ... (Kode untuk membuat select tetap sama) ...
        select.name = name;
        select.required = true;
        select.innerHTML = `<option value="">-- Pilih ${isBahanBaku ? 'Bahan Baku' : 'Produk Intermediet'} --</option>`;

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${isBahanBaku ? item.nama_bahan : item.nama_intermediet} (${isBahanBaku ? item.satuan_stok : item.satuan})`;
            select.appendChild(option);
        });

        // --- BARU: Listener untuk HPP setelah memilih item ---
        select.addEventListener('change', () => {
             // Listener ini harus memicu re-kalkulasi HPP total resep
             recalculateRecipeHPP(); 
        });

        return select;
    };

    const tambahBarisResep = (resepData = {}) => {
        const div = document.createElement('div');
        div.className = 'input-group resep-row';
        div.style.alignItems = 'flex-end';

        // ... (Elemen select/input dibuat di sini) ...

        const typeSelect = document.createElement('select');
        typeSelect.className = 'item-type-select';
        typeSelect.style.flex = '1';
        typeSelect.innerHTML = `
            <option value="">-- Tipe Bahan --</option>
            <option value="bahan_baku">Bahan Baku Inti</option>
            <option value="produk_intermediet">Produk Intermediet</option>
        `;
        div.appendChild(typeSelect);

        const itemSelectContainer = document.createElement('div');
        itemSelectContainer.style.flex = '2';
        div.appendChild(itemSelectContainer);

        const jumlahInput = document.createElement('input');
        jumlahInput.type = 'number';
        jumlahInput.name = 'jumlahDipakai';
        jumlahInput.placeholder = 'Jumlah Dipakai';
        jumlahInput.step = 'any';
        jumlahInput.value = resepData.jumlah_dipakai || '';
        jumlahInput.required = true;

        // --- BARU: Listener untuk HPP setelah mengisi jumlah ---
        jumlahInput.addEventListener('input', recalculateRecipeHPP);
        div.appendChild(jumlahInput);

        const satuanInput = document.createElement('input');
        satuanInput.type = 'text';
        satuanInput.name = 'satuanDipakai';
        satuanInput.placeholder = 'Satuan';
        satuanInput.value = resepData.satuan_dipakai || '';
        satuanInput.required = true;
        satuanInput.readOnly = true; 
        div.appendChild(satuanInput);

        const hapusBtn = document.createElement('button');
        hapusBtn.type = 'button';
        hapusBtn.textContent = 'Hapus';
        hapusBtn.className = 'hapus-bahan';
        // --- BARU: HPP recalculation setelah hapus ---
        hapusBtn.onclick = () => { div.remove(); recalculateRecipeHPP(); }; 
        div.appendChild(hapusBtn);


        // Logic dinamis untuk Select Item dan Satuan
        const updateItemSelect = (tipe) => {
            // ... (Logika updateItemSelect tetap sama, hanya memanggil createItemSelect) ...
            itemSelectContainer.innerHTML = '';
            let itemSelect;
            let dataList;

            if (tipe === 'bahan_baku') {
                itemSelect = createItemSelect('bahanBakuId', masterData.bahanBaku, true);
                dataList = masterData.bahanBaku;
            } else if (tipe === 'produk_intermediet') {
                itemSelect = createItemSelect('produkIntermedietId', masterData.produkIntermediet, false);
                dataList = masterData.produkIntermediet;
            }

            if (itemSelect) {
                itemSelectContainer.appendChild(itemSelect);

                // Set nilai awal jika data resep ada
                if (resepData.id && resepData.tipe.replace('_', 'Id') === itemSelect.name) {
                    itemSelect.value = resepData.id;
                }

                // Listener untuk mengisi satuan
                itemSelect.addEventListener('change', () => {
                    const selectedItem = dataList.find(item => item.id === itemSelect.value);
                    if (selectedItem) {
                        satuanInput.value = selectedItem.satuan_stok || selectedItem.satuan;
                    }
                    recalculateRecipeHPP(); // Panggil recalculate setelah satuan diisi
                });

                // Trigger change event jika ada nilai awal (untuk mengisi satuanInput)
                 if (itemSelect.value) itemSelect.dispatchEvent(new Event('change'));
            }
        };

        typeSelect.addEventListener('change', (e) => {
            updateItemSelect(e.target.value);
            recalculateRecipeHPP(); // Panggil recalculate setelah tipe diubah
        });

        // Jika resepData ada, inisialisasi baris
        if (resepData.tipe) {
            typeSelect.value = resepData.tipe;
            updateItemSelect(resepData.tipe);
        }

        resepInputs.appendChild(div);
    };

    tambahBahanBtn.addEventListener('click', () => tambahBarisResep());

    // --- 4. LOGIKA SUBMIT (Simpan Resep & Pricing) ---
    formResep.addEventListener('submit', async (e) => {
        // ... (Logika submit tetap sama) ...
        e.preventDefault();
        message.textContent = 'Memproses data...';
        message.className = '';

        // PENTING: Lakukan Kalkulasi HPP sekali lagi untuk final check
        recalculateRecipeHPP(); 

        // Verifikasi Kerugian (opsional, tapi disarankan)
        const hargaInput = parseFloat(hargaJualInput.value);
        if (currentRecipeHPP > 0 && hargaInput < currentRecipeHPP) {
            if (!confirm(`PERINGATAN! Harga Jual (Rp${hargaInput.toFixed(0)}) lebih rendah dari HPP Resep (Rp${currentRecipeHPP.toFixed(0)}). Anda akan rugi. Lanjutkan?`)) {
                message.textContent = 'Transaksi dibatalkan oleh pengguna.';
                message.className = 'error';
                return;
            }
        }

        // ... (Sisa logika insert/update ke Supabase tetap sama) ...
        const namaProduk = namaProdukAkhirInput.value.trim();
        const satuanJual = satuanJualInput.value.trim();
        let produkAkhirId = produkAkhirIdHidden.value;
        const produkInfoLama = masterData.produkAkhir[namaProduk];

        // 4.1 PENANGANAN PRODUK BARU
        if (!produkAkhirId && !produkInfoLama) {
            // Produk baru, perlu dibuat terlebih dahulu
            message.textContent = `Produk baru ditemukan: ${namaProduk}. Membuat entri baru...`;

            const { data: newProduk, error: insertError } = await supabase
                .from('produk_akhir')
                .insert([{ 
                    nama_produk: namaProduk, 
                    satuan_jual: satuanJual,
                    harga_jual_default: hargaInput || 0,
                    target_margin: parseFloat(marginInput.value) || 0,
                    // Tambahkan HPP simulasi ke produk akhir saat dibuat (Opsional, untuk referensi awal)
                    hpp_per_unit: currentRecipeHPP 
                }])
                .select()
                .single();

            if (insertError) {
                message.textContent = `❌ Gagal membuat produk akhir baru: ${insertError.message}`;
                message.className = 'error';
                return;
            }
            produkAkhirId = newProduk.id;
        } else if (produkInfoLama) {
            produkAkhirId = produkInfoLama.id;
        }

        if (!produkAkhirId) {
             message.textContent = 'ID Produk Akhir tidak ditemukan.';
             message.className = 'error';
             return;
        }

        // 4.2 Update Pricing Produk Akhir (Jika produk lama)
        if (produkInfoLama) {
            const { error: pricingError } = await supabase
                .from('produk_akhir')
                .update({
                    harga_jual_default: hargaInput,
                    target_margin: parseFloat(marginInput.value),
                    // Update HPP simulasi ke produk akhir saat resep disimpan
                    hpp_per_unit: currentRecipeHPP 
                })
                .eq('id', produkAkhirId);

            if (pricingError) {
                message.textContent = `❌ Gagal update pricing: ${pricingError.message}`;
                message.className = 'error';
                return;
            }
        }


        // 4.3 Hapus Resep Lama
        const { error: deleteError } = await supabase
            .from('resep_akhir')
            .delete()
            .eq('produk_akhir_id', produkAkhirId);

        if (deleteError) {
            message.textContent = `❌ Gagal menghapus resep lama: ${deleteError.message}`;
            message.className = 'error';
            return;
        }

        // 4.4 Kumpulkan dan Insert Resep Baru
        // Gunakan currentRecipeItems yang sudah divalidasi dan dikumpulkan oleh recalculateRecipeHPP()
        const resepBaru = currentRecipeItems.map(item => ({
            produk_akhir_id: produkAkhirId,
            bahan_baku_id: item.tipe === 'bahan_baku' ? item.itemId : null,
            produk_intermediet_id: item.tipe === 'produk_intermediet' ? item.itemId : null,
            jumlah_dipakai: item.jumlah,
            satuan_dipakai: item.itemSatuan,
        }));

        if (resepBaru.length > 0) {
            const { error: insertError } = await supabase
                .from('resep_akhir')
                .insert(resepBaru);

            if (insertError) {
                message.textContent = `❌ Gagal menyimpan resep baru: ${insertError.message}`;
