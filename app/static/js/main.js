// Task Management Frontend - Terminal Style

document.addEventListener('DOMContentLoaded', function() {
    const taskList = document.getElementById('task-list');
    const addTaskBtn = document.getElementById('add-task-btn');
    const newTaskBar = document.getElementById('new-task-bar');
    const newTaskInput = document.getElementById('new-task-input');
    const executeBtn = document.getElementById('execute-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const deadlineInput = document.getElementById('deadline-input');
    const folderSelect = document.getElementById('folder-select');
    const newFolderInput = document.getElementById('new-folder-input');
    const searchInput = document.getElementById('search-input');
    const filterBar = document.getElementById('filter-bar');
    const filterButtons = {};
    const folderFilterKeys = new Set();
    const manualFolders = new Set();
    let currentFilter = 'all';
    let searchQuery = '';
    let tasks = [];
    let latestFolderSet = new Set();
    const filterAllButton = document.getElementById('filter-all');
    const filterTomorrowButton = document.getElementById('filter-tomorrow');
    // Folder selection handler
    folderSelect.addEventListener('change', () => {
        if (folderSelect.value) {
            newFolderInput.value = ''; // Clear new folder input if existing folder selected
        }
    });

    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[char]);
    }

    function registerFilterButton(key, button) {
        if (!button) return;
        filterButtons[key] = button;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            setActiveFilter(key);
        });
    }

    function updateActiveFilterStyles() {
        Object.entries(filterButtons).forEach(([key, button]) => {
            button.classList.remove('active', 'border-primary', 'text-primary');
            button.classList.add('border-transparent', 'text-muted-foreground');
            if (key === currentFilter) {
                button.classList.add('active', 'border-primary', 'text-primary');
                button.classList.remove('border-transparent', 'text-muted-foreground');
            }
        });
    }

    function setActiveFilter(key) {
        if (!filterButtons[key]) return;
        currentFilter = key;
        updateActiveFilterStyles();
        renderTasks();
    }

    function updateFolderSelect(folders) {
        const previousValue = folderSelect.value;
        const sortedFolders = folders.slice().sort((a, b) => a.localeCompare(b));
        folderSelect.innerHTML = '<option value="">select folder...</option>' + sortedFolders
            .map(folder => `<option value="${escapeHtml(folder)}">${escapeHtml(folder)}</option>`)
            .join('');
        if (previousValue && sortedFolders.includes(previousValue)) {
            folderSelect.value = previousValue;
        }
    }

    function syncFolderFilters(folderSet) {
        Array.from(folderFilterKeys).forEach(folderName => {
            if (!folderSet.has(folderName)) {
                if (filterButtons[folderName]) {
                    filterButtons[folderName].remove();
                    delete filterButtons[folderName];
                }
                folderFilterKeys.delete(folderName);
            }
        });

        folderSet.forEach(folderName => {
            if (!folderFilterKeys.has(folderName)) {
                addFolderFilterButton(folderName);
            }
        });
    }

    function syncFoldersFromTasks() {
        const folderSet = new Set(manualFolders);
        tasks.forEach(task => {
            if (task.tag) folderSet.add(task.tag);
        });
        latestFolderSet = folderSet;
        updateFolderSelect(Array.from(folderSet));
        syncFolderFilters(folderSet);
    }

    function refreshViewAfterTaskUpdate() {
        if (!['all', 'tomorrow'].includes(currentFilter) && !latestFolderSet.has(currentFilter)) {
            currentFilter = 'all';
        }
        updateActiveFilterStyles();
        renderTasks();
    }

    // Fetch tasks from backend
    async function fetchTasks() {
        try {
            const response = await fetch('/tasks');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const apiTasks = await response.json();
            // Transform API tasks to UI format
            tasks = apiTasks.map(task => ({
                id: task.id,
                text: task.title,
                priority: "med", // Default, could be enhanced
                time: formatTime(task.created_at, task.deadline),
                tag: task.folder,
                done: task.completed,
                overdue: isOverdue(task.created_at, task.completed, task.deadline),
                deadline: task.deadline
            }));

            syncFoldersFromTasks();
            refreshViewAfterTaskUpdate();
        } catch (error) {
            console.error('Error fetching tasks:', error);
            taskList.innerHTML = '<p class="text-center text-muted-foreground py-8">Error loading tasks. Please try again later.</p>';
        }
    }

    function formatTime(createdAt, deadline) {
        if (deadline) {
            const date = new Date(deadline);
            const now = new Date();
            const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return "due today";
            if (diffDays === 1) return "due tomorrow";
            if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
            return `due in ${diffDays} days`;
        }
        
        const date = new Date(createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "today";
        if (diffDays === 1) return "yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    function isOverdue(createdAt, completed, deadline) {
        if (completed) return false;
        if (deadline) {
            return new Date(deadline) < new Date();
        }
        const date = new Date(createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        return diffDays > 1; // Overdue if more than 1 day old
    }

    // Render tasks based on current filter and search
    function renderTasks(filteredTasks = tasks) {
        // Handle special tomorrow tab
        if (currentFilter === 'tomorrow') {
            renderTomorrowCalculator();
            return;
        }

        // Filter by search
        if (searchQuery) {
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by category
        if (currentFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.tag === currentFilter);
        }

        taskList.innerHTML = '';

        // Overdue
        const overdue = filteredTasks.filter(t => t.overdue && !t.done);
        if (overdue.length) {
            taskList.innerHTML += `<h2 class="text-destructive text-xs font-bold mb-3 tracking-widest">/usr/bin/overdue</h2>`;
            overdue.forEach(task => taskList.innerHTML += createTaskHTML(task));
        }

        // Today
        const today = filteredTasks.filter(t => !t.overdue && !t.done);
        if (today.length) {
            taskList.innerHTML += `<h2 class="text-primary text-xs font-bold mb-3 mt-8 tracking-widest">/usr/bin/today</h2>`;
            today.forEach(task => taskList.innerHTML += createTaskHTML(task));
        }

        // Completed
        const done = filteredTasks.filter(t => t.done);
        if (done.length) {
            taskList.innerHTML += `<h2 class="text-muted-foreground text-xs font-bold mb-3 mt-8 tracking-widest">/usr/bin/completed</h2>`;
            done.forEach(task => taskList.innerHTML += createTaskHTML(task));
        }

    }

    function renderTomorrowCalculator() {
        taskList.innerHTML = `
            <div class="space-y-6">
                <h2 class="text-primary text-xs font-bold tracking-widest">/usr/bin/tomorrow</h2>
                
                <div class="bg-zinc-950 border border-primary/30 rounded p-4">
                    <h3 class="text-primary text-sm font-bold mb-3">Time Calculator</h3>
                    
                    <div class="space-y-3">
                        <div class="flex items-center gap-3">
                            <input 
                                id="time-interval-input"
                                type="text" 
                                class="flex-1 bg-transparent border border-primary/30 rounded px-3 py-2 text-sm"
                                placeholder="12:45-13:50"
                            />
                            <button id="add-interval-btn" class="px-4 py-2 bg-primary text-black font-bold rounded">Add</button>
                        </div>
                        
                        <div id="intervals-list" class="space-y-2 text-sm"></div>
                        
                        <div class="border-t border-primary/20 pt-3">
                            <div class="flex justify-between items-center">
                                <span class="text-primary font-bold">Total Time:</span>
                                <span id="total-time" class="text-primary font-mono">0 minutes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        loadTimeIntervals();
        
        document.getElementById('add-interval-btn').addEventListener('click', addTimeInterval);
        document.getElementById('time-interval-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTimeInterval();
        });
    }

    function addTimeInterval() {
        const input = document.getElementById('time-interval-input');
        let rawValue = input.value.trim();
        if (!rawValue) return;

        let associatedTaskId = null;
        const taskMatch = rawValue.match(/^(.*)\s+@(\d+)$/);
        if (taskMatch) {
            rawValue = taskMatch[1].trim();
            associatedTaskId = Number(taskMatch[2]);
        }

        const match = rawValue.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
        if (!match) {
            alert('Invalid format. Use HH:MM-HH:MM (e.g., 12:45-13:50)');
            return;
        }

        const [, startH, startM, endH, endM] = match.map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes <= startMinutes) {
            alert('End time must be after start time');
            return;
        }

        const duration = endMinutes - startMinutes;
        const intervals = getTimeIntervals();
        intervals.push({
            interval: rawValue,
            duration,
            date: new Date().toISOString().split('T')[0],
            taskId: associatedTaskId
        });
        saveTimeIntervals(intervals);

        input.value = '';
        loadTimeIntervals();
    }

    function loadTimeIntervals() {
        const intervals = getTimeIntervals();
        const list = document.getElementById('intervals-list');
        const total = intervals.reduce((sum, item) => sum + item.duration, 0);

        list.innerHTML = intervals.map((item, index) => {
            const label = item.taskId ? `${item.interval} (task #${item.taskId})` : item.interval;
            return `
            <div class="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded">
                <span>${label}</span>
                <div class="flex items-center gap-2">
                    <span class="text-primary text-xs">${formatDuration(item.duration)}</span>
                    <button onclick="removeTimeInterval(${index})" class="text-destructive hover:text-red-400">×</button>
                </div>
            </div>
        `;
        }).join('');

        document.getElementById('total-time').textContent = formatDuration(total);
    }

    function removeTimeInterval(index) {
        const intervals = getTimeIntervals();
        if (index < 0 || index >= intervals.length) return;
        const [removed] = intervals.splice(index, 1);
        saveTimeIntervals(intervals);
        loadTimeIntervals();
    }

    function removeIntervalsForTask(taskId) {
        if (!taskId) return;
        const intervals = getTimeIntervals();
        const filtered = intervals.filter(item => item.taskId !== taskId);
        if (filtered.length === intervals.length) return;
        saveTimeIntervals(filtered);
        loadTimeIntervals();
    }

    window.removeTimeInterval = removeTimeInterval;

    function ensureWeeklyReset() {
        const today = new Date();
        const isoDate = today.toISOString().split('T')[0];
        const lastReset = localStorage.getItem('lastTimeReset');
        if (today.getDay() === 0 && lastReset !== isoDate) {
            localStorage.setItem('timeIntervals', JSON.stringify([]));
            localStorage.setItem('lastTimeReset', isoDate);
            return true;
        }
        return false;
    }

    function getTimeIntervals() {
        ensureWeeklyReset();
        const stored = localStorage.getItem('timeIntervals');
        return stored ? JSON.parse(stored) : [];
    }

    function saveTimeIntervals(intervals) {
        localStorage.setItem('timeIntervals', JSON.stringify(intervals));
    }

    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const hourLabel = hours === 1 ? 'hour' : 'hours';
        const minuteLabel = mins === 1 ? 'minute' : 'minutes';
        if (hours && mins) return `${hours} ${hourLabel} ${mins} ${minuteLabel}`;
        if (hours) return `${hours} ${hourLabel}`;
        return `${mins} ${minuteLabel}`;
    }

    function addFolderFilterButton(folderName) {
        if (!filterBar || filterButtons[folderName]) return;
        const button = document.createElement('button');
        button.className = 'category-btn px-4 py-1 border border-transparent hover:border-primary/50 text-muted-foreground hover:text-primary';
        button.textContent = `#${folderName}`;
        filterBar.appendChild(button);
        registerFilterButton(folderName, button);
        folderFilterKeys.add(folderName);
    }

    function createTaskHTML(task) {
        return `
            <div onclick="toggleTask(${task.id})" class="task-item flex items-start gap-4 py-3 px-4 -mx-4 rounded-xl group cursor-pointer ${task.done ? 'opacity-60' : ''}">
                <div class="w-6 h-6 mt-0.5 border ${task.done ? 'bg-primary border-primary text-black' : 'border-primary/40 group-hover:border-primary'} flex items-center justify-center font-bold">
                    ${task.done ? '✓' : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="${task.done ? 'line-through text-muted-foreground' : 'text-[17px]'}">${task.text}</span>
                        <div class="flex items-center gap-2">
                            ${task.priority === 'critical' ? 
                                `<span class="text-xs bg-destructive text-black px-2 py-0.5 font-bold">CRITICAL</span>` : 
                                `<span class="text-xs border border-primary/40 px-2 py-0.5">${task.priority}</span>`}
                            <button type="button" onclick="event.stopPropagation(); deleteTask(${task.id});" class="text-[11px] uppercase tracking-widest text-destructive border border-destructive px-2 py-0.5 rounded hover:bg-destructive/20">rm</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 text-xs mt-1">
                        <span class="${task.overdue ? 'text-destructive' : 'text-primary'}">${task.time}</span>
                        <span class="text-muted-foreground">#${task.tag}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Toggle task completion
    async function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        try {
            const response = await fetch(`/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: task.text,
                    description: '',
                    completed: !task.done,
                    deadline: task.deadline,
                    folder: task.tag
                }),
            });
            
            if (!response.ok) throw new Error('Failed to update task');
            
            // Refresh tasks
            fetchTasks();
        } catch (error) {
            console.error('Error toggling task:', error);
            alert('Failed to update task. Please try again.');
        }
    }

    async function deleteTask(id) {
        try {
            const response = await fetch(`/tasks/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete task');
            removeIntervalsForTask(id);
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again.');
        }
    }

    window.deleteTask = deleteTask;

    // Add new task
    function startNewTask() {
        newTaskBar.classList.remove('hidden');
        newTaskInput.focus();
    }

    function cancelNewTask() {
        newTaskBar.classList.add('hidden');
        newTaskInput.value = '';
        deadlineInput.value = '';
        folderSelect.value = '';
        newFolderInput.value = '';
    }

    async function addNewTask() {
        const text = newTaskInput.value.trim();
        if (!text) {
            alert('Please enter a task description');
            return;
        }
        
        let folder = folderSelect.value || newFolderInput.value.trim();
        if (!folder) {
            alert('Please select or create a folder for this task');
            return;
        }
        
        manualFolders.add(folder);
        const instantFolders = new Set(latestFolderSet);
        instantFolders.add(folder);
        updateFolderSelect(Array.from(instantFolders));
        if (!folderFilterKeys.has(folder)) {
            addFolderFilterButton(folder);
        }
        
        const deadline = deadlineInput.value ? new Date(deadlineInput.value).toISOString() : null;
        
        try {
            const response = await fetch('/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: text,
                    description: '',
                    completed: false,
                    deadline: deadline,
                    folder: folder
                }),
            });
            
            if (!response.ok) throw new Error('Failed to add task');
            
            cancelNewTask();
            fetchTasks();
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task. Please try again.');
        }
    }

    // Event listeners
    addTaskBtn.addEventListener('click', startNewTask);
    executeBtn.addEventListener('click', addNewTask);
    cancelBtn.addEventListener('click', cancelNewTask);
    newTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addNewTask();
        if (e.key === 'Escape') cancelNewTask();
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTasks();
    });

    registerFilterButton('all', filterAllButton);
    registerFilterButton('tomorrow', filterTomorrowButton);
    setActiveFilter('all');
    fetchTasks();
});

