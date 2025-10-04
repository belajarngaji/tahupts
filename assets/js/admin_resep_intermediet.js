// assets/js/admin_resep_intermediet.js

import { supabase } from './supabase.js';

let masterData = {
    produkIntermediet: {},
    bahanBaku: [],
    bahanBakuHpp: {}, // Master data HPP bahan baku
};
let currentRecipeHPP = 0; 
let currentRecipeItems = []; 
let isNewPIIMode = false;

// --- DEKLARASI GLOBAL UNTUK ELEMEN DOM ---
let satuanUnitInput;
let hppDisplay;
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
// ------------------------------------------


// --- FUNGSI HPP & RECIPE ---

const recalculateRecipeHPP = () => {
    currentRecipeHPP = 0;
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
            let itemHpp = 0;

            if (item) {
                // LOGIKA HPP BERDASARKAN SATUAN DIPAKAI (Hanya BBI)
                if (satuanDipakai === item.satuan_utama) {
                    itemHpp = item.hpp_per_unit * item.faktor_konversi; 
                } else if (satuanDipakai === item.satuan_konversi) {
                    itemHpp = item.hpp_per_unit; 
                }
            }

            currentRecipeHPP += jumlah * itemHpp;
            currentRecipeItems.push({ 
                itemId: itemId, 
                jumlah: jumlah, 
                itemHpp: itemHpp, 
                itemSatuan: satuanDipakai,
                tipe: 'bahan_baku' // HANYA BBI
            }); 
        }
    });

    hppDisplay.value = currentRecipeHPP.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    document.getElementById('hppFeedback').textContent = currentRecipeHPP > 0 
        ? `HPP Final Resep: Rp${currentRecipeHPP.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
        : 'HPP belum dapat dihitung. Tambahkan bahan baku.';
};

// --- FUNGSI UTILITY BARIS RESEP ---

const createItemSelect = (name, data) => {
    const select = document.createElement('select');
    select.name = name;
    select.required = true;
    select.innerHTML = `<option value="">-- Pilih Bahan Baku Inti --</option>`;
    data.forEach(item => {
        select.appendChild(new Option(`${item.nama_bahan} (${item.satuan_stok})`, item.id));
    });
    select.addEventListener('change', recalculateRecipeHPP);
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
    
    // 2. JUMLAH DIPAKAI
    const jumlahInput = document.createElement('input');
    jumlahInput.type = 'number';
    jumlahInput.name = 'jumlahDipakai';
    jumlahInput.placeholder = 'Jumlah Dipakai';
    jumlahInput.step = 'any';
    jumlahInput.value = resepData.jumlah_dipakai || '';
    jumlahInput.required = true;

    jumlahInput.addEventListener('input', recalculateRecipeHPP);
    div.appendChild(jumlahInput);
    
    // 3. SATUAN DIPAKAI (Dropdown Konversi)
    const satuanSelect = document.createElement('select'); 
    satuanSelect.name = 'satuanDipakai';
    satuanSelect.className = 'satuan-dipakai-select';
    satuanSelect.required = true;
    satuanSelect.addEventListener('change', recalculateRecipeHPP); 
    div.appendChild(satuanSelect);

    // 4. TOMBOL HAPUS
    const hapusBtn = document.createElement('button');
    hapusBtn.type = 'button';
    hapusBtn.textContent = 'Hapus';
    hapusBtn.className = 'hapus-bahan';
    hapusBtn.onclick = () => { div.remove(); recalculateRecipeHPP(); }; 
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
            
            // Set nilai default/lama
            satuanSelect.value = resepData.satuan_dipakai || hppItem.satuan_konversi || hppItem.satuan_utama; 
        }
        recalculateRecipeHPP(); 
    });
    
    // Load data resep lama
    if (resepData.id) {
        itemSelect.value = resepData.id;
        itemSelect.dispatchEvent(new Event('change')); // Memicu update satuan
    } else {
        satuanSelect.add(new Option('-- Pilih Bahan Baku --', ''));
    }

    resepInputsPI.appendChild(div);
};

// --- FUNGSI MEMUAT DATA LAMA & MASTER DATA ---

const loadResep = async (piId) => {
    const { data: resep, error: resepError } = await supabase
        .from('resep_akhir')
        .select('bahan_baku_id, jumlah_dipakai, satuan_dipakai')
        .eq('produk_akhir_id', piId)
        .not('bahan_baku_id', 'is', null); // Filter HANYA BBI
    
    if (resepError) {
        message.textContent = '❌ Gagal memuat resep PI lama.';
        return;
    }

    if (resep.length > 0) {
        resep.forEach(r => {
            tambahBarisResep({ 
                id: r.bahan_baku_id, // Hanya BBI ID
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
    const { data: piData, error: piError } = await supabase.from('produk_intermediet').select('*, hpp_per_unit, stok_saat_ini');
    const { data: bb, error: bbError } = await supabase.from('bahan_baku_inti').select('id, nama_bahan, satuan_stok, harga_pokok_per_unit, satuan_konversi, faktor_konversi');
    
    if (piError || bbError) {
        message.textContent = '❌ Gagal memuat data master.';
        console.error(piError || bbError);
        return;
    }

    // 2. Mapping Data HPP BBI
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
    
    // 3. Isi Dropdown PI
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

// --- FUNGSI RESET & MODE TOGGLE ---

const resetFormMode = (newMode) => {
    isNewPIIMode = newMode;
    resepInputsPI.innerHTML = '';
    hppDisplay.value = '';
    document.getElementById('hppFeedback').textContent = '';
    currentRecipeHPP = 0;
    
    // Reset data
    piIdHidden.value = '';
    satuanUnitInput.value = '';
    stokSaatIniDisplay.value = '';
    
    tambahBarisResep(); // Selalu tambahkan baris kosong
    
    // Logic readOnly Satuan Unit: BISA DIEDIT jika newMode=true
    satuanUnitInput.readOnly = !newMode;

    if (newMode) {
        message.textContent = 'Mode PI Baru: Tentukan nama, satuan, dan resep.';
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
    recalculateRecipeHPP(); 
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

    // --- LISTENER MODE PEMILIHAN ---
    tombolPIBaru.addEventListener('click', () => resetFormMode(true));
    tombolBatalBaru.addEventListener('click', () => resetFormMode(false));
    tambahBahanPIBtn.addEventListener('click', () => tambahBarisResep());
    
    namaPISelect.addEventListener('change', async () => {
        const selectedId = namaPISelect.value;
        const piInfo = masterData.produkIntermediet[selectedId];

        if (!piInfo) {
            resetFormMode(false); 
            return;
        }

        resepInputsPI.innerHTML = ''; 
        currentRecipeHPP = 0;

        piIdHidden.value = piInfo.id;
        satuanUnitInput.value = piInfo.satuan;
        stokSaatIniDisplay.value = (piInfo.stok_saat_ini || 0).toFixed(2);
        satuanUnitInput.readOnly = true; 

        await loadResep(piInfo.id);
        recalculateRecipeHPP(); 
        message.textContent = `PI Katalog: ${piInfo.nama_intermediet}. Resep dimuat.`;
    });

    // --- LOGIKA SUBMIT ---
    formResep.addEventListener('submit', async (e) => {
        e.preventDefault();

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

        recalculateRecipeHPP(); 
        
        if (currentRecipeItems.length === 0) {
             message.textContent = '❌ Resep tidak boleh kosong. Tambahkan Bahan Baku Inti.';
             message.className = 'error';
             return;
        }

        let piId = piIdHidden.value;
        // 1. PENANGANAN PI BARU
        if (isNewPIIMode) {
            message.textContent = `PI baru ditemukan: ${namaPI}. Membuat entri baru...`;

            const { data: newPI, error: insertErrorPI } = await supabase 
                .from('produk_intermediet')
                .insert([{ 
                    nama_intermediet: namaPI, 
                    satuan: satuanUnit,
                    hpp_per_unit: currentRecipeHPP,
                    stok_saat_ini: 0 // Stok awal selalu 0
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

        if (!piId) {
             message.textContent = 'ID Produk Intermediet tidak ditemukan.';
             message.className = 'error';
             return;
        }

        // 2. Update HPP PI Lama
        if (piInfoLama) {
            const { error: hppUpdateError } = await supabase
                .from('produk_intermediet')
                .update({
                    hpp_per_unit: currentRecipeHPP,
                    satuan: satuanUnit
                })
                .eq('id', piId);
            
            if (hppUpdateError) {
                message.textContent = `❌ Gagal update HPP/Satuan PI: ${hppUpdateError.message}`;
                message.className = 'error';
                return;
            }
        }


        // 3. Hapus Resep Lama (di resep_akhir, karena resep PI juga disimpan di sana)
        const { error: deleteError } = await supabase
            .from('resep_akhir')
            .delete()
            .eq('produk_akhir_id', piId);
        
        if (deleteError) {
            message.textContent = `❌ Gagal menghapus resep lama: ${deleteError.message}`;
            message.className = 'error';
            return;
        }

        // 4. Kumpulkan dan Insert Resep Baru (Hanya BBI)
        const resepBaru = currentRecipeItems.map(item => ({
            produk_akhir_id: piId, // Menggunakan PI ID sebagai FK produk_akhir_id
            bahan_baku_id: item.itemId, // Hanya BBI yang tersisa di currentRecipeItems
            produk_intermediet_id: null, 
            jumlah_dipakai: item.jumlah,
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
        
        message.textContent = `✅ Resep dan HPP berhasil diperbarui untuk PI: ${namaPI}. HPP Unit: Rp${currentRecipeHPP.toFixed(0)}`;
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