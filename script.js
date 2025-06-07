document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE CONFIGURATION ---
    const SUPABASE_URL = 'https://pxdjggvgiesoxmevedko.supabase.co';
    // Sua anon public key (obtida do painel do Supabase)
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4ZGpnZ2d2aWVzb3htZXZlZGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNTc5NDEsImV4cCI6MjA2NDgzMzk0MX0.qMcKoeFkHVVIaMAnJQ5gRP9Tyd97fkG_qWsrdD-5MPk'; 

    const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- UTILITIES (Funções Auxiliares) ---
    const Utilities = {
        formatCurrency: (value) => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        },
        displayMessage: (message, type = 'info', duration = 3000) => {
            const messageContainer = document.getElementById('message-container');
            const messageEl = document.createElement('div');
            messageEl.className = `message ${type}`;
            messageEl.textContent = message;
            messageContainer.appendChild(messageEl);

            void messageEl.offsetWidth; 

            setTimeout(() => {
                messageEl.classList.add('hide');
                messageEl.addEventListener('animationend', () => {
                    messageEl.remove();
                }, { once: true });
            }, duration);
        },
        clearValidationErrors: (formId) => {
            document.querySelectorAll(`#${formId} .error-message`).forEach(el => {
                el.textContent = '';
                el.classList.remove('active');
            });
        },
        showValidationError: (elementId, message) => {
            const errorEl = document.getElementById(elementId);
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.classList.add('active');
            }
        },
        chartColors: [
            '#8A2BE2', '#4682B4', '#FFD700', '#DA70D6', '#6B8E23', '#FF6347', '#20B2AA',
            '#FF4500', '#9370DB', '#00CED1', '#FFA07A', '#7CFC00', '#ADD8E6', '#FF69B4'
        ],
        textPrimaryColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
    };

    // --- AUTHENTICATION HANDLER (Gerenciamento de Autenticação) ---
    const AuthHandler = {
        user: null, // Armazena o usuário logado
        authForm: document.getElementById('auth-form'),
        authEmailInput: document.getElementById('auth-email'),
        authPasswordInput: document.getElementById('auth-password'),
        authSubmitBtn: document.getElementById('auth-submit-btn'),
        toggleAuthModeBtn: document.getElementById('toggle-auth-mode'),
        authSection: document.getElementById('auth-section'),
        mainContentArea: document.querySelector('.main-content-area'),
        logoutBtn: document.getElementById('logout-btn'),

        isSignInMode: true, // true para login, false para registro

        init() {
            this.authForm.addEventListener('submit', this.handleAuthSubmit.bind(this));
            this.toggleAuthModeBtn.addEventListener('click', this.toggleAuthMode.bind(this));
            this.logoutBtn.addEventListener('click', () => this.signOut());

            // Escuta por mudanças no estado de autenticação (login, logout)
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN') {
                    this.user = session.user;
                    Utilities.displayMessage(`Bem-vindo, ${this.user.email}!`, 'success');
                    await AppState.init(); // Carrega os dados do usuário logado
                    this.showLoggedInView();
                } else if (event === 'SIGNED_OUT') {
                    this.user = null;
                    Utilities.displayMessage('Você foi desconectado.', 'info');
                    AppState.clearData(); // Limpa dados da interface
                    this.showLoggedOutView();
                }
            });

            // Verifica o estado inicial da sessão
            this.checkUserSession();
        },

        async checkUserSession() {
            Utilities.displayMessage('Verificando sessão...', 'info', 1500);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                this.user = user;
                await AppState.init(); // Garante que os dados são carregados antes de exibir
                this.showLoggedInView();
            } else {
                this.user = null;
                this.showLoggedOutView();
            }
        },

        toggleAuthMode() {
            this.isSignInMode = !this.isSignInMode;
            if (this.isSignInMode) {
                this.authSubmitBtn.textContent = 'Entrar';
                this.toggleAuthModeBtn.textContent = 'Novo aqui? Registre-se';
                this.authCard.querySelector('h2').textContent = 'Bem-vindo de volta!';
                this.authCard.querySelector('p').textContent = 'Faça login para continuar gerenciando suas finanças.';
            } else {
                this.authSubmitBtn.textContent = 'Registrar';
                this.toggleAuthModeBtn.textContent = 'Já tem conta? Faça login';
                this.authCard.querySelector('h2').textContent = 'Crie sua conta!';
                this.authCard.querySelector('p').textContent = 'Registre-se para começar a gerenciar suas finanças.';
            }
            Utilities.clearValidationErrors('auth-form'); // Limpa erros ao trocar de modo
        },

        async handleAuthSubmit(e) {
            e.preventDefault();
            Utilities.clearValidationErrors('auth-form');

            const email = this.authEmailInput.value.trim();
            const password = this.authPasswordInput.value.trim();

            let isValid = true;
            if (!email || !email.includes('@') || !email.includes('.')) {
                Utilities.showValidationError('auth-email-error', 'Por favor, insira um e-mail válido.');
                isValid = false;
            }
            if (password.length < 6) {
                Utilities.showValidationError('auth-password-error', 'A senha deve ter no mínimo 6 caracteres.');
                isValid = false;
            }

            if (!isValid) {
                Utilities.displayMessage('Por favor, corrija os erros no formulário.', 'error');
                return;
            }

            if (this.isSignInMode) {
                await this.signIn(email, password);
            } else {
                await this.signUp(email, password);
            }
        },

        async signIn(email, password) {
            Utilities.displayMessage('Tentando fazer login...', 'info');
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                Utilities.displayMessage(`Erro ao fazer login: ${error.message}`, 'error');
            }
            // onAuthStateChange vai lidar com o sucesso
        },

        async signUp(email, password) {
            Utilities.displayMessage('Tentando registrar...', 'info');
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                Utilities.displayMessage(`Erro ao registrar: ${error.message}`, 'error');
            } else {
                Utilities.displayMessage('Registro bem-sucedido! Por favor, verifique seu e-mail para confirmar a conta.', 'success', 7000);
                this.isSignInMode = true; // Volta para o modo de login
                this.toggleAuthMode(); // Atualiza o texto do botão
            }
            // onAuthStateChange não é acionado por signUp se a confirmação por email for necessária
        },

        async signOut() {
            Utilities.displayMessage('Saindo...', 'info');
            const { error } = await supabase.auth.signOut();
            if (error) {
                Utilities.displayMessage(`Erro ao sair: ${error.message}`, 'error');
            }
            // onAuthStateChange vai lidar com a interface após o logout
        },

        showLoggedInView() {
            this.authSection.style.display = 'none';
            this.mainContentArea.style.display = 'block';
            this.logoutBtn.style.display = 'inline-block'; // Mostra o botão de sair
        },
        
        showLoggedOutView() {
            this.authSection.style.display = 'flex'; // Usar flex para centralizar
            this.mainContentArea.style.display = 'none';
            this.logoutBtn.style.display = 'none'; // Esconde o botão de sair
        }
    };

    // --- STATE MANAGEMENT (Gerenciamento de Estado) ---
    const AppState = {
        transactions: [],
        goals: [],
        investments: [],

        async init() {
            if (!AuthHandler.user) { 
                this.clearData();
                return;
            }
            Utilities.displayMessage('Carregando dados...', 'info');
            // Busca dados do Supabase
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', AuthHandler.user.id);

            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .eq('user_id', AuthHandler.user.id);

            const { data: investmentsData, error: investmentsError } = await supabase
                .from('investments')
                .select('*')
                .eq('user_id', AuthHandler.user.id);

            if (transactionsError || goalsError || investmentsError) {
                Utilities.displayMessage('Erro ao carregar dados do usuário: ' + (transactionsError?.message || goalsError?.message || investmentsError?.message), 'error');
                this.clearData();
                return;
            }

            // Garante que os dados do Supabase são transformados para a estrutura esperada pelo frontend
            this.transactions = transactionsData ? transactionsData.map(t => ({
                id: t.id,
                description: t.description,
                amount: parseFloat(t.amount), // Garante que é número
                category: t.category,
                date: t.created_at // Usar created_at do Supabase
            })) : [];
            this.goals = goalsData ? goalsData.map(g => ({
                id: g.id,
                description: g.description,
                targetAmount: parseFloat(g.targetAmount),
                savedAmount: parseFloat(g.savedAmount)
            })) : [];
            this.investments = investmentsData ? investmentsData.map(i => ({
                id: i.id,
                name: i.name,
                initialAmount: parseFloat(i.initialAmount),
                currentValue: parseFloat(i.currentValue),
                type: i.type,
                dateAdded: i.created_at // Usar created_at do Supabase
            })) : [];

            this.renderAll();
            Utilities.displayMessage('Dados carregados com sucesso!', 'success');
        },

        clearData() { 
            this.transactions = [];
            this.goals = [];
            this.investments = [];
            this.renderAll(); 
        },

        async saveTransactions() { /* A inserção/deleção no Supabase já é o "salvar" */ Utilities.displayMessage('Transações atualizadas!', 'success', 1500); },
        async saveGoals() { /* A inserção/deleção no Supabase já é o "salvar" */ Utilities.displayMessage('Metas atualizadas!', 'success', 1500); },
        async saveInvestments() { /* A inserção/deleção no Supabase já é o "salvar" */ Utilities.displayMessage('Investimentos atualizados!', 'success', 1500); },

        async addTransaction(description, amount, type, category) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para adicionar transações.', 'error'); return; }
            const transaction = {
                user_id: AuthHandler.user.id, 
                description,
                amount: type === 'despesa' ? -parseFloat(amount) : parseFloat(amount),
                category: type === 'despesa' ? category : null,
                // created_at é gerado automaticamente pelo Supabase com now()
            };

            const { data, error } = await supabase
                .from('transactions')
                .insert([transaction])
                .select(); 

            if (error) {
                Utilities.displayMessage(`Erro ao adicionar transação: ${error.message}`, 'error');
                return;
            }
            // Adiciona o item retornado pelo Supabase (com o ID e created_at gerados)
            this.transactions.push({ 
                id: data[0].id,
                description: data[0].description,
                amount: parseFloat(data[0].amount), // Garante que é número
                category: data[0].category,
                date: data[0].created_at // Usar created_at
            });
            this.transactions.sort((a,b) => new Date(b.date) - new Date(a.date)); // Ordena pela data de criação
            this.renderAll(); 
            Utilities.displayMessage('Transação adicionada com sucesso!', 'success');
        },

        async deleteTransaction(id) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para excluir transações.', 'error'); return; }
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id)
                .eq('user_id', AuthHandler.user.id); 

            if (error) {
                Utilities.displayMessage(`Erro ao excluir transação: ${error.message}`, 'error');
                return;
            }
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.renderAll(); 
            Utilities.displayMessage('Transação excluída!', 'info');
        },

        async addGoal(description, targetAmount) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para adicionar metas.', 'error'); return; }
            const goal = {
                user_id: AuthHandler.user.id, 
                description,
                targetAmount: parseFloat(targetAmount),
                savedAmount: 0
            };

            const { data, error } = await supabase
                .from('goals')
                .insert([goal])
                .select();

            if (error) {
                Utilities.displayMessage(`Erro ao adicionar meta: ${error.message}`, 'error');
                return;
            }
            this.goals.push({
                id: data[0].id,
                description: data[0].description,
                targetAmount: parseFloat(data[0].targetAmount),
                savedAmount: parseFloat(data[0].savedAmount)
            });
            this.renderAll();
            Utilities.displayMessage('Meta criada com sucesso!', 'success');
        },

        async deleteGoal(id) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para excluir metas.', 'error'); return; }
            const { error } = await supabase
                .from('goals')
                .delete()
                .eq('id', id)
                .eq('user_id', AuthHandler.user.id);

            if (error) {
                Utilities.displayMessage(`Erro ao excluir meta: ${error.message}`, 'error');
                return;
            }
            this.goals = this.goals.filter(g => g.id !== id);
            this.renderAll();
            Utilities.displayMessage('Meta excluída!', 'info');
        },

        async depositIntoGoal(goalId, amount) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para depositar em metas.', 'error'); return; }
            const goal = this.goals.find(g => g.id === goalId);
            if (goal) {
                const newSavedAmount = goal.savedAmount + amount;
                const { data, error } = await supabase
                    .from('goals')
                    .update({ savedAmount: newSavedAmount })
                    .eq('id', goalId)
                    .eq('user_id', AuthHandler.user.id)
                    .select();

                if (error) {
                    Utilities.displayMessage(`Erro ao depositar na meta: ${error.message}`, 'error');
                    return;
                }
                // Atualiza o objeto goal localmente com os dados retornados pelo Supabase
                const updatedGoal = data[0];
                const index = this.goals.findIndex(g => g.id === goalId);
                if (index !== -1) {
                    this.goals[index] = {
                        id: updatedGoal.id,
                        description: updatedGoal.description,
                        targetAmount: parseFloat(updatedGoal.targetAmount),
                        savedAmount: parseFloat(updatedGoal.savedAmount)
                    };
                }
                this.addTransaction(`Depósito para meta: ${goal.description}`, amount, 'despesa', 'Metas');
                // renderAll() já é chamado em addTransaction
                Utilities.displayMessage(`R$ ${amount.toFixed(2).replace('.', ',')} depositados na meta "${goal.description}"`, 'success');
            } else {
                Utilities.displayMessage('Meta não encontrada.', 'error');
            }
        },

        async addInvestment(name, initialAmount, currentAmount, type) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para adicionar investimentos.', 'error'); return; }
            const investment = {
                user_id: AuthHandler.user.id, 
                name,
                initialAmount: parseFloat(initialAmount),
                currentValue: currentAmount ? parseFloat(currentAmount) : parseFloat(initialAmount),
                type,
            };

            const { data, error } = await supabase
                .from('investments')
                .insert([investment])
                .select();

            if (error) {
                Utilities.displayMessage(`Erro ao adicionar investimento: ${error.message}`, 'error');
                return;
            }
            this.investments.push({
                id: data[0].id,
                name: data[0].name,
                initialAmount: parseFloat(data[0].initialAmount),
                currentValue: parseFloat(data[0].currentValue),
                type: data[0].type,
                dateAdded: data[0].created_at // Usar created_at
            });
            this.addTransaction(`Investimento: ${name}`, investment.initialAmount, 'despesa', 'Investimentos');
            this.renderAll(); 
            Utilities.displayMessage('Investimento adicionado com sucesso!', 'success');
        },

        async deleteInvestment(id) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para excluir investimentos.', 'error'); return; }
            const { error } = await supabase
                .from('investments')
                .delete()
                .eq('id', id)
                .eq('user_id', AuthHandler.user.id);

            if (error) {
                Utilities.displayMessage(`Erro ao excluir investimento: ${error.message}`, 'error');
                return;
            }
            this.investments = this.investments.filter(inv => inv.id !== id);
            this.renderAll(); 
            Utilities.displayMessage('Investimento excluído!', 'info');
        },

        async updateInvestmentValue(id, newCurrentValue) {
            if (!AuthHandler.user) { Utilities.displayMessage('Você precisa estar logado para atualizar investimentos.', 'error'); return; }
            const { data, error } = await supabase
                .from('investments')
                .update({ currentValue: newCurrentValue })
                .eq('id', id)
                .eq('user_id', AuthHandler.user.id)
                .select();

            if (error) {
                Utilities.displayMessage(`Erro ao atualizar investimento: ${error.message}`, 'error');
                return;
            }
            const updatedInvestment = data[0];
            const index = this.investments.findIndex(inv => inv.id === id);
            if (index !== -1) {
                this.investments[index] = {
                    id: updatedInvestment.id,
                    name: updatedInvestment.name,
                    initialAmount: parseFloat(updatedInvestment.initialAmount),
                    currentValue: parseFloat(updatedInvestment.currentValue),
                    type: updatedInvestment.type,
                    dateAdded: updatedInvestment.created_at
                };
            }
            this.renderAll();
            Utilities.displayMessage(`Valor de investimento atualizado para ${Utilities.formatCurrency(newCurrentValue)}`, 'success');
        },

        // --- RENDERING FUNCTIONS (Desenhar na tela) ---
        renderBalance() {
            const total = this.transactions.reduce((acc, t) => acc + t.amount, 0);
            document.getElementById('balance').textContent = Utilities.formatCurrency(total);
        },

        renderTransactions() {
            const transactionListEl = document.getElementById('transaction-list');
            transactionListEl.innerHTML = '';
            // Ordena pela data de criação (created_at do Supabase)
            const recentTransactions = [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5); 

            if (recentTransactions.length === 0) {
                transactionListEl.innerHTML = '<li class="empty-list-message">Nenhuma transação recente.</li>';
                return;
            }

            recentTransactions.forEach(t => {
                const type = t.amount > 0 ? 'receita' : 'despesa';
                const sign = t.amount > 0 ? '+' : '';
                const item = document.createElement('li');
                item.dataset.id = t.id;
                item.innerHTML = `
                    <div class="transaction-item">
                        <div class="info-description">${t.description}</div>
                        <div class="info-subtext">${t.category || ''}</div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="transaction-amount ${type}">${sign} ${Utilities.formatCurrency(Math.abs(t.amount))}</span>
                        <button class="delete-btn" data-type="transaction" aria-label="Excluir Transação">&times;</button>
                    </div>
                `;
                transactionListEl.appendChild(item);
            });
        },

        renderGoals() {
            const goalListEl = document.getElementById('goal-list');
            goalListEl.innerHTML = '';
            if (this.goals.length === 0) {
                goalListEl.innerHTML = '<div class="empty-list-message">Crie sua primeira meta clicando em "Nova Meta".</div>';
                return;
            }
            this.goals.forEach(g => {
                const percentage = (g.savedAmount / g.targetAmount) * 100;
                const item = document.createElement('div');
                item.className = 'goal-item';
                item.dataset.id = g.id;
                item.innerHTML = `
                    <div class="goal-info">
                        <span class="info-description">${g.description}</span>
                        <span class="info-subtext">${Utilities.formatCurrency(g.savedAmount)} / ${Utilities.formatCurrency(g.targetAmount)}</span>
                    </div>
                    <div class="goal-actions">
                        <button class="btn-small" data-action="add-money">Depositar</button>
                        <button class="btn-small" data-action="delete-goal">Excluir</button>
                    </div>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percentage > 100 ? 100 : percentage}%;"></div>
                    </div>
                `;
                goalListEl.appendChild(item);
            });
        },
        
        renderInvestments() {
            const totalInvestedEl = document.getElementById('total-invested');
            const investmentListEl = document.getElementById('investment-list');
            const investmentPerformanceListEl = document.getElementById('investment-performance-list');

            let totalInitialValue = 0; // Soma dos initialAmount
            let totalCurrentValue = 0; // Soma dos currentValue

            investmentListEl.innerHTML = '';
            investmentPerformanceListEl.innerHTML = '';

            if (this.investments.length === 0) {
                investmentListEl.innerHTML = '<li class="empty-list-message">Nenhum investimento adicionado.</li>';
                investmentPerformanceListEl.innerHTML = '<div class="empty-list-message">Nenhum dado de performance ainda.</div>';
                totalInvestedEl.textContent = Utilities.formatCurrency(0);
                return;
            }

            this.investments.forEach(inv => {
                totalInitialValue += inv.initialAmount;
                totalCurrentValue += inv.currentValue;

                const profitLoss = inv.currentValue - inv.initialAmount;
                const percentageChange = (inv.initialAmount === 0 || isNaN(inv.initialAmount)) ? 0 : (profitLoss / inv.initialAmount) * 100;
                
                let performanceClass = 'performance-neutral';
                let performanceSign = '';
                if (profitLoss > 0) {
                    performanceClass = 'performance-positive';
                    performanceSign = '+';
                } else if (profitLoss < 0) {
                    performanceClass = 'performance-negative';
                }

                const item = document.createElement('li');
                item.className = 'investment-item';
                item.dataset.id = inv.id;
                item.innerHTML = `
                    <div class="investment-info">
                        <span class="info-description">${inv.name}</span>
                        <span class="info-subtext">${inv.type}</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="investment-value">${Utilities.formatCurrency(inv.currentValue)}</span>
                        <span class="performance-indicator ${performanceClass}">
                            (${performanceSign}${Utilities.formatCurrency(Math.abs(profitLoss))} / ${performanceSign}${percentageChange.toFixed(2)}%)
                        </span>
                        <button class="delete-btn" data-type="investment" aria-label="Excluir Investimento">&times;</button>
                    </div>
                    <div class="investment-actions">
                        <button class="btn-small" data-action="update-investment-value">Atualizar Valor</button>
                    </div>
                `;
                investmentListEl.appendChild(item);
            });

            totalInvestedEl.textContent = Utilities.formatCurrency(totalCurrentValue); // Exibe o valor atual total

            const performanceByType = this.investments.reduce((acc, inv) => {
                acc[inv.type] = (acc[inv.type] || { initial: 0, current: 0 });
                acc[inv.type].initial += inv.initialAmount;
                acc[inv.type].current += inv.currentValue;
                return acc;
            }, {});

            Object.entries(performanceByType).forEach(([type, data]) => {
                const profitLoss = data.current - data.initial;
                const percentageChange = (data.initial === 0 || isNaN(data.initial)) ? 0 : (profitLoss / data.initial) * 100;
                
                let performanceClass = 'performance-neutral';
                let performanceSign = '';
                if (profitLoss > 0) {
                    performanceClass = 'performance-positive';
                    performanceSign = '+';
                } else if (profitLoss < 0) {
                    performanceClass = 'performance-negative';
                }

                const reportItem = document.createElement('div');
                reportItem.className = 'report-item'; 
                reportItem.innerHTML = `
                    <div class="report-info">
                        <span class="info-description">${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}</span>
                        <span class="info-subtext">Valor Atual: ${Utilities.formatCurrency(data.current)}</span>
                    </div>
                    <div class="investment-performance-summary">
                        <span class="${performanceClass}">${performanceSign}${percentageChange.toFixed(2)}%</span>
                        <span class="${performanceClass}">(${Utilities.formatCurrency(Math.abs(profitLoss))})</span>
                    </div>
                `;
                investmentPerformanceListEl.appendChild(reportItem);
            });
        },
        
        renderAll() {
            this.renderBalance();
            this.renderTransactions();
            this.renderGoals();
            ChartRenderer.renderExpensesPieChart(this.transactions);
            this.renderInvestments();
        }
    };

    // --- CHART RENDERING (Renderização de Gráficos) ---
    const ChartRenderer = {
        expensesPieChart: null, 

        init() { },

        renderExpensesPieChart(transactions) {
            const ctx = document.getElementById('expenses-pie-chart');
            const messageEl = document.getElementById('expenses-pie-chart-message');

            const now = new Date();
            const currentMonthExpenses = transactions.filter(t => {
                const tDate = new Date(t.date); 
                return t.amount < 0 && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            });

            const expensesByCategory = currentMonthExpenses.reduce((acc, t) => {
                const category = t.category || 'Outros'; 
                acc[category] = (acc[category] || 0) + Math.abs(t.amount);
                return acc;
            }, {});

            const labels = Object.keys(expensesByCategory);
            const data = Object.values(expensesByCategory);

            if (data.length === 0) {
                if (this.expensesPieChart) {
                    this.expensesPieChart.destroy(); 
                    this.expensesPieChart = null;
                }
                messageEl.style.display = 'block'; 
                ctx.dataset.chartEmpty = 'true'; 
                return;
            } else {
                messageEl.style.display = 'none'; 
                ctx.dataset.chartEmpty = 'false';
            }

            if (this.expensesPieChart) {
                this.expensesPieChart.data.labels = labels;
                this.expensesPieChart.data.datasets[0].data = data;
                this.expensesPieChart.data.datasets[0].backgroundColor = Utilities.chartColors.slice(0, labels.length);
                this.expensesPieChart.update();
            } else {
                this.expensesPieChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: Utilities.chartColors.slice(0, labels.length),
                            hoverOffset: 10,
                            borderColor: 'rgba(255, 255, 255, 0.1)', 
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right', 
                                labels: {
                                    color: Utilities.textPrimaryColor, // Usar cor definida em Utilities
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed !== null) {
                                            label += Utilities.formatCurrency(context.parsed);
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        },
    };

    // --- NAVIGATION CONTROL (Controle de Navegação) ---
    const NavigationController = {
        navLinks: document.querySelectorAll('.nav-link'),
        sections: {
            dashboard: document.getElementById('dashboard-section'),
            investments: document.getElementById('investments-section')
        },
        init() {
            this.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetSection = e.target.dataset.section;
                    this.showSection(targetSection);
                });
            });
        },
        showSection(sectionId) {
            Object.keys(this.sections).forEach(id => {
                const section = this.sections[id];
                const navLink = document.querySelector(`.nav-link[data-section="${id}"]`);

                if (id === sectionId) {
                    section.classList.remove('hidden-section');
                    section.classList.add('active-section');
                    navLink.classList.add('active');
                    AppState.renderAll(); 
                } else {
                    section.classList.remove('active-section');
                    section.classList.add('hidden-section');
                    navLink.classList.remove('active');
                }
            });
        }
    };

    // --- MODAL CONTROL (Controle de Modais) ---
    const ModalController = {
        modals: {
            transaction: document.getElementById('transaction-modal-overlay'),
            goal: document.getElementById('goal-modal-overlay'),
            investment: document.getElementById('investment-modal-overlay')
        },

        init() {
            document.getElementById('open-transaction-modal-btn').addEventListener('click', () => this.openModal('transaction'));
            document.getElementById('open-goal-modal-btn').addEventListener('click', () => this.openModal('goal'));
            document.getElementById('open-investment-modal-btn').addEventListener('click', () => this.openModal('investment'));

            document.querySelectorAll('.close-modal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modalType = e.target.dataset.modal;
                    this.closeModal(modalType);
                });
            });

            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        const modalType = overlay.id.replace('-modal-overlay', '');
                        this.closeModal(modalType);
                    }
                });
            });
        },

        openModal(type) {
            const modal = this.modals[type];
            if (modal) {
                modal.classList.add('active');
                Utilities.clearValidationErrors(`${type}-form`); 
            }
        },

        closeModal(type) {
            const modal = this.modals[type];
            if (modal) {
                modal.classList.remove('active');
                if (type === 'transaction') document.getElementById('transaction-form').reset();
                if (type === 'goal') document.getElementById('goal-form').reset();
                if (type === 'investment') document.getElementById('investment-form').reset();
                Utilities.clearValidationErrors(`${type}-form`);
            }
        }
    };

    // --- FORM SUBMISSION HANDLERS (Lógica de Formulários) ---
    const FormHandler = {
        transactionForm: document.getElementById('transaction-form'),
        goalForm: document.getElementById('goal-form'),
        investmentForm: document.getElementById('investment-form'), 
        tTypeSelect: document.getElementById('t-type'),
        tCategoryGroup: document.getElementById('t-category-group'),

        init() {
            this.transactionForm.addEventListener('submit', this.handleTransactionSubmit.bind(this));
            this.goalForm.addEventListener('submit', this.handleGoalSubmit.bind(this));
            this.investmentForm.addEventListener('submit', this.handleInvestmentSubmit.bind(this)); 
            this.tTypeSelect.addEventListener('change', this.toggleCategoryVisibility.bind(this));
            this.toggleCategoryVisibility(); 
        },

        toggleCategoryVisibility() {
            if (this.tTypeSelect.value === 'despesa') {
                this.tCategoryGroup.style.display = 'block';
            } else {
                this.tCategoryGroup.style.display = 'none';
            }
        },

        handleTransactionSubmit(e) {
            e.preventDefault();
            Utilities.clearValidationErrors('transaction-form');

            const description = document.getElementById('t-description').value.trim();
            const amountStr = document.getElementById('t-amount').value.trim();
            const type = document.getElementById('t-type').value;
            const category = document.getElementById('t-category').value;

            let isValid = true;

            if (description.length < 3) {
                Utilities.showValidationError('t-description-error', 'A descrição deve ter pelo menos 3 caracteres.');
                isValid = false;
            }
            if (!amountStr || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) {
                Utilities.showValidationError('t-amount-error', 'Por favor, insira um valor válido e positivo.');
                isValid = false;
            }

            if (isValid) {
                AppState.addTransaction(description, amountStr, type, category);
                ModalController.closeModal('transaction');
            } else {
                Utilities.displayMessage('Por favor, corrija os erros do formulário.', 'error');
            }
        },
        
        handleGoalSubmit(e) {
            e.preventDefault();
            Utilities.clearValidationErrors('goal-form');

            const description = document.getElementById('g-description').value.trim();
            const targetAmountStr = document.getElementById('g-target-amount').value.trim();

            let isValid = true;

            if (description.length < 3) {
                Utilities.showValidationError('g-description-error', 'O nome da meta deve ter pelo menos 3 caracteres.');
                isValid = false;
            }
            if (!targetAmountStr || isNaN(parseFloat(targetAmountStr)) || parseFloat(targetAmountStr) <= 0) {
                Utilities.showValidationError('g-target-amount-error', 'Por favor, insira um valor válido e positivo para a meta.');
                isValid = false;
            }

            if (isValid) {
                AppState.addGoal(description, targetAmountStr);
                ModalController.closeModal('goal');
            } else {
                Utilities.displayMessage('Por favor, corrija os erros do formulário.', 'error');
            }
        },

        handleInvestmentSubmit(e) { 
            e.preventDefault();
            Utilities.clearValidationErrors('investment-form');

            const name = document.getElementById('inv-name').value.trim();
            const initialAmountStr = document.getElementById('inv-initial-amount').value.trim();
            const currentAmountStr = document.getElementById('inv-current-value').value.trim();
            const type = document.getElementById('inv-type').value;

            let isValid = true;

            if (name.length < 3) {
                Utilities.showValidationError('inv-name-error', 'O nome do investimento deve ter pelo menos 3 caracteres.');
                isValid = false;
            }
            if (!initialAmountStr || isNaN(parseFloat(initialAmountStr)) || parseFloat(initialAmountStr) <= 0) {
                Utilities.showValidationError('inv-initial-amount-error', 'Por favor, insira um valor inicial válido e positivo.');
                isValid = false;
            }
            if (currentAmountStr && (isNaN(parseFloat(currentAmountStr)) || parseFloat(currentAmountStr) < 0)) {
                Utilities.showValidationError('inv-current-value-error', 'Por favor, insira um valor atual válido e não negativo.');
                isValid = false;
            }

            if (isValid) {
                AppState.addInvestment(name, initialAmountStr, currentAmountStr || null, type);
                ModalController.closeModal('investment');
            } else {
                Utilities.displayMessage('Por favor, corrija os erros do formulário de investimento.', 'error');
            }
        }
    };

    // --- GLOBAL EVENT LISTENER (Delegação de Eventos) ---
    const GlobalEvents = {
        init() {
            document.body.addEventListener('click', this.handleGlobalClick.bind(this));
        },

        async handleGlobalClick(e) { // Tornar async para await updateInvestmentValue
            const target = e.target;
            const parentLi = target.closest('li');
            const parentGoal = target.closest('.goal-item');
            const parentInvestment = target.closest('.investment-item');

            // Deletar transação
            if (target.matches('.delete-btn[data-type="transaction"]') && parentLi) {
                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                    const id = parseInt(parentLi.dataset.id, 10);
                    await AppState.deleteTransaction(id); // await a operação Supabase
                }
            }
            
            // Deletar meta
            if (target.matches('button[data-action="delete-goal"]') && parentGoal) {
                if (confirm('Tem certeza que deseja excluir esta meta?')) {
                    const id = parseInt(parentGoal.dataset.id, 10);
                    await AppState.deleteGoal(id); // await
                }
            }

            // Deletar investimento
            if (target.matches('.delete-btn[data-type="investment"]') && parentInvestment) {
                if (confirm('Tem certeza que deseja excluir este investimento? Esta ação é irreversível.')) {
                    const id = parseInt(parentInvestment.dataset.id, 10);
                    await AppState.deleteInvestment(id); // await
                }
            }
            
            // Depositar dinheiro na meta
            if (target.matches('button[data-action="add-money"]') && parentGoal) {
                const id = parseInt(parentGoal.dataset.id, 10);
                const goal = AppState.goals.find(g => g.id === id);

                if (goal) {
                    let amountStr = prompt(`Quanto você deseja depositar na meta "${goal.description}"? (Valor máximo restante: ${Utilities.formatCurrency(goal.targetAmount - goal.savedAmount)})`);
                    amountStr = amountStr ? amountStr.replace(',', '.') : ''; 

                    const amount = parseFloat(amountStr);

                    if (isNaN(amount) || amount <= 0) {
                        Utilities.displayMessage('Por favor, insira um valor numérico positivo.', 'error');
                        return;
                    }

                    if (goal.savedAmount + amount > goal.targetAmount) {
                        Utilities.displayMessage(`Você não pode depositar mais do que o valor restante para esta meta. Restante: ${Utilities.formatCurrency(goal.targetAmount - goal.savedAmount)}`, 'error', 5000);
                        return;
                    }
                    
                    await AppState.depositIntoGoal(id, amount); // await
                } else {
                    Utilities.displayMessage('Erro: Meta não encontrada para depósito.', 'error');
                }
            }

            // Atualizar valor do investimento
            if (target.matches('button[data-action="update-investment-value"]') && parentInvestment) {
                const id = parseInt(parentInvestment.dataset.id, 10);
                const investment = AppState.investments.find(inv => inv.id === id);

                if (investment) {
                    let newCurrentValueStr = prompt(`Qual o novo valor atual para "${investment.name}"? (Valor atual: ${Utilities.formatCurrency(investment.currentValue)})`);
                    newCurrentValueStr = newCurrentValueStr ? newCurrentValueStr.replace(',', '.') : '';

                    const newCurrentValue = parseFloat(newCurrentValueStr);

                    if (isNaN(newCurrentValue) || newCurrentValue < 0) {
                        Utilities.displayMessage('Por favor, insira um valor numérico válido e não negativo.', 'error');
                        return;
                    }

                    await AppState.updateInvestmentValue(id, newCurrentValue); // await
                    Utilities.displayMessage(`Valor de "${investment.name}" atualizado para ${Utilities.formatCurrency(newCurrentValue)}`, 'success');
                } else {
                    Utilities.displayMessage('Erro: Investimento não encontrado para atualização.', 'error');
                }
            }
        }
    };

    // --- INITIALIZATION (Inicialização da Aplicação) ---
    const initializeApp = () => {
        AuthHandler.init(); // Inicializa o controle de autenticação primeiro
        // AppState.init() é chamado pelo AuthHandler.checkUserSession ou onAuthStateChange
        NavigationController.init(); 
        ModalController.init(); 
        FormHandler.init(); 
        GlobalEvents.init(); 
    };

    initializeApp();
});