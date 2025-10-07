// assets/js/history.js

import { supabase } from "./supabase.js"; 

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

// Fungsi untuk memformat angka menjadi Rupiah (Memastikan nol ditampilkan dengan benar)
function formatRupiah(number) {
    // Jika null, undefined, atau 0, langsung kembalikan 'Rp 0'
    if (number === null || number === undefined || isNaN(number) || number === 0) return 'Rp 0';
    
    // Pastikan angka selalu positif untuk tampilan (tanda sudah diwakili oleh warna/kategori)
    const absoluteNumber = Math.abs(number);
    return 'Rp ' + absoluteNumber.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk mendapatkan nilai string atau '-' jika null/undefined
function safeValue(value) {
    return value || '-';
}

// ==============================================
// FUNGSI UTAMA: MENGAMBIL & MENGELOMPOKKAN DATA
// (Tidak ada perubahan mendasar, hanya perhitungan finansial yang sudah benar)
// ==============================================

async function fetchAndRenderLog() {
    // ... (Fungsi fetchAndRenderLog tetap sama) ...
    const container = document.getElementById('daily-log-container');
    const loading = document.getElementById('loading-indicator');
    container.innerHTML = '';
    
    if (loading) loading.style.display = 'block';

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('start_time', { ascending: false }); 

    if (loading) loading.style.display = 'none';

    if (error) {
        container.innerHTML = `<p style="color: red;">Gagal memuat data: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p>Belum ada entri jurnal yang tercatat.</p>';
        return;
    }

    const groupedData = data.reduce((acc, entry) => {
        const dateKey = entry.start_time ? entry.start_time.substring(0, 10) : 'unknown';
        
        if (!acc[dateKey]) {
            acc[dateKey] = { 
                entries: [], 
                totalExpense: 0, 
                totalIncome: 0,
                date: entry.start_time || entry.created_at
            };
        }

        acc[dateKey].entries.push(entry);

        if (entry.transaction_type === 'Pengeluaran' && entry.amount) {
            acc[dateKey].totalExpense += entry.amount;
        } else if (entry.transaction_type === 'Pemasukan' && entry.amount) {
            acc[dateKey].totalIncome += entry.amount;
        }
        return acc;
    }, {});

    renderGroupedData(groupedData, container);
}

// ==============================================
// FUNGSI UTAMA: MERENDER DATA (PERBAIKAN TAMPILAN)
// ==============================================

function renderGroupedData(groupedData, container) {
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
                    <span class="expense-amount-summary">Pengeluaran: ${formatRupiah(group.totalExpense)}</span>
                    <span class="income-amount-summary">Pemasukan: ${formatRupiah(group.totalIncome)}</span>
                </div>
            </div>
        `;
        dailySummaryDiv.innerHTML += headerHtml;

        // --- 2. Detail Setiap Entri ---
        group.entries.forEach(entry => {
            const entryCard = document.createElement('div');
            entryCard.className = 'daily-entry-card';
            entryCard.dataset.id = entry.id; 

            // Gunakan struktur DIV untuk tata letak yang ramah seluler (tidak ada |)
            const entryHtml = `
                <div class="detail-group">
                    <div class="detail-item">
                        <strong>Aktivitas:</strong> ${safeValue(entry.activity_name)}
                    </div>
                    <div class="detail-item">
                        <strong>Kategori:</strong> ${safeValue(entry.activity_category)}
                    </div>
                </div>
                
                <div class="detail-group">
                    <div class="detail-item full-width">
                        <strong>Waktu:</strong> ${formatTime(entry.start_time)} 
                        ${entry.end_time ? `s.d. ${formatTime(entry.end_time)}` : ''}
                    </div>
                    <div class="detail-item full-width">
                        <strong>Keterangan Rinci:</strong> ${safeValue(entry.notes)}
                    </div>
                </div>

                <hr class="separator">

                <div class="detail-group">
                    <div class="detail-item">
                        <strong>Mood:</strong> ${safeValue(entry.mood_main)}
                    </div>
                    <div class="detail-item">
                        <strong>Intensitas:</strong> ${safeValue(entry.emotion_intensity)}
                    </div>
                </div>

                <div class="detail-group">
                    <div class="detail-item full-width">
                        <strong>Pemicu:</strong> ${safeValue(entry.trigger_event)}
                    </div>
                    <div class="detail-item full-width">
                        <strong>Respon:</strong> ${safeValue(entry.response_action)}
                    </div>
                </div>

                <div class="detail-group three-col">
                    <div class="detail-item">
                        <strong>Fisik:</strong> ${safeValue(entry.physical_sensations)}
                    </div>
                    <div class="detail-item">
                        <strong>Jantung:</strong> ${safeValue(entry.heart_rate)} BPM
                    </div>
                    <div class="detail-item">
                        <strong>Tidur:</strong> ${safeValue(entry.sleep_quality)}
                    </div>
                    <div class="detail-item">
                        <strong>Bicara:</strong> ${safeValue(entry.speech_style)}
                    </div>
                    <div class="detail-item">
                        <strong>Ekspresi:</strong> ${safeValue(entry.facial_expression)}
                    </div>
                </div>

                ${entry.amount ? `
                    <hr class="separator-financial">
                    <div class="detail-group">
                        <div class="detail-item full-width">
                            <strong>Transaksi:</strong> ${safeValue(entry.transaction_type)}
                        </div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-item">
                            <strong>Jumlah:</strong> <span class="${entry.transaction_type === 'Pengeluaran' ? 'expense-amount-detail' : 'income-amount-detail'}">${formatRupiah(entry.amount)}</span>
                        </div>
                        <div class="detail-item">
                            <strong>Kategori:</strong> ${safeValue(entry.financial_category)}
                        </div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-item full-width">
                            <strong>Tujuan:</strong> ${safeValue(entry.financial_purpose)}
                        </div>
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

    setupActionListeners();
}

// ... (Fungsi handleDelete dan setupActionListeners tetap sama) ...
async function handleDelete(id) {
    if (!confirm(`Apakah Anda yakin ingin menghapus entri ID: ${id}?`)) {
        return;
    }

    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) {
        alert('Gagal menghapus entri: ' + error.message);
        console.error('Error deleting:', error);
    } else {
        alert('Entri berhasil dihapus!');
        fetchAndRenderLog();
    }
}

function setupActionListeners() {
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            handleDelete(id);
        });
    });

    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            alert(`Fungsi Edit untuk ID ${id} belum diimplementasikan. Nantinya akan membuka form dengan data ini.`);
        });
    });
}

document.addEventListener('DOMContentLoaded', fetchAndRenderLog);