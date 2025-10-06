// assets/js/form.js

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
        const radio = document.querySelector(`input[name="${id}"]:checked`);
        return radio ? radio.value : null;
    }
    const element = document.getElementById(id);
    // Pastikan string kosong (null) tidak dikirim jika input tidak diisi
    return element && element.value !== '' ? element.value : null;
}

// ==============================================
// FUNGSI 1: AUTOSUGGEST (Saran Otomatis)
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

    // Buat/Ambil Elemen Datalist
    const datalistId = `${inputId}-list`;
    let datalist = document.getElementById(datalistId);

    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = datalistId;
        inputElement.parentNode.appendChild(datalist);
    }
    
    // Isi Datalist
    datalist.innerHTML = ''; 
    historyData.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        datalist.appendChild(option);
    });

    // Hubungkan Input dengan Datalist
    inputElement.setAttribute('list', datalistId);
}

// ==============================================
// FUNGSI 2: PENGIRIMAN DATA UTAMA
// ==============================================

async function handleSubmitForm(event) {
    event.preventDefault(); // Mencegah form melakukan reload halaman

    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.textContent = 'Menyimpan...';
    submitButton.disabled = true;

    // 1. Ambil Semua Data Formulir
    const formData = {
        // --- 1. Inti Aktivitas & Waktu ---
        activity_name: getInputValue('activity_name'),
        activity_category: getInputValue('activity_category'),
        start_time: getInputValue('start_time'),
        end_time: getInputValue('end_time'),
        notes: getInputValue('notes'),

        // --- 2. Emosi & Mental ---
        mood_main: getInputValue('mood_main'),
        // Pastikan intensity diubah ke integer jika ada nilai
        emotion_intensity: getInputValue('emotion_intensity') ? parseInt(getInputValue('emotion_intensity')) : null,
        trigger_event: getInputValue('trigger_event'),
        thoughts: getInputValue('thoughts'),
        response_action: getInputValue('response_action'),
        
        // --- 3. Fisiologis & Komunikasi ---
        physical_sensations: getInputValue('physical_sensations'),
        heart_rate: getInputValue('heart_rate') ? parseInt(getInputValue('heart_rate')) : null,
        speech_style: getInputValue('speech_style'),
        facial_expression: getInputValue('facial_expression'),
        sleep_quality: getInputValue('sleep_quality'),

        // --- 4. Finansial ---
        transaction_type: getInputValue('transaction_type', true), // isRadio=true
        // Menggunakan parseFloat untuk angka, Supabase akan menanganinya
        amount: getInputValue('amount') ? parseFloat(getInputValue('amount')) : null, 
        financial_category: getInputValue('financial_category'),
        financial_purpose: getInputValue('financial_purpose'),
    };
    
    // Filter data agar tidak mengirim kolom dengan nilai null/kosong (kecuali yang wajib)
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
        submitButton.textContent = 'Simpan Jurnal Detail';
        submitButton.disabled = false;
    } else {
        alert('Jurnal berhasil disimpan!');
        document.getElementById('activityForm').reset(); // Kosongkan form
        submitButton.textContent = 'Simpan Jurnal Detail';
        submitButton.disabled = false;
        // Opsional: Muat ulang autosuggest setelah sukses
        setupAutosuggest('activity_name', 'activity_name');
    }
}

// ==============================================
// EVENT LISTENERS UTAMA
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Autosuggest untuk Input yang Sering Diulang
    setupAutosuggest('activity_name', 'activity_name');
    setupAutosuggest('trigger_event', 'trigger_event');
    setupAutosuggest('financial_category', 'financial_category');
    
    // 2. Hubungkan Fungsi Submit ke Formulir
    const form = document.getElementById('activityForm');
    if (form) {
        form.addEventListener('submit', handleSubmitForm);
    }
});