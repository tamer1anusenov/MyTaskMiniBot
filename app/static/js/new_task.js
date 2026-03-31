// New task page logic - Optimized for performance
(() => {
  'use strict';

  // State management
  const state = {
    taskText: '',
    priority: 'medium', // default
    dateTime: null,
    tags: [],
    isSaving: false,
    // Cache DOM elements
    elements: {
      taskInput: null,
      priorityButtons: null,
      priorityLow: null,
      priorityMedium: null,
      priorityHigh: null,
      datetimeSection: null,
      datetimeDisplay: null,
      tagsSection: null,
      saveBtn: null,
      cancelBtn: null
    }
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    setupEventListeners();
    initializeDefaults();
    
    // Initialize Telegram WebApp if not already done
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      
      // Handle back button from Telegram
      window.Telegram.WebApp.onEvent('backButtonClicked', () => {
        window.Telegram.WebApp.close();
      });
    }
  }

  function cacheElements() {
    state.elements.taskInput = document.getElementById('task-input');
    state.elements.priorityButtons = document.querySelectorAll('[id^="priority-"]');
    state.elements.priorityLow = document.getElementById('priority-low');
    state.elements.priorityMedium = document.getElementById('priority-medium');
    state.elements.priorityHigh = document.getElementById('priority-high');
    state.elements.datetimeSection = document.getElementById('datetime-section');
    state.elements.datetimeDisplay = document.getElementById('datetime-display');
    state.elements.tagsSection = document.getElementById('tags-section');
    state.elements.saveBtn = document.getElementById('save-btn');
    state.elements.cancelBtn = document.getElementById('cancel-btn');
  }

  function setupEventListeners() {
    // Task input with auto-save
    state.elements.taskInput.addEventListener('input', debounce(handleTaskInput, 500));
    state.elements.taskInput.addEventListener('keydown', handleTaskInputKeydown);
    
    // Priority buttons
    state.elements.priorityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setPriority(btn.id.replace('priority-', ''));
      });
    });
    
    // Date/time section (placeholder for now - would open a date picker)
    state.elements.datetimeSection.addEventListener('click', openDateTimePicker);
    
    // Tags section (placeholder for now - would open tag input)
    state.elements.tagsSection.addEventListener('click', openTagInput);
    
    // Save button
    state.elements.saveBtn.addEventListener('click', saveTask);
    
    // Cancel button
    state.elements.cancelBtn.addEventListener('click', cancelTask);
  }

  function initializeDefaults() {
    // Set initial priority UI
    setPriority('medium');
    
    // Set initial date/time (tomorrow at 3:00 PM as example)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0);
    state.dateTime = tomorrow;
    updateDateTimeDisplay();
  }

  function handleTaskInput(e) {
    state.taskText = e.target.value;
    
    // Parse natural language for date/time and priority
    parseNaturalLanguage(state.taskText);
  }

  function handleTaskInputKeydown(e) {
    if (e.key === 'Enter' && state.taskText.trim() !== '') {
      e.preventDefault();
      saveTask();
    }
  }

  function setPriority(level) {
    state.priority = level;
    
    // Update UI
    state.elements.priorityLow.classList.toggle('bg-accent', level === 'low');
    state.elements.priorityLow.classList.toggle('text-[14px]', level === 'low');
    state.elements.priorityLow.classList.toggle('font-medium', level === 'low');
    state.elements.priorityLow.classList.toggle('border-2', level === 'low');
    state.elements.priorityLow.classList.toggle('border-chart-2/50', level === 'low');
    state.elements.priorityLow.classList.toggle('text-chart-2', level === 'low');
    
    state.elements.priorityMedium.classList.toggle('bg-accent', level === 'medium');
    state.elements.priorityMedium.classList.toggle('text-[14px]', level === 'medium');
    state.elements.priorityMedium.classList.toggle('font-medium', level === 'medium');
    state.elements.priorityMedium.classList.toggle('border-2', level === 'medium');
    state.elements.priorityMedium.classList.toggle('border-chart-3/50', level === 'medium');
    state.elements.priorityMedium.classList.toggle('text-chart-3', level === 'medium');
    
    state.elements.priorityHigh.classList.toggle('bg-accent', level === 'high');
    state.elements.priorityHigh.classList.toggle('text-[14px]', level === 'high');
    state.elements.priorityHigh.classList.toggle('font-semibold', level === 'high');
    state.elements.priorityHigh.classList.toggle('border-2', level === 'high');
    state.elements.priorityHigh.classList.toggle('border-chart-4/50', level === 'high');
    state.elements.priorityHigh.classList.toggle('text-chart-4', level === 'high');
  }

  function parseNaturalLanguage(text) {
    // Reset to defaults
    setPriority('medium');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0);
    state.dateTime = tomorrow;
    state.tags = [];
    
    // Parse for priority indicators
    if (text.includes('!high') || text.includes('!important') || text.includes('!!')) {
      setPriority('high');
      text = text.replace(/!high|!important|!!/gi, '').trim();
    } else if (text.includes('!low')) {
      setPriority('low');
      text = text.replace(/!low/gi, '').trim();
    } else if (text.includes('!medium')) {
      setPriority('medium');
      text = text.replace(/!medium/gi, '').trim();
    }
    
    // Parse for date indicators
    const dateMatch = text.match(/(today|tomorrow|next\s+week|mon|tue|wed|thu|fri|sat|sun)/i);
    if (dateMatch) {
      const day = dateMatch[1].toLowerCase();
      if (day === 'today') {
        state.dateTime = new Date(now);
        state.dateTime.setHours(now.getHours() + 1, 0, 0); // Default to 1 hour from now
      } else if (day === 'tomorrow') {
        state.dateTime = new Date(tomorrow);
        state.dateTime.setHours(15, 0, 0); // Default to 3 PM
      }
      // Could add more date parsing here
      
      // Remove the matched date text from input
      text = text.replace(dateMatch[0], '').trim();
    }
    
    // Parse for tags
    const tagMatches = text.match(/#\w+/g);
    if (tagMatches) {
      state.tags = tagMatches;
      // Remove tags from input text
      text = text.replace(/#\w+/g, '').trim();
    }
    
    // Update input text (cleaned version)
    state.elements.taskInput.value = text;
    state.taskText = text;
    
    // Update displays
    updateDateTimeDisplay();
  }

  function updateDateTimeDisplay() {
    if (!state.dateTime) {
      state.elements.datetimeDisplay.textContent = 'Set Date & Time';
      return;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(state.dateTime.getFullYear(), state.dateTime.getMonth(), state.dateTime.getDate());
    
    let displayText;
    
    if (taskDate.getTime() === today.getTime()) {
      displayText = `Today, ${state.dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (taskDate.getTime() === tomorrow.getTime()) {
        displayText = `Tomorrow, ${state.dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      } else {
        displayText = state.dateTime.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) + 
                     ', ' + state.dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
    }
    
    state.elements.datetimeDisplay.textContent = displayText;
  }

  function openDateTimePicker() {
    // Placeholder - in a real app, this would open a date/time picker modal
    alert('Date/Time picker would open here');
  }

  function openTagInput() {
    // Placeholder - in a real app, this would open a tag input modal
    alert('Tag input would open here');
  }

  async function saveTask() {
    if (state.isSaving) return;
    
    if (!state.taskText.trim()) {
      showError('Please enter a task description');
      return;
    }
    
    state.isSaving = true;
    state.elements.saveBtn.disabled = true;
    state.elements.saveBtn.textContent = 'Saving...';
    
    try {
      const newTask = {
        id: Date.now(), // Simple ID generation - in real app use UUID or DB ID
        text: state.taskText.trim(),
        completed: false,
        priority: state.priority,
        tags: [...state.tags],
        date: state.dateTime ? state.dateTime.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        time: state.dateTime ? formatTimeForDisplay(state.dateTime) : 'Today'
      };
      
      // Save to localStorage (in real app, this would be an API call)
      const storedTasks = localStorage.getItem('tasks');
      const tasks = storedTasks ? JSON.parse(storedTasks) : [];
      tasks.push(newTask);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      
      // Provide feedback
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
      // Close the window or go back
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.close();
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      showError('Failed to save task');
    } finally {
      state.isSaving = false;
      state.elements.saveBtn.disabled = false;
      state.elements.saveBtn.textContent = 'Add';
    }
  }

  function formatTimeForDisplay(date) {
    if (!date) return 'Today';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (taskDate.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
      } else {
        return date.toLocaleDateString();
      }
    }
  }

  function cancelTask() {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.close();
    } else {
      window.location.href = '/';
    }
  }

  function showError(message) {
    // Simple toast-like error display
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'error-toast fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive/90 text-primary-foreground px-4 py-2 rounded-md text-[14px] z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Debounce function for performance
  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Expose essential functions globally for debugging (remove in production)
  window.__NEW_TASK_STATE__ = state;
})();