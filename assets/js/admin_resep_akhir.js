// assets/js/admin_resep_akhir.js (Kode Lengkap Final)

import { supabase } from './supabase.js';

let masterData = {
    produkAkhir: {},
    bahanBaku: [],
    produkIntermediet: [],
    bahanBakuHpp: {},
    produkIntermedietHpp: {},
};

let currentRecipeHPP = 0; 
let currentRecipeItems = []; 
let isNewProductMode = false;

// --- DEKLARASI GLOBAL UNTUK ELEMEN DOM ---
let satuanJualInput;
let hargaJualInput;
let marginInput;
// ------------------------------------------


// --- FUNGSI VALIDASI PRICING & HPP ---
const calculateIdealPrice = (hpp, marginTarget) => {
    if (hpp <= 0) return 0;
    if (marginTarget <= 0 || marginTarget > 99) return hpp; 
    const marginDesimal = marginTarget / 100;
    const hargaIdeal = hpp / (1 - marginDesimal);
    return hargaIdeal;
};

const displayPricingFeedback = (hpp, hargaJual, targetMargin) => {
    let feedbackDiv = document.getElementById('pricingFeedback');
    if (!feedbackDiv) {
        feedbackDiv = document.createElement('div');
        feedbackDiv.id = 'pricingFeedback';
        feedbackDiv.style.margin = '15px 0';
        try { 
            if (hargaJualInput) {
                hargaJualInput.parentNode.parentNode.after(feedbackDiv);
            }
        } catch (e) {
            console.warn("Pricing feedback target not found yet.");
        }
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

            currentRecipeHPP += jumlah * itemHpp;

            currentRecipeItems.push({ 
                itemId: itemId, 
                jumlah: jumlah, 
                itemHpp: itemHpp, 
                itemSatuan: itemSatuan,
                tipe: tipe 
            }); 
        }
    });

    if (hargaJualInput && marginInput) {
        displayPricingFeedback(
            currentRecipeHPP, 
            parseFloat(hargaJualInput.value) || 0, 
            parseFloat(marginInput.value) || 0
        );
    }
};
// --- END FUNGSI VALIDASI PRICING ---


