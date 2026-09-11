const grid = document.querySelector('#sharedCalendarGrid');
const monthLabel = document.querySelector('#sharedMonthLabel');
const params = new URLSearchParams(window.location.search);
const pad = value => String(value).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTime = time => { if (!time) return ''; const [hour, minute] = time.split(':'); const date = new Date(2000, 0, 1, hour, minute); return date.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }); };
const today = new Date();
const monthParam = params.get('month');
let visibleMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? new Date(`${monthParam}-01T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), 1);
let events = [];
try { events = JSON.parse(params.get('events') || '[]'); if (!Array.isArray(events)) events = []; } catch { events = []; }

function isSameDay(a, b) { return dateKey(a) === dateKey(b); }
function eventsForDate(date) {
  const key = dateKey(date);
  return events.filter(event => {
    if (event.exceptions && event.exceptions.includes(key)) return false;
    if (event.endDate && key > event.endDate) return false;
    if (event.date === key) return true;
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
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  for (let index = 0; index < cellCount; index += 1) {
    const dayOffset = index - firstDay;
    const date = new Date(year, month, dayOffset + 1);
    const isOutside = dayOffset < 0 || dayOffset >= daysInMonth;
    const cell = document.createElement('div');
    cell.className = `day-cell${isOutside ? ' outside-month' : ''}${isSameDay(date, today) ? ' today' : ''}`;
    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = isOutside && dayOffset < 0 ? daysInPreviousMonth + dayOffset + 1 : date.getDate();
    cell.append(number);
    const dayEvents = document.createElement('div');
    dayEvents.className = 'day-events';
    eventsForDate(date).slice(0, 3).forEach(event => {
      const pill = document.createElement('div');
      pill.className = `event-pill${event.important ? ' important' : ''}`;
      pill.innerHTML = `<span class="event-time">${formatTime(event.time)}</span><span class="event-name"></span>`;
      pill.querySelector('.event-name').textContent = event.name;
      dayEvents.append(pill);
    });
    const count = eventsForDate(date).length;
    if (count > 3) { const more = document.createElement('span'); more.className = 'more-events'; more.textContent = `+ ${count - 3} more`; dayEvents.append(more); }
    cell.append(dayEvents);
    grid.append(cell);
  }
}

document.querySelector('#previousMonth').addEventListener('click', () => { visibleMonth.setMonth(visibleMonth.getMonth() - 1); renderCalendar(); });
document.querySelector('#nextMonth').addEventListener('click', () => { visibleMonth.setMonth(visibleMonth.getMonth() + 1); renderCalendar(); });
renderCalendar();
