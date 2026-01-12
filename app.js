/**
 * Furry Events Calendar 2026
 * A beautiful static calendar for displaying community events
 */

// ============================================
// Constants & Configuration
// ============================================

const YEAR = 2026;
const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ============================================
// State
// ============================================

let eventsData = { events: [], categories: [] };
let activeFilters = new Set();
let currentMonth = null; // null = year view, 0-11 = month view

// ============================================
// DOM Elements
// ============================================

const elements = {
  yearView: document.getElementById('year-view'),
  monthView: document.getElementById('month-view'),
  monthsGrid: document.getElementById('months-grid'),
  monthGrid: document.getElementById('month-grid'),
  monthEventList: document.getElementById('month-event-list'),
  monthTitle: document.getElementById('month-title'),
  backToYear: document.getElementById('back-to-year'),
  prevMonth: document.getElementById('prev-month'),
  nextMonth: document.getElementById('next-month'),
  filterToggle: document.getElementById('filter-toggle'),
  filterPanel: document.getElementById('filter-panel'),
  filterCount: document.getElementById('filter-count'),
  categoryFilters: document.getElementById('category-filters'),
  themeToggle: document.getElementById('theme-toggle'),
  modal: document.getElementById('event-modal'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalClose: document.getElementById('modal-close'),
  modalTitle: document.getElementById('modal-title'),
  modalCategory: document.getElementById('modal-category'),
  modalCategoryDot: document.getElementById('modal-category-dot'),
  modalDate: document.getElementById('modal-date'),
  modalLocation: document.getElementById('modal-location'),
  modalDescription: document.getElementById('modal-description'),
  modalLink: document.getElementById('modal-link'),
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
 * Format date for display
 */
function formatDate(dateStr) {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format date range
 */
function formatDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (startDate === endDate) {
    return formatDate(startDate);
  }
  
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
  }
  
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

/**
 * Get first day of month (0 = Monday, 6 = Sunday)
 */
function getFirstDayOfMonth(year, month) {
  const date = new Date(year, month, 1);
  return (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
}

/**
 * Get number of days in month
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Check if date is today
 */
function isToday(year, month, day) {
  const today = new Date();
  return today.getFullYear() === year && 
         today.getMonth() === month && 
         today.getDate() === day;
}

/**
 * Get events for a specific date
 */
function getEventsForDate(year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  return eventsData.events.filter(event => {
    // Check category filter
    if (activeFilters.size > 0 && !activeFilters.has(event.category)) {
      return false;
    }
    
    const startDate = event.startDate;
    const endDate = event.endDate;
    
    return dateStr >= startDate && dateStr <= endDate;
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Get events for a specific month
 */
function getEventsForMonth(year, month) {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  return eventsData.events.filter(event => {
    if (activeFilters.size > 0 && !activeFilters.has(event.category)) {
      return false;
    }
    
    const startMonth = event.startDate.substring(0, 7);
    const endMonth = event.endDate.substring(0, 7);
    
    return monthStr >= startMonth && monthStr <= endMonth;
  });
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

/**
 * Determine event position in multi-day span
 */
function getEventDayPosition(event, year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const startDate = event.startDate;
  const endDate = event.endDate;
  
  if (startDate === endDate) return 'single';
  if (dateStr === startDate) return 'start';
  if (dateStr === endDate) return 'end';
  return 'middle';
}

// ============================================
// URL State Management
// ============================================

function updateURLState() {
  const params = new URLSearchParams();
  
  if (activeFilters.size > 0) {
    params.set('categories', Array.from(activeFilters).join(','));
  }
  
  if (currentMonth !== null) {
    params.set('month', currentMonth);
  }
  
  const newURL = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  
  window.history.replaceState({}, '', newURL);
}

function loadURLState() {
  const params = new URLSearchParams(window.location.search);
  
  // Handle GitHub Pages SPA redirect (from 404.html)
  const redirectPath = params.get('p');
  const redirectQuery = params.get('q');
  if (redirectPath !== null || redirectQuery !== null) {
    // Restore the original URL and re-parse
    const restoredSearch = redirectQuery ? '?' + redirectQuery : '';
    const newURL = window.location.pathname.replace(/\/$/, '') + '/' + (redirectPath || '') + restoredSearch + window.location.hash;
    window.history.replaceState(null, '', newURL);
    // Re-parse with restored params
    const restoredParams = new URLSearchParams(restoredSearch);
    
    const categories = restoredParams.get('categories');
    if (categories) {
      categories.split(',').forEach(cat => {
        if (eventsData.categories.find(c => c.id === cat)) {
          activeFilters.add(cat);
        }
      });
    }
    
    const month = restoredParams.get('month');
    if (month !== null && !isNaN(parseInt(month))) {
      const monthNum = parseInt(month);
      if (monthNum >= 0 && monthNum <= 11) {
        currentMonth = monthNum;
      }
    }
    return;
  }
  
  const categories = params.get('categories');
  if (categories) {
    categories.split(',').forEach(cat => {
      if (eventsData.categories.find(c => c.id === cat)) {
        activeFilters.add(cat);
      }
    });
  }
  
  const month = params.get('month');
  if (month !== null && !isNaN(parseInt(month))) {
    const monthNum = parseInt(month);
    if (monthNum >= 0 && monthNum <= 11) {
      currentMonth = monthNum;
    }
  }
}

// ============================================
// Theme Management
// ============================================

function initTheme() {
  // Check for saved theme preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
    document.documentElement.classList.add('dark');
  }
  
  // Listen for system theme changes
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
  
  // Update filter count badge
  if (activeFilters.size > 0) {
    elements.filterCount.textContent = activeFilters.size;
    elements.filterCount.classList.remove('hidden');
    elements.filterCount.classList.add('flex');
  } else {
    elements.filterCount.classList.add('hidden');
    elements.filterCount.classList.remove('flex');
  }
}

/**
 * Render mini calendar for year view
 */
function renderMiniCalendar(month) {
  const firstDay = getFirstDayOfMonth(YEAR, month);
  const daysInMonth = getDaysInMonth(YEAR, month);
  const daysInPrevMonth = getDaysInMonth(YEAR, month - 1);
  const eventsInMonth = getEventsForMonth(YEAR, month);
  
  let html = WEEKDAYS_SHORT.map(day => 
    `<div class="mini-calendar-header">${day}</div>`
  ).join('');
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="mini-calendar-day other-month">${day}</div>`;
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const events = getEventsForDate(YEAR, month, day);
    const todayClass = isToday(YEAR, month, day) ? 'today' : '';
    const hasEventClass = events.length > 0 ? 'has-event' : '';
    const eventColor = events.length > 0 ? events[0].color : '';
    
    // Check for multi-day events
    const hasMultiDay = events.some(e => e.startDate !== e.endDate);
    const multiClass = hasMultiDay ? 'has-multi-event' : '';
    
    html += `
      <div 
        class="mini-calendar-day ${todayClass} ${hasEventClass} ${multiClass}"
        ${eventColor ? `style="--event-color: ${eventColor}"` : ''}
      >${day}</div>
    `;
  }
  
  // Next month days - always fill to 6 weeks (42 cells)
  const totalCells = firstDay + daysInMonth;
  const remainingCells = 42 - totalCells;
  
  for (let day = 1; day <= remainingCells; day++) {
    html += `<div class="mini-calendar-day other-month">${day}</div>`;
  }
  
  return html;
}

/**
 * Render event list for year view
 */
function renderEventList(month) {
  const events = getEventsForMonth(YEAR, month);
  
  if (events.length === 0) {
    return '<div class="event-list-empty">Нет событий</div>';
  }
  
  // Sort events by start date
  const sortedEvents = events.sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  return sortedEvents.map(event => {
    const category = getCategoryById(event.category);
    const startDay = parseInt(event.startDate.split('-')[2]);
    const endDay = parseInt(event.endDate.split('-')[2]);
    const startMonth = parseInt(event.startDate.split('-')[1]) - 1;
    const endMonth = parseInt(event.endDate.split('-')[1]) - 1;
    
    // Format date display
    let dateDisplay;
    if (event.startDate === event.endDate) {
      dateDisplay = startDay;
    } else if (startMonth === endMonth) {
      dateDisplay = `${startDay}–${endDay}`;
    } else {
      dateDisplay = `${startDay}.${String(startMonth + 1).padStart(2, '0')}–${endDay}.${String(endMonth + 1).padStart(2, '0')}`;
    }
    
    return `
      <button 
        class="event-list-item"
        data-event-id="${event.id}"
        style="--event-color: ${event.color || category.color}"
        title="${event.title}"
      >
        <span class="event-list-date">${dateDisplay}</span>
        <span class="event-list-dot"></span>
        <span class="event-list-title">${event.title}</span>
      </button>
    `;
  }).join('');
}

/**
 * Render year view with all months
 */
function renderYearView() {
  elements.monthsGrid.innerHTML = MONTHS_RU.map((monthName, index) => {
    const eventsCount = getEventsForMonth(YEAR, index).length;
    
    return `
      <article 
        class="month-card stagger-${index + 1}"
        data-month="${index}"
        aria-label="${monthName} ${YEAR}, ${eventsCount} событий"
      >
        <header class="month-card-header" role="button" tabindex="0">
          <h2 class="month-card-title">${monthName}</h2>
          ${eventsCount >= 0 ? `<span class="month-card-events-count">${eventsCount}</span>` : ''}
        </header>
        <div class="mini-calendar" role="button" tabindex="0">
          ${renderMiniCalendar(index)}
        </div>
        <div class="event-list">
          ${renderEventList(index)}
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Render event list for month view (larger format)
 */
function renderMonthEventList(month) {
  const events = getEventsForMonth(YEAR, month);
  
  if (events.length === 0) {
    return '<div class="month-event-list-empty">Нет событий в этом месяце</div>';
  }
  
  // Sort events by start date
  const sortedEvents = events.sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  return sortedEvents.map(event => {
    const category = getCategoryById(event.category);
    const dateRange = formatDateRange(event.startDate, event.endDate);
    
    return `
      <button 
        class="month-event-list-item"
        data-event-id="${event.id}"
        style="--event-color: ${event.color || category.color}"
      >
        <span class="month-event-list-dot"></span>
        <div class="month-event-list-content">
          <span class="month-event-list-title">${event.title}</span>
          <span class="month-event-list-date">${dateRange}</span>
        </div>
        <span class="month-event-list-category">${category.name}</span>
      </button>
    `;
  }).join('');
}

/**
 * Render full month view
 */
function renderMonthView() {
  if (currentMonth === null) return;
  
  const month = currentMonth;
  const firstDay = getFirstDayOfMonth(YEAR, month);
  const daysInMonth = getDaysInMonth(YEAR, month);
  const daysInPrevMonth = getDaysInMonth(YEAR, month === 0 ? 11 : month - 1);
  
  elements.monthTitle.textContent = `${MONTHS_RU[month]} ${YEAR}`;
  
  let html = '';
  
  // Previous month days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? YEAR - 1 : YEAR;
  
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const events = getEventsForDate(prevYear, prevMonth, day);
    html += renderDayCell(prevYear, prevMonth, day, events, true);
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const events = getEventsForDate(YEAR, month, day);
    html += renderDayCell(YEAR, month, day, events, false);
  }
  
  // Next month days - always fill to 6 weeks (42 cells)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? YEAR + 1 : YEAR;
  const totalCells = firstDay + daysInMonth;
  const remainingCells = 42 - totalCells;
  
  for (let day = 1; day <= remainingCells; day++) {
    const events = getEventsForDate(nextYear, nextMonth, day);
    html += renderDayCell(nextYear, nextMonth, day, events, true);
  }
  
  elements.monthGrid.innerHTML = html;
  elements.monthEventList.innerHTML = renderMonthEventList(month);
}

/**
 * Render a single day cell
 */
function renderDayCell(year, month, day, events, isOtherMonth) {
  const todayClass = isToday(year, month, day) ? 'today' : '';
  const otherMonthClass = isOtherMonth ? 'other-month' : '';
  
  const maxVisible = 3;
  const visibleEvents = events.slice(0, maxVisible);
  const hiddenCount = events.length - maxVisible;
  
  const eventsHtml = visibleEvents.map(event => {
    const category = getCategoryById(event.category);
    const position = getEventDayPosition(event, year, month, day);
    const positionClass = position !== 'single' ? `multi-day multi-day-${position}` : '';
    
    // Calculate background with opacity
    const bgColor = event.color || category.color;
    
    return `
      <button 
        class="event-item ${positionClass}"
        data-event-id="${event.id}"
        style="--event-bg: ${bgColor}"
        title="${event.title}"
      >
        <span class="event-title">${event.title}</span>
      </button>
    `;
  }).join('');
  
  const moreHtml = hiddenCount > 0 
    ? `<button class="more-events" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">+${hiddenCount} ещё</button>`
    : '';
  
  return `
    <div class="month-day-cell ${todayClass} ${otherMonthClass}">
      <div class="day-number">${day}</div>
      <div class="event-container">
        ${eventsHtml}
        ${moreHtml}
      </div>
    </div>
  `;
}

// ============================================
// Modal Functions
// ============================================

function showEventModal(eventId) {
  const event = eventsData.events.find(e => e.id === eventId);
  if (!event) return;
  
  const category = getCategoryById(event.category);
  
  elements.modalTitle.textContent = event.title;
  elements.modalCategory.textContent = category.name;
  elements.modalCategoryDot.style.backgroundColor = event.color || category.color;
  elements.modalDate.textContent = formatDateRange(event.startDate, event.endDate);
  elements.modalLocation.textContent = event.location;
  elements.modalDescription.textContent = event.description;
  elements.modalLink.href = event.url;
  
  elements.modal.classList.remove('hidden', 'hiding');
  elements.modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Focus trap
  elements.modalClose.focus();
}

function hideEventModal() {
  elements.modal.classList.add('hiding');
  
  setTimeout(() => {
    elements.modal.classList.remove('show', 'hiding');
    elements.modal.classList.add('hidden');
    document.body.style.overflow = '';
  }, 200);
}

// ============================================
// View Navigation
// ============================================

function showYearView() {
  currentMonth = null;
  
  elements.monthView.classList.add('hidden');
  elements.monthView.classList.remove('showing');
  elements.yearView.classList.remove('hidden');
  elements.backToYear.classList.add('hidden');
  elements.backToYear.classList.remove('flex');
  
  renderYearView();
  updateURLState();
}

function showMonthView(month) {
  currentMonth = month;
  
  elements.yearView.classList.add('hidden');
  elements.monthView.classList.remove('hidden');
  elements.monthView.classList.add('showing');
  elements.backToYear.classList.remove('hidden');
  elements.backToYear.classList.add('flex');
  
  renderMonthView();
  updateURLState();
}

function navigateMonth(direction) {
  if (currentMonth === null) return;
  
  let newMonth = currentMonth + direction;
  
  if (newMonth < 0) newMonth = 11;
  if (newMonth > 11) newMonth = 0;
  
  showMonthView(newMonth);
}

// ============================================
// Event Handlers
// ============================================

function handleMonthCardClick(e) {
  // Check if clicking on an event list item
  const eventListItem = e.target.closest('.event-list-item');
  if (eventListItem) {
    e.stopPropagation();
    const eventId = eventListItem.dataset.eventId;
    showEventModal(eventId);
    return;
  }
  
  // Check if clicking on the header or calendar to navigate to month view
  const clickableArea = e.target.closest('.month-card-header, .mini-calendar');
  if (!clickableArea) return;
  
  const monthCard = e.target.closest('.month-card');
  if (!monthCard) return;
  
  const month = parseInt(monthCard.dataset.month);
  showMonthView(month);
}

function handleEventClick(e) {
  const eventItem = e.target.closest('.event-item');
  if (!eventItem) return;
  
  e.stopPropagation();
  const eventId = eventItem.dataset.eventId;
  showEventModal(eventId);
}

function handleMonthEventListClick(e) {
  const eventItem = e.target.closest('.month-event-list-item');
  if (!eventItem) return;
  
  const eventId = eventItem.dataset.eventId;
  showEventModal(eventId);
}

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
  
  if (currentMonth !== null) {
    renderMonthView();
  } else {
    renderYearView();
  }
  
  updateURLState();
}

function toggleFilterPanel() {
  const isExpanded = elements.filterPanel.classList.toggle('hidden');
  elements.filterToggle.setAttribute('aria-expanded', !isExpanded);
}

// ============================================
// Keyboard Navigation
// ============================================

function handleKeyboard(e) {
  // Modal open - handle modal keys
  if (elements.modal.classList.contains('show')) {
    if (e.key === 'Escape') {
      hideEventModal();
    }
    return;
  }
  
  // Month view navigation
  if (currentMonth !== null) {
    if (e.key === 'ArrowLeft') {
      navigateMonth(-1);
    } else if (e.key === 'ArrowRight') {
      navigateMonth(1);
    } else if (e.key === 'Escape') {
      showYearView();
    }
    return;
  }
  
  // Year view - Enter/Space on focused elements
  if (e.key === 'Enter' || e.key === ' ') {
    const focused = document.activeElement;
    if (focused.classList.contains('month-card-header') || focused.classList.contains('mini-calendar')) {
      e.preventDefault();
      handleMonthCardClick({ target: focused });
    }
    if (focused.classList.contains('event-list-item')) {
      e.preventDefault();
      const eventId = focused.dataset.eventId;
      showEventModal(eventId);
    }
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
    
    // Render filters
    renderFilters();
    
    // Render initial view
    if (currentMonth !== null) {
      showMonthView(currentMonth);
    } else {
      renderYearView();
    }
    
    // Event listeners
    elements.monthsGrid.addEventListener('click', handleMonthCardClick);
    elements.monthsGrid.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleMonthCardClick(e);
      }
    });
    
    elements.monthGrid.addEventListener('click', handleEventClick);
    elements.monthEventList.addEventListener('click', handleMonthEventListClick);
    elements.categoryFilters.addEventListener('click', handleFilterClick);
    elements.filterToggle.addEventListener('click', toggleFilterPanel);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.backToYear.addEventListener('click', showYearView);
    elements.prevMonth.addEventListener('click', () => navigateMonth(-1));
    elements.nextMonth.addEventListener('click', () => navigateMonth(1));
    
    // Modal listeners
    elements.modalClose.addEventListener('click', hideEventModal);
    elements.modalBackdrop.addEventListener('click', hideEventModal);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      loadURLState();
      if (currentMonth !== null) {
        showMonthView(currentMonth);
      } else {
        showYearView();
      }
    });
    
  } catch (error) {
    console.error('Failed to initialize calendar:', error);
    elements.monthsGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500 mb-2">Ошибка загрузки данных</p>
        <p class="text-stone-500 text-sm">Убедитесь, что файл events.json находится в корне проекта</p>
      </div>
    `;
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
