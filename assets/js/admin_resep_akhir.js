// assets/js/admin_resep_akhir.js (Kode Lengkap yang Diperbarui)

import { supabase } from './supabase.js';

let masterData = {
    produkAkhir: {}, // Map: { 'Nama Produk': {id, satuan_jual, harga_jual_default, target_margin}, ... }
    bahanBaku: [],
    produkIntermediet: [],
};

document.addEventListener('DOMContentLoaded', async () => {
    const formResep = document.getElementById('formResepAkhir');
    
    // Elemen Input Baru
    const namaProdukAkhirInput = document.getElementById('namaProdukAkhir'); 
    const datalist = document.getElementById('produkAkhirList');
    const produkAkhirIdHidden = document.getElementById('produkAkhirIdHidden');
    
    const resepInputs = document.getElementById('resepInputs');
    const tambahBahanBtn = document.getElementById('tambahBahan');
    const satuanJualInput = document.getElementById('satuanJual');
    const hargaJualInput = document.getElementById('hargaJualDefault');
    const marginInput = document.getElementById('targetMargin');
    const message = document.getElementById('message');

    // --- 1. AMBIL DATA MASTER ---
    const loadMasterData = async () => {
        message.textContent = 'Memuat data master...';

        // Ambil semua data produk yang dibutuhkan
        const { data: pa, error: paError } = await supabase.from('produk_akhir').select('*');
        const { data: bb, error: bbError } = await supabase.from('bahan_baku_inti').select('id, nama_bahan, satuan_stok');
        const { data: pi, error: piError } = await supabase.from('produk_intermediet').select('id, nama_intermediet, satuan');

        if (paError || bbError || piError) {
            message.textContent = '❌ Gagal memuat data master.';
            console.error(paError || bbError || piError);
            return;
        }

        masterData.bahanBaku = bb;
        masterData.produkIntermediet = pi;

        // Isi Datalist Produk Akhir
        datalist.innerHTML = ''; 
        masterData.produkAkhir = {}; // Reset Map
        pa.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nama_produk;
            datalist.appendChild(option);
            
            // Simpan data di map untuk lookup cepat
            masterData.produkAkhir[p.nama_produk] = p;
        });
        
        message.textContent = 'Data siap. Pilih atau ketik nama produk.';
    };
    
    // --- 2. LISTENER FLEKSIBEL PRODUK AKHIR ---
    namaProdukAkhirInput.addEventListener('input', async () => {
        const nama = namaProdukAkhirInput.value.trim();
        const produkInfo = masterData.produkAkhir[nama];
        
        resepInputs.innerHTML = ''; // Kosongkan resep

        if (produkInfo) {
            // --- SKENARIO 1: PRODUK LAMA (Dipilih dari Datalist) ---
            produkAkhirIdHidden.value = produkInfo.id;
            satuanJualInput.value = produkInfo.satuan_jual;
            hargaJualInput.value = produkInfo.harga_jual_default || 0;
            marginInput.value = produkInfo.target_margin || 0;
            satuanJualInput.readOnly = true; // Satuan dikunci jika produk sudah ada

            // Muat Resep Lama
            await loadResep(produkInfo.id);

        } else {
            // --- SKENARIO 2: PRODUK BARU (Diketik Manual) ---
            produkAkhirIdHidden.value = ''; // Reset ID
            satuanJualInput.value = '';
            hargaJualInput.value = 0;
            marginInput.value = 0;
            satuanJualInput.readOnly = false; // Boleh diisi manual
            
            tambahBarisResep(); // Tambahkan baris resep kosong untuk produk baru
        }
    });
    
    // --- FUNGSI BARU: MEMUAT RESEP LAMA ---
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

    // --- 3. FUNGSI UTILITY (tambahBarisResep Disesuaikan) ---
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
        return select;
    };

    const tambahBarisResep = (resepData = {}) => {
        const div = document.createElement('div');
        div.className = 'input-group resep-row';
        div.style.alignItems = 'flex-end';
        
        // ... (Kode untuk membuat typeSelect, itemSelectContainer, jumlahInput, satuanInput, hapusBtn tetap sama) ...
        
        // Buat elemen input/select
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
        hapusBtn.onclick = () => div.remove();
        div.appendChild(hapusBtn);


        // Logic dinamis untuk Select Item dan Satuan
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
                });
                
                // Trigger change event jika ada nilai awal (untuk mengisi satuanInput)
                 if (itemSelect.value) itemSelect.dispatchEvent(new Event('change'));
            }
        };

        typeSelect.addEventListener('change', (e) => updateItemSelect(e.target.value));

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
        e.preventDefault();
        message.textContent = 'Memproses data...';
        message.className = '';

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
                    harga_jual_default: parseFloat(hargaJualInput.value) || 0,
                    target_margin: parseFloat(marginInput.value) || 0,
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
                    harga_jual_default: parseFloat(hargaJualInput.value),
                    target_margin: parseFloat(marginInput.value)
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
        const resepBaru = [];
        let validResepCount = 0;
        document.querySelectorAll('.resep-row').forEach(row => {
            const tipe = row.querySelector('.item-type-select').value;
            const jumlah = parseFloat(row.querySelector('input[name="jumlahDipakai"]').value);
            const satuan = row.querySelector('input[name="satuanDipakai"]').value;
            
            let bahanId = row.querySelector('select[name="bahanBakuId"]')?.value || null;
            let intermedietId = row.querySelector('select[name="produkIntermedietId"]')?.value || null;
            
            if ((bahanId || intermedietId) && jumlah > 0) {
                resepBaru.push({
                    produk_akhir_id: produkAkhirId,
                    bahan_baku_id: bahanId,
                    produk_intermediet_id: intermedietId,
                    jumlah_dipakai: jumlah,
                    satuan_dipakai: satuan,
                });
                validResepCount++;
            }
        });

        if (validResepCount > 0) {
            const { error: insertError } = await supabase
                .from('resep_akhir')
                .insert(resepBaru);

            if (insertError) {
                message.textContent = `❌ Gagal menyimpan resep baru: ${insertError.message}`;
                message.className = 'error';
                return;
            }
        }

        message.textContent = `✅ Resep dan Pricing berhasil diperbarui untuk produk: ${namaProduk}.`;
        message.className = 'success';
        
        // Muat ulang data agar produk baru muncul di datalist
        await loadMasterData();
        // Reset form hanya setelah semua operasi selesai
        formResep.reset();
        satuanJualInput.readOnly = false;
        resepInputs.innerHTML = '';
        tambahBarisResep(); // Tambahkan baris kosong awal
    });

    // Inisialisasi
    await loadMasterData();
    tambahBarisResep(); // Tambahkan baris kosong awal saat halaman dimuat
});