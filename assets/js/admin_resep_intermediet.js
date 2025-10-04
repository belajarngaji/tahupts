// assets/js/admin_resep_intermediet.js (Logika Batch/Yield)

import { supabase } from './supabase.js';

let masterData = {
    produkIntermediet: {},
    bahanBaku: [],
    bahanBakuHpp: {}, // Master data HPP bahan baku
};
let totalBatchCost = 0; // Menggantikan currentRecipeHPP
let currentRecipeItems = []; 
let isNewPIIMode = false;

// --- DEKLARASI GLOBAL UNTUK ELEMEN DOM ---
let satuanUnitInput;
let hppDisplay; // Sekarang akan menampilkan TOTAL BIAYA BATCH
let stokSaatIniDisplay;
let namaPISelect;
let tombolPIBaru;
let piBaruInputArea;
let namaPIInput;
let tombolBatalBaru;
let piIdHidden;
let resepInputsPI;
let tambahBahanPIBtn;
let message;
let formResep;
let yieldQuantityInput; // Elemen baru
let yieldSatuanDisplay; // Elemen baru
let totalBatchCostFeedback; // Elemen baru
// ------------------------------------------


// --- FUNGSI HPP & RECIPE (Diubah menjadi Batch Cost) ---

const recalculateBatchCost = () => {
    totalBatchCost = 0;
    currentRecipeItems = [];
    
    document.querySelectorAll('.resep-row').forEach(row => {
        const itemSelect = row.querySelector('select[name="bahanBakuId"]');
        const jumlahInput = row.querySelector('input[name="jumlahDipakai"]');
        const satuanDipakaiSelect = row.querySelector('select[name="satuanDipakai"]');
        
        const itemId = itemSelect ? itemSelect.value : null;
        const jumlah = parseFloat(jumlahInput.value);
        const satuanDipakai = satuanDipakaiSelect ? satuanDipakaiSelect.value : null;

        if (itemId && jumlah > 0 && satuanDipakai) {
            
            const item = masterData.bahanBakuHpp[itemId];
            let itemHppUnit = 0;

            if (item) {
                // LOGIKA HPP BERDASARKAN SATUAN DIPAKAI (Hanya BBI)
                if (satuanDipakai === item.satuan_utama) {
                    itemHppUnit = item.hpp_per_unit * item.faktor_konversi; 
                } else if (satuanDipakai === item.satuan_konversi) {
                    itemHppUnit = item.hpp_per_unit; 
                }
            }

            totalBatchCost += jumlah * itemHppUnit;
            currentRecipeItems.push({ 
                itemId: itemId, 
                jumlah: jumlah, 
                itemHppUnit: itemHppUnit, 
                itemSatuan: satuanDipakai,
                tipe: 'bahan_baku' 
            }); 
        }
    });

    const yieldQty = parseFloat(yieldQuantityInput.value) || 0;
    let hppPerUnit = 0;
    
    if (yieldQty > 0) {
        hppPerUnit = totalBatchCost / yieldQty;
    }

    hppDisplay.value = totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    totalBatchCostFeedback.textContent = totalBatchCost > 0 && yieldQty > 0
        ? `Total Biaya Batch: Rp${totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })} | HPP per Unit Kemasan: Rp${hppPerUnit.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`
        : 'HPP per Unit akan dihitung setelah total biaya dan jumlah hasil (Yield) diisi.';
};

// --- FUNGSI UTILITY BARIS RESEP (Tidak ada perubahan signifikan) ---

const createItemSelect = (name, data) => {
    const select = document.createElement('select');
    select.name = name;
    select.required = true;
    select.innerHTML = `<option value="">-- Pilih Bahan Baku Inti --</option>`;
    data.forEach(item => {
        select.appendChild(new Option(`${item.nama_bahan} (${item.satuan_stok})`, item.id));
    });
    select.addEventListener('change', recalculateBatchCost);
    return select;
};

