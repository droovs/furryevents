/**
 * Furry Events List Page
 * Displays all events in a filterable table view
 */

// ============================================
// Constants & Configuration
// ============================================

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const MONTHS_RU_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
];

// ============================================
// State
// ============================================

let eventsData = { events: [], categories: [] };
let activeFilters = new Set();

// ============================================
// DOM Elements
// ============================================

const elements = {
  categoryFilters: document.getElementById('category-filters'),
  eventsBody: document.getElementById('events-body'),
  uncertainSection: document.getElementById('uncertain-section'),
  uncertainBody: document.getElementById('uncertain-body'),
  themeToggle: document.getElementById('theme-toggle'),
};

// ============================================
// Utility Functions
// ============================================

/**
 * Parse date string to Date object
 */
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if event has a valid date
 */
function hasValidDate(event) {
  return event.startDate && event.startDate.trim() !== '' && 
         event.endDate && event.endDate.trim() !== '';
}

/**
 * Format date range for display
 */
function formatDateRange(startDate, endDate, isUncertain = false) {
  // Handle missing dates
  if (!startDate || startDate.trim() === '' || !endDate || endDate.trim() === '') {
    return 'Дата не определена';
  }
  
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const uncertainPrefix = isUncertain ? '≈ ' : '';
  
  if (startDate === endDate) {
    return `${uncertainPrefix}${start.getDate()} ${MONTHS_RU[start.getMonth()]}`;
  }
  
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${uncertainPrefix}${start.getDate()}–${end.getDate()} ${MONTHS_RU[start.getMonth()]}`;
  }
  
  return `${uncertainPrefix}${start.getDate()} ${MONTHS_RU_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_RU_SHORT[end.getMonth()]}`;
}

/**
 * Get category info by ID
 */
function getCategoryById(categoryId) {
  return eventsData.categories.find(cat => cat.id === categoryId) || {
    id: categoryId,
    name: categoryId,
    color: '#6b7280'
  };
}

// ============================================
// Theme Management
// ============================================

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
    document.documentElement.classList.add('dark');
  }
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// ============================================
// Render Functions
// ============================================

/**
 * Render category filters
 */
function renderFilters() {
  elements.categoryFilters.innerHTML = eventsData.categories.map(category => `
    <button 
      class="filter-btn ${activeFilters.has(category.id) ? 'active' : ''}"
      data-category="${category.id}"
      style="--filter-color: ${category.color}"
      aria-pressed="${activeFilters.has(category.id)}"
    >
      <span class="filter-dot"></span>
      <span>${category.name}</span>
    </button>
  `).join('');
}

/**
 * Render single event row
 */
function renderEventRow(event, isUncertain = false) {
  const category = getCategoryById(event.category);
  const eventHasDate = hasValidDate(event);
  const dateText = eventHasDate 
    ? formatDateRange(event.startDate, event.endDate, isUncertain)
    : 'Дата не определена';
  const hasLink = event.url && event.url.trim() !== '';
  
  const uncertainBadge = isUncertain 
    ? `<span class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>не подтв.</span>
       </span>`
    : '';
  
  const dateClass = !eventHasDate ? 'text-amber-600 dark:text-amber-400' : 'text-stone-600 dark:text-stone-400';
  
  return `
    <tr class="border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${event.color || category.color}"></span>
          <span class="font-medium text-stone-900 dark:text-stone-100">${event.title}</span>
          ${uncertainBadge}
        </div>
      </td>
      <td class="px-6 py-4 ${dateClass} font-mono text-sm whitespace-nowrap">
        ${dateText}
      </td>
      <td class="px-6 py-4 hidden sm:table-cell">
        <span class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full" 
              style="background-color: ${category.color}20; color: ${category.color}">
          ${category.name}
        </span>
      </td>
      <td class="px-6 py-4 text-stone-600 dark:text-stone-400 hidden md:table-cell">
        ${event.location || '—'}
      </td>
      <td class="px-6 py-4">
        ${hasLink ? `
          <a href="${event.url}" target="_blank" rel="noopener noreferrer" 
             class="inline-flex items-center gap-1 text-accent hover:text-accent-dark transition-colors">
            <span>Открыть</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </a>
        ` : `<span class="text-stone-400 dark:text-stone-600">—</span>`}
      </td>
    </tr>
  `;
}

/**
 * Render events table
 */
function renderEvents() {
  // Filter events based on active categories
  let filteredEvents = eventsData.events;
  if (activeFilters.size > 0) {
    filteredEvents = filteredEvents.filter(event => activeFilters.has(event.category));
  }
  
  // Separate confirmed and uncertain events
  const confirmedEvents = filteredEvents.filter(event => !event.dateUncertain);
  const uncertainEvents = filteredEvents.filter(event => event.dateUncertain);
  
  // Sort by start date (handle missing dates)
  const sortByDate = (a, b) => {
    const aHasDate = hasValidDate(a);
    const bHasDate = hasValidDate(b);
    
    if (aHasDate && bHasDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    if (aHasDate) return -1;
    if (bHasDate) return 1;
    return a.title.localeCompare(b.title);
  };
  
  confirmedEvents.sort(sortByDate);
  uncertainEvents.sort(sortByDate);
  
  // Render confirmed events
  if (confirmedEvents.length === 0) {
    elements.eventsBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
          Нет событий для отображения
        </td>
      </tr>
    `;
  } else {
    elements.eventsBody.innerHTML = confirmedEvents.map(event => renderEventRow(event, false)).join('');
  }
  
  // Render uncertain events section
  if (uncertainEvents.length > 0) {
    elements.uncertainSection.classList.remove('hidden');
    elements.uncertainBody.innerHTML = uncertainEvents.map(event => renderEventRow(event, true)).join('');
  } else {
    elements.uncertainSection.classList.add('hidden');
  }
}

// ============================================
// Event Handlers
// ============================================

function handleFilterClick(e) {
  const filterBtn = e.target.closest('.filter-btn');
  if (!filterBtn) return;
  
  const category = filterBtn.dataset.category;
  
  if (activeFilters.has(category)) {
    activeFilters.delete(category);
  } else {
    activeFilters.add(category);
  }
  
  renderFilters();
  renderEvents();
  
  // Update URL
  const params = new URLSearchParams();
  if (activeFilters.size > 0) {
    params.set('categories', Array.from(activeFilters).join(','));
  }
  const newURL = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, '', newURL);
}

function loadURLState() {
  const params = new URLSearchParams(window.location.search);
  const categories = params.get('categories');
  
  if (categories) {
    categories.split(',').forEach(cat => {
      if (eventsData.categories.find(c => c.id === cat)) {
        activeFilters.add(cat);
      }
    });
  }
}

// ============================================
// Initialization
// ============================================

async function init() {
  try {
    // Load events data
    const response = await fetch('events.json');
    if (!response.ok) throw new Error('Failed to load events');
    eventsData = await response.json();
    
    // Initialize theme
    initTheme();
    
    // Load URL state
    loadURLState();
    
    // Render filters and events
    renderFilters();
    renderEvents();
    
    // Event listeners
    elements.categoryFilters.addEventListener('click', handleFilterClick);
    elements.themeToggle.addEventListener('click', toggleTheme);
    
  } catch (error) {
    console.error('Failed to initialize events page:', error);
    elements.eventsBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center">
          <p class="text-red-500 mb-2">Ошибка загрузки данных</p>
          <p class="text-stone-500 text-sm">Убедитесь, что файл events.json находится в корне проекта</p>
        </td>
      </tr>
    `;
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
