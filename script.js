const grid = document.querySelector('#calendarGrid');
const monthLabel = document.querySelector('#monthLabel');
const selectedDateLabel = document.querySelector('#selectedDateLabel');
const modalBackdrop = document.querySelector('#modalBackdrop');
const eventForm = document.querySelector('#eventForm');
const eventName = document.querySelector('#eventName');
const eventTime = document.querySelector('#eventTime');
const repeatRule = document.querySelector('#repeatRule');
const importantEvent = document.querySelector('#importantEvent');
const modalTitle = document.querySelector('#modalTitle');
const deleteEventButton = document.querySelector('#deleteEventButton');
const deleteOptions = document.querySelector('#deleteOptions');
const shareButton = document.querySelector('#shareButton');
const calendarTip = document.querySelector('#calendarTip');
const shareResultBackdrop = document.querySelector('#shareResultBackdrop');
const shareUrlField = document.querySelector('#shareUrlField');
const copyAgainButton = document.querySelector('#copyAgainButton');

const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let editingEventId = null;
let sharingMode = false;
const selectedEventKeys = new Set();
let lastShareUrl = '';
let events = JSON.parse(localStorage.getItem('month-at-a-glance-events') || '[]');

const pad = value => String(value).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const readableDate = date => date.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
const formatTime = time => { if (!time) return ''; const [hour, minute] = time.split(':'); const date = new Date(2000, 0, 1, hour, minute); return date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }); };

function isSameDay(a, b) { return dateKey(a) === dateKey(b); }

function eventsForDate(date) {
  return events.filter(event => {
    const key = dateKey(date);
    if (event.exceptions && event.exceptions.includes(key)) return false;
    if (event.endDate && key > event.endDate) return false;
    if (event.date === dateKey(date)) return true;
    if (event.repeat === 'daily') return date >= new Date(`${event.date}T00:00:00`);
    if (event.repeat === 'weekdays') return date >= new Date(`${event.date}T00:00:00`) && date.getDay() > 0 && date.getDay() < 6;
    if (event.repeat === 'weekends') return date >= new Date(`${event.date}T00:00:00`) && (date.getDay() === 0 || date.getDay() === 6);
    if (event.repeat === 'weekly') return date >= new Date(`${event.date}T00:00:00`) && (date - new Date(`${event.date}T00:00:00`)) % (7 * 24 * 60 * 60 * 1000) === 0;
    return false;
  }).sort((a, b) => a.time.localeCompare(b.time));
}

function renderCalendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  monthLabel.textContent = visibleMonth.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  grid.innerHTML = '';
  grid.classList.toggle('sharing-mode', sharingMode);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let index = 0; index < cellCount; index += 1) {
    const dayOffset = index - firstDay;
    const date = new Date(year, month, dayOffset + 1);
    const isOutside = dayOffset < 0 || dayOffset >= daysInMonth;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `day-cell${isOutside ? ' outside-month' : ''}${isSameDay(date, today) ? ' today' : ''}`;
    cell.setAttribute('aria-label', `Add event on ${readableDate(date)}`);
    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = isOutside && dayOffset < 0 ? daysInPreviousMonth + dayOffset + 1 : date.getDate();
    cell.append(number);
    const dayEvents = document.createElement('div');
    dayEvents.className = 'day-events';
    eventsForDate(date).slice(0, 3).forEach(event => {
      const pill = document.createElement('span');
      const eventKey = `${event.id}|${dateKey(date)}`;
      pill.className = `event-pill${event.important ? ' important' : ''}${selectedEventKeys.has(eventKey) ? ' selected' : ''}`;
      pill.title = `${event.name} at ${formatTime(event.time)}`;
      pill.innerHTML = `<span class="event-time">${formatTime(event.time)}</span><span class="event-name"></span>`;
      pill.querySelector('.event-name').textContent = event.name;
      pill.addEventListener('click', click => {
        click.stopPropagation();
        if (sharingMode) {
          if (selectedEventKeys.has(eventKey)) selectedEventKeys.delete(eventKey);
          else selectedEventKeys.add(eventKey);
          renderCalendar();
        } else openModal(date, event);
      });
      dayEvents.append(pill);
    });
    const count = eventsForDate(date).length;
    if (count > 3) { const more = document.createElement('span'); more.className = 'more-events'; more.textContent = `+ ${count - 3} more`; dayEvents.append(more); }
    cell.append(dayEvents);
    cell.addEventListener('click', () => openModal(date));
    grid.append(cell);
  }
}

function openModal(date = selectedDate, eventToEdit = null) {
  selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  selectedDateLabel.textContent = readableDate(selectedDate);
  eventForm.reset();
  editingEventId = eventToEdit ? eventToEdit.id : null;
  modalTitle.textContent = eventToEdit ? 'Edit event' : 'Add an event';
  deleteEventButton.hidden = !eventToEdit;
  deleteOptions.hidden = true;
  eventTime.value = eventToEdit ? eventToEdit.time : '09:00';
  if (eventToEdit) {
    eventName.value = eventToEdit.name;
    repeatRule.value = eventToEdit.repeat;
    importantEvent.checked = eventToEdit.important;
  }
  modalBackdrop.hidden = false;
  setTimeout(() => eventName.focus(), 0);
}