const tambahBarisResep = (resepData = {}) => {
    const div = document.createElement('div');
    div.className = 'input-group resep-row';

    // 1. SELECT BAHAN BAKU
    const itemSelectContainer = document.createElement('div');
    itemSelectContainer.style.flex = '3';
    div.appendChild(itemSelectContainer);
    
    const itemSelect = createItemSelect('bahanBakuId', masterData.bahanBaku);
    itemSelectContainer.appendChild(itemSelect);
    
    // 2. JUMLAH DIPAKAI (Jumlah Batch)
    const jumlahInput = document.createElement('input');
    jumlahInput.type = 'number';
    jumlahInput.name = 'jumlahDipakai';
    jumlahInput.placeholder = 'Jumlah per Batch';
    jumlahInput.step = 'any';
    jumlahInput.value = resepData.jumlah_dipakai || '';
    jumlahInput.required = true;

    jumlahInput.addEventListener('input', recalculateBatchCost);
    div.appendChild(jumlahInput);
    
    // 3. SATUAN DIPAKAI (Dropdown Konversi)
    const satuanSelect = document.createElement('select'); 
    satuanSelect.name = 'satuanDipakai';
    satuanSelect.className = 'satuan-dipakai-select';
    satuanSelect.required = true;
    satuanSelect.addEventListener('change', recalculateBatchCost); 
    div.appendChild(satuanSelect);

    // 4. TOMBOL HAPUS
    const hapusBtn = document.createElement('button');
    hapusBtn.type = 'button';
    hapusBtn.textContent = 'Hapus';
    hapusBtn.className = 'hapus-bahan';
    hapusBtn.onclick = () => { div.remove(); recalculateBatchCost(); }; 
    div.appendChild(hapusBtn);


    // LOGIC UPDATE SATUAN DIPAKAI
    itemSelect.addEventListener('change', () => {
        const selectedItem = masterData.bahanBaku.find(item => item.id === itemSelect.value);
        satuanSelect.innerHTML = ''; 
        
        if (selectedItem) {
            const hppItem = masterData.bahanBakuHpp[selectedItem.id];
            
            // Opsi 1: Satuan Utama (e.g., kg)
            satuanSelect.add(new Option(`${hppItem.satuan_utama} (Stok Utama)`, hppItem.satuan_utama));

            // Opsi 2: Satuan Konversi (e.g., gram)
            if (hppItem.satuan_konversi && hppItem.faktor_konversi > 1) {
                satuanSelect.add(new Option(`${hppItem.satuan_konversi} (Unit Konversi)`, hppItem.satuan_konversi));
            }
            
            satuanSelect.value = resepData.satuan_dipakai || hppItem.satuan_konversi || hppItem.satuan_utama; 
        }
        recalculateBatchCost(); 
    });
    
    // Load data resep lama
    if (resepData.id) {
        itemSelect.value = resepData.id;
        itemSelect.dispatchEvent(new Event('change')); 
    } else {
        satuanSelect.add(new Option('-- Pilih Bahan Baku --', ''));
    }

    resepInputsPI.appendChild(div);
};

// --- FUNGSI MEMUAT DATA LAMA & MASTER DATA (Penyesuaian untuk Yield) ---

const loadResep = async (piId) => {
    const { data: resep, error: resepError } = await supabase
        .from('resep_akhir')
        .select('bahan_baku_id, jumlah_dipakai, satuan_dipakai')
        .eq('produk_akhir_id', piId)
        .not('bahan_baku_id', 'is', null)
        .limit(100); // Batas aman untuk resep

    if (resepError) {
        message.textContent = '❌ Gagal memuat resep PI lama.';
        return;
    }

    if (resep.length > 0) {
        resep.forEach(r => {
            tambahBarisResep({ 
                id: r.bahan_baku_id, 
                jumlah_dipakai: r.jumlah_dipakai, 
                satuan_dipakai: r.satuan_dipakai
            });
        });
    } else {
         tambahBarisResep();
    }
}


const loadMasterData = async () => {
    message.textContent = 'Memuat data master...';

    // 1. Ambil data PI dan BBI
    // Tambahkan yield_qty_batch (Baru, perlu ditambahkan di DB)
    const { data: piData, error: piError } = await supabase
        .from('produk_intermediet')
        .select('*, hpp_per_unit, stok_saat_ini, yield_qty_batch') // yield_qty_batch (kolom baru yang perlu Anda buat)
        .order('nama_intermediet', { ascending: true });
        
    const { data: bb, error: bbError } = await supabase
        .from('bahan_baku_inti')
        .select('id, nama_bahan, satuan_stok, harga_pokok_per_unit, satuan_konversi, faktor_konversi');
    
    if (piError || bbError) {
        message.textContent = '❌ Gagal memuat data master.';
        console.error(piError || bbError);
        return;
    }

    // 2. Mapping Data HPP BBI (Sama)
    masterData.bahanBakuHpp = {};
    bb.forEach(b => { 
        masterData.bahanBakuHpp[b.id] = { 
            hpp_per_unit: b.harga_pokok_per_unit || 0, 
            satuan_utama: b.satuan_stok,
            satuan_konversi: b.satuan_konversi,
            faktor_konversi: parseFloat(b.faktor_konversi) || 1
        }; 
    });

    masterData.bahanBaku = bb;
    
    // 3. Isi Dropdown PI (Sama)
    namaPISelect.innerHTML = '<option value="">-- Pilih PI dari Katalog --</option>'; 
    masterData.produkIntermediet = {};
    piData.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id; 
        option.textContent = `${p.nama_intermediet} (${p.satuan})`;
        namaPISelect.appendChild(option);
        masterData.produkIntermediet[p.id] = p;
    });
    message.textContent = 'Data siap. Pilih PI atau tambahkan baru.';
};

