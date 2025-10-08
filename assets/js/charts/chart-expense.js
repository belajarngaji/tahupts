// assets/js/charts/chart-expense.js

const COLORS = ['#E57373', '#FFB74D', '#81C784', '#64B5F6', '#BA68C8', '#A1887F']; // Palet warna

export function renderExpenseChart(data) {
    const expenseData = {};

    data.forEach(entry => {
        if (entry.transaction_type === 'Pengeluaran' && entry.amount > 0) {
            const category = entry.financial_category || 'Lainnya';
            expenseData[category] = (expenseData[category] || 0) + entry.amount;
        }
    });

    const labels = Object.keys(expenseData);
    const amounts = Object.values(expenseData);

    const ctx = document.getElementById('expenseDonutChart').getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pengeluaran (Rp)',
                data: amounts,
                backgroundColor: amounts.map((_, i) => COLORS[i % COLORS.length]),
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'white',
                        padding: 15
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });
}