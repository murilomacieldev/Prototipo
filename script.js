class ObjectiveManager {
    constructor() {
        this.objectives = [];
        this.completedObjectives = [];
        this.editingId = null;
        this.activeTimers = {};
        this.points = 0;
        this.level = 1;
        this.achievements = [];
        this.deletedObjectives = [];
        // Pontos necessários para cada nível
        this.levelThresholds = {
            1: 0,
            2: 100,
            3: 200,
            4: 300,
            5: 700,
            6: 900,
            7: 1000,
            8: 1500,
            9: 2000,
            10: 2500
        };
        
        // Definição das conquistas
        this.achievementDefinitions = [
            { id: 'first_objective', title: 'Primeiro Passo', description: 'Complete seu primeiro objetivo', condition: () => this.completedObjectives.length >= 1, unlocked: false },
            { id: 'five_objectives', title: 'Produtividade Inicial', description: 'Complete 5 objetivos', condition: () => this.completedObjectives.length >= 5, unlocked: false },
            { id: 'ten_objectives', title: 'Consistência', description: 'Complete 10 objetivos', condition: () => this.completedObjectives.length >= 10, unlocked: false },
            { id: 'high_priority', title: 'Prioridades em Ordem', description: 'Complete 3 objetivos de alta prioridade', condition: () => this.completedObjectives.filter(obj => obj.priority === 'high').length >= 3, unlocked: false },
            { id: 'level_up', title: 'Evolução', description: 'Alcance o nível 2', condition: () => this.level >= 2, unlocked: false },
            { id: 'level_5', title: 'Mestre da Produtividade', description: 'Alcance o nível 5', condition: () => this.level >= 5, unlocked: false }
        ];
        
        this.loadFromLocalStorage();
        this.initEventListeners();
        this.updateUI();
        this.checkAchievements();
    }
    
    // Inicializa os event listeners
    initEventListeners() {
        // Botão para adicionar objetivo
        document.getElementById('add-objective-btn').addEventListener('click', () => this.openModal());
        
        // Formulário de objetivo
        document.getElementById('objective-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveObjective();
        });
        
        // Fechar modal
        document.querySelectorAll('.close, .cancel-btn').forEach(element => {
            element.addEventListener('click', () => {
                document.getElementById('objective-modal').style.display = 'none';
                document.getElementById('help-modal').style.display = 'none';
                document.getElementById('achievement-modal').style.display = 'none';
                document.getElementById('import-modal').style.display = 'none';
                document.getElementById('reset-confirm-modal').style.display = 'none';
            });
        });
        
        // Botão de ajuda
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'block';
        });
        
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            });
        });
        
        // Filtro de prioridade - Corrigido
        const filterPriority = document.getElementById('filter-priority');
        if (filterPriority) {
            filterPriority.addEventListener('change', () => {
                console.log('Filtro alterado para:', filterPriority.value);
                this.updateUI();
            });
        }
        
        // Ordenação - Corrigido
        const sortBy = document.getElementById('sort-by');
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                console.log('Ordenação alterada para:', sortBy.value);
                this.updateUI();
            });
        }
        
        // Opções de dados
        document.getElementById('save-data').addEventListener('click', () => this.exportData());
        document.getElementById('import-data').addEventListener('click', () => {
            document.getElementById('import-modal').style.display = 'block';
        });
        document.getElementById('reset-data').addEventListener('click', () => {
            document.getElementById('reset-confirm-modal').style.display = 'block';
        });
        
        // Confirmar importação
        document.getElementById('import-confirm-btn').addEventListener('click', () => this.importData());
        
        // Confirmar reset
        document.getElementById('reset-confirm-btn').addEventListener('click', () => this.resetData());
        
        // Adicionar evento para alternar campos baseado no tipo de cronômetro
        const timerTypeSelect = document.getElementById('objective-timer-type');
        if (timerTypeSelect) {
            timerTypeSelect.addEventListener('change', () => this.toggleTimerFields());
            
            // Chamar imediatamente para configurar os campos corretamente ao abrir o modal
            setTimeout(() => this.toggleTimerFields(), 0);
        }
        
        // Inicializa o toggle de tema
        this.initThemeToggle();
    }
    
    // Inicializa o toggle de tema
    initThemeToggle() {
        // Verifica se há uma preferência salva
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme);
        } else {
            // Usa a preferência do sistema como padrão
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const defaultTheme = prefersDark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', defaultTheme);
            this.updateThemeIcon(defaultTheme);
        }
        
        // Adiciona o event listener para o botão de tema
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                this.updateThemeIcon(newTheme);
            });
        }
    }
    
    // Atualiza o ícone do tema
    updateThemeIcon(theme) {
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            if (theme === 'dark') {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            } else {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
        }
    }
    
    // Alterna a visibilidade dos campos baseado no tipo de cronômetro
    toggleTimerFields() {
        const timerType = document.getElementById('objective-timer-type').value;
        const deadlineField = document.getElementById('objective-deadline').closest('.form-group');
        const estimatedTimeField = document.getElementById('objective-estimated-time').closest('.form-group');
        
        if (timerType === 'progressive') {
            // Para cronômetro progressivo, esconde prazo e mostra tempo estimado
            deadlineField.style.display = 'none';
            estimatedTimeField.style.display = 'block';
        } else if (timerType === 'countdown') {
            // Para cronômetro regressivo, mostra prazo e esconde tempo estimado
            deadlineField.style.display = 'block';
            estimatedTimeField.style.display = 'none';
        }
    }
    
    // Abre o modal para adicionar/editar objetivo
    openModal(id = null) {
        const modal = document.getElementById('objective-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('objective-form');
        
        // Limpa o formulário
        form.reset();
        
        if (id) {
            // Modo de edição
            const objective = this.objectives.find(obj => obj.id === id);
            if (!objective) return;
            
            modalTitle.textContent = 'Editar Objetivo';
            document.getElementById('edit-id').value = id;
            document.getElementById('objective-title').value = objective.title;
            document.getElementById('objective-description').value = objective.description || '';
            
            if (objective.deadline) {
                const deadlineDate = new Date(objective.deadline);
                const formattedDate = this.formatDateForInput(deadlineDate);
                document.getElementById('objective-deadline').value = formattedDate;
            } else {
                document.getElementById('objective-deadline').value = '';
            }
            
            document.getElementById('objective-priority').value = objective.priority;
            document.getElementById('objective-estimated-time').value = objective.estimatedTime || 30;
            document.getElementById('objective-timer-type').value = objective.timerType || 'progressive';
            
            this.editingId = id;
        } else {
            // Modo de adição
            modalTitle.textContent = 'Adicionar Novo Objetivo';
            document.getElementById('edit-id').value = '';
            this.editingId = null;
        }
        
        // Configura a visibilidade dos campos baseado no tipo de cronômetro
        setTimeout(() => this.toggleTimerFields(), 0);
        
        // Adiciona validação para limitar o ano a 4 dígitos
        const deadlineInput = document.getElementById('objective-deadline');
        deadlineInput.addEventListener('input', function() {
            const dateValue = this.value;
            if (dateValue) {
                // Extrai o ano da data
                const yearMatch = dateValue.match(/^(\d{4,})-/);
                if (yearMatch && yearMatch[1].length > 4) {
                    // Se o ano tiver mais de 4 dígitos, corta para 4
                    const correctedYear = yearMatch[1].substring(0, 4);
                    this.value = dateValue.replace(/^(\d{4,})/, correctedYear);
                }
            }
        });
        
        modal.style.display = 'block';
    }
    
    // Formata a data para o input datetime-local
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Salva um objetivo (novo ou editado)
    saveObjective() {
        const titleInput = document.getElementById('objective-title');
        const descriptionInput = document.getElementById('objective-description');
        const deadlineInput = document.getElementById('objective-deadline');
        const priorityInput = document.getElementById('objective-priority');
        const estimatedTimeInput = document.getElementById('objective-estimated-time');
        const timerTypeInput = document.getElementById('objective-timer-type');
        
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const timerType = timerTypeInput.value;
        const priority = priorityInput.value;
        
        // Validação para o ano no campo de prazo
        let deadline = null;
        if (timerType === 'countdown' && deadlineInput.value) {
            const dateValue = deadlineInput.value;
            const yearMatch = dateValue.match(/^(\d{4,})-/);
            if (yearMatch && yearMatch[1].length > 4) {
                alert('O ano deve ter no máximo 4 dígitos.');
                return;
            }
            deadline = new Date(dateValue).getTime();
        }
        
        const estimatedTime = (timerType === 'progressive') 
            ? parseInt(estimatedTimeInput.value) || 30 
            : 0;
        
        if (!title) {
            alert('Por favor, insira um título para o objetivo.');
            return;
        }
        
        // Validação específica para cronômetro regressivo
        if (timerType === 'countdown' && !deadline) {
            alert('Para cronômetro regressivo, é necessário definir um prazo.');
            return;
        }
        
        if (this.editingId) {
            // Atualiza um objetivo existente
            const index = this.objectives.findIndex(obj => obj.id === this.editingId);
            if (index !== -1) {
                const objective = this.objectives[index];
                objective.title = title;
                objective.description = description;
                objective.deadline = deadline;
                objective.priority = priority;
                objective.estimatedTime = estimatedTime;
                objective.timerType = timerType;
                objective.updatedAt = Date.now();
            }
        } else {
            // Cria um novo objetivo
            const newObjective = {
                id: Date.now().toString(),
                title,
                description,
                deadline,
                priority,
                estimatedTime,
                timerType,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                completed: false,
                timeSpent: 0,
                timerRunning: false
            };
            
            this.objectives.push(newObjective);
        }
        
        this.saveToLocalStorage();
        this.updateUI();
        
        // Fecha o modal
        document.getElementById('objective-modal').style.display = 'none';
    }
    
    // Exclui um objetivo
    deleteObjective(id) {
        if (confirm('Tem certeza que deseja excluir este objetivo?')) {
            // Para o timer se estiver rodando
            if (this.activeTimers[id]) {
                clearInterval(this.activeTimers[id]);
                delete this.activeTimers[id];
            }
            
            const index = this.objectives.findIndex(obj => obj.id === id);
            if (index !== -1) {
                const objective = this.objectives[index];
                objective.deletedAt = Date.now();
                this.deletedObjectives.push(objective);
                this.objectives.splice(index, 1);
                
                this.saveToLocalStorage();
                this.updateUI();
            }
        }
    }
    
    // Marca um objetivo como concluído
    completeObjective(id) {
        const index = this.objectives.findIndex(obj => obj.id === id);
        if (index === -1) return;
        
        const objective = this.objectives[index];
        objective.completed = true;
        objective.completedAt = Date.now();
        
        // Para o timer se estiver rodando
        if (this.activeTimers[id]) {
            clearInterval(this.activeTimers[id]);
            delete this.activeTimers[id];
        }
        
        // Adiciona pontos baseado na prioridade
        let pointsEarned = 0;
        switch (objective.priority) {
            case 'high':
                pointsEarned = 50;
                break;
            case 'medium':
                pointsEarned = 30;
                break;
            case 'low':
                pointsEarned = 20;
                break;
        }
        
        this.addPoints(pointsEarned, id);
        
        // Move para a lista de concluídos
        this.completedObjectives.push(objective);
        this.objectives.splice(index, 1);
        
        this.saveToLocalStorage();
        this.updateUI();
        this.checkAchievements();
        
        // Anima o card antes de remover
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                this.updateUI();
            }, 500);
        } else {
            this.updateUI();
        }
    }
    
    // Recupera um objetivo concluído
    recoverCompletedObjective(id) {
        const index = this.completedObjectives.findIndex(obj => obj.id === id);
        if (index !== -1) {
            const objective = this.completedObjectives[index];
            
            // Remove a marcação de concluído
            objective.completed = false;
            delete objective.completedAt;
            
            // Subtrai os pontos que foram ganhos ao completar o objetivo
            let pointsToSubtract = 0;
            switch (objective.priority) {
                case 'high':
                    pointsToSubtract = 50;
                    break;
                case 'medium':
                    pointsToSubtract = 30;
                    break;
                case 'low':
                    pointsToSubtract = 20;
                    break;
            }
            
            // Não deixa os pontos ficarem negativos
            this.points = Math.max(0, this.points - pointsToSubtract);
            
            // Recalcula o nível baseado nos pontos atuais
            let newLevel = 1;
            for (let lvl = 1; lvl <= 10; lvl++) {
                if (this.points >= this.levelThresholds[lvl]) {
                    newLevel = lvl;
                } else {
                    break;
                }
            }
            this.level = newLevel;
            
            // Move o objetivo de volta para a lista de ativos
            this.objectives.push(objective);
            this.completedObjectives.splice(index, 1);
            
            this.saveToLocalStorage();
            this.updateUI();
            this.checkAchievements();
        }
    }
    
    // Recupera um objetivo excluído
    recoverObjective(id) {
        const index = this.deletedObjectives.findIndex(obj => obj.id === id);
        if (index !== -1) {
            const objective = this.deletedObjectives[index];
            delete objective.deletedAt;
            this.objectives.push(objective);
            this.deletedObjectives.splice(index, 1);
            
            this.saveToLocalStorage();
            this.updateUI();
        }
    }
    
    // Adiciona pontos ao usuário
    addPoints(points, objectiveId) {
        this.points += points;
        
        // Verifica se subiu de nível
        const oldLevel = this.level;
        let newLevel = this.level;
        
        // Encontra o novo nível baseado nos pontos
        for (let lvl = this.level + 1; lvl <= 10; lvl++) {
            if (this.points >= this.levelThresholds[lvl]) {
                newLevel = lvl;
            } else {
                break;
            }
        }
        
        if (newLevel > oldLevel) {
            this.level = newLevel;
            this.showLevelUpNotification(newLevel);
            this.checkAchievements();
        }
        
        // Atualiza a UI
        document.getElementById('points-value').textContent = this.points;
        
        // Calcula o progresso para o próximo nível
        let nextLevelThreshold = this.levelThresholds[this.level + 1] || this.levelThresholds[10] * 1.5;
        let currentLevelThreshold = this.levelThresholds[this.level];
        let progress = ((this.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;
        progress = Math.min(progress, 100);
        
        document.getElementById('level-value').textContent = this.level;
        document.getElementById('level-progress').style.width = `${progress}%`;
        
        // Anima os pontos ganhos
        const pointsAnimation = document.getElementById('points-animation');
        pointsAnimation.textContent = `+${points}`;
        pointsAnimation.style.opacity = '1';
        pointsAnimation.style.top = '-30px';
        
        setTimeout(() => {
            pointsAnimation.style.opacity = '0';
            pointsAnimation.style.top = '-20px';
        }, 1500);
        
        // Anima o card do objetivo
        const card = document.querySelector(`[data-id="${objectiveId}"]`);
        if (card) {
            card.classList.add('pulse');
            setTimeout(() => {
                card.classList.remove('pulse');
            }, 1000);
        }
    }
    
    // Mostra notificação de subida de nível
    showLevelUpNotification(newLevel) {
        const notification = document.getElementById('level-up-notification');
        document.getElementById('new-level').textContent = newLevel;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Verifica conquistas desbloqueadas
    checkAchievements() {
        let newAchievements = false;
        
        this.achievementDefinitions.forEach(achievement => {
            if (!achievement.unlocked && achievement.condition()) {
                achievement.unlocked = true;
                this.achievements.push({
                    id: achievement.id,
                    title: achievement.title,
                    description: achievement.description,
                    unlockedAt: Date.now()
                });
                
                newAchievements = true;
                this.showAchievementNotification(achievement);
            }
        });
        
        if (newAchievements) {
            this.saveToLocalStorage();
        }
    }
    
    // Mostra notificação de conquista
    showAchievementNotification(achievement) {
        const modal = document.getElementById('achievement-modal');
        document.getElementById('achievement-title').textContent = achievement.title;
        document.getElementById('achievement-description').textContent = achievement.description;
        
        modal.style.display = 'block';
    }
    
    // Inicia/pausa o timer de um objetivo
    toggleTimer(id) {
        const objective = this.objectives.find(obj => obj.id === id);
        if (!objective) return;
        
        if (objective.timerRunning) {
            // Pausa o timer
            clearInterval(this.activeTimers[id]);
            delete this.activeTimers[id];
            objective.timerRunning = false;
        } else {
            // Inicia o timer
            objective.timerRunning = true;
            const timerDisplay = document.querySelector(`[data-id="${id}"] .timer-display`);
            
            if (objective.timerType === 'countdown' && objective.deadline) {
                // Cronômetro regressivo até a data/hora marcada
                this.activeTimers[id] = setInterval(() => {
                    const now = Date.now();
                    let timeLeft = Math.max(0, Math.floor((objective.deadline - now) / 1000));
                    
                    if (timerDisplay) {
                        timerDisplay.textContent = this.formatTime(timeLeft);
                    }
                    
                    if (timeLeft <= 0) {
                        clearInterval(this.activeTimers[id]);
                        delete this.activeTimers[id];
                        objective.timerRunning = false;
                        this.completeObjective(id);
                    }
                    
                    this.saveToLocalStorage();
                }, 1000);
            } else {
                // Cronômetro progressivo até o fim da minutagem
                this.activeTimers[id] = setInterval(() => {
                    objective.timeSpent += 1;
                    
                    if (timerDisplay) {
                        timerDisplay.textContent = this.formatTime(objective.timeSpent);
                    }
                    
                    // Se atingir o tempo estimado, completa o objetivo
                    if (objective.estimatedTime > 0 && objective.timeSpent >= objective.estimatedTime * 60) {
                        clearInterval(this.activeTimers[id]);
                        delete this.activeTimers[id];
                        objective.timerRunning = false;
                        this.completeObjective(id);
                    }
                    
                    this.saveToLocalStorage();
                }, 1000);
            }
        }
        
        this.updateTimerUI(id);
    }
    
    // Reseta o timer de um objetivo
    resetTimer(id) {
        const objective = this.objectives.find(obj => obj.id === id);
        if (!objective) return;
        
        // Para o timer se estiver rodando
        if (this.activeTimers[id]) {
            clearInterval(this.activeTimers[id]);
            delete this.activeTimers[id];
            objective.timerRunning = false;
        }
        
        objective.timeSpent = 0;
        this.saveToLocalStorage();
        this.updateTimerUI(id);
    }
    
    // Atualiza a UI do timer
    updateTimerUI(id) {
        const objective = this.objectives.find(obj => obj.id === id);
        if (!objective) return;
        
        const timerDisplay = document.querySelector(`[data-id="${id}"] .timer-display`);
        const playPauseBtn = document.querySelector(`[data-id="${id}"] .play-pause-btn`);
        
        if (timerDisplay) {
            if (objective.timerType === 'countdown' && objective.deadline) {
                const now = Date.now();
                let timeLeft = Math.max(0, Math.floor((objective.deadline - now) / 1000));
                timerDisplay.textContent = this.formatTime(timeLeft);
            } else {
                timerDisplay.textContent = this.formatTime(objective.timeSpent);
            }
        }
        
        if (playPauseBtn) {
            if (objective.timerRunning) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    }
    
    // Formata o tempo em segundos para HH:MM:SS
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    // Atualiza a interface do usuário
    updateUI() {
        console.log('Atualizando UI...');
        this.renderObjectives();
        this.renderCompletedObjectives();
        this.renderDeletedObjectives();
        this.renderAchievements();
        
        // Atualiza os contadores
        document.getElementById('points-value').textContent = this.points;
        document.getElementById('level-value').textContent = this.level;
        document.getElementById('achievements-value').textContent = this.achievements.length;
        
        // Calcula o progresso para o próximo nível
        let nextLevelThreshold = this.levelThresholds[this.level + 1] || this.levelThresholds[10] * 1.5;
        let currentLevelThreshold = this.levelThresholds[this.level];
        let progress = ((this.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;
        progress = Math.min(progress, 100);
        
        document.getElementById('level-progress').style.width = `${progress}%`;
        
        // Atualiza os contadores nas abas
        const activeCount = document.getElementById('active-count');
        const completedCount = document.getElementById('completed-count');
        const deletedCount = document.getElementById('deleted-count');
        const achievementsCount = document.getElementById('achievements-count');
        
        if (activeCount) activeCount.textContent = this.objectives.length;
        if (completedCount) completedCount.textContent = this.completedObjectives.length;
        if (deletedCount) deletedCount.textContent = this.deletedObjectives.length;
        if (achievementsCount) achievementsCount.textContent = this.achievements.length;
    }
    
    // Renderiza a lista de objetivos ativos
    renderObjectives() {
        const container = document.getElementById('objectives-container');
        container.innerHTML = '';
        
        // Filtra os objetivos - Corrigido
        let filteredObjectives = [...this.objectives];
        const filterValue = document.getElementById('filter-priority')?.value || 'all';
        
        console.log('Aplicando filtro:', filterValue);
        
        if (filterValue !== 'all') {
            filteredObjectives = filteredObjectives.filter(obj => obj.priority === filterValue);
        }
        
        // Ordena os objetivos - Corrigido
        const sortValue = document.getElementById('sort-by')?.value || 'created';
        
        console.log('Aplicando ordenação:', sortValue);
        
        filteredObjectives.sort((a, b) => {
            switch (sortValue) {
                case 'deadline':
                    // Coloca os sem prazo no final
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return a.deadline - b.deadline;
                case 'priority':
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                case 'created':
                    return b.createdAt - a.createdAt; // Mais recentes primeiro
                case 'title':
                    return a.title.localeCompare(b.title); // Ordem alfabética
                default:
                    return 0;
            }
        });
        
        console.log('Objetivos filtrados e ordenados:', filteredObjectives.length);
        
        // Verifica se não há objetivos
        if (filteredObjectives.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>Nenhum objetivo ativo</h3>
                    <p>Clique no botão "+" para adicionar um novo objetivo.</p>
                </div>
            `;
            return;
        }
        
        // Renderiza cada objetivo
        filteredObjectives.forEach(objective => {
            const card = document.createElement('div');
            card.className = `objective-card ${objective.priority}-priority fade-in`;
            card.dataset.id = objective.id;
            
            // Verifica o status do prazo
            let deadlineStatus = '';
            let deadlineClass = '';
            
            if (objective.deadline) {
                const now = Date.now();
                const deadline = objective.deadline;
                const timeLeft = deadline - now;
                
                if (timeLeft < 0) {
                    deadlineStatus = 'Atrasado';
                    deadlineClass = 'deadline-overdue';
                } else if (timeLeft < 24 * 60 * 60 * 1000) { // Menos de 24 horas
                    deadlineStatus = 'Hoje';
                    deadlineClass = 'deadline-approaching';
                } else if (timeLeft < 48 * 60 * 60 * 1000) { // Menos de 48 horas
                    deadlineStatus = 'Amanhã';
                    deadlineClass = 'deadline-approaching';
                }
            }
            
            // Conteúdo específico baseado no tipo de cronômetro
            let timerInfo = '';
            let timerDisplay = '';
            
            if (objective.timerType === 'countdown') {
                timerInfo = objective.deadline ? 
                    `<div class="meta-item">
                        <i class="fas fa-stopwatch"></i>
                        <span>Cronômetro: Regressivo até o prazo</span>
                    </div>` : '';
                
                timerDisplay = objective.deadline ? 
                    this.formatTime(Math.max(0, Math.floor((objective.deadline - Date.now()) / 1000))) : 
                    '00:00:00';
            } else {
                timerInfo = `<div class="meta-item">
                    <i class="fas fa-stopwatch"></i>
                    <span>Cronômetro: Progressivo (${objective.estimatedTime} min)</span>
                </div>`;
                
                timerDisplay = this.formatTime(objective.timeSpent);
            }
            
            card.innerHTML = `
                <div class="objective-header">
                    <h3 class="objective-title">${objective.title}</h3>
                    <div class="objective-actions">
                        <button class="action-btn edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                ${objective.description ? `<p class="objective-description">${objective.description}</p>` : ''}
                <div class="objective-meta">
                    ${objective.deadline ? `
                        <div class="meta-item ${deadlineClass}">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${this.formatDate(objective.deadline)} ${deadlineStatus ? `(${deadlineStatus})` : ''}</span>
                        </div>
                    ` : ''}
                    <div class="meta-item">
                        <i class="fas fa-flag"></i>
                        <span>${this.getPriorityLabel(objective.priority)}</span>
                    </div>
                    ${timerInfo}
                </div>
                <div class="timer-container">
                    <div class="timer-display">${timerDisplay}</div>
                    <div class="timer-controls">
                        <button class="timer-btn play-pause-btn" title="${objective.timerRunning ? 'Pausar' : 'Iniciar'}">
                            <i class="fas ${objective.timerRunning ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                        <button class="timer-btn reset-btn" title="Resetar">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </div>
                <div class="objective-complete">
                    <input type="checkbox" id="complete-${objective.id}" class="complete-checkbox">
                    <label for="complete-${objective.id}" class="complete-label">Marcar como concluído</label>
                </div>
            `;
            
            container.appendChild(card);
            
            // Adiciona event listeners
            card.querySelector('.edit-btn').addEventListener('click', () => this.openModal(objective.id));
            card.querySelector('.delete-btn').addEventListener('click', () => this.deleteObjective(objective.id));
            card.querySelector('.complete-checkbox').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.completeObjective(objective.id);
                }
            });
            card.querySelector('.play-pause-btn').addEventListener('click', () => this.toggleTimer(objective.id));
            card.querySelector('.reset-btn').addEventListener('click', () => this.resetTimer(objective.id));
            
            // Reinicia o timer se estiver rodando
            if (objective.timerRunning) {
                this.toggleTimer(objective.id);
            }
        });
    }
    
    // Renderiza a lista de objetivos concluídos
    renderCompletedObjectives() {
        const container = document.getElementById('completed-container');
        container.innerHTML = '';
        
        // Verifica se não há objetivos concluídos
        if (this.completedObjectives.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h3>Nenhum objetivo concluído</h3>
                    <p>Os objetivos que você completar aparecerão aqui.</p>
                </div>
            `;
            return;
        }
        
        // Ordena por data de conclusão (mais recentes primeiro)
        const sortedObjectives = [...this.completedObjectives].sort((a, b) => b.completedAt - a.completedAt);
        
        // Renderiza cada objetivo concluído
        sortedObjectives.forEach(objective => {
            const card = document.createElement('div');
            card.className = `objective-card ${objective.priority}-priority completed-objective fade-in`;
            card.dataset.id = objective.id;
            
            card.innerHTML = `
                <div class="objective-header">
                    <h3 class="objective-title">${objective.title}</h3>
                    <div class="objective-actions">
                        <button class="action-btn recover-btn" title="Recuperar"><i class="fas fa-undo"></i></button>
                    </div>
                </div>
                ${objective.description ? `<p class="objective-description">${objective.description}</p>` : ''}
                <div class="objective-meta">
                    <div class="meta-item">
                        <i class="fas fa-flag"></i>
                        <span>${this.getPriorityLabel(objective.priority)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>Tempo gasto: ${this.formatTime(objective.timeSpent)}</span>
                    </div>
                </div>
                <div class="completed-info">
                    <i class="fas fa-check-circle"></i>
                    <span>Concluído em ${this.formatDate(objective.completedAt)}</span>
                </div>
            `;
            
            container.appendChild(card);
            
            // Adiciona event listener para recuperar
            card.querySelector('.recover-btn').addEventListener('click', () => {
                if (confirm('Deseja recuperar este objetivo? Os pontos ganhos serão removidos.')) {
                    this.recoverCompletedObjective(objective.id);
                }
            });
        });
    }
    
    // Renderiza a lista de objetivos excluídos
    renderDeletedObjectives() {
        const container = document.getElementById('deleted-container');
        container.innerHTML = '';
        
        // Verifica se não há objetivos excluídos
        if (this.deletedObjectives.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trash-alt"></i>
                    <h3>Nenhum objetivo excluído</h3>
                    <p>Os objetivos que você excluir aparecerão aqui.</p>
                </div>
            `;
            return;
        }
        
        // Ordena por data de exclusão (mais recentes primeiro)
        const sortedObjectives = [...this.deletedObjectives].sort((a, b) => b.deletedAt - a.deletedAt);
        
        // Renderiza cada objetivo excluído
        sortedObjectives.forEach(objective => {
            const card = document.createElement('div');
            card.className = `objective-card ${objective.priority}-priority deleted-objective fade-in`;
            card.dataset.id = objective.id;
            
            card.innerHTML = `
                <div class="objective-header">
                    <h3 class="objective-title">${objective.title}</h3>
                    <div class="objective-actions">
                        <button class="action-btn recover-btn" title="Recuperar"><i class="fas fa-undo"></i></button>
                    </div>
                </div>
                ${objective.description ? `<p class="objective-description">${objective.description}</p>` : ''}
                <div class="objective-meta">
                    ${objective.deadline ? `
                        <div class="meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${this.formatDate(objective.deadline)}</span>
                        </div>
                    ` : ''}
                    <div class="meta-item">
                        <i class="fas fa-flag"></i>
                        <span>${this.getPriorityLabel(objective.priority)}</span>
                    </div>
                </div>
                <div class="deleted-info">
                    <i class="fas fa-trash-alt"></i>
                    <span>Excluído em ${this.formatDate(objective.deletedAt)}</span>
                </div>
            `;
            
            container.appendChild(card);
            
            // Adiciona event listener para recuperar
            card.querySelector('.recover-btn').addEventListener('click', () => this.recoverObjective(objective.id));
        });
    }
    
    // Renderiza as conquistas
    renderAchievements() {
        const container = document.getElementById('achievements-container');
        container.innerHTML = '';
        
        // Verifica se não há conquistas
        if (this.achievements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <h3>Nenhuma conquista desbloqueada</h3>
                    <p>Complete objetivos para desbloquear conquistas.</p>
                </div>
            `;
            return;
        }
        
        // Ordena por data de desbloqueio (mais recentes primeiro)
        const sortedAchievements = [...this.achievements].sort((a, b) => b.unlockedAt - a.unlockedAt);
        
        // Renderiza cada conquista
        sortedAchievements.forEach(achievement => {
            const card = document.createElement('div');
            card.className = 'achievement-card fade-in';
            
            card.innerHTML = `
                <div class="achievement-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <h3 class="achievement-title">${achievement.title}</h3>
                <p class="achievement-description">${achievement.description}</p>
                <div class="achievement-date">
                    <i class="fas fa-unlock"></i>
                    <span>Desbloqueado em ${this.formatDate(achievement.unlockedAt)}</span>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    // Retorna o label da prioridade
    getPriorityLabel(priority) {
        switch (priority) {
            case 'high':
                return 'Alta Prioridade';
            case 'medium':
                return 'Média Prioridade';
            case 'low':
                return 'Baixa Prioridade';
            default:
                return 'Prioridade Desconhecida';
        }
    }
    
    // Formata a data
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    // Salva os dados no localStorage
    saveToLocalStorage() {
        const data = {
            objectives: this.objectives,
            completedObjectives: this.completedObjectives,
            deletedObjectives: this.deletedObjectives,
            points: this.points,
            level: this.level,
            achievements: this.achievements
        };
        
        localStorage.setItem('objectiveManagerData', JSON.stringify(data));
    }
    
    // Carrega os dados do localStorage
    loadFromLocalStorage() {
        const data = localStorage.getItem('objectiveManagerData');
        
        if (data) {
            const parsedData = JSON.parse(data);
            this.objectives = parsedData.objectives || [];
            this.completedObjectives = parsedData.completedObjectives || [];
            this.deletedObjectives = parsedData.deletedObjectives || [];
            this.points = parsedData.points || 0;
            this.level = parsedData.level || 1;
            this.achievements = parsedData.achievements || [];
            
            // Atualiza o status das conquistas
            this.achievementDefinitions.forEach(achievement => {
                achievement.unlocked = this.achievements.some(a => a.id === achievement.id);
            });
        }
    }
    
    // Exporta os dados para um arquivo JSON
    exportData() {
        const data = {
            objectives: this.objectives,
            completedObjectives: this.completedObjectives,
            deletedObjectives: this.deletedObjectives,
            points: this.points,
            level: this.level,
            achievements: this.achievements,
            exportDate: Date.now()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `objetivos_backup_${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        // Mostra notificação
        const notification = document.getElementById('export-notification');
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Importa dados de um arquivo JSON
    importData() {
        const importText = document.getElementById('import-data-text').value;
        
        try {
            const data = JSON.parse(importText);
            
            if (!data.objectives || !data.completedObjectives) {
                throw new Error('Formato de dados inválido');
            }
            
            this.objectives = data.objectives;
            this.completedObjectives = data.completedObjectives;
            this.deletedObjectives = data.deletedObjectives || [];
            this.points = data.points || 0;
            this.level = data.level || 1;
            this.achievements = data.achievements || [];
            
            // Atualiza o status das conquistas
            this.achievementDefinitions.forEach(achievement => {
                achievement.unlocked = this.achievements.some(a => a.id === achievement.id);
            });
            
            this.saveToLocalStorage();
            this.updateUI();
            
            // Fecha o modal
            document.getElementById('import-modal').style.display = 'none';
            
            alert('Dados importados com sucesso!');
        } catch (error) {
            alert('Erro ao importar dados. Verifique se o formato está correto.');
            console.error('Erro ao importar dados:', error);
        }
    }
    
    resetData() {
        this.objectives = [];
        this.completedObjectives = [];
        this.deletedObjectives = [];
        this.points = 0;
        this.level = 1;
        this.achievements = [];
        
        // Reseta o status das conquistas
        this.achievementDefinitions.forEach(achievement => {
            achievement.unlocked = false;
        });
        
        this.saveToLocalStorage();
        this.updateUI();
        
        // Fecha o modal
        document.getElementById('reset-confirm-modal').style.display = 'none';
        
        alert('Todos os dados foram resetados com sucesso!');
    }
}

// Inicializa o gerenciador de objetivos quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.objectiveManager = new ObjectiveManager();
    
    // Fecha os modais quando clicar fora deles
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Previne que o formulário seja enviado quando pressionar Enter
    document.getElementById('objective-form').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
});

// Service Worker para funcionalidade offline (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registrado com sucesso:', registration);
        }).catch(error => {
            console.log('Falha ao registrar ServiceWorker:', error);
        });
    });
}