document.addEventListener('DOMContentLoaded', async () => {
    const formResep = document.getElementById('formResepAkhir');

    // --- DOM ELEMENTS BARU ---
    const namaProdukAkhirSelect = document.getElementById('namaProdukAkhirSelect');
    const tombolProdukBaru = document.getElementById('tombolProdukBaru');
    const produkBaruInputArea = document.getElementById('produkBaruInputArea');
    const namaProdukAkhirInput = document.getElementById('namaProdukAkhirInputBaru');
    const tombolBatalBaru = document.getElementById('tombolBatalBaru');

    // --- DOM ELEMENTS LAMA (INISIALISASI VARIABEL GLOBAL TANPA 'const') ---
    const produkAkhirIdHidden = document.getElementById('produkAkhirIdHidden');
    const resepInputs = document.getElementById('resepInputs');
    const tambahBahanBtn = document.getElementById('tambahBahan');
    
    // PENTING: Inisialisasi variabel global
    satuanJualInput = document.getElementById('satuanJual');
    hargaJualInput = document.getElementById('hargaJualDefault');
    marginInput = document.getElementById('targetMargin');
    
    const message = document.getElementById('message');


    // Fungsi Utility untuk mereset tampilan dan data saat beralih mode
    const resetFormMode = (newMode) => {
        isNewProductMode = newMode;
        document.getElementById('pricingFeedback')?.remove();

        resepInputs.innerHTML = '';
        tambahBarisResep();

        // Reset data
        produkAkhirIdHidden.value = '';
        satuanJualInput.value = '';
        hargaJualInput.value = 0;
        marginInput.value = 0;
        
        // Logic readOnly Satuan Jual: BISA DIEDIT jika newMode=true
        satuanJualInput.readOnly = !newMode; 

        if (newMode) {
            message.textContent = 'Mode Produk Baru: Tentukan nama, satuan, resep, dan pricing.';
            namaProdukAkhirSelect.style.display = 'none';
            tombolProdukBaru.style.display = 'none';
            produkBaruInputArea.style.display = 'flex'; 
            namaProdukAkhirInput.required = true;
            namaProdukAkhirSelect.value = '';
            namaProdukAkhirInput.value = ''; 
            namaProdukAkhirInput.focus();
        } else {
            message.textContent = 'Pilih produk dari katalog atau tambahkan yang baru.';
            namaProdukAkhirSelect.style.display = 'block';
            tombolProdukBaru.style.display = 'block';
            produkBaruInputArea.style.display = 'none';
            namaProdukAkhirInput.required = false;
        }
        recalculateRecipeHPP(); 
    };

    // --- LISTENER MODE PEMILIHAN BARU ---
    tombolProdukBaru.addEventListener('click', () => {
        resetFormMode(true);
        displayPricingFeedback(0, 0, 0); 
    });

    tombolBatalBaru.addEventListener('click', () => {
        resetFormMode(false);
    });

    namaProdukAkhirSelect.addEventListener('change', async () => {
        const selectedOption = namaProdukAkhirSelect.options[namaProdukAkhirSelect.selectedIndex];
        const nama = selectedOption.textContent.trim();
        const produkInfo = masterData.produkAkhir[nama];

        if (!produkInfo) {
            resetFormMode(false); 
            return;
        }

        resepInputs.innerHTML = ''; 
        currentRecipeHPP = 0;
        document.getElementById('pricingFeedback')?.remove();

        produkAkhirIdHidden.value = produkInfo.id;
        satuanJualInput.value = produkInfo.satuan_jual;
        hargaJualInput.value = produkInfo.harga_jual_default || 0;
        marginInput.value = produkInfo.target_margin || 0;
        satuanJualInput.readOnly = true; 

        await loadResep(produkInfo.id);
        recalculateRecipeHPP(); 
        message.textContent = `Produk Katalog: ${nama}. Resep dimuat.`;
    });

    namaProdukAkhirInput.addEventListener('input', () => {
        message.textContent = `Mode Produk Baru: ${namaProdukAkhirInput.value}`;
    });


    // --- LISTENER PRICING ---
    hargaJualInput.addEventListener('input', () => {
        displayPricingFeedback(currentRecipeHPP, parseFloat(hargaJualInput.value) || 0, parseFloat(marginInput.value) || 0);
    });
    marginInput.addEventListener('input', () => {
        hargaJualInput.dispatchEvent(new Event('input')); 
    });


    // --- 1. AMBIL DATA MASTER ---
    const loadMasterData = async () => {
        message.textContent = 'Memuat data master...';

        const { data: pa, error: paError } = await supabase.from('produk_akhir').select('*, hpp_per_unit');
        const { data: bb, error: bbError } = await supabase.from('bahan_baku_inti').select('id, nama_bahan, satuan_stok, harga_pokok_per_unit');
        const { data: pi, error: piError } = await supabase.from('produk_intermediet').select('id, nama_intermediet, satuan, hpp_per_unit');

        if (paError || bbError || piError) {
            message.textContent = '❌ Gagal memuat data master.';
            console.error(paError || bbError || piError);
            return;
        }

        masterData.bahanBakuHpp = {};
        bb.forEach(b => { masterData.bahanBakuHpp[b.id] = { hpp_per_unit: b.harga_pokok_per_unit || 0, satuan: b.satuan_stok }; });

        masterData.produkIntermedietHpp = {};
        pi.forEach(i => { masterData.produkIntermedietHpp[i.id] = { hpp_per_unit: i.hpp_per_unit || 0, satuan: i.satuan }; });

        masterData.bahanBaku = bb;
        masterData.produkIntermediet = pi;

        namaProdukAkhirSelect.innerHTML = '<option value="">-- Pilih Produk dari Katalog --</option>'; 
        masterData.produkAkhir = {};
        pa.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nama_produk; 
            option.textContent = p.nama_produk;
            namaProdukAkhirSelect.appendChild(option);
            masterData.produkAkhir[p.nama_produk] = p;
        });

        message.textContent = 'Data siap. Pilih produk atau tambahkan baru.';
    };

    // --- FUNGSI MEMUAT RESEP LAMA (TETAP SAMA) ---
    const loadResep = async (produkAkhirId) => {
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


    // --- 3. FUNGSI UTILITY (tambahBarisResep) ---
    const createItemSelect = (name, data, isBahanBaku) => {
        const select = document.createElement('select');
        select.name = name;
        select.required = true;
        select.innerHTML = `<option value="">-- Pilih ${isBahanBaku ? 'Bahan Baku' : 'Produk Intermediet'} --</option>`;

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${isBahanBaku ? item.nama_bahan : item.nama_intermediet} (${isBahanBaku ? item.satuan_stok : item.satuan})`;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
             recalculateRecipeHPP(); 
        });

        return select;
    };

    const tambahBarisResep = (resepData = {}) => {
        const div = document.createElement('div');
        div.className = 'input-group resep-row';
        div.style.alignItems = 'flex-end';

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
        hapusBtn.onclick = () => { div.remove(); recalculateRecipeHPP(); }; 
        div.appendChild(hapusBtn);


        const updateItemSelect = (tipe) => {
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

                if (resepData.id && resepData.tipe) {
                    const targetName = tipe.replace('_', '') + 'Id';
                    if (resepData.tipe.includes(tipe)) {
                         itemSelect.value = resepData.id;
                    }
                }

                itemSelect.addEventListener('change', () => {
                    const selectedItem = dataList.find(item => item.id === itemSelect.value);
                    if (selectedItem) {
                        satuanInput.value = selectedItem.satuan_stok || selectedItem.satuan;
                    }
                    recalculateRecipeHPP(); 
                });

                if (itemSelect.value) itemSelect.dispatchEvent(new Event('change'));
            }
        };

        typeSelect.addEventListener('change', (e) => {
            updateItemSelect(e.target.value);
            recalculateRecipeHPP();
        });

        if (resepData.tipe) {
            typeSelect.value = resepData.tipe;
            updateItemSelect(resepData.tipe);
        }

        resepInputs.appendChild(div);
    };

    tambahBahanBtn.addEventListener('click', () => tambahBarisResep());

    // --- 4. LOGIKA SUBMIT ---
    formResep.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- 4.0 TENTUKAN NAMA PRODUK AKHIR ---
        let namaProduk;
        const produkInfoLama = isNewProductMode ? null : masterData.produkAkhir[namaProdukAkhirSelect.value];

        if (isNewProductMode) {
            namaProduk = namaProdukAkhirInput.value.trim();
        } else if (namaProdukAkhirSelect.value) {
            namaProduk = namaProdukAkhirSelect.value.trim();
        } else {
             message.textContent = '❌ Harap pilih produk atau ketik nama produk baru.';
             message.className = 'error';
             return;
        }

        if (!namaProduk) {
             message.textContent = '❌ Nama Produk tidak boleh kosong.';
             message.className = 'error';
             return;
        }

        message.textContent = 'Memproses data...';
        message.className = '';

        recalculateRecipeHPP(); 

        // Verifikasi Kerugian
        const hargaInput = parseFloat(hargaJualInput.value);
        if (currentRecipeHPP > 0 && hargaInput < currentRecipeHPP) {
            if (!confirm(`PERINGATAN! Harga Jual (Rp${hargaInput.toFixed(0)}) lebih rendah dari HPP Resep (Rp${currentRecipeHPP.toFixed(0)}). Anda akan rugi. Lanjutkan?`)) {
                message.textContent = 'Transaksi dibatalkan oleh pengguna.';
                message.className = 'error';
                return;
            }
        }

        let produkAkhirId = produkAkhirIdHidden.value;

        // 4.1 PENANGANAN PRODUK BARU
        if (isNewProductMode) {
            message.textContent = `Produk baru ditemukan: ${namaProduk}. Membuat entri baru...`;

            // Menggunakan variabel insertErrorProduk untuk scope ini
            const { data: newProduk, error: insertErrorProduk } = await supabase 
                .from('produk_akhir')
                .insert([{ 
                    nama_produk: namaProduk, 
                    satuan_jual: satuanJualInput.value.trim(),
                    harga_jual_default: hargaInput || 0,
                    target_margin: parseFloat(marginInput.value) || 0,
                    hpp_per_unit: currentRecipeHPP 
                }])
                .select()
                .single();

            if (insertErrorProduk) {
                message.textContent = `❌ Gagal membuat produk akhir baru: ${insertErrorProduk.message}`;
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
        const resepBaru = currentRecipeItems.map(item => ({
            produk_akhir_id: produkAkhirId,
            bahan_baku_id: item.tipe === 'bahan_baku' ? item.itemId : null,
            produk_intermediet_id: item.tipe === 'produk_intermediet' ? item.itemId : null, 
            jumlah_dipakai: item.jumlah,
            satuan_dipakai: item.itemSatuan,
        }));

        if (resepBaru.length > 0) {
            // Menggunakan variabel insertErrorResep untuk scope ini
            const { error: insertErrorResep } = await supabase
                .from('resep_akhir')
                .insert(resepBaru);

            if (insertErrorResep) {
                message.textContent = `❌ Gagal menyimpan resep baru: ${insertErrorResep.message}`;
                message.className = 'error'; 
                return;
            }
        }

        message.textContent = `✅ Resep dan Pricing berhasil diperbarui untuk produk: ${namaProduk}. HPP Resep Simulasi: Rp${currentRecipeHPP.toFixed(0)}`;
        message.className = 'success';

        await loadMasterData();
        formResep.reset();
        resepInputs.innerHTML = '';
        tambahBarisResep();
        document.getElementById('pricingFeedback')?.remove(); 
        resetFormMode(false);
    });

    // Inisialisasi
    await loadMasterData();
    resetFormMode(false); 
});