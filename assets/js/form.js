// assets/js/form.js

// 1. Integrasi Supabase Client (Pastikan path ke supabase.js benar)
import { supabase } from "./supabase.js"; 

const TABLE_NAME = 'activity_log';

// ==============================================
// FUNGSI UTILITY: PENGAMBIL DATA FORM
// ==============================================

// Fungsi untuk mendapatkan nilai dari input (termasuk radio button)
function getInputValue(id, isRadio = false) {
    if (isRadio) {
        // Untuk radio button, ID yang dikirim adalah 'name' dari input radio
        const radio = document.querySelector(`input[name="${id}"]:checked`);
        return radio ? radio.value : null;
    }
    const element = document.getElementById(id);
    // Pastikan string kosong (null) tidak dikirim jika input tidak diisi
    return element && element.value !== '' ? element.value : null;
}

// ==============================================
// FUNGSI 1: AUTOSUGGEST (Saran Otomatis untuk input teks bebas)
// ==============================================

async function setupAutosuggest(inputId, columnName) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) return;

    // Ambil data unik dari kolom yang diinginkan
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(columnName)
        .limit(100); // Batasi hasil untuk efisiensi

    if (error) {
        console.error(`Gagal memuat autosuggest untuk ${columnName}:`, error);
        return;
    }

    // Ekstrak nilai unik, filter yang kosong, dan urutkan
    const historyData = [...new Set(data.map(item => item[columnName]).filter(Boolean))];

    // Buat/Ambil Elemen Datalist dan Hubungkan ke Input
    const datalistId = `${inputId}-list`;
    let datalist = document.getElementById(datalistId);

    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = datalistId;
        // Pastikan input memiliki atribut 'list' yang sesuai
        inputElement.setAttribute('list', datalistId); 
        inputElement.parentNode.appendChild(datalist);
    }

    // Isi Datalist
    datalist.innerHTML = ''; 
    historyData.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        datalist.appendChild(option);
    });
}

// ==============================================
// FUNGSI 2: DROPDOWN KATEGORI DINAMIS (dengan opsi "Tambahkan Baru")
// ==============================================

async function populateCategoryDropdown(selectId, columnName) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    // 1. Ambil data unik kategori dari Supabase
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(columnName);

    if (error) {
        console.error(`Gagal memuat kategori untuk ${columnName}:`, error);
        selectElement.innerHTML = '<option value="">Gagal memuat kategori</option>';
        return;
    }

    const historyData = [...new Set(data.map(item => item[columnName]).filter(Boolean))];
    
    // 2. Kosongkan dan buat opsi default
    selectElement.innerHTML = '<option value="" disabled selected>Pilih Kategori</option>';

    // 3. Isi dengan data sejarah
    historyData.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
    });

    // 4. Tambahkan Opsi Khusus "Tambahkan Baru +"
    const newOptionValue = '__ADD_NEW__';
    const newOption = document.createElement('option');
    newOption.value = newOptionValue;
    newOption.textContent = '➕ Tambahkan Baru...';
    selectElement.appendChild(newOption);

    // 5. Tambahkan Logika Event Listener untuk Menangani 'Tambahkan Baru'
    selectElement.addEventListener('change', () => {
        if (selectElement.value === newOptionValue) {
            const newCategory = prompt(`Masukkan nama Kategori baru untuk ${columnName.replace('_', ' ')}:`);
            if (newCategory) {
                // Tambahkan kategori baru ke dropdown dan setel sebagai pilihan saat ini
                const newOpt = document.createElement('option');
                newOpt.value = newCategory;
                newOpt.textContent = newCategory;
                
                // Masukkan opsi baru sebelum opsi 'Tambahkan Baru...'
                selectElement.insertBefore(newOpt, newOption);
                selectElement.value = newCategory; // Setel nilai yang baru dibuat
            } else {
                // Jika pengguna membatalkan prompt, kembalikan ke "Pilih Kategori"
                selectElement.value = "";
            }
        }
    });
}


// ==============================================
// FUNGSI 3: PENGIRIMAN DATA UTAMA
// (Logika ini tetap sama)
// ==============================================

async function handleSubmitForm(event) {
    event.preventDefault(); 

    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.textContent = 'Menyimpan...';
    submitButton.disabled = true;

    // 1. Ambil Semua Data Formulir
    const formData = {
        // --- Inti Aktivitas & Waktu ---
        activity_name: getInputValue('activity_name'),
        activity_category: getInputValue('activity_category'),
        start_time: getInputValue('start_time'),
        end_time: getInputValue('end_time'),
        notes: getInputValue('notes'),

        // --- Emosi & Mental ---
        mood_main: getInputValue('mood_main'),
        emotion_intensity: getInputValue('emotion_intensity') ? parseInt(getInputValue('emotion_intensity')) : null,
        trigger_event: getInputValue('trigger_event'),
        thoughts: getInputValue('thoughts'),
        response_action: getInputValue('response_action'),
        
        // --- Fisiologis & Komunikasi ---
        physical_sensations: getInputValue('physical_sensations'),
        heart_rate: getInputValue('heart_rate') ? parseInt(getInputValue('heart_rate')) : null,
        speech_style: getInputValue('speech_style'),
        facial_expression: getInputValue('facial_expression'),
        sleep_quality: getInputValue('sleep_quality'),

        // --- Finansial ---
        transaction_type: getInputValue('transaction_type', true), 
        amount: getInputValue('amount') ? parseFloat(getInputValue('amount')) : null, 
        financial_category: getInputValue('financial_category'),
        financial_purpose: getInputValue('financial_purpose'),
    };
    
    // Filter data agar tidak mengirim kolom dengan nilai null/kosong
    const payload = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== null)
    );

    // 2. Kirim Data ke Supabase
    const { error } = await supabase
        .from(TABLE_NAME)
        .insert([payload]);

    // 3. Tangani Respon
    if (error) {
        console.error('Gagal menyimpan data ke Supabase:', error);
        alert('Gagal menyimpan jurnal! Error: ' + error.message);
    } else {
        alert('Jurnal berhasil disimpan!');
        document.getElementById('activityForm').reset(); 
        
        // Muat ulang kategori/autosuggest agar data baru yang ditambahkan langsung tersedia
        populateCategoryDropdown('activity_category', 'activity_category');
        populateCategoryDropdown('financial_category', 'financial_category');
        setupAutosuggest('activity_name', 'activity_name'); 
    }
    
    submitButton.textContent = 'Simpan Jurnal Detail';
    submitButton.disabled = false;
}

// ==============================================
// EVENT LISTENERS UTAMA
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Dropdown Dinamis untuk Kategori (Activity & Financial)
    populateCategoryDropdown('activity_category', 'activity_category');
    populateCategoryDropdown('financial_category', 'financial_category');
    
    // 2. Setup Autosuggest untuk Input Teks Bebas
    setupAutosuggest('activity_name', 'activity_name');
    setupAutosuggest('trigger_event', 'trigger_event');

    // 3. Hubungkan Fungsi Submit ke Formulir
    const form = document.getElementById('activityForm');
    if (form) {
        form.addEventListener('submit', handleSubmitForm);
    }
});