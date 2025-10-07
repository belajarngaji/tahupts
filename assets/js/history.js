// assets/js/history.js

// 1. Integrasi Supabase Client (Pastikan path ke supabase.js benar)
import { supabase } from "./supabase.js"; 

const TABLE_NAME = 'activity_log';

// ==============================================
// FUNGSI UTILITY: FORMATTING
// ==============================================

// Fungsi untuk memformat tanggal ke format lokal (contoh: Selasa, 7/10/2025)
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

// FUNGSI KRITIS: Memastikan Jam Dibaca Sesuai Data yang Tersimpan (Mengatasi Timezone Offset)
function formatTime(timestamp) {
    if (!timestamp) return '-';
    
    // Asumsi data dari 'datetime-local' disimpan di Supabase sebagai 'YYYY-MM-DDTHH:MM:SS'
    // Parsing string adalah cara paling pasti untuk mendapatkan jam yang diinput.
    if (timestamp.includes('T')) {
        try {
            const timePart = timestamp.split('T')[1];
            if (timePart) {
                const parts = timePart.split(':');
                // Hanya ambil Jam dan Menit (abaikan detik)
                if (parts.length >= 2) {
                    return `${parts[0]}:${parts[1]}`;
                }
            }
        } catch (e) {
            console.warn("Gagal parsing waktu dari string, fallback ke metode Date.");
        }
    }

    // Fallback menggunakan metode Date (berpotensi mengalami offset timezone)
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Fungsi untuk memformat angka menjadi Rupiah (Memastikan nol ditampilkan dengan benar)
function formatRupiah(number) {
    if (number === null || number === undefined || isNaN(number) || number === 0) return 'Rp 0';
    
    const absoluteNumber = Math.abs(number);
    return 'Rp ' + absoluteNumber.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk mendapatkan nilai string atau '-' jika null/undefined
function safeValue(value) {
    return value || '-';
}

// ==============================================
// FUNGSI UTAMA: MENGAMBIL & MENGELOMPOKKAN DATA
// ==============================================

async function fetchAndRenderLog() {
    const container = document.getElementById('daily-log-container');
    const loading = document.getElementById('loading-indicator');
    
    // Kosongkan dan tampilkan loading
    container.innerHTML = '';
    if (loading) loading.style.display = 'block';

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('start_time', { ascending: false }); 

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

    // Kelompokkan data berdasarkan tanggal dan hitung total finansial
    const groupedData = data.reduce((acc, entry) => {
        // Gunakan hanya tanggal (YYYY-MM-DD) sebagai kunci
        const dateKey = entry.start_time ? entry.start_time.substring(0, 10) : 'unknown';
        
        if (!acc[dateKey]) {
            acc[dateKey] = { 
                entries: [], 
                totalExpense: 0, 
                totalIncome: 0,
                // Gunakan created_at jika start_time null
                date: entry.start_time || entry.created_at
            };
        }

        acc[dateKey].entries.push(entry);

        // Hitung total finansial harian
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
// FUNGSI UTAMA: MERENDER DATA (FINAL LAYOUT)
// ==============================================

function renderGroupedData(groupedData, container) {
    const sortedDates = Object.keys(groupedData).sort().reverse();

    sortedDates.forEach(dateKey => {
        const group = groupedData[dateKey];
        const dateDisplay = formatDate(group.date);
        
        // --- 1. Header Harian (Ringkasan Keuangan) ---
        const dailySummaryDiv = document.createElement('div');
        dailySummaryDiv.className = 'daily-summary';

        const totalDifference = group.totalIncome - group.totalExpense;
        
        const headerHtml = `
            <div class="daily-header">
                <h3 class="daily-date">${dateDisplay}</h3>
                <div class="daily-financial-summary">
                    <span class="pendapatan">Pendapatan: ${formatRupiah(group.totalIncome)}</span>
                    <span class="pengeluaran">Pengeluaran: ${formatRupiah(group.totalExpense)}</span>
                    <span class="total">Total: ${formatRupiah(totalDifference)}</span>
                </div>
            </div>
        `;
        dailySummaryDiv.innerHTML += headerHtml;

        // --- 2. Detail Setiap Entri ---
        group.entries.forEach(entry => {
            const entryCard = document.createElement('div');
            entryCard.className = 'daily-entry-card';
            entryCard.dataset.id = entry.id;

            const startTime = formatTime(entry.start_time);
            
            // Kolom Utama (Transaksi/Aktivitas Cepat)
            const mainDetailHtml = `
                <div class="entry-main-row">
                    <div class="entry-time">${startTime}</div> 
                    
                    <div class="entry-description">
                        <span class="activity-name">${safeValue(entry.activity_name)}</span>
                        <span class="activity-category">${safeValue(entry.activity_category)}</span>
                    </div>

                    ${entry.amount ? `
                        <div class="entry-amount-wrapper">
                            <span class="entry-amount ${entry.transaction_type === 'Pengeluaran' ? 'expense-detail' : 'income-detail'}">
                                ${formatRupiah(entry.amount)}
                            </span>
                        </div>
                    ` : ''}

                    <div class="action-buttons">
                        <button class="btn-edit" data-id="${entry.id}">Edit</button>
                        <button class="btn-delete" data-id="${entry.id}">Hapus</button>
                    </div>
                </div>
            `;
            entryCard.innerHTML += mainDetailHtml;
            
            // Detail Jurnal Penuh (Semua Kolom Jurnal Lainnya)
            const detailJurnalHtml = `
                <div class="entry-journal-details">
                    <div class="detail-group">
                        <div class="detail-item">
                            <strong>Waktu Selesai:</strong> ${entry.end_time ? formatTime(entry.end_time) : '-'}
                        </div>
                        <div class="detail-item full-width">
                            <strong>Keterangan Rinci:</strong> ${safeValue(entry.notes)}
                        </div>
                    </div>

                    <div class="detail-group">
                        <div class="detail-item">
                            <strong>Mood:</strong> ${safeValue(entry.mood_main)} (${safeValue(entry.emotion_intensity)}/10)
                        </div>
                        <div class="detail-item full-width">
                            <strong>Pemicu/Respon:</strong> ${safeValue(entry.trigger_event)} / ${safeValue(entry.response_action)}
                        </div>
                        <div class="detail-item full-width">
                            <strong>Pikiran:</strong> ${safeValue(entry.thoughts)}
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
                            <div class="detail-item">
                                <strong>Transaksi:</strong> ${safeValue(entry.transaction_type)}
                            </div>
                            <div class="detail-item">
                                <strong>Kategori Finansial:</strong> ${safeValue(entry.financial_category)}
                            </div>
                            <div class="detail-item full-width">
                                <strong>Tujuan:</strong> ${safeValue(entry.financial_purpose)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            entryCard.innerHTML += detailJurnalHtml; 

            dailySummaryDiv.appendChild(entryCard);
        });

        container.appendChild(dailySummaryDiv);
    });

    setupActionListeners();
}

// ==============================================
// FUNGSI AKSI: DELETE & EDIT
// ==============================================

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
        fetchAndRenderLog(); // Muat ulang daftar
    }
}

function setupActionListeners() {
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            handleDelete(e.target.dataset.id);
        });
    });
    
    // Fungsi Edit: Mengarahkan ke form.html dengan ID untuk dimuat
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            window.location.href = `form.html?editId=${id}`;
        });
    });
}

// ==============================================
// INI ADALAH TITIK AWAL EKSESEKUSI
// ==============================================
document.addEventListener('DOMContentLoaded', fetchAndRenderLog);