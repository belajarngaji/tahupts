// assets/js/charts/chart-financial.js

// Fungsi helper untuk mendapatkan nama bulan/tahun (Contoh: "Okt 2025")
function formatMonthYear(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

export function renderFinancialChart(data) {
    const financialData = {}; // { "2025-10": { income: 0, expense: 0 } }
    
    // 1. Agregasi data per bulan
    data.forEach(entry => {
        if (!entry.start_time || !entry.amount) return;

        // Kunci unik bulanan (YYYY-MM)
        const monthKey = entry.start_time.substring(0, 7); 
        
        if (!financialData[monthKey]) {
            financialData[monthKey] = { income: 0, expense: 0, date: entry.start_time };
        }

        if (entry.transaction_type === 'Pemasukan') {
            financialData[monthKey].income += entry.amount;
        } else if (entry.transaction_type === 'Pengeluaran') {
            financialData[monthKey].expense += entry.amount;
        }
    });

    // 2. Sortir dan Format Data
    const sortedKeys = Object.keys(financialData).sort();
    
    const labels = sortedKeys.map(key => formatMonthYear(financialData[key].date));
    const incomes = sortedKeys.map(key => financialData[key].income);
    const expenses = sortedKeys.map(key => financialData[key].expense);

    // 3. Render Grafik
    const ctx = document.getElementById('financialLineChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan (Rp)',
                    data: incomes,
                    borderColor: '#4CAF50', // Hijau untuk Pemasukan
                    backgroundColor: 'rgba(76, 175, 80, 0.3)',
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Pengeluaran (Rp)',
                    data: expenses,
                    borderColor: '#E57373', // Merah untuk Pengeluaran
                    backgroundColor: 'rgba(229, 115, 115, 0.3)',
                    tension: 0.3,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // EFEK DINAMIS: Animasi saat data dimuat/diperbarui
            animation: {
                duration: 1500, // Durasi lebih panjang untuk kesan smooth
                easing: 'easeInOutCubic',
            },
            hover: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Jumlah (Rp)', color: 'white' },
                    ticks: { 
                        color: 'white',
                        // Format Angka ke Rupiah (sederhana)
                        callback: function(value) {
                            if (value >= 1000000) return 'Rp ' + (value / 1000000).toFixed(1) + 'Jt';
                            if (value >= 1000) return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                            return 'Rp ' + value;
                        }
                    },
                    grid: { color: '#3e3e3e' }
                },
                x: {
                    title: { display: true, text: 'Bulan', color: 'white' },
                    ticks: { color: 'white' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: 'white' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}