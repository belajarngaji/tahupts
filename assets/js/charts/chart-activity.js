// assets/js/charts/chart-activity.js (FINAL REVISI)

import { getHour } from "../utils.js"; 

export function renderActivityChart(data) {
    const activityCount = {};
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

    data.forEach(entry => {
        const hour = getHour(entry.start_time);
        if (hour !== null) {
            const hourKey = String(hour).padStart(2, '0');
            activityCount[hourKey] = (activityCount[hourKey] || 0) + 1;
        }
    });

    const labels = hours.map(h => `${h}:00`);
    const counts = hours.map(h => activityCount[h] || 0);

    const ctx = document.getElementById('activityBarChart').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Entri Aktivitas',
                data: counts,
                backgroundColor: '#4CAF50',
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            
            // PENTING: Menonaktifkan semua animasi (sesuai permintaan)
            animation: false, 
            
            hover: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Jumlah Entri', color: 'white' },
                    ticks: { color: 'white' },
                    grid: { color: '#3e3e3e' }
                },
                x: {
                    title: { display: true, text: 'Waktu (Jam)', color: 'white' },
                    ticks: { color: 'white' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                title: { display: false }
            }
        }
    });
}