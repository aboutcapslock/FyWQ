// script.js
import { supabase } from './supabaseClient.js'; // Importa a instância do Supabase

// Seleção de Elementos DOM (condicionais para evitar erros em páginas sem esses elementos)
const transactionForm = document.querySelector('.transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const transactionList = document.querySelector('.transaction-list');
const currentBalanceDisplay = document.querySelector('.current-balance');
const noTransactionsMessage = document.querySelector('.no-transactions-message');

// Elementos para Relatórios
const monthlyChartCanvas = document.getElementById('monthlyChart');
let monthlyChart = null; // Para armazenar a instância do Chart.js

// Elementos para Configurações
const userSettingsForm = document.querySelector('.user-settings-form');
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');

// Elementos para Autenticação
const loginForm = document.getElementById('loginForm');
const loginUsernameInput = document.getElementById('loginUsername'); // Username agora será o email
const loginPasswordInput = document.getElementById('loginPassword');
const registerForm = document.getElementById('registerForm');
const registerUsernameInput = document.getElementById('registerUsername'); // Username agora será o email
const registerPasswordInput = document.getElementById('registerPassword');
const registerEmailInput = document.getElementById('registerEmail');
const logoutBtn = document.getElementById('logoutBtn');

// --- Variáveis de Armazenamento (agora carregadas do Supabase) ---
let currentSupabaseUser = null; // O objeto de usuário retornado pelo Supabase Auth
let transactions = [];
// Os dados do usuário (nome, email) serão carregados diretamente dos metadados do user do Supabase Auth

// --- Funções Auxiliares ---

/**
 * Formata um valor numérico para o padrão de moeda brasileira (R$).
 * @param {number} value - O valor a ser formatado.
 * @returns {string} O valor formatado como string.
 */
function formatCurrency(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// --- Funções de Autenticação com Supabase ---

async function registerUser(e) {
    e.preventDefault();

    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value.trim();
    const username = registerUsernameInput.value.trim(); // Usaremos isso para o "nome" do usuário

    if (!email || !password || !username) {
        alert('Por favor, preencha todos os campos (Email, Senha e Nome de Usuário).');
        return;
    }

    // A autenticação do Supabase usa email e senha
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: username // Adiciona o username aos metadados do usuário
            }
        }
    });

    if (error) {
        if (error.message.includes('User already registered')) {
            alert('Este email já está registrado. Por favor, faça login ou use outro email.');
        } else {
            alert(`Erro no registro: ${error.message}`);
        }
    } else {
        alert('Registro realizado com sucesso! Verifique seu email para confirmar a conta, se a confirmação por email estiver ativada no Supabase.');
        // Opcional: Redirecionar para uma página de "verifique seu email"
        window.location.href = 'login.html';
    }
}

async function loginUser(e) {
    e.preventDefault();

    const email = loginUsernameInput.value.trim(); // O campo de "username" agora é o email
    const password = loginPasswordInput.value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert(`Erro no login: ${error.message}`);
    } else {
        currentSupabaseUser = data.user;
        alert(`Bem-vindo(a), ${currentSupabaseUser.user_metadata?.username || currentSupabaseUser.email}!`);
        window.location.href = 'index.html';
    }
}

async function logoutUser() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert(`Erro ao fazer logout: ${error.message}`);
    } else {
        currentSupabaseUser = null;
        alert('Você foi desconectado(a).');
        window.location.href = 'login.html';
    }
}

/**
 * Verifica se o usuário está logado e redireciona se necessário.
 * Aplica-se a páginas que exigem autenticação.
 */
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    currentSupabaseUser = user;

    const publicPages = ['login.html', 'register.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (!currentSupabaseUser && !publicPages.includes(currentPage) && currentPage !== '') {
        window.location.href = 'login.html';
    } else if (currentSupabaseUser && publicPages.includes(currentPage)) {
        // Se já logado e tentando acessar login/register, redireciona para a página inicial
        window.location.href = 'index.html';
    }
}

// --- Funções de Dados (Transações) com Supabase ---

async function loadUserTransactions() {
    if (!currentSupabaseUser) {
        transactions = [];
        return;
    }

    // Seleciona todas as transações onde o user_id corresponde ao ID do usuário logado
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentSupabaseUser.id)
        .order('created_at', { ascending: false }); // Ordena pelas mais recentes

    if (error) {
        console.error('Erro ao carregar transações:', error.message);
        transactions = [];
    } else {
        // Mapeia para garantir que 'amount' seja numérico, pois o Supabase pode retornar como string
        transactions = data.map(t => ({
            ...t,
            amount: parseFloat(t.amount)
        }));
    }
}