// --- FUNGSI RESET & MODE TOGGLE (Penyesuaian untuk Yield) ---

const resetFormMode = (newMode) => {
    isNewPIIMode = newMode;
    resepInputsPI.innerHTML = '';
    hppDisplay.value = '';
    totalBatchCostFeedback.textContent = '';
    totalBatchCost = 0;
    
    // Reset data
    piIdHidden.value = '';
    satuanUnitInput.value = '';
    stokSaatIniDisplay.value = '';
    yieldQuantityInput.value = '';

    tambahBarisResep(); 
    
    // Logic readOnly Satuan Unit: BISA DIEDIT jika newMode=true
    satuanUnitInput.readOnly = !newMode;

    if (newMode) {
        message.textContent = 'Mode PI Baru: Tentukan nama, satuan, Yield, dan resep Batch.';
        namaPISelect.style.display = 'none';
        tombolPIBaru.style.display = 'none';
        piBaruInputArea.style.display = 'flex'; 
        namaPIInput.required = true;
        namaPISelect.value = '';
        namaPIInput.value = ''; 
        namaPIInput.focus();
    } else {
        message.textContent = 'Pilih PI dari katalog atau tambahkan yang baru.';
        namaPISelect.style.display = 'block';
        tombolPIBaru.style.display = 'block';
        piBaruInputArea.style.display = 'none';
        namaPIInput.required = false;
    }
    recalculateBatchCost(); 
};


// --- INITALIZATION & LISTENERS ---

