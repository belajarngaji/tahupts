// assets/js/dashboard.js

import { supabase } from "./supabase.js"; 

const TABLE_NAME = 'activity_log';

// Helper function untuk mengambil Jam (00-23)
function getHour(timestamp) {
    if (!timestamp) return null;
    try {
        // Ambil komponen jam dari string timestamp (lebih andal dari new Date)
        const timePart = timestamp.split('T')[1];
        if (timePart) {
            return parseInt(timePart.split(':')[0], 10);
        }
    } catch (e) {
        console.error("Gagal parse jam:", e);
    }
    // Fallback jika parsing string gagal
    const date = new Date(timestamp);
    return date.getHours(); 
}

// ==============================================
// 1. ANALISIS POLA AKTIVITAS HARIAN (ANALISIS JAM)
// ==============================================

function prepareActivityData(data) {
    // Inisialisasi frekuensi untuk setiap jam
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')); // ["00", "01", ..., "23"]
    const activityCount = {};

    data.forEach(entry => {
        const hour = getHour(entry.start_time);
        const activity = entry.activity_name || 'Tidak Diketahui';

        if (hour !== null) {
            const hourKey = String(hour).padStart(2, '0');
            if (!activityCount[hourKey]) {
                activityCount[hourKey] = {};
            }
            activityCount[hourKey][activity] = (activityCount[hourKey][activity] || 0) + 1;
        }
    });

    // Sederhanakan data untuk grafik: temukan aktivitas paling dominan di setiap jam
    const dominantActivityData = hours.map(h => {
        const activities = activityCount[h];
        if (!activities) return { activity: 'Istirahat/Kosong', count: 0 };
        
        // Cari aktivitas dengan hitungan tertinggi
        const dominant = Object.entries(activities).reduce((a, b) => a[1] > b[1] ? a : b, ['Istirahat/Kosong', 0]);
        return { 
            activity: dominant[0], 
            count: dominant[1] 
        };
    });

    // Untuk grafik bar: Jam vs. Frekuensi Total Aktivitas
    const labels = hours.map(h => `${h}:00`);
    const counts = hours.map(h => {
        const hourData = activityCount[h];
        if (!hourData) return 0;
        return Object.values(hourData).reduce((sum, count) => sum + count, 0);
    });

    return { labels, counts };
}

function renderActivityChart(chartData) {
    const ctx = document.getElementById('activityBarChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Total Entri Aktivitas',
                data: chartData.counts,
                backgroundColor: '#4CAF50', // Warna hijau
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah Entri',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: { color: '#3e3e3e' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Waktu (Jam)',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false
                }
            }
        }
    });
}


// ==============================================
// 0. FUNGSI UTAMA: AMBIL SEMUA DATA
// ==============================================

async function loadDashboard() {
    const loading = document.getElementById('loading-indicator');
    if (loading) loading.style.display = 'block';
    
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*');

    if (loading) loading.style.display = 'none';

    if (error) {
        alert('Gagal memuat data analisis: ' + error.message);
        console.error("Error fetching data:", error);
        return;
    }

    if (!data || data.length === 0) {
        document.getElementById('activityBarChart').closest('.chart-card').innerHTML = '<p style="color:white; text-align:center;">Belum ada data yang cukup untuk analisis.</p>';
        return;
    }
    
    // --- Panggil Fungsi Analisis dan Rendering ---
    const activityData = prepareActivityData(data);
    renderActivityChart(activityData);
    
    // TODO: Tambahkan panggilan untuk renderExpenseChart, renderMoodChart, dll. di sini
}

// ==============================================
// TITIK AWAL EKSEKUSI
// ==============================================
document.addEventListener('DOMContentLoaded', loadDashboard);