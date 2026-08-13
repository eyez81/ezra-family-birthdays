import { familyMembers } from "./familyData.js";

const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const weekdays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const today = new Date();
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
let activeTab = "upcoming";

const $ = (selector) => document.querySelector(selector);
const ageOnBirthday = (member, year) => year - member.year;
const dateLabel = (member) => `${member.day} ${monthNames[member.month - 1]} ${member.year}`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function nextBirthday(member) {
  let date = new Date(today.getFullYear(), member.month - 1, member.day);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date < start) date = new Date(today.getFullYear() + 1, member.month - 1, member.day);
  return date;
}

function dayDiff(to) {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86400000);
}

function cardHtml(member, year, days) {
  const daysText = days === undefined ? "" : `<span class="days-away">${days === 0 ? "היום!" : days === 1 ? "מחר" : `בעוד ${days} ימים`}</span>`;
  return `<article class="birthday-card ${member.memorial ? "memorial" : ""}">
    <div class="member-icon" aria-hidden="true">${member.icon || "🎂"}</div>
    <div class="member-details"><h3>${escapeHtml(member.name)}${member.memorial ? " ז״ל" : ""}</h3><p>${dateLabel(member)}</p>${daysText}</div>
    <span class="age-badge">${member.memorial ? "ז״ל" : `גיל ${ageOnBirthday(member, year)}`}</span>
  </article>`;
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthMembers = familyMembers.filter((member) => member.month === month + 1).sort((a, b) => a.day - b.day);
  $("#calendar-title").textContent = `${monthNames[month]} ${year}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, index) => index + 1));
  $("#calendar-days").innerHTML = cells.map((day, index) => {
    if (!day) return `<div class="day-cell empty" aria-hidden="true" data-cell="${index}"></div>`;
    const birthdays = monthMembers.filter((member) => member.day === day);
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const names = birthdays.map((member) => `<span>${member.icon || "🎂"} <b>${escapeHtml(member.name)}</b>${member.memorial ? " ז״ל" : ""}</span>`).join("");
    return `<div class="day-cell ${birthdays.length ? "has-birthday" : ""} ${isToday ? "today" : ""}"><span class="day-number">${day}</span><div class="calendar-birthdays">${names}</div></div>`;
  }).join("");
  $("#month-summary").textContent = `${monthMembers.length} ימי הולדת ב${monthNames[month]}`;
  $("#month-cards").innerHTML = monthMembers.length ? monthMembers.map((member) => cardHtml(member, year)).join("") : '<p class="empty-message">אין ימי הולדת בחודש הזה</p>';
}

function renderList(query = "") {
  const content = $("#list-content");
  if (activeTab === "upcoming") {
    const upcoming = familyMembers.filter((member) => !member.memorial).map((member) => ({ member, date: nextBirthday(member) }))
      .map((item) => ({ ...item, days: dayDiff(item.date) })).filter((item) => item.days <= 30).sort((a, b) => a.days - b.days);
    content.innerHTML = `<h2 class="list-heading">ימי הולדת ב־30 הימים הקרובים</h2><div class="cards-list compact">${upcoming.map(({ member, date, days }) => cardHtml(member, date.getFullYear(), days)).join("")}</div>`;
    return;
  }
  const filtered = familyMembers.filter((member) => member.name.includes(query.trim()));
  content.innerHTML = `<label class="search"><span aria-hidden="true">⌕</span><input id="name-search" value="${escapeHtml(query)}" placeholder="חיפוש לפי שם..." aria-label="חיפוש לפי שם"></label>
    <div class="table-wrap"><table><thead><tr><th>שם</th><th>תאריך</th><th>גיל</th></tr></thead><tbody>${filtered.map((member) => `<tr><td><span>${member.icon || "🎂"}</span> ${escapeHtml(member.name)}${member.memorial ? " ז״ל" : ""}</td><td>${dateLabel(member)}</td><td>${member.memorial ? "ז״ל" : ageOnBirthday(member, today.getFullYear())}</td></tr>`).join("")}</tbody></table></div>`;
  $("#name-search").addEventListener("input", (event) => renderList(event.target.value));
  const search = $("#name-search");
  search.focus();
  search.setSelectionRange(query.length, query.length);
}

function selectTab(tab) {
  activeTab = tab;
  $("#upcoming-tab").classList.toggle("active", tab === "upcoming");
  $("#all-tab").classList.toggle("active", tab === "all");
  $("#upcoming-tab").setAttribute("aria-selected", String(tab === "upcoming"));
  $("#all-tab").setAttribute("aria-selected", String(tab === "all"));
  renderList();
}

$("#weekdays").innerHTML = weekdays.map((day) => `<div>${day}</div>`).join("");
$("#previous-month").addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); renderCalendar(); });
$("#next-month").addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); renderCalendar(); });
$("#upcoming-tab").addEventListener("click", () => selectTab("upcoming"));
$("#all-tab").addEventListener("click", () => selectTab("all"));
renderCalendar();
renderList();
