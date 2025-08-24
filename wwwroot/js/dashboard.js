document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        redirectToLogin();
        return;
    }

    try {
        const response = await fetch('/api/auth/validate', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            redirectToLogin();
            return;
        }

        await loadTransactions();
        await renderChart();

        document.querySelector('.updateBalance').addEventListener('click', () => {
            //renderMonthlyChart();
            updateBalance();
        });
        await updateBalance();
        //await renderMonthlyChart();

        document.getElementById('transactionForm').addEventListener('submit', addTransaction);
        document.getElementById('clearFilters').addEventListener('click', resetFilters);
        document.getElementById('filterType').addEventListener('change', applyFilters);
        document.getElementById('filterCategory').addEventListener('change', applyFilters);
        document.getElementById('filterMonth').addEventListener('change', applyFilters);
        //document.getElementById('filterMonthBalance').addEventListener('change', () => {
        //    renderMonthlyChart();
        //    updateBalance();
        //});
       
        document.getElementById('toggleAnalytics').addEventListener('click', () => {
            currentChartType = currentChartType === 'expenses' ? 'income' : 'expenses';
            renderChart();
        });

    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        redirectToLogin();
    }
});

function redirectToLogin() {
    localStorage.removeItem('jwtToken');
    window.location.href = '/login.html';
}

function applyFilters() {
    const filters = {
        type: document.getElementById('filterType').value,
        category: document.getElementById('filterCategory').value !== 'all' 
            ? document.getElementById('filterCategory').value 
            : null,
        month: document.getElementById('filterMonth').value
    };
    
    loadTransactions(filters);
}

function resetFilters() {
    const filters = {
        type: 'all',
        category: 'all',
        month: ''
    };
    
    document.getElementById('filterType').value = filters.type;
    document.getElementById('filterCategory').value = filters.category;
    document.getElementById('filterMonth').value = filters.month;
    
    applyFilters();
}

async function addTransaction() {
    const transaction = {
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value || new Date().toISOString(),
        description: document.getElementById('description').value
    };
    if (transaction.amount <= 0) {
        alert('Сумма должна быть больше 0');
        return;
    }

    try {
        const response = await fetch('/api/transactions/add-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            },
            body: JSON.stringify(transaction)
        });

        if (!response.ok) {
            throw new Error('Ошибка при добавлении транзакции');
        }

        document.getElementById('transactionForm').reset();
        alert('Транзакция добавлена!');
        
        await loadTransactions();
        await renderChart();
        await updateBalance();
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    }
};

async function loadTransactions(filters = {}) {
    try {
        const url = new URL('/api/transactions/get-transactions', window.location.origin);
        
        if (filters.type) url.searchParams.append('type', filters.type);
        if (filters.category) url.searchParams.append('category', filters.category);
        if (filters.month) url.searchParams.append('month', filters.month);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Ошибка сервера");
        }

        const transactions = await response.json();
        
        renderTransactions(transactions);
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    }
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    container.innerHTML = '';

    if (transactions.length === 0) {
        container.innerHTML = '<p>Нет операций</p>';
        return;
    }

    transactions.forEach(transaction => {
        const transactionEl = document.createElement('div');
        transactionEl.className = `transaction transaction-${transaction.amount >= 0 ? 'income' : 'expense'}`;
        
            transactionEl.innerHTML = `
                <div class="transaction-main-row">
                    <div class="transaction-info">
                        <span class="transaction-category">${escapeHtml(transaction.category)}</span>
                        <span class="transaction-date">${formatDate(transaction.date)}</span>
                    </div>
                    <span class="amount-value">${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)} ₽</span>
                </div>
                <div class="transaction-secondary-row">
                    ${transaction.description ? `<p class="transaction-description">•${escapeHtml(transaction.description)}</p>` : '<p></p>'}
                    <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">✕</button>
                </div>
            `;
        
        container.appendChild(transactionEl);
    });
}

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return 'Некорректная дата';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function deleteTransaction(id) {
    if (!confirm('Удалить операцию?')) return;
    
    try {
        const response = await fetch(`/api/transactions/delete-transaction${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        if (!response.ok) throw new Error('Ошибка удаления');
        await loadTransactions();
        await renderChart();
        await updateBalance();
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    }
}

let currentChartType = 'expenses';
let chartInstance = null;

async function renderChart() {
    const response = await fetch('/api/transactions/analytics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
    });

    if (!response.ok) throw new Error('Ошибка загрузки графика');

    const data = await response.json();
    
    const ctx = document.getElementById('Chart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    const chartData = currentChartType === 'expenses' 
        ? data.expensesByCategory 
        : data.incomeByCategory;
    
    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartData.map(x => x.category),
            datasets: [{
                data: chartData.map(x => x.amount),
                backgroundColor: [
                    '#005f73', '#0a9396', '#e9d8a6', 
                    '#ee9b00', '#bb3e03', '#9b2226'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: currentChartType === 'expenses' 
                        ? 'Расходы по категориям' 
                        : 'Доходы по категориям',
                    font: { size: 16 }
                }
            }
        }
    });
}

async function updateBalance() {
    try {
        const response = await fetch('/api/transactions/balance', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки баланса');
        
        const balance = await response.json();
        const balanceEl = document.getElementById('balanceDisplay');
        
        balanceEl.textContent = `${balance.toFixed(2)} ₽`;
        balanceEl.style.color = balance >= 0 ? '#2ecc71' : '#e74c3c';
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('balanceDisplay').textContent = 'Ошибка';
    }
}

//async function renderMonthlyChart() {
//    try {
//        const response = await fetch('/api/transactions/analytics/monthly', {
//            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
//        });

//        if (!response.ok) {
//            const errorData = await response.json().catch(() => null);
//            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
//        }

//        const monthlyData = await response.json();
        
//        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
//        if (window.monthlyChartInstance) {
//            window.monthlyChartInstance.destroy();
//        }
        
//        console.log('Monthly data:', monthlyData);

//        const allValues = monthlyData.flatMap(item => [item.income, -Math.abs(item.expenses)]);
//        const padding = 10000;
        
//        window.monthlyChartInstance = new Chart(ctx, {
//            type: 'bar',
//            data: {
//                labels: monthlyData.map(item => item.period),
//                datasets: [
//                    {
//                        label: 'Доходы',
//                        data: monthlyData.map(item => item.income),
//                        backgroundColor: '#2ecc71',
//                        borderColor: '#27ae60',
//                        borderWidth: 1
//                    },
//                    {
//                        label: 'Расходы',
//                        data: monthlyData.map(item => item.expenses),
//                        backgroundColor: '#e74c3c',
//                        borderColor: '#c0392b',
//                        borderWidth: 1
//                    }
//                ]
//            },
//            options: {
//                responsive: true,
//                plugins: {
//                    title: {
//                        display: true,
//                        text: 'Динамика по месяцам'
//                    }
//                },
//                scales: {
//                    x: {
//                        stacked: true,
//                        title: {
//                            display: true,
//                        }
//                    },
//                    y: {
//                        stacked: false,
//                        title: {
//                            display: true,
//                        },
//                        beginAtZero: true,
//                        min: Math.min(...allValues) - padding,
//                        max: Math.max(...allValues) + padding
//                    }
//                }
//            }
//        });
        
//    } catch (error) {
//        console.error('Ошибка загрузки месячной аналитики:', error);
//        alert('Не удалось загрузить данные: ' + error.message);
//    }
//}