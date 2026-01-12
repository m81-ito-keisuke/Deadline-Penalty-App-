// ===== Deadline Penalty App =====

class DeadlinePenaltyApp {
    constructor() {
        this.tasks = [];
        this.history = [];
        this.totalPenalty = 0;
        this.timerInterval = null;

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.initFlatpickr();
        this.render();
        this.startTimer();
        this.startCurrentTimeDisplay();
    }

    // ===== Event Bindings =====
    bindEvents() {
        const form = document.getElementById('task-form');
        form.addEventListener('submit', (e) => this.handleAddTask(e));
    }

    // ===== Flatpickr Calendar =====
    initFlatpickr() {
        const deadlineInput = document.getElementById('task-deadline');
        flatpickr(deadlineInput, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            minDate: "today",
            locale: "ja",
            time_24hr: true,
            placeholder: "日時を選択",
            disableMobile: true
        });
    }

    // ===== Current Time Display =====
    startCurrentTimeDisplay() {
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
    }

    updateCurrentTime() {
        const el = document.getElementById('current-time');
        if (!el) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        el.textContent = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }

    // ===== Task Management =====
    handleAddTask(e) {
        e.preventDefault();

        const nameInput = document.getElementById('task-name');
        const deadlineInput = document.getElementById('task-deadline');
        const penaltyInput = document.getElementById('task-penalty');

        const task = {
            id: Date.now(),
            name: nameInput.value.trim(),
            deadline: new Date(deadlineInput.value).getTime(),
            penalty: parseInt(penaltyInput.value, 10),
            status: 'active',
            createdAt: Date.now()
        };

        this.tasks.push(task);
        this.saveToStorage();
        this.render();

        // Reset form
        nameInput.value = '';
        deadlineInput.value = '';
        penaltyInput.value = '';
        nameInput.focus();
    }

    completeTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const task = this.tasks[taskIndex];
        task.status = 'completed';
        task.completedAt = Date.now();

        this.history.unshift(task);
        this.tasks.splice(taskIndex, 1);

        this.saveToStorage();
        this.render();
    }

    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        this.tasks.splice(taskIndex, 1);
        this.saveToStorage();
        this.render();
    }

    checkOverdue() {
        const now = Date.now();
        let hasChanges = false;

        this.tasks = this.tasks.filter(task => {
            if (task.status === 'active' && now > task.deadline) {
                task.status = 'failed';
                task.failedAt = now;
                this.totalPenalty += task.penalty;
                this.history.unshift(task);
                hasChanges = true;
                return false;
            }
            return true;
        });

        if (hasChanges) {
            this.saveToStorage();
            this.render();
        }
    }

    // ===== Timer =====
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.checkOverdue();
            this.updateCountdowns();
        }, 1000);
    }

    updateCountdowns() {
        const now = Date.now();

        this.tasks.forEach(task => {
            const countdownEl = document.querySelector(`[data-task-id="${task.id}"] .task-countdown`);
            const cardEl = document.querySelector(`[data-task-id="${task.id}"]`);

            if (!countdownEl || !cardEl) return;

            const remaining = task.deadline - now;
            countdownEl.textContent = this.formatCountdown(remaining);

            // Update urgency classes
            const hoursRemaining = remaining / (1000 * 60 * 60);

            cardEl.classList.remove('urgent', 'overdue');
            countdownEl.classList.remove('urgent', 'overdue');

            if (remaining <= 0) {
                cardEl.classList.add('overdue');
                countdownEl.classList.add('overdue');
            } else if (hoursRemaining <= 1) {
                cardEl.classList.add('urgent');
                countdownEl.classList.add('urgent');
            }
        });
    }

    formatCountdown(ms) {
        if (ms <= 0) return '期限超過';

        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}日 ${hours % 24}時間`;
        } else if (hours > 0) {
            return `${hours}時間 ${minutes % 60}分`;
        } else if (minutes > 0) {
            return `${minutes}分 ${seconds % 60}秒`;
        } else {
            return `${seconds}秒`;
        }
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    }

    // ===== Rendering =====
    render() {
        this.renderTotalPenalty();
        this.renderActiveTasks();
        this.renderHistory();
    }

    renderTotalPenalty() {
        const el = document.getElementById('total-penalty');
        el.textContent = `¥${this.totalPenalty.toLocaleString()}`;
    }

    renderActiveTasks() {
        const container = document.getElementById('active-tasks');
        const noTasks = document.getElementById('no-tasks');

        if (this.tasks.length === 0) {
            container.innerHTML = '';
            noTasks.classList.remove('hidden');
            return;
        }

        noTasks.classList.add('hidden');

        container.innerHTML = this.tasks.map(task => `
            <div class="task-card" data-task-id="${task.id}">
                <div class="task-header">
                    <span class="task-name">${this.escapeHtml(task.name)}</span>
                    <span class="task-penalty">¥${task.penalty.toLocaleString()}</span>
                </div>
                <div class="task-info">
                    <span class="task-deadline">📅 ${this.formatDateTime(task.deadline)}</span>
                    <span class="task-countdown">${this.formatCountdown(task.deadline - Date.now())}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-complete" onclick="app.completeTask(${task.id})">✓ 完了</button>
                    <button class="btn-delete" onclick="app.deleteTask(${task.id})">削除</button>
                </div>
            </div>
        `).join('');

        this.updateCountdowns();
    }

    renderHistory() {
        const container = document.getElementById('history-tasks');
        const noHistory = document.getElementById('no-history');

        if (this.history.length === 0) {
            container.innerHTML = '';
            noHistory.classList.remove('hidden');
            return;
        }

        noHistory.classList.add('hidden');

        container.innerHTML = this.history.map((task, index) => {
            const isCompleted = task.status === 'completed';
            const statusClass = isCompleted ? 'success' : 'failed';
            const statusText = isCompleted ? '✓ 完了' : `✗ 失敗 (-¥${task.penalty.toLocaleString()})`;

            return `
                <div class="task-card ${isCompleted ? 'completed' : 'failed'}">
                    <div class="task-header">
                        <span class="task-name">${this.escapeHtml(task.name)}</span>
                        <span class="task-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="task-info">
                        <span class="task-deadline">📅 期限: ${this.formatDateTime(task.deadline)}</span>
                    </div>
                    <div class="history-actions">
                        <button class="btn-history-delete" onclick="app.deleteHistoryItem(${index})">🗑 削除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    deleteHistoryItem(index) {
        if (index < 0 || index >= this.history.length) return;

        const task = this.history[index];

        // If was a failed task, subtract the penalty from total
        if (task.status === 'failed') {
            this.totalPenalty -= task.penalty;
            if (this.totalPenalty < 0) this.totalPenalty = 0;
        }

        this.history.splice(index, 1);
        this.saveToStorage();
        this.render();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Storage =====
    saveToStorage() {
        const data = {
            tasks: this.tasks,
            history: this.history,
            totalPenalty: this.totalPenalty
        };
        localStorage.setItem('deadlinePenaltyApp', JSON.stringify(data));
    }

    loadFromStorage() {
        try {
            const data = JSON.parse(localStorage.getItem('deadlinePenaltyApp'));
            if (data) {
                this.tasks = data.tasks || [];
                this.history = data.history || [];
                this.totalPenalty = data.totalPenalty || 0;
            }
        } catch (e) {
            console.error('Failed to load data from storage:', e);
        }
    }
}

// Initialize app
const app = new DeadlinePenaltyApp();