function closeModal() { modalBackdrop.hidden = true; editingEventId = null; }

document.querySelector('#previousMonth').addEventListener('click', () => { visibleMonth.setMonth(visibleMonth.getMonth() - 1); renderCalendar(); });
document.querySelector('#nextMonth').addEventListener('click', () => { visibleMonth.setMonth(visibleMonth.getMonth() + 1); renderCalendar(); });
document.querySelector('#todayButton').addEventListener('click', () => { visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); });
document.querySelector('#addEventButton').addEventListener('click', () => openModal(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)));
document.querySelector('#closeModal').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modalBackdrop.hidden) closeModal(); });

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.append(helper);
  helper.select();
  document.execCommand('copy');
  helper.remove();
  return Promise.resolve();
}

function enterSharingMode() {
  sharingMode = true;
  selectedEventKeys.clear();
  shareButton.classList.add('active');
  shareButton.innerHTML = '<span aria-hidden="true">✓</span> Finish sharing';
  calendarTip.innerHTML = '<span aria-hidden="true">✦</span> Select the events you want to share, then finish sharing.';
  renderCalendar();
}

shareButton.addEventListener('click', () => {
  if (!sharingMode) {
    enterSharingMode();
    return;
  }
  if (!selectedEventKeys.size) {
    calendarTip.innerHTML = '<span aria-hidden="true">!</span> Select at least one event before finishing.';
    return;
  }
  const sharedEvents = [...selectedEventKeys].map(key => {
    const separator = key.lastIndexOf('|');
    const eventId = key.slice(0, separator);
    const occurrenceDate = key.slice(separator + 1);
    const source = events.find(event => event.id === eventId);
    if (!source) return null;
    return { id: `${eventId}-${occurrenceDate}`, date: occurrenceDate, name: source.name, time: source.time, repeat: 'none', important: source.important };
  }).filter(Boolean);
  const params = new URLSearchParams({ month: `${visibleMonth.getFullYear()}-${pad(visibleMonth.getMonth() + 1)}`, events: JSON.stringify(sharedEvents) });
  const shareUrl = `https://calendar.derrickhsu.com/shared.html?${params.toString()}`;
  lastShareUrl = shareUrl;
  copyText(shareUrl).then(() => {
    calendarTip.innerHTML = '<span aria-hidden="true">✓</span> Share link copied to your clipboard.';
    sharingMode = false;
    shareButton.classList.remove('active');
    shareButton.innerHTML = '<span aria-hidden="true">↗</span> Share';
    selectedEventKeys.clear();
    renderCalendar();
    shareUrlField.value = lastShareUrl;
    shareResultBackdrop.hidden = false;
  });
});

function closeShareResult() { shareResultBackdrop.hidden = true; }
document.querySelector('#closeShareResult').addEventListener('click', closeShareResult);
shareResultBackdrop.addEventListener('click', event => { if (event.target === shareResultBackdrop) closeShareResult(); });
copyAgainButton.addEventListener('click', () => {
  copyText(lastShareUrl).then(() => {
    copyAgainButton.textContent = 'Copied ✓';
    setTimeout(() => { copyAgainButton.textContent = 'Copy link again'; }, 1400);
  });
});

eventForm.addEventListener('submit', event => {
  event.preventDefault();
  const eventData = { name: eventName.value.trim(), time: eventTime.value, repeat: repeatRule.value, important: importantEvent.checked };
  if (editingEventId) {
    const eventIndex = events.findIndex(item => item.id === editingEventId);
    if (eventIndex !== -1) events[eventIndex] = { ...events[eventIndex], ...eventData };
  } else {
    events.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), date: dateKey(selectedDate), exceptions: [], ...eventData });
  }
  localStorage.setItem('month-at-a-glance-events', JSON.stringify(events));
  closeModal();
  renderCalendar();
});

deleteEventButton.addEventListener('click', () => {
  if (!editingEventId) return;
  const editingEvent = events.find(event => event.id === editingEventId);
  if (!editingEvent) return;
  if (editingEvent.repeat === 'none') {
    events = events.filter(event => event.id !== editingEventId);
    localStorage.setItem('month-at-a-glance-events', JSON.stringify(events));
    closeModal();
    renderCalendar();
    return;
  }
  deleteOptions.hidden = false;
});

deleteOptions.addEventListener('click', event => {
  const scope = event.target.dataset.deleteScope;
  if (!scope || !editingEventId) return;
  const editingEvent = events.find(item => item.id === editingEventId);
  if (!editingEvent) return;
  if (scope === 'all') {
    events = events.filter(item => item.id !== editingEventId);
  } else if (scope === 'future') {
    const dayBefore = new Date(selectedDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    editingEvent.endDate = dateKey(dayBefore);
  } else {
    editingEvent.exceptions = [...new Set([...(editingEvent.exceptions || []), dateKey(selectedDate)])];
  }
  localStorage.setItem('month-at-a-glance-events', JSON.stringify(events));
  closeModal();
  renderCalendar();
});

renderCalendar();
