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
  homeLink: document.getElementById('home-link'),
  uncertainEventsSection: document.getElementById('uncertain-events-section'),
  uncertainEventsBody: document.getElementById('uncertain-events-body'),
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
 * Check if event has a valid date
 */
function hasValidDate(event) {
  return event.startDate && event.startDate.trim() !== '' && 
         event.endDate && event.endDate.trim() !== '';
}

/**
 * Format date range
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
    return uncertainPrefix + formatDate(startDate);
  }
  
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${uncertainPrefix}${start.getDate()}–${end.getDate()} ${start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
  }
  
  return `${uncertainPrefix}${formatDate(startDate)} – ${formatDate(endDate)}`;
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
 * Get events for a specific date (excludes uncertain events)
 */
function getEventsForDate(year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  return eventsData.events.filter(event => {
    // Exclude uncertain events from calendar
    if (event.dateUncertain) {
      return false;
    }
    
    // Check category filter
    if (activeFilters.size > 0 && !activeFilters.has(event.category)) {
      return false;
    }
    
    // Check if event has valid dates
    if (!hasValidDate(event)) {
      return false;
    }
    
    const startDate = event.startDate;
    const endDate = event.endDate;
    
    return dateStr >= startDate && dateStr <= endDate;
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Get events for a specific month (excludes uncertain events)
 */
function getEventsForMonth(year, month) {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  return eventsData.events.filter(event => {
    // Exclude uncertain events from month display
    if (event.dateUncertain) {
      return false;
    }
    
    if (activeFilters.size > 0 && !activeFilters.has(event.category)) {
      return false;
    }
    
    // Check if event has valid dates
    if (!hasValidDate(event)) {
      return false;
    }
    
    const startMonth = event.startDate.substring(0, 7);
    const endMonth = event.endDate.substring(0, 7);
    
    return monthStr >= startMonth && monthStr <= endMonth;
  });
}

/**
 * Get all uncertain events
 */
function getUncertainEvents() {
  return eventsData.events.filter(event => {
    if (!event.dateUncertain) {
      return false;
    }
    
    if (activeFilters.size > 0 && !activeFilters.has(event.category)) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by start date if available, otherwise put dateless events at the end
    const aHasDate = hasValidDate(a);
    const bHasDate = hasValidDate(b);
    
    if (aHasDate && bHasDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    if (aHasDate) return -1;
    if (bHasDate) return 1;
    return a.title.localeCompare(b.title);
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
    
    // Check if all events on this day are uncertain
    const hasUncertain = events.some(e => e.dateUncertain);
    const allUncertain = events.length > 0 && events.every(e => e.dateUncertain);
    const uncertainClass = allUncertain ? 'all-uncertain' : (hasUncertain ? 'has-uncertain' : '');
    
    html += `
      <div 
        class="mini-calendar-day ${todayClass} ${hasEventClass} ${multiClass} ${uncertainClass}"
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
 * Render single event list item
 */
function renderEventListItem(event, category) {
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
  
  // Add uncertain prefix
  if (event.dateUncertain) {
    dateDisplay = '≈' + dateDisplay;
  }
  
  const uncertainClass = event.dateUncertain ? 'uncertain' : '';
  
  return `
    <button 
      class="event-list-item ${uncertainClass}"
      data-event-id="${event.id}"
      style="--event-color: ${event.color || category.color}"
      title="${event.title}${event.dateUncertain ? ' (дата не подтверждена)' : ''}"
    >
      <span class="event-list-date">${dateDisplay}</span>
      <span class="event-list-dot"></span>
      <span class="event-list-title">${event.title}</span>
      ${event.dateUncertain ? '<span class="event-uncertain-badge">?</span>' : ''}
    </button>
  `;
}

/**
 * Render event list for year view
 */
function renderEventList(month) {
  const events = getEventsForMonth(YEAR, month);
  
  if (events.length === 0) {
    return '<div class="event-list-empty">Нет событий</div>';
  }
  
  // Separate confirmed and uncertain events
  const confirmedEvents = events.filter(e => !e.dateUncertain);
  const uncertainEvents = events.filter(e => e.dateUncertain);
  
  // Sort each group by start date
  confirmedEvents.sort((a, b) => a.startDate.localeCompare(b.startDate));
  uncertainEvents.sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  let html = '';
  
  // Render confirmed events first
  html += confirmedEvents.map(event => {
    const category = getCategoryById(event.category);
    return renderEventListItem(event, category);
  }).join('');
  
  // Render uncertain events at bottom with separator if there are any
  if (uncertainEvents.length > 0 && confirmedEvents.length > 0) {
    html += '<div class="uncertain-divider"><span>даты уточняются</span></div>';
  }
  
  html += uncertainEvents.map(event => {
    const category = getCategoryById(event.category);
    return renderEventListItem(event, category);
  }).join('');
  
  return html;
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
  
  // Render uncertain events section
  renderUncertainEventsSection();
}

/**
 * Render uncertain events table row
 */
function renderUncertainEventRow(event) {
  const category = getCategoryById(event.category);
  const hasDate = hasValidDate(event);
  const dateText = hasDate 
    ? `≈ ${formatDateRange(event.startDate, event.endDate, false)}`
    : 'Дата не определена';
  const hasLink = event.url && event.url.trim() !== '';
  
  return `
    <tr class="border-b border-stone-100 dark:border-stone-800 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer uncertain-event-row" data-event-id="${event.id}">
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${event.color || category.color}"></span>
          <span class="font-medium text-stone-900 dark:text-stone-100">${event.title}</span>
        </div>
      </td>
      <td class="px-6 py-4 text-stone-600 dark:text-stone-400 font-mono text-sm whitespace-nowrap">
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
             class="inline-flex items-center gap-1 text-accent hover:text-accent-dark transition-colors"
             onclick="event.stopPropagation()">
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
 * Render the uncertain events section
 */
function renderUncertainEventsSection() {
  const uncertainEvents = getUncertainEvents();
  
  if (uncertainEvents.length === 0) {
    elements.uncertainEventsSection.classList.add('hidden');
    return;
  }
  
  elements.uncertainEventsSection.classList.remove('hidden');
  elements.uncertainEventsBody.innerHTML = uncertainEvents.map(event => renderUncertainEventRow(event)).join('');
}

/**
 * Render event list for month view (larger format)
 */
function renderMonthEventList(month) {
  const events = getEventsForMonth(YEAR, month);
  
  if (events.length === 0) {
    return '<div class="month-event-list-empty">Нет событий в этом месяце</div>';
  }
  
  // Separate confirmed and uncertain events
  const confirmedEvents = events.filter(e => !e.dateUncertain);
  const uncertainEvents = events.filter(e => e.dateUncertain);
  
  // Sort each group by start date
  confirmedEvents.sort((a, b) => a.startDate.localeCompare(b.startDate));
  uncertainEvents.sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  const renderItem = (event) => {
    const category = getCategoryById(event.category);
    const dateRange = formatDateRange(event.startDate, event.endDate, event.dateUncertain);
    const uncertainClass = event.dateUncertain ? 'uncertain' : '';
    
    return `
      <button 
        class="month-event-list-item ${uncertainClass}"
        data-event-id="${event.id}"
        style="--event-color: ${event.color || category.color}"
      >
        <span class="month-event-list-dot"></span>
        <div class="month-event-list-content">
          <span class="month-event-list-title">
            ${event.title}
            ${event.dateUncertain ? '<span class="month-uncertain-badge">дата не подтверждена</span>' : ''}
          </span>
          <span class="month-event-list-date">${dateRange}</span>
        </div>
        <span class="month-event-list-category">${category.name}</span>
      </button>
    `;
  };
  
  let html = confirmedEvents.map(renderItem).join('');
  
  // Add uncertain section if there are uncertain events
  if (uncertainEvents.length > 0) {
    if (confirmedEvents.length > 0) {
      html += `
        <div class="month-uncertain-section">
          <div class="month-uncertain-header">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Даты ещё не подтверждены</span>
          </div>
        </div>
      `;
    }
    html += uncertainEvents.map(renderItem).join('');
  }
  
  return html;
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
    const uncertainClass = event.dateUncertain ? 'uncertain' : '';
    
    // Calculate background with opacity
    const bgColor = event.color || category.color;
    
    return `
      <button 
        class="event-item ${positionClass} ${uncertainClass}"
        data-event-id="${event.id}"
        style="--event-bg: ${bgColor}"
        title="${event.title}${event.dateUncertain ? ' (дата не подтверждена)' : ''}"
      >
        <span class="event-title">${event.title}</span>
        ${event.dateUncertain && position !== 'middle' && position !== 'end' ? '<span class="event-uncertain-mark">?</span>' : ''}
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
  
  // Handle uncertain dates and missing dates
  const eventHasDate = hasValidDate(event);
  let dateHtml;
  
  if (!eventHasDate) {
    dateHtml = '<span class="text-amber-600 dark:text-amber-400">Дата ещё не определена</span>';
  } else if (event.dateUncertain) {
    const dateText = formatDateRange(event.startDate, event.endDate, true);
    dateHtml = `${dateText} <span class="inline-flex items-center ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">дата не подтверждена</span>`;
  } else {
    dateHtml = formatDateRange(event.startDate, event.endDate, false);
  }
  
  elements.modalDate.innerHTML = dateHtml;
  
  elements.modalLocation.textContent = event.location || 'Не указано';
  elements.modalDescription.textContent = event.description || 'Описание пока недоступно';
  elements.modalLink.href = event.url;
  
  // Hide link if no URL
  if (!event.url || event.url.trim() === '') {
    elements.modalLink.classList.add('hidden');
  } else {
    elements.modalLink.classList.remove('hidden');
  }
  
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

/**
 * Handle click on uncertain event row
 */
function handleUncertainEventClick(e) {
  const row = e.target.closest('.uncertain-event-row');
  if (!row) return;
  
  // Don't trigger if clicking on a link
  if (e.target.closest('a')) return;
  
  const eventId = row.dataset.eventId;
  showEventModal(eventId);
}

function showMonthView(month) {
  currentMonth = month;
  
  elements.yearView.classList.add('hidden');
  elements.monthView.classList.remove('hidden');
  elements.monthView.classList.add('showing');
  elements.backToYear.classList.remove('hidden');
  elements.backToYear.classList.add('flex');
  
  // Hide uncertain events section in month view
  elements.uncertainEventsSection.classList.add('hidden');
  
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

/**
 * Navigate to home (year view)
 */
function handleHomeClick(e) {
  e.preventDefault();
  showYearView();
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
    elements.uncertainEventsBody.addEventListener('click', handleUncertainEventClick);
    elements.categoryFilters.addEventListener('click', handleFilterClick);
    elements.filterToggle.addEventListener('click', toggleFilterPanel);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.backToYear.addEventListener('click', showYearView);
    elements.homeLink.addEventListener('click', handleHomeClick);
    
    elements.prevMonth.addEventListener('click', () => navigateMonth(-1));
    elements.nextMonth.addEventListener('click', () => navigateMonth(1));
    
    // Modal listeners
    elements.modalClose.addEventListener('click', hideEventModal);
    elements.modalBackdrop.addEventListener('click', hideEventModal);
    
    // Close modal when clicking outside modal content
    elements.modal.addEventListener('click', (e) => {
      const modalContent = document.getElementById('modal-content');
      if (!modalContent.contains(e.target)) {
        hideEventModal();
      }
    });
    
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