async function addTransaction(e) {
    e.preventDefault();

    if (!currentSupabaseUser) {
        alert('Você precisa estar logado para adicionar transações.');
        return;
    }

    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeSelect.value;

    if (!description || isNaN(amount) || amount <= 0) {
        alert('Por favor, preencha a descrição e um valor positivo para a transação.');
        return;
    }

    const { data, error } = await supabase
        .from('transactions')
        .insert([
            {
                user_id: currentSupabaseUser.id,
                description: description,
                amount: amount,
                type: type,
                date: new Date().toLocaleDateString('pt-BR'), // Apenas para exibição, created_at é o timestamp real
                monthYear: new Date().getFullYear() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0')
            }
        ])
        .select(); // Retorna os dados inseridos

    if (error) {
        alert(`Erro ao adicionar transação: ${error.message}`);
        console.error('Erro ao adicionar transação:', error);
    } else {
        // Adiciona a transação retornada pelo Supabase ao array local
        transactions.unshift({ ...data[0], amount: parseFloat(data[0].amount) });
        updateBalance();
        alert('Transação adicionada com sucesso!');
        descriptionInput.value = '';
        amountInput.value = '';
        typeSelect.value = 'income';
    }
}

async function deleteTransaction(id) {
    if (!currentSupabaseUser) {
        alert('Você precisa estar logado para remover transações.');
        return;
    }

    if (confirm('Tem certeza que deseja remover esta transação?')) {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', currentSupabaseUser.id); // Garante que só o próprio usuário possa deletar

        if (error) {
            alert(`Erro ao remover transação: ${error.message}`);
            console.error('Erro ao remover transação:', error);
        } else {
            // Remove do array local e re-renderiza
            transactions = transactions.filter(trans => trans.id !== id);
            renderTransactions();
            updateBalance();
            if (monthlyChart) {
                updateMonthlyChart();
            }
        }
    }
}

// --- Funções de Renderização e Gráficos (não mudam muito, apenas usam 'transactions' global) ---

function updateBalance() {
    if (currentBalanceDisplay) {
        const balance = transactions.reduce((acc, trans) => {
            return trans.type === 'income' ? acc + trans.amount : acc - trans.amount;
        }, 0);

        currentBalanceDisplay.textContent = formatCurrency(balance);

        if (balance > 0) {
            currentBalanceDisplay.style.color = 'var(--color-success)';
        } else if (balance < 0) {
            currentBalanceDisplay.style.color = 'var(--color-danger)';
        } else {
            currentBalanceDisplay.style.color = 'var(--color-text-dark)';
        }
    }
}

function renderTransactions() {
    if (transactionList) {
        transactionList.innerHTML = '';

        if (transactions.length === 0) {
            if (noTransactionsMessage) {
                noTransactionsMessage.style.display = 'block';
            }
            return;
        } else {
            if (noTransactionsMessage) {
                noTransactionsMessage.style.display = 'none';
            }
        }

        transactions.forEach(trans => {
            const listItem = document.createElement('li');
            listItem.classList.add(trans.type);

            const formattedAmount = `${trans.type === 'expense' ? '-' : ''}${formatCurrency(trans.amount)}`;

            listItem.innerHTML = `
                <div>
                    <span class="transaction-description">${trans.description}</span>
                    <span class="transaction-date">${trans.date}</span>
                </div>
                <span class="transaction-amount">${formattedAmount}</span>
                <button class="delete-btn" data-id="${trans.id}" title="Remover Transação">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0
 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4l.684 10A1.993 1.993 0 0 0 6 16h4a1.993 1.993 0 0 0 1.202-3.118L11.882 4zM2.5 3h11V2h-11z"/>
                    </svg>
                </button>
            `;
            transactionList.appendChild(listItem);
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // Pega o id do atributo 'data-id' do botão
                const idToDelete = button.dataset.id; // Correção: pegar do dataset do button
                deleteTransaction(idToDelete);
            });
        });
    }
}

