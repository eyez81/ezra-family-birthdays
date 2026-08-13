import { familyMembers } from "./familyData.js";

const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const weekdays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const today = new Date();
const visibleMembers = familyMembers.filter((member) => member.showInLists !== false);
const peopleById = new Map(familyMembers.map((member) => [member.id, member]));
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
let activeTab = "upcoming";
let selectedPersonId = null;

const $ = (selector) => document.querySelector(selector);
const ageOnBirthday = (member, year) => year - member.year;
const currentAge = (member) => {
  let age = today.getFullYear() - member.year;
  if (today.getMonth() + 1 < member.month || (today.getMonth() + 1 === member.month && today.getDate() < member.day)) age--;
  return age;
};
const dateLabel = (member) => `${member.day} ${monthNames[member.month - 1]} ${member.year}`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const compactDate = (date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
const escapeIcs = (value) => String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

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

function openGoogleCalendar(member) {
  const start = nextBirthday(member);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `יום הולדת – ${member.name}`,
    dates: `${compactDate(start)}/${compactDate(end)}`,
    details: "יום הולדת משפחתי – אירוע שנתי",
    recur: "RRULE:FREQ=YEARLY"
  });
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank", "noopener,noreferrer");
}

function downloadAllBirthdays() {
  const members = visibleMembers.filter((member) => !member.memorial);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = members.map((member) => {
    const start = nextBirthday(member);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return [
      "BEGIN:VEVENT",
      `UID:birthday-${member.id}@ezra-family`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(start)}`,
      `DTEND;VALUE=DATE:${compactDate(end)}`,
      "RRULE:FREQ=YEARLY",
      `SUMMARY:${escapeIcs(`יום הולדת – ${member.name}`)}`,
      "DESCRIPTION:יום הולדת משפחתי – אירוע שנתי",
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    ].join("\r\n");
  }).join("\r\n");
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ezra Family Birthdays//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ימי הולדת – משפחת עזרא",
    events,
    "END:VCALENDAR",
    ""
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ezra-family-birthdays.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  const button = $("#download-all-calendar");
  const original = button.innerHTML;
  button.textContent = `הקובץ הוכן – ${members.length} ימי הולדת`;
  setTimeout(() => { button.innerHTML = original; }, 2500);
}

function cardHtml(member, year, days) {
  const daysText = days === undefined ? "" : `<span class="days-away">${days === 0 ? "היום!" : days === 1 ? "מחר" : `בעוד ${days} ימים`}</span>`;
  return `<button class="birthday-card person-trigger ${member.memorial ? "memorial" : ""}" data-person-id="${member.id}" type="button">
    <div class="member-icon" aria-hidden="true">${member.icon || "🎂"}</div>
    <div class="member-details"><h3>${escapeHtml(member.name)}${member.memorial ? " ז״ל" : ""}</h3><p>${dateLabel(member)}</p>${daysText}</div>
    <span class="age-badge">${member.memorial ? "ז״ל" : `גיל ${ageOnBirthday(member, year)}`}</span>
  </button>`;
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthMembers = visibleMembers.filter((member) => member.month === month + 1).sort((a, b) => a.day - b.day);
  $("#calendar-title").textContent = `${monthNames[month]} ${year}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, index) => index + 1));
  $("#calendar-days").innerHTML = cells.map((day, index) => {
    if (!day) return `<div class="day-cell empty" aria-hidden="true" data-cell="${index}"></div>`;
    const birthdays = monthMembers.filter((member) => member.day === day);
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const names = birthdays.map((member) => `<button class="calendar-person person-trigger" data-person-id="${member.id}" type="button">${member.icon || "🎂"} <b>${escapeHtml(member.name)}</b>${member.memorial ? " ז״ל" : ""}</button>`).join("");
    return `<div class="day-cell ${birthdays.length ? "has-birthday" : ""} ${isToday ? "today" : ""}"><span class="day-number">${day}</span><div class="calendar-birthdays">${names}</div></div>`;
  }).join("");
  $("#month-summary").textContent = `${monthMembers.length} ימי הולדת ב${monthNames[month]}`;
  $("#month-cards").innerHTML = monthMembers.length ? monthMembers.map((member) => cardHtml(member, year)).join("") : '<p class="empty-message">אין ימי הולדת בחודש הזה</p>';
}

