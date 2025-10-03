// assets/js/admin_resep_akhir.js
import { supabase } from './supabase.js';

let masterData = {
    produkAkhir: [],
    bahanBaku: [],
    produkIntermediet: [],
};

document.addEventListener('DOMContentLoaded', async () => {
    const formResep = document.getElementById('formResepAkhir');
    const produkSelect = document.getElementById('produkAkhirSelect');
    const resepInputs = document.getElementById('resepInputs');
    const tambahBahanBtn = document.getElementById('tambahBahan');
    const satuanJualInput = document.getElementById('satuanJual');
    const hargaJualInput = document.getElementById('hargaJualDefault');
    const marginInput = document.getElementById('targetMargin');
    const message = document.getElementById('message');

    // --- 1. AMBIL DATA MASTER ---
    const loadMasterData = async () => {
        // Ambil semua data produk yang dibutuhkan (produk_akhir, bahan_baku_inti, produk_intermediet)
        const { data: pa, error: paError } = await supabase.from('produk_akhir').select('*');
        const { data: bb, error: bbError } = await supabase.from('bahan_baku_inti').select('id, nama_bahan, satuan_stok');
        const { data: pi, error: piError } = await supabase.from('produk_intermediet').select('id, nama_intermediet, satuan');

        if (paError || bbError || piError) {
            message.textContent = '❌ Gagal memuat data master.';
            console.error(paError || bbError || piError);
            return;
        }

        masterData.produkAkhir = pa;
        masterData.bahanBaku = bb;
        masterData.produkIntermediet = pi;

        // Isi dropdown Produk Akhir
        produkSelect.innerHTML = '<option value="">-- Pilih atau Tambah Produk --</option>';
        pa.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nama_produk;
            produkSelect.appendChild(option);
        });
    };
    
    // --- 2. FUNGSI UTILITY ---
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
        
        // 1. Pilih Tipe Bahan
        const typeSelect = document.createElement('select');
        typeSelect.className = 'item-type-select';
        typeSelect.style.flex = '1';
        typeSelect.innerHTML = `
            <option value="">-- Tipe Bahan --</option>
            <option value="bahan_baku">Bahan Baku Inti</option>
            <option value="produk_intermediet">Produk Intermediet</option>
        `;
        div.appendChild(typeSelect);

        // 2. Kontainer untuk Select Item (akan diisi dinamis)
        const itemSelectContainer = document.createElement('div');
        itemSelectContainer.style.flex = '2';
        div.appendChild(itemSelectContainer);

        // 3. Input Jumlah
        const jumlahInput = document.createElement('input');
        jumlahInput.type = 'number';
        jumlahInput.name = 'jumlahDipakai';
        jumlahInput.placeholder = 'Jumlah Dipakai';
        jumlahInput.step = 'any';
        jumlahInput.value = resepData.jumlah_dipakai || '';
        jumlahInput.required = true;
        div.appendChild(jumlahInput);
        
        // 4. Input Satuan (akan diisi otomatis/diisi manual saat select item)
        const satuanInput = document.createElement('input');
        satuanInput.type = 'text';
        satuanInput.name = 'satuanDipakai';
        satuanInput.placeholder = 'Satuan';
        satuanInput.value = resepData.satuan_dipakai || '';
        satuanInput.required = true;
        satuanInput.readOnly = true; // Disarankan readonly agar konsisten dengan stok
        div.appendChild(satuanInput);

        // 5. Tombol Hapus
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
                if (resepData.id && resepData.tipe === tipe) {
                    itemSelect.value = resepData.id;
                }
                
                // Listener untuk mengisi satuan
                itemSelect.addEventListener('change', () => {
                    const selectedItem = dataList.find(item => item.id === itemSelect.value);
                    if (selectedItem) {
                        satuanInput.value = selectedItem.satuan_stok || selectedItem.satuan;
                    }
                });
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
    
    // --- 3. LISTENER PRODUK AKHIR ---
    produkSelect.addEventListener('change', async () => {
        const produkAkhirId = produkSelect.value;
        resepInputs.innerHTML = ''; // Kosongkan resep lama

        if (!produkAkhirId) {
            satuanJualInput.value = '';
            hargaJualInput.value = '';
            marginInput.value = '';
            return;
        }

        // Ambil data detail produk (satuan, harga jual, margin)
        const produkInfo = masterData.produkAkhir.find(p => p.id === produkAkhirId);
        satuanJualInput.value = produkInfo.satuan_jual;
        hargaJualInput.value = produkInfo.harga_jual_default || 0;
        marginInput.value = produkInfo.target_margin || 0;

        // Ambil data resep yang sudah ada dari DB
        const { data: resep, error: resepError } = await supabase
            .from('resep_akhir')
            .select('bahan_baku_id, produk_intermediet_id, jumlah_dipakai, satuan_dipakai');

        if (resepError) {
            message.textContent = '❌ Gagal memuat resep lama.';
            return;
        }
        
        // Isi form dengan resep yang sudah ada
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
             tambahBarisResep(); // Tambahkan baris kosong jika resep baru
        }
    });

    // --- 4. LOGIKA SUBMIT (Simpan Resep & Pricing) ---
    formResep.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = 'Menyimpan resep dan pricing...';
        message.className = '';

        const produkAkhirId = produkSelect.value;
        if (!produkAkhirId) {
            message.textContent = 'Pilih Produk Akhir terlebih dahulu.';
            message.className = 'error';
            return;
        }

        // 4.1 Update Pricing Produk Akhir
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

        // 4.2 Hapus Resep Lama
        const { error: deleteError } = await supabase
            .from('resep_akhir')
            .delete()
            .eq('produk_akhir_id', produkAkhirId);

        if (deleteError) {
            message.textContent = `❌ Gagal menghapus resep lama: ${deleteError.message}`;
            message.className = 'error';
            return;
        }
        
        // 4.3 Kumpulkan dan Insert Resep Baru
        const resepBaru = [];
        document.querySelectorAll('.resep-row').forEach(row => {
            const tipe = row.querySelector('.item-type-select').value;
            const jumlah = parseFloat(row.querySelector('input[name="jumlahDipakai"]').value);
            const satuan = row.querySelector('input[name="satuanDipakai"]').value;
            
            let bahanId = row.querySelector('select[name="bahanBakuId"]')?.value || null;
            let intermedietId = row.querySelector('select[name="produkIntermedietId"]')?.value || null;
            
            // Validasi: pastikan salah satu ID ada dan jumlah valid
            if ((bahanId || intermedietId) && jumlah > 0) {
                resepBaru.push({
                    produk_akhir_id: produkAkhirId,
                    bahan_baku_id: bahanId,
                    produk_intermediet_id: intermedietId,
                    jumlah_dipakai: jumlah,
                    satuan_dipakai: satuan,
                });
            }
        });

        if (resepBaru.length > 0) {
            const { error: insertError } = await supabase
                .from('resep_akhir')
                .insert(resepBaru);

            if (insertError) {
                message.textContent = `❌ Gagal menyimpan resep baru: ${insertError.message}`;
                message.className = 'error';
                return;
            }
        }

        message.textContent = `✅ Resep dan Pricing berhasil diperbarui untuk produk: ${produkSelect.options[produkSelect.selectedIndex].textContent}.`;
        message.className = 'success';
    });

    // Inisialisasi
    await loadMasterData();
});