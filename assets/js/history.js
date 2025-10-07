// assets/js/history.js

import { supabase } from "./supabase.js"; // Import client supabase Anda

const TABLE_NAME = 'activity_log';

// ==============================================
// UTILITY FUNCTONS
// ==============================================

// Fungsi untuk memformat tanggal ke format lokal (contoh: Selasa, 7/10/2025)
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

// Fungsi untuk memformat waktu ke format jam (contoh: 14:30)
function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Fungsi untuk memformat angka menjadi Rupiah
function formatRupiah(number) {
    if (number === null || number === undefined || isNaN(number)) return 'Rp 0';
    return 'Rp ' + Math.abs(number).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ==============================================
// FUNGSI UTAMA: MENGAMBIL & MENGELOMPOKKAN DATA
// ==============================================

async function fetchAndRenderLog() {
    const container = document.getElementById('daily-log-container');
    const loading = document.getElementById('loading-indicator');
    container.innerHTML = '';
    
    // Tampilkan loading
    if (loading) loading.style.display = 'block';

    // Ambil semua data (pastikan RLS di Supabase sudah diatur untuk SELECT)
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('start_time', { ascending: false }); // Urutkan dari yang terbaru

    if (loading) loading.style.display = 'none';

    if (error) {
        container.innerHTML = `<p style="color: red;">Gagal memuat data: ${error.message}</p>`;
        console.error("Error fetching data:", error);
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p>Belum ada entri jurnal yang tercatat.</p>';
        return;
    }

    // Kelompokkan data berdasarkan tanggal
    const groupedData = data.reduce((acc, entry) => {
        // Ambil hanya tanggal (tanpa waktu)
        const dateKey = entry.start_time ? entry.start_time.substring(0, 10) : 'unknown';
        
        if (!acc[dateKey]) {
            acc[dateKey] = { 
                entries: [], 
                totalExpense: 0, 
                totalIncome: 0,
                // Gunakan created_at untuk tanggal jika start_time null
                date: entry.start_time || entry.created_at
            };
        }

        acc[dateKey].entries.push(entry);

        // Hitung total finansial
        if (entry.transaction_type === 'Pengeluaran' && entry.amount) {
            acc[dateKey].totalExpense += entry.amount;
        } else if (entry.transaction_type === 'Pemasukan' && entry.amount) {
            acc[dateKey].totalIncome += entry.amount;
        }
        return acc;
    }, {});

    // Render data yang sudah dikelompokkan
    renderGroupedData(groupedData, container);
}

// ==============================================
// FUNGSI UTAMA: MERENDER DATA
// ==============================================

function renderGroupedData(groupedData, container) {
    // Urutkan kunci tanggal dari yang terbaru
    const sortedDates = Object.keys(groupedData).sort().reverse();

    sortedDates.forEach(dateKey => {
        const group = groupedData[dateKey];
        const dateDisplay = formatDate(group.date);

        // --- 1. Header Harian ---
        const dailySummaryDiv = document.createElement('div');
        dailySummaryDiv.className = 'daily-summary';

        const headerHtml = `
            <div class="daily-header">
                <h3>${dateDisplay}</h3>
                <div class="daily-financial">
                    <span style="color: #dc3545;">Pengeluaran: ${formatRupiah(group.totalExpense)}</span>
                    <span style="color: #28a745;">Pemasukan: ${formatRupiah(group.totalIncome)}</span>
                </div>
            </div>
        `;
        dailySummaryDiv.innerHTML += headerHtml;

        // --- 2. Detail Setiap Entri ---
        group.entries.forEach(entry => {
            const entryCard = document.createElement('div');
            entryCard.className = 'daily-entry-card';
            entryCard.dataset.id = entry.id; // Untuk keperluan Hapus/Edit

            // Format tampilan setiap entri
            const entryHtml = `
                <div class="entry-detail-row">
                    <strong>Aktivitas:</strong> ${entry.activity_name || '-'} | 
                    <strong>Kategori:</strong> ${entry.activity_category || '-'}
                </div>
                <div class="entry-detail-row">
                    <strong>Waktu:</strong> ${formatTime(entry.start_time)} 
                    ${entry.end_time ? `s.d. ${formatTime(entry.end_time)}` : ''}
                </div>
                <div class="entry-detail-row">
                    <strong>Keterangan:</strong> ${entry.notes || '-'}
                </div>
                
                <hr style="border: 0; border-top: 1px dashed #eee; margin: 8px 0;">

                <div class="entry-detail-row">
                    <strong>Mood:</strong> ${entry.mood_main || '-'} | 
                    <strong>Intensitas:</strong> ${entry.emotion_intensity || '-'}
                </div>
                <div class="entry-detail-row">
                    <strong>Pemicu:</strong> ${entry.trigger_event || '-'}
                </div>
                <div class="entry-detail-row">
                    <strong>Respon:</strong> ${entry.response_action || '-'}
                </div>
                <div class="entry-detail-row">
                    <strong>Fisik:</strong> ${entry.physical_sensations || '-'} | 
                    <strong>Jantung:</strong> ${entry.heart_rate || '-'} BPM
                </div>
                <div class="entry-detail-row">
                    <strong>Tidur:</strong> ${entry.sleep_quality || '-'} | 
                    <strong>Bicara:</strong> ${entry.speech_style || '-'} | 
                    <strong>Ekspresi:</strong> ${entry.facial_expression || '-'}
                </div>

                ${entry.amount ? `
                    <hr style="border: 0; border-top: 1px dashed #ccc; margin: 8px 0;">
                    <div class="entry-detail-row">
                        <strong>Transaksi:</strong> ${entry.transaction_type || '-'}
                    </div>
                    <div class="entry-detail-row">
                        <strong>Jumlah:</strong> <span class="${entry.transaction_type === 'Pengeluaran' ? 'expense-amount' : 'income-amount'}">${formatRupiah(entry.amount)}</span> | 
                        <strong>Kategori:</strong> ${entry.financial_category || '-'}
                    </div>
                    <div class="entry-detail-row">
                        <strong>Tujuan:</strong> ${entry.financial_purpose || '-'}
                    </div>
                ` : ''}

                <div class="action-buttons">
                    <button class="btn-edit" data-id="${entry.id}">Edit</button>
                    <button class="btn-delete" data-id="${entry.id}" style="background-color: #dc3545;">Hapus</button>
                </div>
            `;
            entryCard.innerHTML = entryHtml;
            dailySummaryDiv.appendChild(entryCard);
        });

        container.appendChild(dailySummaryDiv);
    });

    // Pasang Event Listener untuk Tombol
    setupActionListeners();
}

// ==============================================
// FUNGSI AKSI: DELETE & EDIT (Stubs)
// ==============================================

async function handleDelete(id) {
    if (!confirm(`Apakah Anda yakin ingin menghapus entri ID: ${id}?`)) {
        return;
    }

    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id); // Hanya hapus entri dengan ID ini

    if (error) {
        alert('Gagal menghapus entri: ' + error.message);
        console.error('Error deleting:', error);
    } else {
        alert('Entri berhasil dihapus!');
        fetchAndRenderLog(); // Muat ulang daftar
    }
}

function setupActionListeners() {
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            handleDelete(id);
        });
    });

    // TODO: Implementasi fungsi EDIT (akan melibatkan membuka form dengan data yang sudah terisi)
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            alert(`Fungsi Edit untuk ID ${id} belum diimplementasikan. Nantinya akan membuka form dengan data ini.`);
        });
    });
}

// ==============================================
// INI ADALAH TITIK AWAL EKSEKUSI
// ==============================================
document.addEventListener('DOMContentLoaded', fetchAndRenderLog);