function renderList(query = "") {
  const content = $("#list-content");
  if (activeTab === "upcoming") {
    const upcoming = visibleMembers.filter((member) => !member.memorial).map((member) => ({ member, date: nextBirthday(member) }))
      .map((item) => ({ ...item, days: dayDiff(item.date) })).filter((item) => item.days <= 30).sort((a, b) => a.days - b.days);
    content.innerHTML = `<h2 class="list-heading">ימי הולדת ב־30 הימים הקרובים</h2><div class="cards-list compact">${upcoming.map(({ member, date, days }) => cardHtml(member, date.getFullYear(), days)).join("")}</div>`;
    return;
  }
  const filtered = visibleMembers.filter((member) => member.name.includes(query.trim()));
  content.innerHTML = `<label class="search"><span aria-hidden="true">⌕</span><input id="name-search" value="${escapeHtml(query)}" placeholder="חיפוש לפי שם..." aria-label="חיפוש לפי שם"></label>
    <div class="table-wrap"><table><thead><tr><th>שם</th><th>תאריך</th><th>גיל</th></tr></thead><tbody>${filtered.map((member) => `<tr class="person-row person-trigger" data-person-id="${member.id}" tabindex="0"><td><span>${member.icon || "🎂"}</span> ${escapeHtml(member.name)}${member.memorial ? " ז״ל" : ""}</td><td>${dateLabel(member)}</td><td>${member.memorial ? "ז״ל" : currentAge(member)}</td></tr>`).join("")}</tbody></table></div>`;
  $("#name-search").addEventListener("input", (event) => renderList(event.target.value));
  const search = $("#name-search");
  search.focus();
  search.setSelectionRange(query.length, query.length);
}

function relationCard(person) {
  if (!person) return "";
  return `<button class="relation-card person-trigger" data-person-id="${person.id}" type="button">
    <span class="relation-icon">${person.icon}</span>
    <span class="relation-details"><strong>${escapeHtml(person.name)}${person.memorial ? " ז״ל" : ""}</strong><small>${dateLabel(person)}</small></span>
    <span class="age-badge">${person.memorial ? "ז״ל" : `גיל ${currentAge(person)}`}</span>
  </button>`;
}

function relationSection(title, ids) {
  const uniquePeople = [...new Set(ids)].map((id) => peopleById.get(id)).filter(Boolean);
  if (!uniquePeople.length) return "";
  return `<section class="relation-section"><h4>${title}</h4><div class="relations-grid">${uniquePeople.map(relationCard).join("")}</div></section>`;
}

function showPersonDetails(id) {
  const person = peopleById.get(Number(id));
  if (!person) return;
  selectedPersonId = person.id;
  const siblings = [...new Set(person.parents.flatMap((parentId) => peopleById.get(parentId)?.children || []))].filter((siblingId) => siblingId !== person.id);
  const grandchildren = [...new Set(person.children.flatMap((childId) => peopleById.get(childId)?.children || []))];
  $("#person-dialog-title").textContent = `${person.name}${person.memorial ? " ז״ל" : ""}`;
  $("#person-summary").innerHTML = `<p><span aria-hidden="true">▣</span> <strong>תאריך לידה:</strong> ${dateLabel(person)}</p><p><span aria-hidden="true">♙</span> <strong>${person.memorial ? "לזכר/ה:" : "גיל:"}</strong> ${person.memorial ? "ז״ל" : currentAge(person)}</p>`;
  $("#add-person-calendar").hidden = Boolean(person.memorial);
  $("#family-tree").innerHTML = [
    relationSection("בן/בת זוג", person.spouse ? [person.spouse] : []),
    relationSection("הורים", person.parents),
    relationSection("אחים ואחיות", siblings),
    relationSection("ילדים", person.children),
    relationSection("נכדים", grandchildren)
  ].join("") || '<p class="empty-message">לא הוגדרו קשרי משפחה</p>';
  const dialog = $("#person-dialog");
  if (!dialog.open) dialog.showModal();
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
$("#download-all-calendar").addEventListener("click", downloadAllBirthdays);
$("#add-person-calendar").addEventListener("click", () => {
  const person = peopleById.get(selectedPersonId);
  if (person && !person.memorial) openGoogleCalendar(person);
});
document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".person-trigger");
  if (trigger) showPersonDetails(trigger.dataset.personId);
});
document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".person-row")) {
    event.preventDefault();
    showPersonDetails(event.target.dataset.personId);
  }
});
$("#close-dialog").addEventListener("click", () => $("#person-dialog").close());
$("#person-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
renderCalendar();
renderList();