function getMonthlyData() {
    const monthlyData = {};

    transactions.forEach(trans => {
        const monthYear = trans.monthYear;
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { income: 0, expense: 0 };
        }
        if (trans.type === 'income') {
            monthlyData[monthYear].income += trans.amount;
        } else {
            monthlyData[monthYear].expense += trans.amount;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        return new Date(a) - new Date(b);
    });

    const labels = sortedMonths.map(my => {
        const [year, month] = my.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    });

    const incomeData = sortedMonths.map(my => monthlyData[my].income);
    const expenseData = sortedMonths.map(my => monthlyData[my].expense);

    return { labels, incomeData, expenseData };
}

function updateMonthlyChart() {
    if (monthlyChartCanvas) {
        const { labels, incomeData, expenseData } = getMonthlyData();

        const ctx = monthlyChartCanvas.getContext('2d');

        if (monthlyChart) {
            monthlyChart.destroy();
        }

        monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entradas',
                        data: incomeData,
                        backgroundColor: 'rgba(40, 167, 69, 0.8)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    },
                    {
                        label: 'Saídas',
                        data: expenseData,
                        backgroundColor: 'rgba(220, 53, 69, 0.8)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'var(--color-text-medium)',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                            }
                        },
                        backgroundColor: 'var(--color-text-dark)',
                        titleColor: 'var(--color-white)',
                        bodyColor: 'var(--color-white)',
                        borderColor: 'var(--color-focus)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'var(--color-text-medium)'
                        },
                        grid: {
                            color: 'var(--color-border)'
                        },
                        title: {
                            display: true,
                            text: 'Mês',
                            color: 'var(--color-text-dark)'
                        }
                    },
                    y: {
                        ticks: {
                            color: 'var(--color-text-medium)',
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        },
                        grid: {
                            color: 'var(--color-border)'
                        },
                        title: {
                            display: true,
                            text: 'Valor',
                            color: 'var(--color-text-dark)'
                        }
                    }
                }
            }
        });
    }
}

// --- Funções para Configurações (Agora usando dados do Supabase Auth) ---

async function loadUserSettings() {
    if (userNameInput && currentSupabaseUser) {
        // Usa o username dos metadados do usuário do Supabase Auth
        userNameInput.value = currentSupabaseUser.user_metadata?.username || ''; // Adicionado ?. para segurança
    }
    if (userEmailInput && currentSupabaseUser) {
        userEmailInput.value = currentSupabaseUser.email || '';
    }
}

async function saveUserSettings(e) {
    e.preventDefault();

    if (!currentSupabaseUser) {
        alert('Você precisa estar logado para salvar configurações.');
        return;
    }

    if (userNameInput) {
        const newName = userNameInput.value.trim();
        if (newName) {
            // Atualiza os metadados do usuário no Supabase Auth
            const { data, error } = await supabase.auth.updateUser({
                data: { username: newName }
            });

            if (error) {
                alert(`Erro ao salvar configurações: ${error.message}`);
                console.error('Erro ao atualizar usuário:', error);
            } else {
                currentSupabaseUser = data.user; // Atualiza o objeto de usuário local
                alert('Configurações salvas com sucesso!');
            }
        } else {
            alert('Por favor, digite um nome de usuário.');
        }
    }
}


// --- Lógica de Inicialização Global ---

document.addEventListener('DOMContentLoaded', async () => {
    // Primeiro, verifica se o usuário está autenticado
    await checkAuth();

    // Configura o link ativo na navegação
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.main-nav ul li a').forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Event Listeners para autenticação
    if (registerForm) {
        registerForm.addEventListener('submit', registerUser);
    }
    if (loginForm) {
        loginForm.addEventListener('submit', loginUser);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
    
    // Se o usuário estiver logado e em uma página que exige dados dele, carregue-os e inicialize as funções
    if (currentSupabaseUser) {
        await loadUserTransactions(); // Carrega as transações do usuário logado

        // Inicializa funcionalidades baseadas na página atual
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            updateBalance();
            if (transactionForm) {
                transactionForm.addEventListener('submit', addTransaction);
            }
        } else if (window.location.pathname.endsWith('historico.html')) {
            renderTransactions();
        } else if (window.location.pathname.endsWith('relatorios.html')) {
            updateMonthlyChart();
        } else if (window.location.pathname.endsWith('configuracoes.html')) {
            loadUserSettings();
            if (userSettingsForm) {
                userSettingsForm.addEventListener('submit', saveUserSettings);
            }
        }
    }
});