// assets/js/charts/chart-mood.js

import { getHour } from "../utils.js";

export function renderMoodChart(data) {
    const moodSum = {}; // { hour: { sum: 0, count: 0 } }
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

    data.forEach(entry => {
        const hour = getHour(entry.start_time);
        const intensity = entry.emotion_intensity;

        if (hour !== null && intensity) {
            const hourKey = String(hour).padStart(2, '0');
            if (!moodSum[hourKey]) {
                moodSum[hourKey] = { sum: 0, count: 0 };
            }
            moodSum[hourKey].sum += intensity;
            moodSum[hourKey].count += 1;
        }
    });

    const labels = hours.map(h => `${h}:00`);
    const averages = hours.map(h => {
        const data = moodSum[h];
        return data && data.count > 0 ? (data.sum / data.count).toFixed(1) : null;
    });

    const ctx = document.getElementById('moodLineChart').getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rata-Rata Intensitas Mood (1-10)',
                data: averages,
                borderColor: '#64B5F6', // Biru Muda
                backgroundColor: 'rgba(100, 181, 246, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 10,
                    title: { display: true, text: 'Intensitas Mood', color: 'white' },
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
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });
}