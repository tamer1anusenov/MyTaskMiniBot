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
    
    // Filter buttons
    const filterButtons = {
        all: document.getElementById('filter-all'),
        work: document.getElementById('filter-work'),
        personal: document.getElementById('filter-personal'),
        bills: document.getElementById('filter-bills')
    };
    
    let currentFilter = 'all';
    let searchQuery = '';
    let tasks = [];

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

            renderTasks();
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

        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<p class="text-center text-muted-foreground py-8">No tasks found.</p>';
        }
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
                        ${task.priority === 'critical' ? 
                            `<span class="text-xs bg-destructive text-black px-2 py-0.5 font-bold">CRITICAL</span>` : 
                            `<span class="text-xs border border-primary/40 px-2 py-0.5">${task.priority}</span>`}
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

    // Add new task
    function startNewTask() {
        newTaskBar.classList.remove('hidden');
        newTaskInput.focus();
    }

    function cancelNewTask() {
        newTaskBar.classList.add('hidden');
        newTaskInput.value = '';
        deadlineInput.value = '';
        newFolderInput.value = '';
        folderSelect.value = 'daily';
    }

    async function addNewTask() {
        const text = newTaskInput.value.trim();
        if (!text) return;
        
        const deadline = deadlineInput.value ? new Date(deadlineInput.value).toISOString() : null;
        let folder = folderSelect.value;
        if (newFolderInput.value.trim()) {
            folder = newFolderInput.value.trim();
        }
        
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

    // Filters
    Object.keys(filterButtons).forEach(key => {
        filterButtons[key].addEventListener('click', () => {
            currentFilter = key;
            Object.values(filterButtons).forEach(btn => {
                btn.classList.remove('active', 'border-primary', 'text-primary');
                btn.classList.add('border-transparent', 'text-muted-foreground');
            });
            filterButtons[key].classList.add('active', 'border-primary', 'text-primary');
            filterButtons[key].classList.remove('border-transparent', 'text-muted-foreground');
            renderTasks();
        });
    });

    // Initial load
    fetchTasks();
});