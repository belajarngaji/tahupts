// assets/js/dashboard.js (File Utama)

import { supabase } from "./supabase.js"; 
import { renderActivityChart } from "./charts/chart-activity.js";
import { renderExpenseChart } from "./charts/chart-expense.js";
import { renderMoodChart } from "./charts/chart-mood.js";

const TABLE_NAME = 'activity_log';

// ==============================================
// 0. FUNGSI UTAMA: AMBIL SEMUA DATA & RENDER SEMUA GRAFIK
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
        document.getElementById('activityBarChart').closest('.container').innerHTML = '<p style="color:white; text-align:center; padding-top: 50px;">Belum ada data yang cukup untuk analisis.</p>';
        return;
    }
    
    // --- Panggil Fungsi Analisis dan Rendering dari Modul Terpisah ---
    console.log("Data berhasil dimuat. Merender semua grafik...");
    
    renderActivityChart(data);
    renderExpenseChart(data);
    renderMoodChart(data);
    
    // TODO: Panggil renderFinancialChart jika Anda membuatnya
}

// =BASED ON THE USER'S REQUEST FOR SEPARATE JS FOR EACH GRAPH=
document.addEventListener('DOMContentLoaded', loadDashboard);