document.addEventListener('DOMContentLoaded', async () => {
    // Inisialisasi DOM Elements
    formResep = document.getElementById('formResepIntermediet');
    namaPISelect = document.getElementById('namaPISelect');
    tombolPIBaru = document.getElementById('tombolPIBaru');
    piBaruInputArea = document.getElementById('piBaruInputArea');
    namaPIInput = document.getElementById('namaPIInputBaru');
    tombolBatalBaru = document.getElementById('tombolBatalBaru');
    piIdHidden = document.getElementById('piIdHidden');
    resepInputsPI = document.getElementById('resepInputsPI');
    tambahBahanPIBtn = document.getElementById('tambahBahanPI');
    satuanUnitInput = document.getElementById('satuanUnit');
    hppDisplay = document.getElementById('hppDisplay');
    stokSaatIniDisplay = document.getElementById('stokSaatIni');
    message = document.getElementById('message');
    // Elemen Yield Baru
    yieldQuantityInput = document.getElementById('yieldQuantity'); 
    yieldSatuanDisplay = document.getElementById('yieldSatuanDisplay');
    totalBatchCostFeedback = document.getElementById('totalBatchCostFeedback');


    // --- LISTENER MODE PEMILIHAN ---
    tombolPIBaru.addEventListener('click', () => resetFormMode(true));
    tombolBatalBaru.addEventListener('click', () => resetFormMode(false));
    tambahBahanPIBtn.addEventListener('click', () => tambahBarisResep());
    yieldQuantityInput.addEventListener('input', recalculateBatchCost); // Listener Yield
    
    namaPISelect.addEventListener('change', async () => {
        const selectedId = namaPISelect.value;
        const piInfo = masterData.produkIntermediet[selectedId];

        if (!piInfo) {
            resetFormMode(false); 
            return;
        }

        resepInputsPI.innerHTML = ''; 
        totalBatchCost = 0;

        piIdHidden.value = piInfo.id;
        satuanUnitInput.value = piInfo.satuan;
        stokSaatIniDisplay.value = (piInfo.stok_saat_ini || 0).toFixed(2);
        yieldQuantityInput.value = piInfo.yield_qty_batch || ''; // Load yield lama
        yieldSatuanDisplay.textContent = `(${piInfo.satuan})`;
        satuanUnitInput.readOnly = true; 

        await loadResep(piInfo.id);
        recalculateBatchCost(); 
        message.textContent = `PI Katalog: ${piInfo.nama_intermediet}. Resep Batch dimuat.`;
    });

    // --- LOGIKA SUBMIT (Perubahan untuk Batch/Yield) ---
    formResep.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validasi Awal
        const yieldQuantity = parseFloat(yieldQuantityInput.value);
        if (yieldQuantity <= 0) {
            message.textContent = '❌ Jumlah Unit Dihasilkan (Yield) harus lebih dari nol.';
            message.className = 'error';
            return;
        }

        let namaPI;
        let satuanUnit;
        const piInfoLama = isNewPIIMode ? null : masterData.produkIntermediet[namaPISelect.value];

        if (isNewPIIMode) {
            namaPI = namaPIInput.value.trim();
            satuanUnit = satuanUnitInput.value.trim();
        } else if (piInfoLama) {
            namaPI = piInfoLama.nama_intermediet;
            satuanUnit = satuanUnitInput.value.trim();
        } else {
             message.textContent = '❌ Harap pilih PI atau ketik nama PI baru.';
             message.className = 'error';
             return;
        }

        if (!namaPI || !satuanUnit) {
             message.textContent = '❌ Nama dan Satuan PI tidak boleh kosong.';
             message.className = 'error';
             return;
        }

        message.textContent = 'Memproses data...';
        message.className = '';

        recalculateBatchCost(); // Final recalculation
        
        if (currentRecipeItems.length === 0) {
             message.textContent = '❌ Resep Batch tidak boleh kosong. Tambahkan Bahan Baku Inti.';
             message.className = 'error';
             return;
        }

        // LOGIKA KUNCI: HITUNG HPP UNIT AKHIR
        const HPP_UNIT_AKHIR = totalBatchCost / yieldQuantity; 

        let piId = piIdHidden.value;
        // 2. PENANGANAN PI BARU
        if (isNewPIIMode) {
            message.textContent = `PI baru ditemukan: ${namaPI}. Membuat entri baru...`;

            const { data: newPI, error: insertErrorPI } = await supabase 
                .from('produk_intermediet')
                .insert([{ 
                    nama_intermediet: namaPI, 
                    satuan: satuanUnit,
                    hpp_per_unit: HPP_UNIT_AKHIR, // Simpan HPP Unit
                    yield_qty_batch: yieldQuantity, // Simpan Yield
                    stok_saat_ini: 0 
                }])
                .select()
                .single();
            
            if (insertErrorPI) {
                message.textContent = `❌ Gagal membuat PI baru: ${insertErrorPI.message}`;
                message.className = 'error';
                return;
            }
            piId = newPI.id;
        } 

        // 3. Update HPP PI Lama
        if (piInfoLama) {
            const { error: hppUpdateError } = await supabase
                .from('produk_intermediet')
                .update({
                    hpp_per_unit: HPP_UNIT_AKHIR, // Simpan HPP Unit
                    yield_qty_batch: yieldQuantity, // Simpan Yield
                    satuan: satuanUnit
                })
                .eq('id', piId);
            
            if (hppUpdateError) {
                message.textContent = `❌ Gagal update HPP/Satuan PI: ${hppUpdateError.message}`;
                message.className = 'error';
                return;
            }
        }


        // 4. Hapus dan Simpan Resep Batch
        const { error: deleteError } = await supabase
            .from('resep_akhir')
            .delete()
            .eq('produk_akhir_id', piId);
        
        if (deleteError) {
            message.textContent = `❌ Gagal menghapus resep lama: ${deleteError.message}`;
            message.className = 'error';
            return;
        }

        // Simpan resep Batch ke resep_akhir (tetap menggunakan PI ID sebagai FK produk_akhir_id)
        const resepBaru = currentRecipeItems.map(item => ({
            produk_akhir_id: piId, 
            bahan_baku_id: item.itemId, 
            produk_intermediet_id: null, 
            jumlah_dipakai: item.jumlah, // Jumlah ini adalah jumlah per 1 batch
            satuan_dipakai: item.itemSatuan,
        }));

        if (resepBaru.length > 0) {
            const { error: insertErrorResep } = await supabase
                .from('resep_akhir')
                .insert(resepBaru);
            
            if (insertErrorResep) {
                message.textContent = `❌ Gagal menyimpan resep baru: ${insertErrorResep.message}`;
                message.className = 'error'; 
                return;
            }
        }
        
        message.textContent = `✅ Resep Batch dan HPP Unit berhasil diperbarui untuk PI: ${namaPI}. HPP Unit: Rp${HPP_UNIT_AKHIR.toFixed(2)}`;
        message.className = 'success';

        // Reset dan Inisialisasi Ulang
        await loadMasterData();
        formResep.reset();
        resetFormMode(false);
    });

    // Inisialisasi Awal
    await loadMasterData();
    resetFormMode(false);
});