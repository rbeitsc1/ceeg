const DISCOVER_GROUPS = [
  { key: "this_week", label: "This Week", copy: "Immediate outings and practical plans that need attention now." },
  { key: "next_10_days", label: "Next 10 Days", copy: "Near-term decisions that should be made before they become rushed." },
  { key: "this_month", label: "This Month", copy: "The rest of the current month, for choices that still fit this cycle." },
  { key: "next_month", label: "Next Month", copy: "Early planning for next month while schedules and good seats are still open." },
  { key: "book_ahead", label: "Book Ahead", copy: "Longer-range special planning beyond next month." },
];

const CATEGORY_ICONS = {
  Opera: "🎭",
  Ballet: "🩰",
  Classical: "🎻",
  Concert: "🎵",
  Musical: "🎙️",
  Theater: "🎬",
  Dance: "💃",
  Art: "🎨",
  Garden: "🌿",
  Museum: "🏛️",
  Event: "✨",
};

const EVENT_DURATION_MINUTES = {
  Opera: 180,
  Ballet: 150,
  Classical: 135,
  Concert: 150,
  Musical: 165,
  Theater: 160,
  Dance: 135,
  Art: 120,
  Garden: 120,
  Museum: 120,
  Event: 150,
};

const DEFAULT_CATEGORY_SELECTION = ["Opera", "Ballet"];
const API_ORIGIN_FALLBACK = "http://127.0.0.1:8000";
const RUN_ENDING_SOON_DAYS = 14;
const NEW_RELEASE_WINDOW_DAYS = 7;
const FINAL_DATE_SOON_DAYS = 10;
const PREFERENCE_STORAGE_KEY = "ceeg-planning-preferences-v1";
const BEHAVIOR_SIGNAL_STORAGE_KEY = "ceeg-behavior-signals-v1";
const DEFAULT_PREFERENCES = {
  selectedCategories: DEFAULT_CATEGORY_SELECTION,
  startTimeFilter: "12:00",
  endTimeFilter: "20:00",
  startDateFilter: "",
  endDateFilter: "",
};
const state = {
  events: [],
  filteredVenue: "all",
  filteredSource: "all",
  selectedCategories: new Set(),
  categoryTouched: false,
  discoverRunFilter: "all",
  statusFilter: new Set(),
  startTimeFilter: "",
  endTimeFilter: "",
  startDateFilter: "",
  endDateFilter: "",
  calendarView: "next30",
  calendarAnchorDate: startOfDay(new Date()),
  sources: [],
  loading: false,
  completedOpen: false,
  apiOrigin: null,
  expandedRunIds: new Set(),
  pendingConsideringIds: new Set(),
  pendingStatusIds: new Set(),
  pendingRunHideIds: new Set(),
  recentAction: null,
  expandedDayKeys: new Set(),
  preferencesHydrated: false,
  preferenceDefaultsApplied: false,
  plannerModalOpen: false,
  plannerMode: "week",
  advancedFiltersOpen: false,
  eventSearchQuery: "",
  eventSearchRunId: null,
  behaviorProfile: null,
};

let toastTimer = null;

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const categoryPills = document.getElementById("categoryPills");
const categoryResetButton = document.getElementById("categoryResetButton");
const venueFilter = document.getElementById("venueFilter");
const sourceFilter = document.getElementById("sourceFilter");
const refreshButton = document.getElementById("refreshButton");
const discoverResetButton = document.getElementById("discoverResetButton");
const discoverRunFilterRow = document.getElementById("discoverRunFilterRow");
const statusFilterRow = document.getElementById("statusFilterRow");
const calendarViewToggles = document.getElementById("calendarViewToggles");
const calendarPrevButton = document.getElementById("calendarPrevButton");
const calendarNextButton = document.getElementById("calendarNextButton");
const calendarTodayButton = document.getElementById("calendarTodayButton");
const calendarPeriodLabel = document.getElementById("calendarPeriodLabel");
const calendarViewLabel = document.getElementById("calendarViewLabel");
const calendarPeriodHint = document.getElementById("calendarPeriodHint");
const planWeekButton = document.getElementById("planWeekButton");
const planMonthButton = document.getElementById("planMonthButton");
const advancedFiltersToggle = document.getElementById("advancedFiltersToggle");
const allCategoriesButton = document.getElementById("allCategoriesButton");
const completedToggle = document.getElementById("completedToggle");
const toastMessage = document.getElementById("toastMessage");
const discoverFilterSummary = document.getElementById("discoverFilterSummary");
const calendarFeedback = document.getElementById("calendarFeedback");
const startDateInput = document.getElementById("startDateInput");
const endDateInput = document.getElementById("endDateInput");
const startTimeInput = document.getElementById("startTimeInput");
const endTimeInput = document.getElementById("endTimeInput");
const resetTimeRangeButton = document.getElementById("resetTimeRangeButton");
const eventSearchInput = document.getElementById("eventSearchInput");
const eventSearchSuggestions = document.getElementById("eventSearchSuggestions");
const eventSearchClear = document.getElementById("eventSearchClear");
const eventSearchFeedback = document.getElementById("eventSearchFeedback");

const completedGrid = document.getElementById("completedGrid");
const monthAheadSummary = document.getElementById("monthAheadSummary");
const monthAheadAttention = document.getElementById("monthAheadAttention");
const monthAheadBoard = document.getElementById("monthAheadBoard");
const resetHiddenButton = document.getElementById("resetHiddenButton");
const hiddenItemsNote = document.getElementById("hiddenItemsNote");
const monthAheadEmptyCopy = document.getElementById("monthAheadEmptyCopy");
const heroSmartPicks = document.getElementById("heroSmartPicks");
const heroSmartPicksGrid = document.getElementById("heroSmartPicksGrid");
const smartPicksKicker = document.getElementById("smartPicksKicker");
const advancedFiltersPanel = document.getElementById("advancedFiltersPanel");

const completedEmpty = document.getElementById("completedEmpty");
const completedPanel = document.getElementById("completedPanel");
const monthAheadEmpty = document.getElementById("monthAheadEmpty");
const plannerModal = document.getElementById("plannerModal");
const plannerModalBackdrop = document.getElementById("plannerModalBackdrop");
const plannerModalClose = document.getElementById("plannerModalClose");
const plannerPanelTitle = document.getElementById("plannerPanelTitle");
const plannerPanelEyebrow = document.getElementById("plannerPanelEyebrow");
const plannerPanelCopy = document.getElementById("plannerPanelCopy");
const plannerPanelRange = document.getElementById("plannerPanelRange");
const plannerRecommendedList = document.getElementById("plannerRecommendedList");
const bookedList = document.getElementById("bookedList");
const bookedEmpty = document.getElementById("bookedEmpty");
const weeklySummaryTitle = document.getElementById("weeklySummaryTitle");
const weeklySummaryList = document.getElementById("weeklySummaryList");
const weeklySummaryEmpty = document.getElementById("weeklySummaryEmpty");

const sourceSummary = document.getElementById("sourceSummary");
const historyBookedCount = document.getElementById("historyBookedCount");
const historyCompletedCount = document.getElementById("historyCompletedCount");
const cardTemplate = document.getElementById("eventCardTemplate");
hydratePreferences();
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    });
  });
}

if (calendarViewToggles) {
  calendarViewToggles.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarView = button.dataset.calendarView || "month";
      syncCalendarViewButtons();
      render();
    });
  });
}

calendarPrevButton?.addEventListener("click", () => {
  shiftCalendarPeriod(-1);
  render();
});

calendarNextButton?.addEventListener("click", () => {
  shiftCalendarPeriod(1);
  render();
});

calendarTodayButton?.addEventListener("click", () => {
  state.calendarAnchorDate = startOfDay(new Date());
  if (!["week", "next10", "next30", "month"].includes(state.calendarView)) {
    state.calendarView = "next30";
  }
  syncCalendarViewButtons();
  render();
});

if (categoryResetButton) {
  categoryResetButton.addEventListener("click", () => {
    state.categoryTouched = true;
    applyDefaultCategorySelection();
    savePreferences();
    render();
  });
}

if (venueFilter) {
  venueFilter.addEventListener("change", () => {
    state.filteredVenue = venueFilter.value;
    render();
  });
}

if (sourceFilter) {
  sourceFilter.addEventListener("change", () => {
    state.filteredSource = sourceFilter.value;
    render();
  });
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => loadEvents({ forceRefresh: true }));
}

if (planWeekButton) {
  planWeekButton.addEventListener("click", () => {
    state.plannerMode = "week";
    state.plannerModalOpen = true;
    render();
  });
}

if (planMonthButton) {
  planMonthButton.addEventListener("click", () => {
    state.plannerMode = "month";
    state.plannerModalOpen = true;
    render();
  });
}

if (advancedFiltersToggle) {
  advancedFiltersToggle.addEventListener("click", () => {
    state.advancedFiltersOpen = !state.advancedFiltersOpen;
    render();
  });
}

if (discoverResetButton) {
  discoverResetButton.addEventListener("click", () => {
    resetDiscoverFilters();
    showToast("Filters reset to the calmer default");
  });
}

if (discoverRunFilterRow) {
  discoverRunFilterRow.querySelectorAll("[data-run-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.discoverRunFilter = button.dataset.runFilter || "all";
      syncRunFilterButtons();
      render();
    });
  });
}

if (statusFilterRow) {
  statusFilterRow.querySelectorAll("[data-status-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleStatusFilter(button.dataset.statusFilter || "all");
      syncStatusFilterButtons();
      render();
    });
  });
}

if (allCategoriesButton) {
  allCategoriesButton.addEventListener("click", () => {
    state.categoryTouched = true;
    state.selectedCategories = new Set();
    savePreferences();
    render();
  });
}

startDateInput?.addEventListener("change", () => {
  state.startDateFilter = startDateInput.value;
  savePreferences();
  render();
});

endDateInput?.addEventListener("change", () => {
  state.endDateFilter = endDateInput.value;
  savePreferences();
  render();
});

startTimeInput?.addEventListener("change", () => {
  state.startTimeFilter = startTimeInput.value;
  savePreferences();
  render();
});

endTimeInput?.addEventListener("change", () => {
  state.endTimeFilter = endTimeInput.value;
  savePreferences();
  render();
});

resetTimeRangeButton?.addEventListener("click", () => {
  state.startTimeFilter = DEFAULT_PREFERENCES.startTimeFilter;
  state.endTimeFilter = DEFAULT_PREFERENCES.endTimeFilter;
  savePreferences();
  render();
});

eventSearchInput?.addEventListener("input", () => {
  state.eventSearchQuery = eventSearchInput.value;
  state.eventSearchRunId = null;
  render();
});

eventSearchInput?.addEventListener("focus", () => {
  renderEventSearch();
});

eventSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    state.eventSearchQuery = eventSearchInput.value.trim();
    state.eventSearchRunId = null;
    const exactMatch = getEventSearchMatches().find((match) => normalizeSearchQuery(match.run.title) === normalizeSearchQuery(state.eventSearchQuery));
    if (exactMatch) recordBehaviorSignal(exactMatch.run.representative, "searched");
    render();
    document.getElementById("monthAhead")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (event.key === "Escape") {
    state.eventSearchQuery = "";
    state.eventSearchRunId = null;
    render();
  }
});

eventSearchClear?.addEventListener("click", () => {
  state.eventSearchQuery = "";
  state.eventSearchRunId = null;
  render();
});

if (completedToggle && completedPanel) {
  completedToggle.addEventListener("click", () => {
    state.completedOpen = !state.completedOpen;
    completedPanel.classList.toggle("hidden", !state.completedOpen);
    completedToggle.setAttribute("aria-expanded", String(state.completedOpen));
    completedToggle.textContent = state.completedOpen ? "Hide Completed" : "Show Completed";
  });
}

if (resetHiddenButton) {
  resetHiddenButton.addEventListener("click", () => resetHiddenItems());
}

if (plannerModalClose) {
  plannerModalClose.addEventListener("click", () => {
    state.plannerModalOpen = false;
    render();
  });
}

if (plannerModalBackdrop) {
  plannerModalBackdrop.addEventListener("click", () => {
    state.plannerModalOpen = false;
    render();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (state.plannerModalOpen) {
      state.plannerModalOpen = false;
      render();
    }
  }
});

function syncCalendarViewButtons() {
  if (!calendarViewToggles) return;
  calendarViewToggles.querySelectorAll("[data-calendar-view]").forEach((button) => {
    const isActive = (button.dataset.calendarView || "month") === state.calendarView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setStatusFilter(statuses = []) {
  state.statusFilter = new Set(statuses.filter(Boolean));
}

function toggleStatusFilter(status) {
  if (status === "all") {
    state.statusFilter = new Set();
    return;
  }

  const next = new Set(state.statusFilter);
  if (next.has(status)) {
    next.delete(status);
  } else {
    next.add(status);
  }
  state.statusFilter = next;
}

function syncRunFilterButtons() {
  if (discoverRunFilterRow) {
    discoverRunFilterRow.querySelectorAll("[data-run-filter]").forEach((button) => {
      const isActive = (button.dataset.runFilter || "all") === state.discoverRunFilter;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }
}

function syncStatusFilterButtons() {
  document.querySelectorAll("[data-status-filter]").forEach((button) => {
    const value = button.dataset.statusFilter || "all";
    const isActive = value === "all" ? state.statusFilter.size === 0 : state.statusFilter.has(value);
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncTimeFilterButtons() {
  if (startDateInput) startDateInput.value = state.startDateFilter || "";
  if (endDateInput) endDateInput.value = state.endDateFilter || "";
  if (startTimeInput) startTimeInput.value = state.startTimeFilter || "";
  if (endTimeInput) endTimeInput.value = state.endTimeFilter || "";
}

function buildTimeFilterOptions() {
  const options = [];
  for (let hour = 8; hour <= 23; hour += 1) {
    const value = `${String(hour).padStart(2, "0")}:00`;
    options.push({ value, label: formatTimeFilterLabel(value) });
  }
  return options;
}

function populateTimeFilterSelect(select, fallbackLabel) {
  if (!select || select.dataset.populated === "true") return;
  select.innerHTML = "";
  buildTimeFilterOptions().forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    select.appendChild(node);
  });
  select.dataset.populated = "true";
  select.setAttribute("aria-label", fallbackLabel);
}

function normalizeSearchQuery(value = "") {
  return value.trim().toLowerCase();
}

function hasActiveSearch() {
  return Boolean(normalizeSearchQuery(state.eventSearchQuery));
}

function getSearchableRuns() {
  return buildRuns(state.events).filter((run) => run.dateEntries.length > 0);
}

function matchesSearchQuery(run) {
  const query = normalizeSearchQuery(state.eventSearchQuery);
  if (!query) return true;
  if (state.eventSearchRunId) return run.runId === state.eventSearchRunId;
  return normalizeSearchQuery(run.title).includes(query);
}

function getEventSearchMatches() {
  const query = normalizeSearchQuery(state.eventSearchQuery);
  if (!query) return [];
  const runs = getSearchableRuns().filter((run) => {
    if (!normalizeSearchQuery(run.title).includes(query)) return false;
    const matchingEntries = run.dateEntries.filter((entry) => {
      const date = getEventDate(entry.event);
      return isWithinRange(date, getCalendarRange().start, getCalendarRange().end) && matchesEntrySurfaceFilters(entry);
    });
    return matchingEntries.length > 0;
  });
  const duplicateCounts = runs.reduce((map, run) => {
    map.set(run.title, (map.get(run.title) || 0) + 1);
    return map;
  }, new Map());
  return runs.slice(0, 8).map((run) => {
    const matchingCount = run.dateEntries.filter((entry) => {
      const date = getEventDate(entry.event);
      return isWithinRange(date, getCalendarRange().start, getCalendarRange().end) && matchesEntrySurfaceFilters(entry);
    }).length;
    return {
      run,
      label: duplicateCounts.get(run.title) > 1 ? `${run.title} — ${run.venue}` : run.title,
      meta: `${matchingCount} date${matchingCount === 1 ? "" : "s"} in range • ${run.venue}`,
    };
  });
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightSearchMatch(value = "", query = "") {
  const safeValue = escapeHtml(value);
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return safeValue;
  const lowerValue = value.toLowerCase();
  const start = lowerValue.indexOf(normalizedQuery);
  if (start === -1) return safeValue;
  const end = start + normalizedQuery.length;
  return `${escapeHtml(value.slice(0, start))}<mark>${escapeHtml(value.slice(start, end))}</mark>${escapeHtml(value.slice(end))}`;
}

function renderEventSearch() {
  if (!eventSearchInput || !eventSearchSuggestions || !eventSearchClear) return;
  eventSearchInput.value = state.eventSearchQuery || "";
  eventSearchClear.classList.toggle("hidden", !hasActiveSearch());
  const matches = getEventSearchMatches();
  eventSearchSuggestions.innerHTML = "";
  const hasFocusedRun = Boolean(state.eventSearchRunId);
  const isFocused = document.activeElement === eventSearchInput;
  eventSearchSuggestions.classList.toggle("hidden", matches.length === 0 || !hasActiveSearch() || hasFocusedRun || !isFocused);
  if (eventSearchFeedback) {
    const filteredRuns = getSurfaceRuns();
    const query = state.eventSearchQuery.trim();
    const feedback =
      !query
        ? ""
        : filteredRuns.length
          ? `${filteredRuns.length} match${filteredRuns.length === 1 ? "" : "es"} found`
          : "No matching events — try a broader search";
    eventSearchFeedback.textContent = feedback;
    eventSearchFeedback.classList.toggle("hidden", !feedback);
  }
  matches.forEach((match) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "event-search-suggestion";
    button.setAttribute("role", "option");
    button.innerHTML = `<strong>${highlightSearchMatch(match.label, state.eventSearchQuery)}</strong><span>${match.meta}</span>`;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      focusSearchRun(match.run);
    });
    eventSearchSuggestions.appendChild(button);
  });
}

function focusSearchRun(run) {
  if (!run) return;
  state.eventSearchQuery = run.title;
  state.eventSearchRunId = run.runId;
  recordBehaviorSignal(run.representative, "searched");
  state.calendarAnchorDate = startOfDay(run.runStartDate || getEventDate(run.representative) || new Date());
  state.calendarView = run.hasMultipleDates ? "month" : "next30";
  syncCalendarViewButtons();
  render();
  buildSurfaceEntries()
    .filter((item) => item.run.runId === run.runId)
    .forEach((item) => state.expandedRunIds.add(item.id));
  render();
  document.getElementById("monthAhead")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncAdvancedFiltersDrawer() {
  if (!advancedFiltersToggle || !advancedFiltersPanel) return;
  advancedFiltersToggle.setAttribute("aria-expanded", String(state.advancedFiltersOpen));
  const activeAdvancedFilterCount = [
    state.filteredVenue !== "all",
    state.discoverRunFilter !== "all",
    Boolean(state.startDateFilter),
    Boolean(state.endDateFilter),
    !isUsingDefaultTimeWindow(),
    !isUsingDefaultCategorySelection() && state.selectedCategories.size > 0 && state.selectedCategories.size !== getAvailableCategories().length,
  ].filter(Boolean).length;
  const label = activeAdvancedFilterCount > 0 ? `Filters (${activeAdvancedFilterCount})` : "Filters";
  advancedFiltersToggle.textContent = state.advancedFiltersOpen ? `Hide ${label}` : label;
  advancedFiltersPanel.classList.toggle("hidden", !state.advancedFiltersOpen);
}

function showToast(message) {
  if (!toastMessage) return;
  toastMessage.textContent = message;
  toastMessage.classList.add("is-visible");
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toastMessage.classList.remove("is-visible");
  }, 2200);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function endOfWeek(date) {
  const copy = startOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function isWithinRange(date, start, end) {
  return Boolean(date) && date >= start && date <= end;
}

function formatMonthDay(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

function formatMonthName(date) {
  return new Intl.DateTimeFormat(undefined, { month: "long" }).format(date);
}

function resetDiscoverFilters() {
  state.filteredVenue = "all";
  state.filteredSource = "all";
  state.discoverRunFilter = "all";
  state.statusFilter = new Set();
  state.eventSearchQuery = "";
  state.eventSearchRunId = null;
  hydratePreferences();
  const stored = getStoredPreferences();
  state.startTimeFilter = stored?.startTimeFilter || DEFAULT_PREFERENCES.startTimeFilter;
  state.endTimeFilter = stored?.endTimeFilter || DEFAULT_PREFERENCES.endTimeFilter;
  state.startDateFilter = stored?.startDateFilter || DEFAULT_PREFERENCES.startDateFilter;
  state.endDateFilter = stored?.endDateFilter || DEFAULT_PREFERENCES.endDateFilter;
  state.categoryTouched = true;
  applyDefaultCategorySelection();
  state.calendarView = "next30";
  state.calendarAnchorDate = startOfDay(new Date());
  render();
}

function normalizeText(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function canonicalKey(value) {
  return normalizeText(value).toLowerCase();
}

function canonicalVenueKey(value) {
  let normalized = canonicalKey(value)
    .replace(/[&]/g, " and ")
    .replace(/[/-]/g, " ")
    .replace(/[.,]/g, " ")
    .replace(/\bftl\b/g, "fort lauderdale")
    .replace(/\bfl\b/g, "florida")
    .replace(/\bpac\b/g, "performing arts center")
    .replace(/\barsht\b/g, "adrienne arsht")
    .replace(/\bthe arsht center\b/g, "adrienne arsht center")
    .replace(/\badrienne arsht center\b/g, "adrienne arsht center")
    .replace(/\bperforming arts center\b/g, "center")
    .replace(/\bfor the performing arts\b/g, "")
    .replace(/\bof miami dade county\b/g, "")
    .replace(/\bmiami dade\b/g, "miami")
    .replace(/\btheater\b/g, "theatre")
    .replace(/\bauditorium florida\b/g, "auditorium")
    .replace(/\bfort lauderdale\b/g, "")
    .replace(/\badrienne arsht pac\b/g, "adrienne arsht center")
    .replace(/\badrienne arsht center\b/g, "")
    .replace(/\bcenter\b/g, "")
    .replace(/\bconcert hall\b/g, "concert hall")
    .replace(/\bwar memorial auditorium\b/g, "war memorial auditorium")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.includes("war memorial auditorium")) return "war memorial auditorium";
  if (normalized.includes("knight concert hall")) return "knight concert hall";
  if (normalized.includes("ziff ballet opera house")) return "ziff ballet opera house";
  if (normalized.includes("au rene theatre")) return "au rene theatre";
  if (normalized.includes("amerant bank arena")) return "amerant bank arena";
  return normalized;
}

function truncateText(value, maxLength = 150) {
  if (!value || value.length <= maxLength) return value || "";
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function classifyPlanningWindowFromDate(date) {
  if (!date) return { key: "book_ahead", label: "Book Ahead" };
  const today = startOfDay(new Date());
  const eventDay = startOfDay(date);
  const deltaDays = Math.round((eventDay - today) / (1000 * 60 * 60 * 24));
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const monthAfterNextStart = new Date(today.getFullYear(), today.getMonth() + 2, 1);

  if (deltaDays <= 6) return { key: "this_week", label: "This Week" };
  if (deltaDays <= 10) return { key: "next_10_days", label: "Next 10 Days" };
  if (eventDay < nextMonthStart) return { key: "this_month", label: "This Month" };
  if (eventDay < monthAfterNextStart) return { key: "next_month", label: "Next Month" };
  return { key: "book_ahead", label: "Book Ahead" };
}

function canonicalizePlanningWindow(windowKey, startsAtValue) {
  const date = typeof startsAtValue === "string" ? getEventDate({ starts_at: startsAtValue }) : startsAtValue || null;
  const computed = classifyPlanningWindowFromDate(date);
  if (!windowKey || windowKey === "upcoming") return computed;
  if (!DISCOVER_GROUPS.some((group) => group.key === windowKey)) return computed;
  if (date && windowKey !== computed.key) return computed;
  return { key: windowKey, label: DISCOVER_GROUPS.find((group) => group.key === windowKey)?.label || computed.label };
}

function normalizeEventRecord(event) {
  const normalizedWindow = canonicalizePlanningWindow(event?.planning_window, event?.starts_at);
  return {
    ...event,
    date_added: typeof event?.date_added === "string" ? event.date_added : null,
    planning_window: normalizedWindow.key,
    planning_window_label: normalizedWindow.label,
  };
}

function getDisplayPlanningWindow(event) {
  return canonicalizePlanningWindow(event?.planning_window, event?.starts_at).key;
}

function getDisplayPlanningLabel(event) {
  return canonicalizePlanningWindow(event?.planning_window, event?.starts_at).label;
}

function getEventDate(event) {
  const date = new Date(event.starts_at);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventAddedDate(event) {
  if (!event?.date_added) return null;
  const date = new Date(event.date_added);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventDayKey(event) {
  const date = getEventDate(event);
  return date ? date.toISOString().slice(0, 10) : event.starts_at_display || "";
}

function formatDateOnly(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatTimeOnly(date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatTimeFilterLabel(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatTimeOnly(date);
}

function formatEventDateTime(event) {
  const date = getEventDate(event);
  if (!date) return event.starts_at_display || "Date to be confirmed";
  const dateLabel = event.starts_at_display || formatDateOnly(date);
  const hasTime = hasExplicitEventTime(event);
  return hasTime ? `${dateLabel} • ${formatTimeOnly(date)}` : dateLabel;
}

function hasExplicitEventTime(event) {
  const rawValue = typeof event?.starts_at === "string" ? event.starts_at : "";
  const timeMatch = rawValue.match(/T(\d{2}):(\d{2})(?::\d{2})?/);
  if (timeMatch) {
    return timeMatch[1] !== "00" || timeMatch[2] !== "00";
  }
  const date = getEventDate(event);
  return Boolean(date) && (date.getHours() !== 0 || date.getMinutes() !== 0);
}

function getEventHour(event) {
  const date = getEventDate(event);
  if (!date || !hasExplicitEventTime(event)) return null;
  return date.getHours() + date.getMinutes() / 60;
}

function getEstimatedDurationMinutes(event) {
  return EVENT_DURATION_MINUTES[event.category] || EVENT_DURATION_MINUTES.Event;
}

function getEstimatedEndHour(event) {
  const startHour = getEventHour(event);
  if (startHour === null) return null;
  return startHour + getEstimatedDurationMinutes(event) / 60;
}

function formatEstimatedEndTime(event) {
  const date = getEventDate(event);
  const endHour = getEstimatedEndHour(event);
  if (!date || endHour === null) return "End time estimate unavailable";
  const hours = Math.floor(endHour);
  const minutes = Math.round((endHour - hours) * 60);
  const endDate = new Date(date);
  endDate.setHours(hours, minutes, 0, 0);
  return formatTimeOnly(endDate);
}

function getStoredPreferences() {
  try {
    const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function createEmptyBehaviorSignals() {
  return {
    categories: {},
    venues: {},
    times: {},
  };
}

function getStoredBehaviorSignals() {
  try {
    const raw = window.localStorage.getItem(BEHAVIOR_SIGNAL_STORAGE_KEY);
    if (!raw) return createEmptyBehaviorSignals();
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : createEmptyBehaviorSignals();
  } catch (error) {
    return createEmptyBehaviorSignals();
  }
}

function saveBehaviorSignals(signals) {
  try {
    window.localStorage.setItem(BEHAVIOR_SIGNAL_STORAGE_KEY, JSON.stringify(signals));
  } catch (error) {
    // Ignore storage failures and keep Ceeg usable.
  }
}

function getTimeBucketForEvent(event) {
  const hour = getEventHour(event);
  if (hour === null) return "unknown";
  if (hour < 11) return "morning";
  if (hour < 16) return "daytime";
  if (hour < 20) return "evening";
  return "late";
}

function incrementBehaviorBucket(collection, key, type, amount = 1) {
  if (!key) return;
  if (!collection[key]) {
    collection[key] = { searched: 0, considering: 0, booked: 0, completed: 0, hidden: 0, restored: 0 };
  }
  collection[key][type] = (collection[key][type] || 0) + amount;
}

function recordBehaviorSignal(event, type, amount = 1) {
  if (!event || !type) return;
  const signals = getStoredBehaviorSignals();
  incrementBehaviorBucket(signals.categories, canonicalKey(event.category || "Event"), type, amount);
  incrementBehaviorBucket(signals.venues, canonicalKey(event.venue || ""), type, amount);
  incrementBehaviorBucket(signals.times, getTimeBucketForEvent(event), type, amount);
  saveBehaviorSignals(signals);
  state.behaviorProfile = null;
}

function savePreferences() {
  try {
    window.localStorage.setItem(
      PREFERENCE_STORAGE_KEY,
      JSON.stringify({
        selectedCategories: [...state.selectedCategories],
        useAllCategories: state.selectedCategories.size === 0,
        startTimeFilter: state.startTimeFilter,
        endTimeFilter: state.endTimeFilter,
        startDateFilter: state.startDateFilter,
        endDateFilter: state.endDateFilter,
      })
    );
  } catch (error) {
    // Ignore storage failures and keep Ceeg usable.
  }
}

function hydratePreferences() {
  if (state.preferencesHydrated) return;
  const stored = getStoredPreferences();
  state.startTimeFilter = stored?.startTimeFilter || DEFAULT_PREFERENCES.startTimeFilter;
  state.endTimeFilter = stored?.endTimeFilter || DEFAULT_PREFERENCES.endTimeFilter;
  state.startDateFilter = stored?.startDateFilter || DEFAULT_PREFERENCES.startDateFilter;
  state.endDateFilter = stored?.endDateFilter || DEFAULT_PREFERENCES.endDateFilter;
  state.preferencesHydrated = true;
}

function getDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseInputTime(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours + minutes / 60;
}

function isUsingDefaultTimeWindow() {
  return (
    state.startTimeFilter === DEFAULT_PREFERENCES.startTimeFilter &&
    state.endTimeFilter === DEFAULT_PREFERENCES.endTimeFilter
  );
}

function isUsingDefaultCategorySelection() {
  if (state.selectedCategories.size === 0) return false;
  const selected = [...state.selectedCategories].sort();
  const preferred = [...DEFAULT_PREFERENCES.selectedCategories].sort();
  return selected.length === preferred.length && selected.every((value, index) => value === preferred[index]);
}

function getAvailableCategories() {
  return [...new Set(state.events.map((event) => event.category).filter(Boolean))].sort();
}

function applyDefaultCategorySelection() {
  const categories = getAvailableCategories();
  const stored = getStoredPreferences();
  if (stored?.useAllCategories) {
    state.selectedCategories = new Set();
    return;
  }
  const preferredCategories = stored?.selectedCategories?.length ? stored.selectedCategories : DEFAULT_PREFERENCES.selectedCategories;
  state.selectedCategories = new Set(preferredCategories.filter((category) => categories.includes(category)));
}

function ensureDefaultCategories() {
  if (!state.categoryTouched) {
    applyDefaultCategorySelection();
    if (!state.preferenceDefaultsApplied && state.selectedCategories.size > 0) {
      state.preferenceDefaultsApplied = true;
    }
  }
}

function getSafeBookingUrl(event) {
  const url = normalizeText(event.booking_url);
  if (/^https?:\/\//i.test(url)) return url;
  const query = encodeURIComponent([event.title, event.venue].filter(Boolean).join(" "));
  return event.source === "Ticketmaster" ? `https://www.ticketmaster.com/search?q=${query}` : `https://www.google.com/search?q=${query}`;
}

function applyBookingLinkState(link, url, label) {
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  link.classList.remove("is-disabled");
}

function getRunKey(event) {
  return [canonicalKey(event.title), canonicalVenueKey(event.venue)].join("|");
}

function compareEvents(left, right) {
  return new Date(left.starts_at) - new Date(right.starts_at);
}

function getBookedDaySet() {
  return new Set(state.events.filter((event) => event.status === "Booked").map((event) => getEventDayKey(event)));
}

function getFamilyEventIds(sourceEvent) {
  if (!sourceEvent) return [];
  const familyKey = getRunKey(sourceEvent);
  return state.events
    .filter((event) => getRunKey(event) === familyKey)
    .map((event) => event.id);
}

function isRunEndingSoon(run) {
  if (!run.runEndDate) return false;
  const now = new Date();
  const delta = (run.runEndDate - now) / (1000 * 60 * 60 * 24);
  return delta >= 0 && delta <= RUN_ENDING_SOON_DAYS;
}

function getRunDateStatus(event, bookedDaySet) {
  if (event.status === "Booked") return "booked";
  if (event.status === "Considering") return "considering";
  if (event.status === "Completed") return "completed";
  if (event.status === "Not Interested") return "hidden";
  if (bookedDaySet.has(getEventDayKey(event))) return "conflict";
  return "ideal";
}

function getCanonicalRunSource(events, representative) {
  const sources = new Set(events.map((event) => event.source).filter(Boolean));
  if (sources.has("Florida Grand Opera")) return "Florida Grand Opera";
  if (sources.has("Arsht Center")) return "Arsht Center";
  if (sources.has("Ticketmaster")) return "Ticketmaster";
  return representative?.source || "";
}

function buildRun(events) {
  const sortedEvents = [...events].sort(compareEvents);
  const bookedDaySet = getBookedDaySet();
  const futureEvents = sortedEvents.filter((event) => {
    const date = getEventDate(event);
    return !date || date >= new Date(new Date().setHours(0, 0, 0, 0));
  });
  const representative = futureEvents[0] || sortedEvents[0];
  const canonicalSource = getCanonicalRunSource(sortedEvents, representative);
  const runStartDate = getEventDate(sortedEvents[0]);
  const runEndDate = getEventDate(sortedEvents[sortedEvents.length - 1]);
  const runAddedDate = sortedEvents.reduce((earliestDate, event) => {
    const addedDate = getEventAddedDate(event);
    if (!addedDate) return earliestDate;
    if (!earliestDate || addedDate < earliestDate) return addedDate;
    return earliestDate;
  }, null);
  const dateEntries = futureEvents.map((event) => ({
    event,
    status: getRunDateStatus(event, bookedDaySet),
    isBooked: event.status === "Booked",
    isConsidering: event.status === "Considering",
    isCompleted: event.status === "Completed",
  }));
  const hiddenEntries = dateEntries.filter((entry) => entry.event.status === "Not Interested");
  const bookedEntries = dateEntries.filter((entry) => entry.isBooked);
  const consideringEntries = bookedEntries.length > 0 ? [] : dateEntries.filter((entry) => entry.isConsidering);
  const completedEntries = dateEntries.filter((entry) => entry.isCompleted);
  const openEntries =
    bookedEntries.length > 0
      ? []
      : dateEntries.filter((entry) => !entry.isBooked && !entry.isConsidering && !entry.isCompleted && entry.event.status !== "Not Interested");
  const availableEntries = openEntries;
  const idealEntries = availableEntries.filter((entry) => entry.status === "ideal");
  const conflictingEntries = availableEntries.filter((entry) => entry.status === "conflict");
  const uniqueDayCount = new Set(sortedEvents.map((event) => getEventDayKey(event))).size;

  return {
    runId: `run:${getRunKey(representative)}`,
    title: representative.title,
    venue: representative.venue,
    source: canonicalSource,
    category: representative.category,
    image: representative.image,
    description: representative.description,
    booking_url: getSafeBookingUrl(representative),
    travel_label: representative.travel_label,
    planning_window: getDisplayPlanningWindow(representative),
    planning_window_label: getDisplayPlanningLabel(representative),
    dateAdded: runAddedDate,
    runStartDate,
    runEndDate,
    runStartLabel: runStartDate ? formatDateOnly(runStartDate) : representative.starts_at_display,
    runEndLabel: runEndDate ? formatDateOnly(runEndDate) : representative.starts_at_display,
    runDurationLabel:
      runStartDate && runEndDate && getEventDayKey(sortedEvents[0]) !== getEventDayKey(sortedEvents[sortedEvents.length - 1])
        ? `${formatDateOnly(runStartDate)} to ${formatDateOnly(runEndDate)}`
        : formatEventDateTime(representative),
    opportunities: futureEvents.length,
    uniqueDayCount,
    hasMultipleDates: uniqueDayCount > 1,
    runsEndingSoon: isRunEndingSoon({ runEndDate }),
    dateEntries,
    availableEntries,
    idealEntries,
    conflictingEntries,
    consideringEntries,
    bookedEntries,
    completedEntries,
    hiddenEntries,
    representative,
  };
}

function buildRuns(events) {
  const grouped = new Map();
  events.forEach((event) => {
    const key = getRunKey(event);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(event);
  });
  return [...grouped.values()].map((group) => buildRun(group)).sort((left, right) => {
    const leftDate = left.runStartDate ? left.runStartDate.getTime() : Number.MAX_SAFE_INTEGER;
    const rightDate = right.runStartDate ? right.runStartDate.getTime() : Number.MAX_SAFE_INTEGER;
    return leftDate - rightDate;
  });
}

function getRunEntriesByStatus(run, status) {
  if (status === "booked") return run.bookedEntries;
  if (status === "considering") return run.consideringEntries;
  if (status === "completed") return run.completedEntries;
  if (status === "hidden") return run.hiddenEntries;
  if (status === "open") return run.availableEntries;
  return run.dateEntries;
}

function filterEntriesByDate(entries, { start = null, end = null, futureOnly = false } = {}) {
  return entries.filter((entry) => {
    const date = getEventDate(entry.event);
    if (!date) return false;
    const day = startOfDay(date);
    if (futureOnly && day < startOfDay(new Date())) return false;
    if (start && day < startOfDay(start)) return false;
    if (end && day > startOfDay(end)) return false;
    return true;
  });
}

function getRunsWithStatus(status, options = {}) {
  const grouped = new Map();
  state.events.forEach((event) => {
    const normalizedStatus =
      event.status === "Not Interested"
        ? "hidden"
        : typeof event.status === "string"
          ? event.status.toLowerCase()
          : "";
    if (normalizedStatus !== status) return;
    const pseudoEntries = filterEntriesByDate([{ event }], options);
    if (!pseudoEntries.length) return;
    const key = getRunKey(event);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  });

  return [...grouped.values()].map((events) => {
    const run = buildRun(events);
    const statusEntries = [...events].sort(compareEvents).map((event) => ({
      event,
      isBooked: status === "booked",
      isConsidering: status === "considering",
      isCompleted: status === "completed",
      status,
    }));
    return { ...run, statusEntries };
  });
}

function getUniqueRunCountForStatus(status, options = {}) {
  return getRunsWithStatus(status, options).length;
}

function getLastAvailableEntry(run) {
  return run.availableEntries[run.availableEntries.length - 1] || null;
}

function getRunUrgency(run) {
  const lastAvailable = getLastAvailableEntry(run);
  if (!lastAvailable) return null;

  const lastAvailableDate = getEventDate(lastAvailable.event);
  const daysLeft = lastAvailableDate ? Math.round((startOfDay(lastAvailableDate) - startOfDay(new Date())) / (1000 * 60 * 60 * 24)) : null;

  if (run.availableEntries.length === 1) {
    return {
      label: "Final date",
      tone: "final",
      detail: lastAvailableDate ? `Last open date ${formatMonthDay(lastAvailableDate)}` : "Only one date left",
    };
  }

  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= FINAL_DATE_SOON_DAYS) {
    return {
      label: "Final week",
      tone: "final",
      detail: `Run closes ${formatMonthDay(lastAvailableDate)}`,
    };
  }

  if (run.runsEndingSoon) {
    return {
      label: "Ending soon",
      tone: "soon",
      detail: lastAvailableDate ? `Last open date ${formatMonthDay(lastAvailableDate)}` : "Run is closing soon",
    };
  }

  return null;
}

function getRunTimelineLabel(run) {
  const urgency = getRunUrgency(run);
  return urgency ? `${run.runDurationLabel} • ${urgency.label}` : run.runDurationLabel;
}

function getDiscoverRuns() {
  return buildRuns(state.events).filter((run) => run.availableEntries.length > 0);
}

function getCalendarRange() {
  const anchor = startOfDay(state.calendarAnchorDate || new Date());
  if (state.calendarView === "week") {
    const start = startOfWeek(anchor);
    return { start, end: endOfWeek(anchor), label: formatMonthName(anchor) };
  }
  if (state.calendarView === "next10") {
    return { start: anchor, end: addDays(anchor, 9), label: `${formatMonthDay(anchor)} - ${formatMonthDay(addDays(anchor, 9))}` };
  }
  if (state.calendarView === "next30") {
    return { start: anchor, end: addDays(anchor, 29), label: `${formatMonthDay(anchor)} - ${formatMonthDay(addDays(anchor, 29))}` };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start, end, label: `${formatMonthName(anchor)} ${anchor.getFullYear()}` };
}

function shiftCalendarPeriod(direction) {
  const anchor = startOfDay(state.calendarAnchorDate || new Date());
  if (state.calendarView === "week") {
    state.calendarAnchorDate = addDays(anchor, direction * 7);
    return;
  }
  if (state.calendarView === "next10") {
    state.calendarAnchorDate = addDays(anchor, direction * 10);
    return;
  }
  if (state.calendarView === "next30") {
    state.calendarAnchorDate = addDays(anchor, direction * 30);
    return;
  }
  state.calendarAnchorDate = new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

function matchesCalendarRange(run) {
  const range = getCalendarRange();
  const activeEntries = [...run.availableEntries, ...run.consideringEntries, ...run.bookedEntries, ...run.completedEntries];
  return activeEntries.some((entry) => isWithinRange(getEventDate(entry.event), range.start, range.end));
}

function matchesPlanningWindow(run) {
  return true;
}

function categoriesAffectCurrentDiscoverView() {
  return !(state.statusFilter.size === 1 && (state.statusFilter.has("Considering") || state.statusFilter.has("Booked")));
}

function matchesCategories(run, options = {}) {
  if (options.ignoreCategories) return true;
  return state.selectedCategories.size === 0 || state.selectedCategories.has(run.category);
}

function matchesVenue(run) {
  return state.filteredVenue === "all" || canonicalVenueKey(run.venue) === state.filteredVenue;
}

function matchesSource(run) {
  return state.filteredSource === "all" || (run.source || "") === state.filteredSource;
}

function matchesRunFilter(run, mode = "discover") {
  const filter = state.discoverRunFilter;
  if (filter === "multiple_dates") return run.hasMultipleDates;
  if (filter === "ending_soon") return run.runsEndingSoon;
  if (filter === "new_releases") return isRunRecentlyAdded(run);
  return true;
}

function isRunRecentlyAdded(run) {
  if (!run?.dateAdded) return false;
  const addedDay = startOfDay(run.dateAdded);
  const today = startOfDay(new Date());
  const ageInDays = Math.round((today - addedDay) / (1000 * 60 * 60 * 24));
  return ageInDays >= 0 && ageInDays < NEW_RELEASE_WINDOW_DAYS;
}

function getSelectedCategoryLabel() {
  if (isUsingDefaultCategorySelection()) return "Jess's usual mix";
  if (state.selectedCategories.size === 0) return "All categories";
  return [...state.selectedCategories].sort().join(", ");
}

function getStatusFilterLabel() {
  if (state.statusFilter.size === 0) return "All Events";
  return [...state.statusFilter]
    .map((status) => (status === "Not Interested" ? "Hidden" : status))
    .join(" + ");
}

function getActiveFilterCount() {
  let count = 0;
  if (hasActiveSearch()) count += 1;
  if (state.statusFilter.size > 0) count += 1;
  if (state.filteredVenue !== "all") count += 1;
  if (state.filteredSource !== "all") count += 1;
  if (state.discoverRunFilter !== "all") count += 1;
  if (state.startDateFilter) count += 1;
  if (state.endDateFilter) count += 1;
  if (!isUsingDefaultTimeWindow()) {
    if (state.startTimeFilter) count += 1;
    if (state.endTimeFilter) count += 1;
  }
  if (
    categoriesAffectCurrentDiscoverView() &&
    !isUsingDefaultCategorySelection() &&
    state.selectedCategories.size > 0 &&
    state.selectedCategories.size !== getAvailableCategories().length
  ) count += 1;
  return count;
}

function getMonthAheadEmptyCopy() {
  const activeFilterCount = getActiveFilterCount();
  if (activeFilterCount === 0) {
    return "The calendar is quiet in this period right now. Refresh events or move to a broader planning window to look further ahead.";
  }

  const activeLabels = [];
  if (hasActiveSearch()) activeLabels.push(`searching for "${state.eventSearchQuery.trim()}"`);
  if (state.statusFilter.size > 0) activeLabels.push(getStatusFilterLabel());
  if (state.filteredVenue !== "all") activeLabels.push(venueFilter?.selectedOptions?.[0]?.textContent || "this venue");
  if (state.filteredSource !== "all") activeLabels.push(sourceFilter?.selectedOptions?.[0]?.textContent || "this source");
  if (state.discoverRunFilter !== "all") {
    activeLabels.push(discoverRunFilterRow?.querySelector(`[data-run-filter="${state.discoverRunFilter}"]`)?.textContent || "this run focus");
  }
  if (state.startDateFilter || state.endDateFilter) {
    activeLabels.push("this date range");
  }
  if (!isUsingDefaultTimeWindow() && state.startTimeFilter) {
    activeLabels.push(`starts after ${formatTimeFilterLabel(state.startTimeFilter)}`);
  }
  if (!isUsingDefaultTimeWindow() && state.endTimeFilter) {
    activeLabels.push(`ends before ${formatTimeFilterLabel(state.endTimeFilter)}`);
  }
  if (
    categoriesAffectCurrentDiscoverView() &&
    !isUsingDefaultCategorySelection() &&
    state.selectedCategories.size > 0 &&
    state.selectedCategories.size !== getAvailableCategories().length
  ) {
    activeLabels.push(getSelectedCategoryLabel());
  }

  return `No runs match the current focus for ${activeLabels.slice(0, 3).join(", ")}${activeLabels.length > 3 ? ", and the other active filters" : ""}. Reset the planning view or loosen one filter to bring more options back in.`;
}

function matchesStatusFilter(entry) {
  if (state.statusFilter.size === 0) return (entry.event.status || "") !== "Not Interested";
  return state.statusFilter.has(entry.event.status || "");
}

function matchesDateRangeFilter(entry) {
  const date = getEventDate(entry.event);
  if (!date) return false;
  const start = getDateOnly(state.startDateFilter);
  const end = getDateOnly(state.endDateFilter);
  const day = startOfDay(date);
  if (start && day < start) return false;
  if (end && day > end) return false;
  return true;
}

function matchesStartTimeFilter(entry) {
  if (!state.startTimeFilter) return true;
  const hour = getEventHour(entry.event);
  const earliest = parseInputTime(state.startTimeFilter);
  if (earliest === null || hour === null) return true;
  return hour >= earliest;
}

function matchesEndTimeFilter(entry) {
  if (!state.endTimeFilter) return true;
  const endHour = getEstimatedEndHour(entry.event);
  const latest = parseInputTime(state.endTimeFilter);
  if (latest === null || endHour === null) return true;
  return endHour <= latest;
}

function matchesEntrySurfaceFilters(entry) {
  return matchesStatusFilter(entry) && matchesDateRangeFilter(entry) && matchesStartTimeFilter(entry) && matchesEndTimeFilter(entry);
}

function renderDiscoverFilterSummary() {
  if (!discoverFilterSummary) return;

  const summaryParts = [];
  const filteredRuns = getSurfaceRuns();
  const resultLabel = hasActiveSearch()
    ? `${filteredRuns.length} matching run${filteredRuns.length === 1 ? "" : "s"}`
    : `${filteredRuns.length} run${filteredRuns.length === 1 ? "" : "s"} in view`;
  const activeFilterCount = getActiveFilterCount();
  const range = getCalendarRange();
  summaryParts.push({
    label: "View",
    value: state.calendarView === "next10" ? "Next 10 Days" : state.calendarView === "next30" ? "Next 30 Days" : "Month",
  });
  if (hasActiveSearch()) {
    summaryParts.push({ label: "Search", value: state.eventSearchQuery.trim() });
  }
  summaryParts.push({ label: "Period", value: range.label });
  summaryParts.push({ label: "Show", value: getStatusFilterLabel() });
  if (categoriesAffectCurrentDiscoverView()) {
    summaryParts.push({ label: "Categories", value: getSelectedCategoryLabel() });
  }

  if (state.filteredVenue !== "all") {
    const venueLabel = venueFilter?.selectedOptions?.[0]?.textContent || "Selected venue";
    summaryParts.push({ label: "Venue", value: venueLabel });
  }

  if (state.filteredSource !== "all") {
    const sourceLabel = sourceFilter?.selectedOptions?.[0]?.textContent || "Selected source";
    summaryParts.push({ label: "Source", value: sourceLabel });
  }

  if (state.discoverRunFilter !== "all") {
    const runLabel = discoverRunFilterRow?.querySelector(`[data-run-filter="${state.discoverRunFilter}"]`)?.textContent || "Run focus";
    summaryParts.push({ label: "Run Focus", value: runLabel });
  }

  if (state.startDateFilter || state.endDateFilter) {
    const startLabel = state.startDateFilter ? formatDateOnly(getDateOnly(state.startDateFilter)) : "Now";
    const endLabel = state.endDateFilter ? formatDateOnly(getDateOnly(state.endDateFilter)) : "Later";
    summaryParts.push({ label: "Dates", value: `${startLabel} to ${endLabel}` });
  }

  if (!isUsingDefaultTimeWindow() && state.startTimeFilter) {
    summaryParts.push({ label: "Earliest", value: formatTimeFilterLabel(state.startTimeFilter) });
  }

  if (!isUsingDefaultTimeWindow() && state.endTimeFilter) {
    summaryParts.push({ label: "Latest", value: formatTimeFilterLabel(state.endTimeFilter) });
  }

  discoverFilterSummary.innerHTML = "";

  const resultNode = document.createElement("p");
  resultNode.className = "filter-summary-result";
  resultNode.textContent = resultLabel;
  discoverFilterSummary.appendChild(resultNode);

  const filterCountNode = document.createElement("span");
  filterCountNode.className = activeFilterCount === 0 ? "filter-summary-chip filter-summary-chip-muted" : "filter-summary-chip";
  filterCountNode.textContent = activeFilterCount === 0 ? "Calm default view" : `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`;
  discoverFilterSummary.appendChild(filterCountNode);

  summaryParts.forEach((part) => {
    const chip = document.createElement("span");
    chip.className = "filter-summary-chip";
    chip.textContent = `${part.label}: ${part.value}`;
    discoverFilterSummary.appendChild(chip);
  });

}

function getMonthAheadColumns() {
  const today = startOfDay(new Date());
  const firstWeekStart = startOfWeek(today);

  return Array.from({ length: MONTH_AHEAD_WEEKS }, (_, index) => {
    const start = addDays(firstWeekStart, index * 7);
    const end = endOfWeek(start);
    return {
      index,
      start,
      end,
      label: index === 0 ? "This Week" : index === 1 ? "Next Week" : `Week ${index + 1}`,
      rangeLabel: `${formatMonthDay(start)} - ${formatMonthDay(end)}`,
      bookNow: [],
      considering: [],
      booked: [],
    };
  });
}

function getCalendarPeriodLabel() {
  const anchor = state.calendarAnchorDate || new Date();
  if (state.calendarView === "week") {
    const start = startOfWeek(anchor);
    const end = endOfWeek(anchor);
    return `${formatMonthDay(start)} - ${formatMonthDay(end)}, ${end.getFullYear()}`;
  }
  if (state.calendarView === "next10") {
    const start = startOfDay(anchor);
    const end = addDays(start, 9);
    return `${formatMonthDay(start)} - ${formatMonthDay(end)}, ${end.getFullYear()}`;
  }
  if (state.calendarView === "next30") {
    const end = addDays(anchor, 29);
    return `${formatMonthDay(anchor)} - ${formatMonthDay(end)}, ${end.getFullYear()}`;
  }
  return `${formatMonthName(anchor)} ${anchor.getFullYear()}`;
}

function getCalendarViewLabel() {
  if (state.calendarView === "week") return "Week View";
  if (state.calendarView === "next10") return "Next 10 Days";
  if (state.calendarView === "next30") return "Next 30 Days";
  return "Month View";
}

function getCalendarPeriodHint() {
  if (state.calendarView === "week") return "Move one week at a time";
  if (state.calendarView === "next10") return "Move in 10 day steps";
  if (state.calendarView === "next30") return "Move in 30 day windows";
  return "Move one month at a time";
}

function getCalendarShiftButtonLabel(direction) {
  const action = direction < 0 ? "Previous" : "Next";
  if (state.calendarView === "week") return `${action} week`;
  if (state.calendarView === "next10") return `${action} 10 days`;
  if (state.calendarView === "next30") return `${action} 30 days`;
  return `${action} month`;
}

function getSurfaceRuns(options = {}) {
  const ignoreCategories = Boolean(options.ignoreCategories);
  return buildRuns(state.events).filter((run) => {
    const relevantEntries = [...run.availableEntries, ...run.consideringEntries, ...run.bookedEntries, ...run.completedEntries, ...run.hiddenEntries];
    const inRangeEntries = relevantEntries.filter((entry) => isWithinRange(getEventDate(entry.event), getCalendarRange().start, getCalendarRange().end));
    if (inRangeEntries.length === 0) return false;
    if (hasActiveSearch()) {
      if (!matchesSearchQuery(run)) return false;
      return inRangeEntries.some((entry) => matchesEntrySurfaceFilters(entry));
    }
    if (!matchesCategories(run, { ignoreCategories }) || !matchesVenue(run) || !matchesSource(run) || !matchesRunFilter(run, "discover")) return false;
    return inRangeEntries.some((entry) => matchesEntrySurfaceFilters(entry));
  });
}

function getRunEntryDisplayStatus(entry) {
  if (entry.isBooked) return "booked";
  if (entry.isConsidering) return "considering";
  if (entry.isCompleted) return "completed";
  if (entry.event.status === "Not Interested") return "hidden";
  return "open";
}

function getStatusPriority(status) {
  if (status === "considering") return 0;
  if (status === "open") return 1;
  if (status === "booked") return 2;
  if (status === "hidden") return 3;
  return 4;
}

function getCurrentWeekRange() {
  const today = startOfDay(new Date());
  return { start: today, end: endOfWeek(today) };
}

function isPreferredCategory(category) {
  return DEFAULT_PREFERENCES.selectedCategories.includes(category);
}

function isPreferredTimeWindow(event) {
  const startMatches = state.startTimeFilter === "all" ? true : matchesStartTimeFilter({ event });
  const endMatches = state.endTimeFilter === "all" ? true : matchesEndTimeFilter({ event });
  return startMatches && endMatches;
}

function getBehaviorSignalScore(bucket = {}) {
  return (
    (bucket.booked || 0) * 6 +
    (bucket.considering || 0) * 3 +
    (bucket.completed || 0) * 2 +
    (bucket.restored || 0) * 1 +
    (bucket.searched || 0) * 1 -
    (bucket.hidden || 0) * 5
  );
}

function mergeBehaviorProfileBucket(map, key, type, amount = 1) {
  if (!key) return;
  const existing = map.get(key) || { searched: 0, considering: 0, booked: 0, completed: 0, hidden: 0, restored: 0 };
  existing[type] = (existing[type] || 0) + amount;
  map.set(key, existing);
}

function buildBehaviorProfile() {
  const profile = {
    categories: new Map(),
    venues: new Map(),
    times: new Map(),
  };
  const storedSignals = getStoredBehaviorSignals();
  Object.entries(storedSignals.categories || {}).forEach(([key, bucket]) => profile.categories.set(key, bucket));
  Object.entries(storedSignals.venues || {}).forEach(([key, bucket]) => profile.venues.set(key, bucket));
  Object.entries(storedSignals.times || {}).forEach(([key, bucket]) => profile.times.set(key, bucket));

  buildRuns(state.events).forEach((run) => {
    const sourceEntry =
      run.bookedEntries[0] ||
      run.consideringEntries[0] ||
      run.completedEntries[0] ||
      run.hiddenEntries[0] ||
      run.availableEntries[0] ||
      run.dateEntries[0];
    if (!sourceEntry) return;
    const type = run.bookedEntries.length
      ? "booked"
      : run.consideringEntries.length
        ? "considering"
        : run.completedEntries.length
          ? "completed"
          : run.hiddenEntries.length && !run.availableEntries.length
            ? "hidden"
            : null;
    if (!type) return;
    const event = sourceEntry.event;
    mergeBehaviorProfileBucket(profile.categories, canonicalKey(event.category || "Event"), type, 1);
    mergeBehaviorProfileBucket(profile.venues, canonicalKey(event.venue || ""), type, 1);
    mergeBehaviorProfileBucket(profile.times, getTimeBucketForEvent(event), type, 1);
  });

  return profile;
}

function getBehaviorProfile() {
  if (!state.behaviorProfile) {
    state.behaviorProfile = buildBehaviorProfile();
  }
  return state.behaviorProfile;
}

function getBehaviorAdjustment(item) {
  const profile = getBehaviorProfile();
  const event = item.primaryEntry.event;
  const categoryScore = getBehaviorSignalScore(profile.categories.get(canonicalKey(item.run.category || "Event")));
  const venueScore = getBehaviorSignalScore(profile.venues.get(canonicalKey(item.run.venue || "")));
  const timeScore = getBehaviorSignalScore(profile.times.get(getTimeBucketForEvent(event)));
  const total = Math.max(-24, Math.min(28, Math.round(categoryScore * 1.15 + venueScore * 0.45 + timeScore * 0.9)));
  const reason =
    total >= 10 ? "Matches your usual picks" :
    total <= -8 ? "Often skipped" :
    "";
  return { score: total, reason };
}

function getCalmCulturalAdjustment(item) {
  const event = item.primaryEntry.event;
  const category = item.run.category || event.category || "Event";
  const text = canonicalKey([item.run.title, item.run.description, event.title, event.description, event.venue].filter(Boolean).join(" "));
  let score = 0;
  let reason = "";

  const categoryScores = {
    Opera: 18,
    Ballet: 16,
    Classical: 14,
    Art: 10,
    Garden: 10,
    Museum: 10,
    Dance: 6,
    Theater: 4,
    Musical: 1,
    Concert: -6,
    Event: -8,
  };

  score += categoryScores[category] || 0;

  if (/\b(matinee|afternoon|gallery|garden|museum|exhibit|exhibition|orchestra|symphony|philharmonic|chamber music)\b/.test(text)) {
    score += 6;
    reason = "Calm cultural fit";
  }

  if (/\b(comedy|comedian|stand-up|standup|improv|late night|after dark|nightlife|dj|party|club)\b/.test(text)) {
    score -= 20;
    reason = "Lower comfort fit";
  }

  return { score, reason };
}

function getItemRepresentativeDate(item) {
  return getEventDate(item.primaryEntry.event);
}

function parseTravelMinutes(label) {
  const value = normalizeText(label);
  const hoursMatch = value.match(/(\d+(?:\.\d+)?)\s*hour/i);
  const minutesMatch = value.match(/(\d+)\s*min/i);
  const hours = hoursMatch ? Math.round(Number(hoursMatch[1]) * 60) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const total = hours + minutes;
  return Number.isFinite(total) && total > 0 ? total : null;
}

function getRecommendationReasons(item, options = {}) {
  const reasons = [];
  const date = getItemRepresentativeDate(item);
  const hour = getEventHour(item.primaryEntry.event);
  const endHour = getEstimatedEndHour(item.primaryEntry.event);
  const travelMinutes = parseTravelMinutes(item.run.travel_label || item.primaryEntry.event.travel_label);
  const isWeekday = date ? ![0, 6].includes(date.getDay()) : false;
  const isWeekend = date ? [0, 6].includes(date.getDay()) : false;

  if (item.urgency?.label === "Final date") reasons.push("Final date");
  else if (item.urgency?.label === "Final week" || item.urgency?.label === "Ending soon") reasons.push("Ending soon");
  const behavior = getBehaviorAdjustment(item);
  const calmFit = getCalmCulturalAdjustment(item);
  if (behavior.reason) reasons.push(behavior.reason);
  if (calmFit.reason) reasons.push(calmFit.reason);
  if (isPreferredCategory(item.run.category)) reasons.push("Matches favorites");
  if (travelMinutes !== null && travelMinutes <= 60) reasons.push("Easy travel");
  if (endHour !== null && endHour <= 17) reasons.push("Ends by 5 PM");
  else if (hour !== null && hour >= 11 && hour < 17 && isWeekend) reasons.push("Weekend daytime fit");
  else if (isPreferredTimeWindow(item.primaryEntry.event) && endHour !== null && endHour <= 18) reasons.push("Good time");
  if (item.showingCount > 1 && reasons.length < (options.max || 2)) reasons.push("Flexible showtimes");
  if (item.status === "considering" && reasons.length < (options.max || 2)) reasons.push("Already under review");

  return [...new Set(reasons)].slice(0, options.max || 2);
}

function getRecommendationScore(item) {
  const event = item.primaryEntry.event;
  const date = getItemRepresentativeDate(item);
  const hour = getEventHour(event);
  const endHour = getEstimatedEndHour(event);
  const travelMinutes = parseTravelMinutes(item.run.travel_label || event.travel_label);
  const isWeekday = date ? ![0, 6].includes(date.getDay()) : false;
  const isWeekend = date ? [0, 6].includes(date.getDay()) : false;
  let score = 0;

  if (item.status === "completed" || item.status === "booked" || item.status === "hidden" || event.status === "Not Interested") {
    return { score: -999, reasons: [] };
  }
  const behavior = getBehaviorAdjustment(item);
  const calmFit = getCalmCulturalAdjustment(item);
  if (item.status === "considering") score += 30;
  if (isPreferredCategory(item.run.category)) score += 20;
  if (isPreferredTimeWindow(event)) score += 18;
  else if (hasExplicitEventTime(event)) score -= 10;
  if (item.urgency?.label === "Final date") score += 24;
  else if (item.urgency?.label === "Final week") score += 18;
  else if (item.urgency?.label === "Ending soon") score += 12;
  if (travelMinutes !== null && travelMinutes <= 40) score += 22;
  else if (travelMinutes !== null && travelMinutes <= 60) score += 18;
  else if (travelMinutes !== null && travelMinutes > 75) score -= 16;
  else if (travelMinutes !== null && travelMinutes > 60) score -= 8;
  if (endHour !== null && endHour <= 17) score += 18;
  else if (endHour !== null && endHour <= 18.5) score += 10;
  else if (hour !== null && hour >= 11 && hour < 17 && isWeekend) score += 10;
  else if (hour !== null && hour >= 17 && hour < 20 && isWeekday) score += 6;
  if (item.showingCount > 1) score += 6;
  if (endHour !== null && endHour > 19) score -= 12;
  if (endHour !== null && endHour > 22) score -= 18;
  if (hour !== null && hour >= 19.5) score -= 12;
  if (hour !== null && hour < 11 && isWeekday) score -= 4;
  score += calmFit.score;
  score += behavior.score;

  return { score, reasons: getRecommendationReasons(item, { max: 2 }) };
}

function getEntrySortTime(entry) {
  const date = getEventDate(entry.event);
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function formatCalendarTime(event) {
  const date = getEventDate(event);
  if (!date || !hasExplicitEventTime(event)) return "";
  return formatTimeOnly(date);
}

function getEntriesWithExplicitTimes(entries = []) {
  return entries.filter((entry) => hasExplicitEventTime(entry.event));
}

function getEntriesTimeLabel(entries = []) {
  const explicitEntries = getEntriesWithExplicitTimes(entries);
  if (entries.length > 1) {
    return explicitEntries.length ? "Multiple times" : "";
  }
  return explicitEntries[0] ? formatTimeOnly(getEventDate(explicitEntries[0].event)) : "";
}

function getEventNotes(event) {
  if (typeof event?.note === "string" && event.note.trim()) return event.note.trim();
  if (typeof event?.notes === "string" && event.notes.trim()) return event.notes.trim();
  if (Array.isArray(event?.notes)) {
    const notes = event.notes.map((note) => normalizeText(note)).filter(Boolean);
    return notes.length ? notes.join(" • ") : "";
  }
  return "";
}

function getCalendarChipContext(item) {
  if (item.status === "considering") return "Considering";
  if (item.status === "booked") return "Booked";
  if (item.status === "completed") return "Completed";
  if (item.status === "hidden") return "Hidden";
  return item.showingCount > 1 ? `${item.showingCount} showtimes` : normalizeText(item.run.venue);
}

function getCalendarPriorityTier(item) {
  if (item.status === "considering" || item.status === "booked" || item.urgency || item.recommendationScore >= 22) return "high";
  const broadCategoryView = state.selectedCategories.size === 0 || state.selectedCategories.size === getAvailableCategories().length;
  const isLessRelevantCategory = broadCategoryView && !DEFAULT_CATEGORY_SELECTION.includes(item.run.category);
  if (item.showingCount > 1 || isLessRelevantCategory || item.status === "completed" || item.status === "hidden") return "low";
  return "normal";
}

function compareSurfaceItems(left, right) {
  const leftPriority = getStatusPriority(left.status);
  const rightPriority = getStatusPriority(right.status);
  if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  if (left.urgency && !right.urgency) return -1;
  if (!left.urgency && right.urgency) return 1;
  if (left.urgency && right.urgency) {
    const urgencyOrder = { final: 0, soon: 1 };
    const leftUrgency = urgencyOrder[left.urgency.tone] ?? 2;
    const rightUrgency = urgencyOrder[right.urgency.tone] ?? 2;
    if (leftUrgency !== rightUrgency) return leftUrgency - rightUrgency;
  }
  if ((right.recommendationScore || 0) !== (left.recommendationScore || 0)) {
    return (right.recommendationScore || 0) - (left.recommendationScore || 0);
  }
  return getEntrySortTime(left.primaryEntry) - getEntrySortTime(right.primaryEntry);
}

function getCalendarDayStatusPriority(item) {
  if (item.status === "booked") return 0;
  if (item.status === "considering") return 1;
  return 2;
}

function sortCalendarDayItems(items = []) {
  return [...items].sort((left, right) => {
    const statusDelta = getCalendarDayStatusPriority(left) - getCalendarDayStatusPriority(right);
    if (statusDelta !== 0) return statusDelta;
    return compareSurfaceItems(left, right);
  });
}

function createCalendarTimesPreview(entries) {
  return getEntriesTimeLabel(entries);
}

function buildSurfaceEntries(options = {}) {
  const range = getCalendarRange();
  const groupedItems = new Map();

  getSurfaceRuns(options).forEach((run) => {
    [...run.availableEntries, ...run.consideringEntries, ...run.bookedEntries, ...run.completedEntries, ...run.hiddenEntries].forEach((entry) => {
      const date = getEventDate(entry.event);
      if (!isWithinRange(date, range.start, range.end)) return;
      if (!matchesEntrySurfaceFilters(entry)) return;
      const dayKey = getEventDayKey(entry.event);
      const key = `${run.runId}:${dayKey}`;
      if (!groupedItems.has(key)) {
        groupedItems.set(key, {
          id: key,
          run,
          dayKey,
          date,
          entries: [],
          urgency: getRunUrgency(run),
        });
      }
      groupedItems.get(key).entries.push(entry);
    });
  });

  return [...groupedItems.values()]
    .map((item) => {
      const entries = [...item.entries].sort((left, right) => getEntrySortTime(left) - getEntrySortTime(right));
      const primaryEntry =
        [...entries].sort((left, right) => {
          const statusDelta = getStatusPriority(getRunEntryDisplayStatus(left)) - getStatusPriority(getRunEntryDisplayStatus(right));
          if (statusDelta !== 0) return statusDelta;
          return getEntrySortTime(left) - getEntrySortTime(right);
        })[0] || entries[0];
      const status = getRunEntryDisplayStatus(primaryEntry);
      const showingCount = entries.length;
      const timePreview = createCalendarTimesPreview(entries);
      const itemWithMeta = {
        ...item,
        entries,
        primaryEntry,
        status,
        showingCount,
        timePreview,
      };
      const recommendation = getRecommendationScore(itemWithMeta);
      const enrichedItem = {
        ...itemWithMeta,
        recommendationScore: recommendation.score,
        fitReasons: recommendation.reasons,
        confidenceSignals: getConfidenceSignals({ ...itemWithMeta, recommendationScore: recommendation.score, fitReasons: recommendation.reasons }),
      };
      return {
        ...enrichedItem,
        priorityTier: getCalendarPriorityTier(enrichedItem),
      };
    })
    .sort(compareSurfaceItems);
}

function createEventQuickActions(item) {
  const actions = document.createElement("div");
  actions.className = "calendar-event-actions";
  const targetEvent = item.primaryEntry.event;

  const link = document.createElement("a");
  link.className = "status-button status-button-open";
  applyBookingLinkState(link, getSafeBookingUrl(targetEvent), "Open");
  link.addEventListener("click", (event) => event.stopPropagation());
  actions.appendChild(link);

  if (item.status === "open") {
    const consider = document.createElement("button");
    consider.type = "button";
    consider.className = "status-button status-button-consider";
    consider.textContent = "Consider";
    consider.addEventListener("click", (event) => {
      event.stopPropagation();
      moveEventToConsidering(targetEvent);
    });
    actions.appendChild(consider);

    const book = document.createElement("button");
    book.type = "button";
    book.className = "status-button status-button-primary";
    book.textContent = "Book";
    book.addEventListener("click", (event) => {
      event.stopPropagation();
      updateEventStatus(targetEvent.id, "Booked", `${item.run.title} booked for ${formatEventDateTime(targetEvent)}`);
    });
    actions.appendChild(book);
  } else if (item.status === "considering") {
    const consider = document.createElement("button");
    consider.type = "button";
    consider.className = "status-button status-button-consider active";
    consider.textContent = "Remove from Considering";
    consider.addEventListener("click", (event) => {
      event.stopPropagation();
      updateEventStatus(targetEvent.id, null, `Removed ${item.run.title} from Considering`);
    });
    actions.appendChild(consider);

    const book = document.createElement("button");
    book.type = "button";
    book.className = "status-button status-button-primary";
    book.textContent = "Book";
    book.addEventListener("click", (event) => {
      event.stopPropagation();
      updateEventStatus(targetEvent.id, "Booked", `${item.run.title} booked for ${formatEventDateTime(targetEvent)}`);
    });
    actions.appendChild(book);
  } else if (item.status === "hidden") {
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "status-button status-button-consider";
    restore.textContent = "Restore hidden";
    restore.addEventListener("click", (event) => {
      event.stopPropagation();
      restoreRunFamily(item.run);
    });
    actions.appendChild(restore);
  } else if (item.status === "booked") {
    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "status-button status-button-hide";
    undo.textContent = "Undo booking";
    undo.addEventListener("click", (event) => {
      event.stopPropagation();
      updateEventStatus(targetEvent.id, null, `Booking removed for ${item.run.title}`);
    });
    actions.appendChild(undo);
  }

  if (item.status !== "booked" && item.status !== "completed") {
    if (item.status === "hidden") return actions;
    const hide = document.createElement("button");
    hide.type = "button";
    hide.className = "status-button status-button-hide";
    hide.textContent = "Hide";
    hide.addEventListener("click", (event) => {
      event.stopPropagation();
      markRunNotInterested(item.run);
    });
    actions.appendChild(hide);
  }

  return actions;
}

function createCalendarShowingList(item) {
  const list = document.createElement("div");
  list.className = "calendar-showing-list";

  item.entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "calendar-showing-row";

    const copy = document.createElement("div");
    copy.className = "calendar-showing-copy";
    const timeLabel = formatCalendarTime(entry.event);
    copy.innerHTML = `
      ${timeLabel ? `<strong>${timeLabel}</strong>` : ""}
      <span>${getRunEntryDisplayStatus(entry) === "open" ? "Open showing" : getRunEntryDisplayStatus(entry).charAt(0).toUpperCase() + getRunEntryDisplayStatus(entry).slice(1)}</span>
    `;
    row.appendChild(copy);

    if (item.entries.length > 1 && getRunEntryDisplayStatus(entry) !== "completed") {
      const entryStatus = getRunEntryDisplayStatus(entry);
      const action = document.createElement("button");
      action.type = "button";
      action.className = "status-button";
      action.textContent = entryStatus === "booked" ? "Booked" : "Book This";
      action.disabled = entryStatus === "booked" || state.pendingStatusIds.has(entry.event.id);
      action.addEventListener("click", (event) => {
        event.stopPropagation();
        if (entryStatus === "considering" || entryStatus === "open") {
          updateEventStatus(entry.event.id, "Booked", `${item.run.title} booked for ${formatEventDateTime(entry.event)}`);
        }
      });
      row.appendChild(action);
    }

    list.appendChild(row);
  });

  return list;
}

function jumpToCalendarItem(item, options = {}) {
  state.calendarView = "next10";
  const itemDate = getItemRepresentativeDate(item);
  state.calendarAnchorDate = startOfDay(itemDate || new Date());
  state.expandedRunIds.add(item.id);
  syncCalendarViewButtons();
  render();
  document.getElementById("monthAhead")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (options.closePlanner) {
    state.plannerModalOpen = false;
    render();
  }
}

function createFitSignalList(item, className = "fit-signal-list") {
  const reasons = (item.confidenceSignals || item.fitReasons || []).slice(0, 2);
  if (!reasons.length) return null;
  const list = document.createElement("div");
  list.className = className;
  reasons.forEach((reason) => {
    const tag = document.createElement("span");
    tag.className = "fit-signal";
    tag.textContent = reason;
    list.appendChild(tag);
  });
  return list;
}

function createRecommendationActions(item, options = {}) {
  const actions = document.createElement("div");
  actions.className = options.compact ? "smart-pick-actions" : "planner-item-actions";

  const addViewButton = () => {
    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "status-button status-button-open";
    viewButton.textContent = options.compact ? "View" : "Open";
    viewButton.addEventListener("click", () => jumpToCalendarItem(item, { closePlanner: options.closePlanner }));
    actions.appendChild(viewButton);
  };

  const addConsiderButton = (active = false) => {
    const considerButton = document.createElement("button");
    considerButton.type = "button";
    considerButton.className = `status-button status-button-consider${active ? " active" : ""}`;
    considerButton.textContent = active ? "Remove from Considering" : "Consider";
    considerButton.addEventListener("click", () =>
      active
        ? updateEventStatus(item.primaryEntry.event.id, null, `Removed ${item.run.title} from Considering`)
        : moveEventToConsidering(item.primaryEntry.event)
    );
    actions.appendChild(considerButton);
  };

  if (options.compact) {
    addConsiderButton(item.status === "considering");
    addViewButton();
    return actions;
  }

  addViewButton();

  if (item.status === "booked") {
    const undoBookedButton = document.createElement("button");
    undoBookedButton.type = "button";
    undoBookedButton.className = "status-button status-button-hide";
    undoBookedButton.textContent = "Undo booking";
    undoBookedButton.addEventListener("click", () =>
      updateEventStatus(item.primaryEntry.event.id, null, `Booking removed for ${item.run.title}`)
    );
    actions.appendChild(undoBookedButton);
    return actions;
  }

  if (item.status === "hidden") {
    const restoreButton = document.createElement("button");
    restoreButton.type = "button";
    restoreButton.className = "status-button status-button-consider";
    restoreButton.textContent = "Restore hidden";
    restoreButton.addEventListener("click", () => restoreRunFamily(item.run));
    actions.appendChild(restoreButton);
    return actions;
  }

  if (item.status !== "completed") {
    addConsiderButton(item.status === "considering");
  }

  if (options.includeBooked && item.status !== "booked" && item.status !== "completed") {
    const bookedButton = document.createElement("button");
    bookedButton.type = "button";
    bookedButton.className = "status-button status-button-primary";
    bookedButton.textContent = "Booked";
    bookedButton.addEventListener("click", () =>
      updateEventStatus(item.primaryEntry.event.id, "Booked", `${item.run.title} booked for ${formatEventDateTime(item.primaryEntry.event)}`)
    );
    actions.appendChild(bookedButton);
  }

  if (options.includeNotInterested && item.status !== "booked" && item.status !== "completed") {
    const hideButton = document.createElement("button");
    hideButton.type = "button";
    hideButton.className = "status-button status-button-hide";
    hideButton.textContent = "Hide";
    hideButton.addEventListener("click", () => markRunNotInterested(item.run));
    actions.appendChild(hideButton);
  }

  return actions;
}

function createRecommendationCard(item) {
  const card = document.createElement("article");
  card.className = "smart-pick-card smart-pick-card-hero";
  const timeLabel = item.timePreview ? `${formatWeekday(getItemRepresentativeDate(item))} • ${item.timePreview}` : formatWeekday(getItemRepresentativeDate(item));
  const venueLabel = normalizeText(item.run.venue) || "Venue TBD";
  const contextLine = getSmartPickContextLine(item);
  card.innerHTML = `
    <div class="smart-pick-topline">
      <p class="feature-label">${item.run.category || "Event"}</p>
      ${item.urgency ? `<span class="calendar-event-badge calendar-event-badge-${item.urgency.tone}">${item.urgency.label}</span>` : ""}
    </div>
    <div class="smart-pick-main">
      <p class="smart-pick-time">${timeLabel}</p>
      <h4>${item.run.title}</h4>
    </div>
    <p class="smart-pick-meta">${venueLabel}</p>
    ${contextLine ? `<p class="smart-pick-context">${contextLine}</p>` : ""}
  `;
  const signals = createFitSignalList(item, "smart-pick-signals");
  if (signals) card.appendChild(signals);
  card.appendChild(createRecommendationActions(item, { compact: true }));
  return card;
}

function getPlannerRange(mode = "week") {
  if (mode === "month") {
    return getCalendarRange();
  }
  return getCurrentWeekRange();
}

function dedupeRunFamilies(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.run.runId)) return false;
    seen.add(item.run.runId);
    return true;
  });
}

function getPlannerCandidatesForMode(mode = "week") {
  const range = getPlannerRange(mode);
  return dedupeRunFamilies(
    buildSurfaceEntries()
    .filter((item) => {
      const date = getItemRepresentativeDate(item);
      return date && isWithinRange(date, range.start, range.end) && !["completed", "booked", "hidden"].includes(item.status);
    })
    .map((item) => {
      const recommendation = getRecommendationScore(item);
      return { ...item, recommendationScore: recommendation.score, fitReasons: recommendation.reasons };
    })
    .filter((item) => item.recommendationScore > -999)
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) return right.recommendationScore - left.recommendationScore;
      return compareSurfaceItems(left, right);
    })
  );
}

function comparePlannerItemsChronologically(left, right) {
  const dateDelta = getEntrySortTime(left.primaryEntry) - getEntrySortTime(right.primaryEntry);
  if (dateDelta !== 0) return dateDelta;
  if ((right.recommendationScore || 0) !== (left.recommendationScore || 0)) {
    return (right.recommendationScore || 0) - (left.recommendationScore || 0);
  }
  return compareSurfaceItems(left, right);
}

function createPlannerItem(item) {
  const row = document.createElement("article");
  row.className = "planner-item";
  const representative = item.primaryEntry?.event || item.idealEntries?.[0]?.event || item.availableEntries?.[0]?.event || null;
  const flag = item.urgency ? '<span class="planner-item-flag">Decide soon</span>' : "";
  const image = representative?.image ? `<img class="planner-item-image" src="${representative.image}" alt="${item.run.title}" />` : '<div class="planner-item-image planner-item-image-placeholder" aria-hidden="true"></div>';
  const dateLabel = formatDateOnly(getItemRepresentativeDate(item));
  const timeLabel =
    item.timePreview === "Multiple times"
      ? "Multiple times"
      : item.timePreview
        ? `${item.timePreview} to about ${formatEstimatedEndTime(item.primaryEntry.event)}`
        : "Time details coming soon";
  const venueLabel = normalizeText(item.run.venue) || "Venue TBD";
  const description = truncateText(normalizeText(representative?.description), 150);
  const notes = representative ? getEventNotes(representative) : "";
  row.innerHTML = `
    <div class="planner-item-media">
      ${image}
    </div>
    <div class="planner-item-body">
      <div class="planner-item-copy">
        <div class="planner-item-topline">
          <p class="feature-label">${formatWeekday(getItemRepresentativeDate(item))}</p>
          <div class="planner-item-flags">
            ${flag}
            ${item.urgency ? `<span class="calendar-event-badge calendar-event-badge-${item.urgency.tone}">${item.urgency.label}</span>` : ""}
          </div>
        </div>
        <h5>${item.run.title}</h5>
        <div class="planner-item-meta">
          <span>${dateLabel}</span>
          <span>${timeLabel}</span>
          <span>${venueLabel}</span>
        </div>
        ${description ? `<p class="planner-item-description">${description}</p>` : ""}
        ${notes ? `<p class="planner-item-note">${notes}</p>` : ""}
      </div>
    </div>
  `;
  const signals = createFitSignalList(item, "planner-fit-signals");
  const footer = document.createElement("div");
  footer.className = "planner-item-footer";
  if (signals) footer.appendChild(signals);
  footer.appendChild(createRecommendationActions(item, { includeBooked: true, includeNotInterested: true, closePlanner: true }));
  row.appendChild(footer);
  return row;
}

function createCalendarEventChip(item, compact = false) {
  const chip = document.createElement("article");
  const expanded = state.expandedRunIds.has(item.id);
  chip.className = `calendar-event-chip calendar-event-chip-${item.status}`;
  chip.classList.add(`calendar-event-chip-tier-${item.priorityTier}`);
  if (item.urgency) chip.classList.add(`calendar-event-chip-${item.urgency.tone}`);
  if (expanded) chip.classList.add("is-expanded");
  if (item.showingCount > 1) chip.classList.add("calendar-event-chip-grouped");
  if (item.recommendationScore >= 28) chip.classList.add("calendar-event-chip-best-fit");

  const header = document.createElement("button");
  header.type = "button";
  header.className = "calendar-event-button";
  header.title = item.run.title;
  header.innerHTML = `
    <span class="calendar-event-meta">
      ${item.timePreview ? `<span class="calendar-event-time">${item.timePreview}</span>` : ""}
      <span class="calendar-event-badges">
        ${item.urgency ? `<span class="calendar-event-badge calendar-event-badge-${item.urgency.tone}">${item.urgency.label}</span>` : ""}
      </span>
    </span>
    <span class="calendar-event-heading">
      <span class="calendar-event-title">${item.run.title}</span>
      ${compact ? "" : `<span class="calendar-event-venue-inline">${getCalendarChipContext(item)}</span>`}
    </span>
  `;
  header.querySelector(".calendar-event-title")?.setAttribute("title", item.run.title);
  header.setAttribute("aria-expanded", String(expanded));
  header.addEventListener("click", () => {
    if (state.expandedRunIds.has(item.id)) {
      state.expandedRunIds.delete(item.id);
    } else {
      state.expandedRunIds.add(item.id);
    }
    render();
  });
  chip.appendChild(header);
  const signals = createFitSignalList(item);
  if (signals) chip.appendChild(signals);

  if (!compact && expanded) {
    const detail = document.createElement("div");
    detail.className = "calendar-event-detail";
    detail.innerHTML = `
      <p class="calendar-event-venue">${item.run.venue}</p>
      <p class="calendar-event-copy">${item.showingCount > 1 ? `${item.showingCount} showtimes on this day.` : "Single showing on this day."} ${item.urgency?.detail || getRunTimelineLabel(item.run)}</p>
      <p class="calendar-event-next-step">${item.status === "open" ? "Next step: consider, book, or hide." : item.status === "considering" ? "Next step: book the best showing." : item.status === "booked" ? "Booked showings stay here until completed." : item.status === "hidden" ? "Hidden showings stay out of planning until restored." : "Completed showings stay in history."}</p>
    `;
    detail.appendChild(createCalendarShowingList(item));
    detail.appendChild(createEventQuickActions(item));
    chip.appendChild(detail);
  }

  return chip;
}

function createCalendarDayCell(date, items, options = {}) {
  const { muted = false, compact = false } = options;
  const cell = document.createElement("section");
  cell.className = "calendar-day-cell";
  const dayKey = date.toISOString().slice(0, 10);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  if (muted) cell.classList.add("is-muted");
  if (startOfDay(date).getTime() === startOfDay(new Date()).getTime()) cell.classList.add("is-today");
  if (isWeekend) cell.classList.add("is-weekend");

  const header = document.createElement("div");
  header.className = "calendar-day-header";
  const isToday = startOfDay(date).getTime() === startOfDay(new Date()).getTime();
  header.innerHTML = `
    <div class="calendar-day-labels">
      <span class="calendar-day-weekday">${formatWeekday(date)}</span>
      ${isToday ? '<span class="calendar-day-today">Today</span>' : ""}
    </div>
    <div class="calendar-day-header-meta">
      <strong class="calendar-day-number">${date.getDate()}</strong>
      ${items.length ? `<span class="calendar-day-count">${items.length} ${items.length === 1 ? "item" : "items"}</span>` : ""}
    </div>
  `;
  cell.appendChild(header);

  const body = document.createElement("div");
  body.className = "calendar-day-events";
  if (!items.length && !muted) {
    const empty = document.createElement("p");
    empty.className = "calendar-day-empty";
    empty.textContent = compact ? "Open" : "Open day";
    body.appendChild(empty);
  } else {
    const baseLimit = 3;
    const isExpanded = state.expandedDayKeys.has(dayKey);
    const visibleItems = isExpanded ? items : items.slice(0, baseLimit);
    visibleItems.forEach((item) => body.appendChild(createCalendarEventChip(item, compact)));
    if (items.length > baseLimit) {
      const hiddenItems = items.slice(baseLimit);
      const more = document.createElement("button");
      more.type = "button";
      more.className = "calendar-day-more-button";
      more.textContent = isExpanded ? "Show less" : `+${items.length - baseLimit} more`;
      more.title = hiddenItems.map((item) => `${item.run.title}: ${item.timePreview}`).join("\n");
      more.addEventListener("click", () => {
        if (state.expandedDayKeys.has(dayKey)) {
          state.expandedDayKeys.delete(dayKey);
        } else {
          state.expandedDayKeys.add(dayKey);
        }
        render();
      });
      body.appendChild(more);
    }
  }
  cell.appendChild(body);
  return cell;
}

function renderMonthGrid(startDate, endDate, items, compact = false) {
  const grid = document.createElement("div");
  grid.className = compact ? "calendar-grid calendar-grid-compact" : "calendar-grid";

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
    const label = document.createElement("div");
    label.className = "calendar-grid-label";
    label.textContent = day;
    grid.appendChild(label);
  });

  const firstCellDate = startOfWeek(startDate);
  const lastCellDate = endOfWeek(endDate);
  for (let cursor = new Date(firstCellDate); cursor <= lastCellDate; cursor = addDays(cursor, 1)) {
    const dayKey = cursor.toISOString().slice(0, 10);
    const dayItems = sortCalendarDayItems(items.filter((item) => item.dayKey === dayKey));
    grid.appendChild(createCalendarDayCell(new Date(cursor), dayItems, { muted: cursor < startDate || cursor > endDate, compact }));
  }

  return grid;
}

function renderLinearCalendar(days, items) {
  const strip = document.createElement("div");
  strip.className = "calendar-linear";
  days.forEach((day) => {
    const dayKey = day.toISOString().slice(0, 10);
    const dayItems = sortCalendarDayItems(items.filter((item) => item.dayKey === dayKey));
    const column = createCalendarDayCell(day, dayItems, { compact: false });
    column.classList.add("calendar-linear-day");
    strip.appendChild(column);
  });
  return strip;
}

function renderMonthAhead() {
  if (!monthAheadBoard || !monthAheadSummary || !monthAheadAttention || !monthAheadEmpty) return;

  const range = getCalendarRange();
  const items = buildSurfaceEntries();
  const runs = getSurfaceRuns();
  const today = startOfDay(new Date());
  const runMatchesCurrentSummaryFilters = (run, entries, options = {}) => {
    const filteredEntries = entries.filter((entry) => {
      const date = getEventDate(entry.event);
      return isWithinRange(date, range.start, range.end);
    });
    if (!filteredEntries.length) return false;
    if (hasActiveSearch()) return matchesSearchQuery(run);
    if (!matchesCategories(run, options) || !matchesVenue(run) || !matchesSource(run) || !matchesRunFilter(run, "discover")) return false;
    return filteredEntries.some((entry) => matchesEntrySurfaceFilters(entry));
  };
  const recentCompletedRuns = getRunsWithStatus("completed").filter((run) =>
    run.statusEntries.some((entry) => {
      const date = getEventDate(entry.event);
      if (!date) return false;
      const daysAgo = Math.round((today - startOfDay(date)) / (1000 * 60 * 60 * 24));
      return daysAgo >= 0 && daysAgo <= 30;
    }) && (!hasActiveSearch() ? matchesCategories(run) && matchesVenue(run) && matchesSource(run) && matchesRunFilter(run, "discover") : matchesSearchQuery(run))
  );

  monthAheadSummary.innerHTML = "";
  [
    {
      label: "Book Soon",
      value: runs.filter((run) => runMatchesCurrentSummaryFilters(run, run.availableEntries) && getRunUrgency(run)).length,
      isActive: state.statusFilter.size === 0 && state.discoverRunFilter === "ending_soon",
      onClick: () => {
        setStatusFilter();
        state.discoverRunFilter = "ending_soon";
        render();
        document.getElementById("monthAhead")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
    {
      label: "Considering",
      value: buildRuns(state.events).filter((run) => runMatchesCurrentSummaryFilters(run, run.consideringEntries, { ignoreCategories: true })).length,
      isActive: state.statusFilter.size === 1 && state.statusFilter.has("Considering"),
      onClick: () => {
        setStatusFilter(["Considering"]);
        render();
        document.getElementById("monthAhead")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
    {
      label: "Booked",
      value: buildRuns(state.events).filter((run) => runMatchesCurrentSummaryFilters(run, run.bookedEntries, { ignoreCategories: true })).length,
      isActive: state.statusFilter.size === 1 && state.statusFilter.has("Booked"),
      onClick: () => {
        setStatusFilter(["Booked"]);
        render();
        document.getElementById("monthAhead")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
    {
      label: "Completed 30 Days",
      value: recentCompletedRuns.length,
      isActive: state.statusFilter.size === 1 && state.statusFilter.has("Completed"),
      onClick: () => {
        setStatusFilter(["Completed"]);
        render();
        document.getElementById("monthAhead")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
  ].forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "month-ahead-stat";
    if (item.isActive) card.classList.add("active");
    card.setAttribute("aria-pressed", String(Boolean(item.isActive)));
    card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    card.addEventListener("click", item.onClick);
    monthAheadSummary.appendChild(card);
  });

  const hiddenCount = new Set(
    state.events
      .filter((event) => event.status === "Not Interested")
      .map((event) => getRunKey(event))
  ).size;
  if (resetHiddenButton) resetHiddenButton.classList.toggle("hidden", hiddenCount === 0);
  if (hiddenItemsNote) {
    hiddenItemsNote.classList.toggle("hidden", hiddenCount === 0);
    hiddenItemsNote.textContent = hiddenCount === 0 ? "" : `${hiddenCount} hidden run${hiddenCount === 1 ? "" : "s"} ready to restore`;
  }
  if (calendarPeriodLabel) calendarPeriodLabel.textContent = getCalendarPeriodLabel();
  if (calendarViewLabel) calendarViewLabel.textContent = getCalendarViewLabel();
  if (calendarPeriodHint) calendarPeriodHint.textContent = getCalendarPeriodHint();
  if (calendarPrevButton) {
    const previousLabel = getCalendarShiftButtonLabel(-1);
    calendarPrevButton.setAttribute("aria-label", previousLabel);
    calendarPrevButton.title = previousLabel;
  }
  if (calendarNextButton) {
    const nextLabel = getCalendarShiftButtonLabel(1);
    calendarNextButton.setAttribute("aria-label", nextLabel);
    calendarNextButton.title = nextLabel;
  }

  const attentionRuns = runs
    .filter((run) => run.availableEntries.some((entry) => matchesEntrySurfaceFilters(entry)) && getRunUrgency(run))
    .sort((left, right) => compareEvents(left.availableEntries[0]?.event || left.representative, right.availableEntries[0]?.event || right.representative))
    .slice(0, 4);

  monthAheadAttention.innerHTML = "";
  monthAheadAttention.classList.toggle("hidden", attentionRuns.length === 0);
  attentionRuns.forEach((run) => {
    const urgency = getRunUrgency(run);
    const item = document.createElement("article");
    item.className = `attention-card attention-card-${urgency?.tone || "soon"}`;
    item.innerHTML = `
      <p class="attention-kicker">${urgency?.label || "Watch this run"}</p>
      <h3>${run.title}</h3>
      <p>${run.venue}</p>
      <span>${urgency?.detail || getRunTimelineLabel(run)}</span>
    `;
    monthAheadAttention.appendChild(item);
  });

  monthAheadBoard.innerHTML = "";
  monthAheadBoard.className = `month-ahead-board month-ahead-board-${state.calendarView}`;
  monthAheadEmpty.classList.toggle("hidden", items.length > 0);
  if (monthAheadEmptyCopy) monthAheadEmptyCopy.textContent = getMonthAheadEmptyCopy();

  if (state.calendarView === "week" || state.calendarView === "next10") {
    const length = state.calendarView === "week" ? 7 : 10;
    const days = Array.from({ length }, (_, index) => addDays(range.start, index));
    monthAheadBoard.appendChild(renderLinearCalendar(days, items));
    return;
  }

  monthAheadBoard.appendChild(renderMonthGrid(range.start, range.end, items, false));
}

function renderSmartPicks() {
  if (!heroSmartPicks || !heroSmartPicksGrid) return;
  const range = getCalendarRange();
  const picks = dedupeRunFamilies(buildSurfaceEntries({ ignoreCategories: true })
    .filter((item) => {
      const date = getItemRepresentativeDate(item);
      return date && isWithinRange(date, range.start, range.end) && !["booked", "completed", "hidden"].includes(item.status);
    })
    .map((item) => {
      const recommendation = getRecommendationScore(item);
      return { ...item, recommendationScore: recommendation.score, fitReasons: recommendation.reasons };
    })
    .filter((item) => item.recommendationScore > -999)
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) return right.recommendationScore - left.recommendationScore;
      return compareSurfaceItems(left, right);
    })
  ).slice(0, 3);

  heroSmartPicksGrid.innerHTML = "";
  if (smartPicksKicker) {
    const kicker =
      state.calendarView === "next10"
        ? "🦋 Good options for Ceeg in the next 10 days"
        : state.calendarView === "month"
          ? "🦋 Good options for Ceeg this month"
          : state.calendarView === "next30"
            ? "🦋 Good options for Ceeg in the next 30 days"
            : "🦋 Good options for Ceeg this week";
    smartPicksKicker.textContent = kicker;
    heroSmartPicks.setAttribute("aria-label", kicker.replace(/^🦋\s*/, ""));
  }
  heroSmartPicks.classList.toggle("hidden", picks.length === 0);
  if (picks.length) {
    picks.forEach((item) => heroSmartPicksGrid.appendChild(createRecommendationCard(item)));
  } else {
    heroSmartPicksGrid.innerHTML = '<p class="empty-state-copy smart-picks-empty">No great matches right now 🦋 Try adjusting filters.</p>';
  }
}

function renderPlannerModal() {
  if (!plannerModal || !plannerRecommendedList || !plannerPanelTitle || !plannerPanelCopy || !plannerPanelEyebrow || !plannerPanelRange) return;
  const mode = state.plannerMode || "week";
  const candidates = getPlannerCandidatesForMode(mode)
    .filter((item) => item.status !== "completed")
    .slice(0, 6)
    .sort(comparePlannerItemsChronologically);
  const range = getPlannerRange(mode);

  plannerPanelEyebrow.textContent = mode === "month" ? "Recommended Plan" : "Recommended Plan";
  plannerPanelTitle.textContent = mode === "month" ? "A calm monthly planning pass." : "A calm weekly planning pass.";
  plannerPanelCopy.textContent =
    mode === "month"
      ? "A compact monthly shortlist chosen by fit and shown in date order."
      : "A compact weekly shortlist chosen by fit and shown in date order.";
  plannerPanelRange.textContent = `${formatDateOnly(range.start)} to ${formatDateOnly(range.end)}`;

  plannerRecommendedList.innerHTML = "";
  if (candidates.length) {
    candidates.forEach((item) => plannerRecommendedList.appendChild(createPlannerItem(item)));
  } else {
    plannerRecommendedList.innerHTML =
      mode === "month"
        ? '<p class="empty-state-copy">This month looks light after the current filters are applied.</p>'
        : '<p class="empty-state-copy">This week looks quiet after the current filters are applied.</p>';
  }

  plannerModal.classList.toggle("hidden", !state.plannerModalOpen);
  plannerModal.setAttribute("aria-hidden", String(!state.plannerModalOpen));
}

function getVisibleDiscoverGroups() {
  return DISCOVER_GROUPS;
}

function updateHeroCounts() {
  return;
}

function updateSnapshotCounts() {
  return;
}

function updatePlanningStateCounts() {
  if (historyBookedCount) historyBookedCount.textContent = getUniqueRunCountForStatus("booked", { futureOnly: true });
  if (historyCompletedCount) historyCompletedCount.textContent = getUniqueRunCountForStatus("completed");
}

function updateWindowCards() {
  return;
}

function renderCategoryPills() {
  if (!categoryPills) return;
  categoryPills.innerHTML = "";
  if (allCategoriesButton) {
    const allActive = state.selectedCategories.size === 0;
    allCategoriesButton.classList.toggle("active", allActive);
    allCategoriesButton.setAttribute("aria-pressed", String(allActive));
  }
  getAvailableCategories().forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-pill";
    const isActive = state.selectedCategories.has(category);
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.innerHTML = `<span class="category-pill-icon" aria-hidden="true">${CATEGORY_ICONS[category] || category.charAt(0).toUpperCase()}</span><span class="category-pill-label">${category}</span>`;
    button.addEventListener("click", () => {
      state.categoryTouched = true;
      if (state.selectedCategories.has(category)) {
        state.selectedCategories.delete(category);
      } else {
        state.selectedCategories.add(category);
      }
      savePreferences();
      render();
    });
    categoryPills.appendChild(button);
  });
}

function populateVenueFilter() {
  if (!venueFilter) return;
  const currentValue = state.filteredVenue;
  const venueMap = new Map();
  state.events.forEach((event) => {
    const venue = normalizeText(event.venue);
    if (!venue) return;
    const key = canonicalVenueKey(venue);
    if (!venueMap.has(key)) {
      venueMap.set(key, venue);
    }
  });

  const venues = [...venueMap.values()].sort((left, right) => left.localeCompare(right));
  venueFilter.innerHTML = '<option value="all">All venues</option>';
  venues.forEach((venue) => {
    const option = document.createElement("option");
    option.value = canonicalVenueKey(venue);
    option.textContent = venue;
    venueFilter.appendChild(option);
  });
  venueFilter.value = venues.some((venue) => canonicalVenueKey(venue) === currentValue) || currentValue === "all" ? currentValue : "all";
  state.filteredVenue = venueFilter.value;
}

function syncSourceFilter() {
  if (!sourceFilter) return;
  const allowedValues = new Set(["all", "Arsht Center", "Ticketmaster", "Florida Grand Opera"]);
  sourceFilter.value = allowedValues.has(state.filteredSource) ? state.filteredSource : "all";
  state.filteredSource = sourceFilter.value;
}

function formatSourceSummary() {
  const readySources = state.sources.filter((source) => source.status === "ready");
  const unavailableSources = state.sources.filter((source) => !["ready"].includes(source.status)).length;
  if (!readySources.length) {
    sourceSummary.textContent = unavailableSources ? "Sources need attention" : "No live sources";
    return;
  }
  sourceSummary.textContent = unavailableSources
    ? `${readySources.length} live • ${unavailableSources} unavailable`
    : `${readySources.length} live source${readySources.length > 1 ? "s" : ""}`;
}

function createRunMeta(run, mode = "discover") {
  const meta = document.createElement("div");
  meta.className = "run-meta";
  const urgency = getRunUrgency(run);

  const primary = document.createElement("span");
  primary.className = "detail-pill";
  primary.textContent = run.hasMultipleDates ? `${run.opportunities} dates in run` : "Single upcoming date";

  const secondary = document.createElement("span");
  secondary.className = "detail-pill";
  secondary.textContent = run.runDurationLabel;

  meta.append(primary, secondary);

  if (mode === "calendar") {
    const calendarMeta = document.createElement("span");
    calendarMeta.className = "detail-pill";
    calendarMeta.textContent = `${run.bookedEntries.length} booked • ${run.idealEntries.length} open`;
    meta.appendChild(calendarMeta);
  } else {
    const optimization = document.createElement("span");
    optimization.className = "detail-pill";
    optimization.textContent = `${run.idealEntries.length} ideal • ${run.conflictingEntries.length} conflicts`;
    meta.appendChild(optimization);
  }

  if (urgency) {
    const urgencyNode = document.createElement("span");
    urgencyNode.className = `detail-pill detail-pill-${urgency.tone}`;
    urgencyNode.textContent = urgency.detail;
    meta.appendChild(urgencyNode);
  }

  return meta;
}

function renderRunDates(run, mode = "discover") {
  const list = document.createElement("div");
  list.className = "run-date-list";

  const entries = [...run.dateEntries];
  if (mode === "calendar") {
    entries.sort((left, right) => {
      const leftPriority = left.isBooked ? 0 : left.status === "conflict" ? 2 : 1;
      const rightPriority = right.isBooked ? 0 : right.status === "conflict" ? 2 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return compareEvents(left.event, right.event);
    });
  }

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "run-date-row";
    row.classList.add(`run-date-${entry.status}`);

    const labelGroup = document.createElement("div");
    labelGroup.className = "run-date-copy";

    const title = document.createElement("strong");
    title.textContent = formatEventDateTime(entry.event);

    const status = document.createElement("span");
    status.className = "run-date-status";
    status.textContent =
      mode === "calendar" && entry.status === "ideal"
        ? "Alternative open date"
        : entry.status === "ideal"
          ? "Ideal"
        : entry.status === "conflict"
          ? "Conflicts with booked plan"
          : entry.status === "considering"
            ? "In Considering"
            : entry.status === "booked"
              ? "Booked"
              : "Completed";

    labelGroup.append(title, status);
    row.appendChild(labelGroup);

    const actions = document.createElement("div");
    actions.className = "run-date-actions";

    if (mode === "discover" && !entry.isBooked && !entry.isConsidering && !entry.isCompleted) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "status-button";
      button.textContent = state.pendingConsideringIds.has(entry.event.id) ? "Moving..." : "Consider Date";
      button.disabled = state.pendingConsideringIds.has(entry.event.id);
      button.addEventListener("click", () => moveEventToConsidering(entry.event));
      actions.appendChild(button);
    }

    if (mode === "planning") {
      if (!entry.isBooked && !entry.isCompleted) {
        const bookButton = document.createElement("button");
        bookButton.type = "button";
        bookButton.className = "status-button status-button-primary";
        bookButton.textContent = state.pendingStatusIds.has(entry.event.id) ? "Booking..." : "Book for Calendar";
        bookButton.disabled = state.pendingStatusIds.has(entry.event.id);
        bookButton.addEventListener("click", () =>
          updateEventStatus(entry.event.id, "Booked", `${entry.event.title} is now booked for ${formatEventDateTime(entry.event)} and moved to Calendar`)
        );
        actions.appendChild(bookButton);
      }

      if (!entry.isBooked && !entry.isCompleted) {
        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "status-button";
        toggleButton.textContent = state.pendingStatusIds.has(entry.event.id) ? "Saving..." : entry.isConsidering ? "Remove from Considering" : "Consider";
        toggleButton.disabled = state.pendingStatusIds.has(entry.event.id);
        toggleButton.addEventListener("click", () =>
          updateEventStatus(
            entry.event.id,
            entry.isConsidering ? null : "Considering",
            entry.isConsidering ? `Removed ${entry.event.title} from Considering` : `${entry.event.title} added to Considering`
          )
        );
        actions.appendChild(toggleButton);
      }
    }

    if (mode === "calendar" && !entry.isBooked && !entry.isCompleted) {
      const hint = document.createElement("span");
      hint.className = "run-date-hint";
      hint.textContent = entry.status === "ideal" ? "Open date in this run" : "Conflicts with a booked plan";
      actions.appendChild(hint);
    }

    row.appendChild(actions);
    list.appendChild(row);
  });

  return list;
}

function createStatusButtons(event, mode = "default") {
  const actions = document.createElement("div");
  actions.className = "status-actions";

  const config = {
    booked: [
      { label: "Mark Completed", value: "Completed", kind: "primary", toast: "Moved to Completed" },
      { label: "Undo booking", value: null, toast: "Booking removed" },
    ],
    completed: [{ label: "Remove from Completed", value: null, toast: "Removed from Completed" }],
    default: [],
  };

  (config[mode] || config.default).forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-button";
    if (option.kind === "primary") {
      button.classList.add("status-button-primary");
    }
    button.textContent = state.pendingStatusIds.has(event.id) ? "Saving..." : option.label;
    button.disabled = state.pendingStatusIds.has(event.id);
    button.addEventListener("click", () => updateEventStatus(event.id, option.value, option.toast));
    actions.appendChild(button);
  });

  return actions;
}

function setCardStatusBadge(node, event) {
  const badge = node.querySelector(".event-status-badge");
  if (!event.status) {
    badge.textContent = getDisplayPlanningLabel(event);
    badge.className = "event-status-badge event-window";
    return;
  }
  badge.textContent = event.status;
  badge.className = "event-status-badge";
  badge.classList.add(`status-${event.status.toLowerCase()}`);
}

function getNotInterestedEntries(run) {
  return run.dateEntries.filter((entry) => entry.event.status === "Not Interested");
}

function renderCard(item, mode = "discover") {
  const isRunCard = Boolean(item.runId);
  const representative = isRunCard ? item.representative : item;
  const urgency = isRunCard ? getRunUrgency(item) : null;
  const node = cardTemplate.content.firstElementChild.cloneNode(true);

  if (mode === "planning") node.classList.add("planning-card");
  if (mode === "calendar") node.classList.add("calendar-card");
  if (mode === "discover") node.classList.add("event-card-discover");
  if (isRunCard) node.classList.add("event-card-run");
  if (mode === "planning") node.classList.add("card-status-considering");
  if (mode === "calendar") node.classList.add("card-status-booked");
  if (mode === "completed") node.classList.add("card-status-completed");
  if (urgency) node.classList.add("event-card-urgent", `event-card-urgent-${urgency.tone}`);

  node.querySelector(".event-source").textContent = representative.source;
  setCardStatusBadge(node, representative);
  node.querySelector(".event-category").textContent = representative.category || "Event";
  node.querySelector(".event-title").textContent = representative.title;
  node.querySelector(".event-venue").textContent = normalizeText(representative.venue) || "Venue TBD";
  node.querySelector(".event-datetime").textContent = isRunCard ? getRunTimelineLabel(item) : formatEventDateTime(representative);
  node.querySelector(".event-description").textContent =
    isRunCard
      ? truncateText(representative.description, 140) || "Run details coming soon."
      : representative.description || "No description available yet.";
  node.querySelector(".detail-cost").textContent = representative.cost_display || "Cost unavailable";
  node.querySelector(".detail-travel").textContent = representative.travel_label || "Travel estimate from Aventura coming soon";

  const image = node.querySelector(".event-image");
  image.src = representative.image || "";
  image.alt = representative.title;
  if (!representative.image) image.classList.add("hidden");

  const bookingLink = node.querySelector(".booking-link");
  applyBookingLinkState(bookingLink, getSafeBookingUrl(representative), mode === "planning" ? "Open booking" : "Open");

  const tagRow = node.querySelector(".tag-row");
  if (isRunCard) {
    [item.hasMultipleDates ? `${item.opportunities} opportunities` : "Single date", urgency?.label || (item.runsEndingSoon ? "Ending soon" : "Run open")].forEach((tag) => {
      const tagNode = document.createElement("span");
      tagNode.className = "tag";
      if (urgency && tag === urgency.label) tagNode.classList.add(`tag-${urgency.tone}`);
      tagNode.textContent = tag;
      tagRow.appendChild(tagNode);
    });
  } else {
    (representative.tags || []).slice(0, 4).forEach((tag) => {
      const tagNode = document.createElement("span");
      tagNode.className = "tag";
      tagNode.textContent = tag;
      tagRow.appendChild(tagNode);
    });
  }

  const noteSlot = node.querySelector(".note-slot");
  const noteLabel = noteSlot.querySelector(".note-slot-label");
  const noteCopy = noteSlot.querySelector(".note-slot-copy");
  const considerButton = node.querySelector(".action-consider");
  const secondaryActions = node.querySelector(".card-actions-secondary");
  const primaryActions = node.querySelector(".card-actions-primary");

  if (isRunCard) {
    noteSlot.classList.add("note-slot-run");
    noteLabel.textContent = mode === "calendar" ? "Run Outlook" : mode === "completed" ? "Completed Run" : "Run Dates";
    noteCopy.textContent =
      mode === "discover"
        ? `${item.runStartLabel} to ${item.runEndLabel}. ${urgency?.detail || `${item.idealEntries.length} date${item.idealEntries.length === 1 ? "" : "s"} clear the current booked calendar.`}`
        : mode === "planning"
          ? `${urgency?.detail || "Choose one or more dates in this run, then mark the best fit as Booked."}`
          : mode === "completed"
            ? "Completed outings stay here as part of your planning record."
            : `${urgency?.detail || "See what is booked in this run and which future dates remain open."}`;
    noteSlot.append(createRunMeta(item, mode), renderRunDates(item, mode));
  }

  if (mode === "discover") {
    if (isRunCard) {
      const expanded = state.expandedRunIds.has(item.runId);
      node.classList.toggle("is-expanded", expanded);
      noteSlot.classList.toggle("hidden", !expanded);
      considerButton.disabled = state.pendingConsideringIds.has(item.availableEntries[0]?.event.id);
      considerButton.classList.remove("button-primary");
      considerButton.classList.add("button-secondary");
      if (item.status === "considering") {
        considerButton.textContent = "Remove from Considering";
        considerButton.addEventListener("click", () => {
          const entry = item.consideringEntries[0] || item.primaryEntry;
          if (entry) updateEventStatus(entry.event.id, null, `Removed ${item.run.title} from Considering`);
        });
      } else if (item.status === "hidden") {
        considerButton.textContent = "Restore hidden";
        considerButton.disabled = state.pendingRunHideIds.has(item.runId);
        considerButton.addEventListener("click", () => restoreRunFamily(item));
      } else if (item.status === "booked") {
        considerButton.textContent = "Undo booking";
        considerButton.disabled = state.pendingStatusIds.has(item.primaryEntry.event.id);
        considerButton.addEventListener("click", () =>
          updateEventStatus(item.primaryEntry.event.id, null, `Booking removed for ${item.run.title}`)
        );
      } else {
        considerButton.textContent = "Consider";
        considerButton.addEventListener("click", () => {
          const entry = item.idealEntries[0] || item.availableEntries[0];
          if (entry) {
            moveEventToConsidering(entry.event);
          }
        });
      }

      const detailsButton = document.createElement("button");
      detailsButton.type = "button";
      detailsButton.className = "button button-secondary action-details";
      detailsButton.textContent = expanded ? "Hide Dates" : "View Dates";
      detailsButton.addEventListener("click", () => {
        if (state.expandedRunIds.has(item.runId)) {
          state.expandedRunIds.delete(item.runId);
        } else {
          state.expandedRunIds.add(item.runId);
        }
        render();
      });
      node.querySelector(".card-actions-primary").appendChild(detailsButton);

      if (item.status !== "hidden" && item.status !== "booked" && item.status !== "completed") {
        const dismissButton = document.createElement("button");
        dismissButton.type = "button";
        dismissButton.className = "button button-secondary action-dismiss";
        dismissButton.textContent = state.pendingRunHideIds.has(item.runId) ? "Hiding..." : "Hide";
        dismissButton.disabled = state.pendingRunHideIds.has(item.runId);
        dismissButton.addEventListener("click", () => markRunNotInterested(item));
        primaryActions.appendChild(dismissButton);
      }
      secondaryActions.remove();
    } else {
      noteSlot.remove();
      secondaryActions.remove();
      considerButton.classList.remove("button-primary");
      considerButton.classList.add("button-secondary");
      if (representative.status === "Considering") {
        considerButton.textContent = "Remove from Considering";
        considerButton.addEventListener("click", () => updateEventStatus(representative.id, null, `Removed ${representative.title} from Considering`));
      } else if (representative.status === "Booked") {
        considerButton.textContent = "Undo booking";
        considerButton.addEventListener("click", () => updateEventStatus(representative.id, null, `Booking removed for ${representative.title}`));
      } else if (representative.status === "Not Interested") {
        considerButton.textContent = "Restore hidden";
        considerButton.addEventListener("click", () => restoreRunFamily({ ...item, representative }));
      } else {
        considerButton.textContent = "Consider";
        considerButton.addEventListener("click", () => moveEventToConsidering(representative));
      }
    }
  } else if (mode === "planning") {
    considerButton.remove();
    secondaryActions.remove();
    noteSlot.classList.add("note-slot-active");
    node.querySelector(".card-actions-primary").classList.add("card-actions-primary-secondary");
    bookingLink.classList.add("button-primary", "booking-link-inline");
    bookingLink.classList.remove("button-secondary");
  } else if (mode === "calendar") {
    considerButton.remove();
    noteSlot.classList.add("note-slot-active");
    secondaryActions.innerHTML = "";
    if (!isRunCard) {
      secondaryActions.appendChild(createStatusButtons(representative, "booked"));
    } else {
      secondaryActions.remove();
    }
    node.querySelector(".card-actions-primary").classList.add("card-actions-primary-secondary");
    bookingLink.classList.add("booking-link-inline");
  } else {
    considerButton.remove();
    noteSlot.remove();
    secondaryActions.innerHTML = "";
    secondaryActions.appendChild(createStatusButtons(representative, "completed"));
    node.querySelector(".card-actions-primary").classList.add("card-actions-primary-secondary");
    bookingLink.classList.add("booking-link-inline");
  }

  return node;
}

function renderCollection(target, emptyNode, items, mode = "default") {
  target.innerHTML = "";
  emptyNode.classList.toggle("hidden", items.length > 0);
  items.forEach((item) => target.appendChild(renderCard(item, mode)));
}

function renderPlanning() {
  updatePlanningStateCounts();
  syncStatusFilterButtons();
}

function renderCalendar() {
  updatePlanningStateCounts();
}

function renderCompleted() {
  const completedRuns = getRunsWithStatus("completed")
    .sort((left, right) => compareEvents(right.statusEntries[0].event, left.statusEntries[0].event));
  renderCollection(completedGrid, completedEmpty, completedRuns, "completed");
}

function formatDurationLabel(event) {
  const minutes = getEstimatedDurationMinutes(event);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function renderBookedList() {
  if (!bookedList || !bookedEmpty) return;
  const bookedRuns = getRunsWithStatus("booked", { futureOnly: true })
    .sort((left, right) => compareEvents(left.statusEntries[0].event, right.statusEntries[0].event));

  bookedList.innerHTML = "";
  bookedEmpty.classList.toggle("hidden", bookedRuns.length > 0);

  bookedRuns.forEach((run) => {
    const event = run.statusEntries[0].event;
    const notes = getEventNotes(event);
    const description = truncateText(normalizeText(event.description), 140);
    const detailLabels = [
      formatDateOnly(getEventDate(event)),
      hasExplicitEventTime(event) ? `${formatCalendarTime(event)} to about ${formatEstimatedEndTime(event)}` : "",
      normalizeText(event.venue) || "Venue TBD",
    ].filter(Boolean);
    const row = document.createElement("article");
    row.className = "booked-list-item";
    row.innerHTML = `
      <div class="history-card-media">
        ${event.image ? `<img class="booked-list-image" src="${event.image}" alt="${event.title}" />` : '<div class="booked-list-image booked-list-image-placeholder" aria-hidden="true"></div>'}
      </div>
      <div class="history-card-body booked-list-copy">
        <p class="history-card-kicker">Upcoming plan</p>
        <h4>${event.title}</h4>
        <div class="history-card-meta">
          ${detailLabels.map((label) => `<span>${label}</span>`).join("")}
        </div>
        ${description ? `<p class="booked-list-description">${description}</p>` : ""}
        ${run.statusEntries.length > 1 ? `<p class="booked-list-note">${run.statusEntries.length} booked dates still attached to this run.</p>` : ""}
        ${notes ? `<p class="booked-list-note">${notes}</p>` : ""}
      </div>
      <div class="history-card-aside booked-list-actions">
        <button class="status-button status-button-open" type="button">Open in Live Planning</button>
        <button class="status-button status-button-hide" type="button">Undo booking</button>
      </div>
    `;
    const [openButton, undoButton] = row.querySelectorAll("button");
    openButton?.addEventListener("click", () => {
      jumpToCalendarItem({
        id: `booked:${event.id}`,
        primaryEntry: { event },
        run: { title: event.title, venue: event.venue },
      });
    });
    undoButton?.addEventListener("click", () => updateEventStatus(event.id, null, `Booking removed for ${event.title}`));
    bookedList.appendChild(row);
  });
}

function renderWeeklySummary() {
  if (!weeklySummaryTitle || !weeklySummaryList || !weeklySummaryEmpty) return;
  const start = startOfWeek(new Date());
  const end = endOfWeek(new Date());
  weeklySummaryTitle.textContent = `Week of ${formatDateOnly(start)}`;

  const weeklyBookedRuns = getRunsWithStatus("booked", { start, end })
    .sort((left, right) => compareEvents(left.statusEntries[0].event, right.statusEntries[0].event));

  weeklySummaryList.innerHTML = "";
  weeklySummaryEmpty.classList.toggle("hidden", weeklyBookedRuns.length > 0);

  const eventsByDay = weeklyBookedRuns.reduce((groups, run) => {
    const event = run.statusEntries[0].event;
    const key = getEventDayKey(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
    return groups;
  }, new Map());

  [...eventsByDay.entries()].forEach(([dayKey, runs]) => {
    const dayDate = new Date(`${dayKey}T00:00:00`);
    const group = document.createElement("section");
    group.className = "weekly-summary-day-group";
    group.innerHTML = `
      <div class="weekly-summary-day-header">
        <p class="feature-label">Ready to share</p>
        <h4>${formatWeekday(dayDate)}</h4>
        <p>${formatDateOnly(dayDate)}</p>
      </div>
    `;

    const items = document.createElement("div");
    items.className = "weekly-summary-day-items";

    runs.forEach((run) => {
      const event = run.statusEntries[0].event;
      const durationLabel = formatDurationLabel(event);
      const description = truncateText(normalizeText(event.description), 140);
      const notes = getEventNotes(event);
      const detailLabels = [
        hasExplicitEventTime(event) ? `${formatCalendarTime(event)} to about ${formatEstimatedEndTime(event)}` : "",
        normalizeText(event.venue) || "Venue TBD",
      ].filter(Boolean);
      const row = document.createElement("article");
      row.className = "weekly-summary-item";
      row.innerHTML = `
        <div class="history-card-media">
          ${event.image ? `<img class="weekly-summary-image" src="${event.image}" alt="${event.title}" />` : '<div class="weekly-summary-image weekly-summary-image-placeholder" aria-hidden="true"></div>'}
        </div>
        <div class="history-card-body weekly-summary-copy">
          <p class="history-card-kicker weekly-summary-day">Planned for this week</p>
          <h4>${event.title}</h4>
          ${detailLabels.length ? `<div class="history-card-meta weekly-summary-details">${detailLabels.map((label) => `<span>${label}</span>`).join("")}</div>` : ""}
          ${description ? `<p class="weekly-summary-description">${description}</p>` : ""}
          ${run.statusEntries.length > 1 ? `<p class="weekly-summary-note">${run.statusEntries.length} booked dates still attached to this run.</p>` : ""}
          ${notes ? `<p class="weekly-summary-note">${notes}</p>` : ""}
        </div>
        <div class="history-card-aside weekly-summary-meta">
          ${durationLabel ? `<span>${durationLabel}</span>` : ""}
          ${event.travel_label ? `<span>${event.travel_label}</span>` : ""}
          <button class="status-button status-button-open" type="button">Open in Live Planning</button>
          <button class="status-button status-button-hide" type="button">Undo booking</button>
        </div>
      `;
      const [openButton, undoButton] = row.querySelectorAll("button");
      openButton?.addEventListener("click", () => {
        jumpToCalendarItem({
          id: `weekly:${event.id}`,
          primaryEntry: { event },
          run: { title: event.title, venue: event.venue },
        });
      });
      undoButton?.addEventListener("click", () => updateEventStatus(event.id, null, `Booking removed for ${event.title}`));
      items.appendChild(row);
    });

    group.appendChild(items);
    weeklySummaryList.appendChild(group);
  });
}

function render() {
  state.behaviorProfile = null;
  ensureDefaultCategories();
  populateTimeFilterSelect(startTimeInput, "Earliest start");
  populateTimeFilterSelect(endTimeInput, "Latest end");
  syncCalendarViewButtons();
  syncRunFilterButtons();
  syncStatusFilterButtons();
  syncTimeFilterButtons();
  syncAdvancedFiltersDrawer();
  renderEventSearch();
  renderCategoryPills();
  populateVenueFilter();
  syncSourceFilter();
  renderMonthAhead();
  renderSmartPicks();
  renderPlannerModal();
  renderPlanning();
  renderCalendar();
  renderCompleted();
  renderBookedList();
  renderWeeklySummary();
  updateHeroCounts();
  updateSnapshotCounts();
  updateWindowCards();
  formatSourceSummary();
  renderDiscoverFilterSummary();
  renderSectionFeedback();
}

function getConfidenceSignals(item) {
  const signals = [];
  const availableCount = item.availableEntries?.length || 0;
  const idealCount = item.idealEntries?.length || 0;
  const hasDaytimeOption = item.availableEntries?.some((entry) => {
    const hour = getEventHour(entry.event);
    return hour !== null && hour >= 11 && hour < 16;
  });
  if (item.status === "considering") signals.push("Already reviewing");
  if (item.status === "booked") signals.push("Booked and off your plate");
  if (item.urgency?.tone === "final") {
    signals.push(item.urgency.label === "Final date" ? "Last chance in this run" : "Ends soon — decide this week");
  } else if (item.urgency) {
    signals.push("Ends soon — worth deciding");
  }
  if (idealCount >= 2 || availableCount >= 3) signals.push("Flexible showtimes");
  else if (idealCount === 1) signals.push("Good fit for your schedule");
  if (hasDaytimeOption) signals.push("Easy daytime option");
  if (!signals.length && availableCount > 0) signals.push("Good fit for your schedule");
  return [...new Set(signals)].slice(0, 2);
}

function getSmartPickContextLine(item) {
  if (item.urgency && item.run.travel_label) return "Near you and ending soon";
  if (!isUsingDefaultTimeWindow()) return "Fits your preferred time window";
  if (state.selectedCategories.size > 0 || state.filteredVenue !== "all") return "Based on your filters and timing";
  if (item.urgency) return "A timely option for the current calendar window";
  return "Based on your filters and timing";
}

function getReassuranceMessage() {
  const range = getCurrentWeekRange();
  const weeklyOpenDecisions = dedupeRunFamilies(
    buildSurfaceEntries()
      .filter((item) => {
        const date = getItemRepresentativeDate(item);
        return date && isWithinRange(date, range.start, range.end) && ["open", "considering"].includes(item.status);
      })
  );
  const urgentThisWeek = weeklyOpenDecisions.filter((item) => item.urgency).length;
  const bookedThisWeek = getUniqueRunCountForStatus("booked", { start: range.start, end: range.end });
  if (urgentThisWeek === 0 && weeklyOpenDecisions.length === 0 && bookedThisWeek > 0) return "You're set for this week";
  if (urgentThisWeek === 0 && weeklyOpenDecisions.length <= 1) {
    return weeklyOpenDecisions.length === 1 ? "Only 1 decision left this week" : "Nothing urgent right now";
  }
  return "";
}

function renderSectionFeedback() {
  if (!calendarFeedback) return;
  const reassurance = state.recentAction?.message || getReassuranceMessage();
  const query = state.eventSearchQuery.trim();
  const searchFeedback =
    query && !getSurfaceRuns().length
      ? "No matching events — try a broader search"
      : query
        ? `${getSurfaceRuns().length} match${getSurfaceRuns().length === 1 ? "" : "es"} found`
        : "";
  const message = reassurance || searchFeedback;
  calendarFeedback.textContent = message;
  calendarFeedback.classList.toggle("hidden", !message);
}

function getApiCandidates(path, query = "") {
  const candidates = [];
  const normalizedPath = `${path}${query}`;
  if (state.apiOrigin) candidates.push(new URL(normalizedPath, state.apiOrigin).toString());
  if (window.location.protocol !== "file:") candidates.push(new URL(normalizedPath, window.location.origin).toString());
  candidates.push(new URL(normalizedPath, API_ORIGIN_FALLBACK).toString());
  return [...new Set(candidates)];
}

async function fetchJsonWithFallback(path, query = "") {
  const candidates = getApiCandidates(path, query);
  let lastError = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Request failed with ${response.status} for ${url}`);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const preview = (await response.text()).slice(0, 80);
        throw new Error(`Expected JSON from ${url}, got ${contentType || "unknown"}: ${preview}`);
      }
      state.apiOrigin = new URL(url).origin;
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load JSON API response.");
}

async function updateEventStatus(eventId, status, successMessage = "") {
  if (state.pendingStatusIds.has(eventId)) return;
  const event = state.events.find((item) => item.id === eventId);
  const targetIds = [eventId];
  targetIds.forEach((id) => state.pendingStatusIds.add(id));
  render();
  let lastError = null;

  for (const apiUrl of getApiCandidates("/api/planning")) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids: targetIds, status }),
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status} for ${apiUrl}`);
      state.apiOrigin = new URL(apiUrl).origin;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    targetIds.forEach((id) => state.pendingStatusIds.delete(id));
    render();
    throw lastError;
  }

  if (event) {
    if (status === "Booked") recordBehaviorSignal(event, "booked");
    if (status === "Considering") recordBehaviorSignal(event, "considering");
    if (status === "Completed") recordBehaviorSignal(event, "completed");
    state.recentAction =
      status === "Booked"
        ? { type: "booked", message: successMessage || `${event.title} moved to Calendar.` }
        : status === "Considering"
          ? { type: "considering", message: successMessage || `${event.title} added to Considering.` }
          : status === "Completed"
            ? { type: "completed", message: successMessage || `${event.title} marked completed.` }
            : { type: "considering", message: successMessage || `${event.title} returned to the default planning state.` };
  }

  if (successMessage) showToast(successMessage);
  targetIds.forEach((id) => state.pendingStatusIds.delete(id));
  render();
  await loadEvents();
}

async function resetHiddenItems() {
  let lastError = null;
  for (const apiUrl of getApiCandidates("/api/planning")) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_not_interested" }),
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status} for ${apiUrl}`);
      state.apiOrigin = new URL(apiUrl).origin;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.error(lastError);
    showToast("Could not restore hidden runs right now");
    return;
  }

  state.recentAction = { type: "considering", message: "Hidden runs restored to Live Planning" };
  showToast("Hidden runs restored");
  await loadEvents();
}

async function restoreRunFamily(run) {
  if (state.pendingRunHideIds.has(run.runId)) return;
  const targetIds = getFamilyEventIds(run.representative).filter((id) => {
    const event = state.events.find((candidate) => candidate.id === id);
    return event && event.status === "Not Interested";
  });
  if (!targetIds.length) return;

  state.pendingRunHideIds.add(run.runId);
  targetIds.forEach((id) => state.pendingStatusIds.add(id));
  render();

  try {
    let lastError = null;
    for (const apiUrl of getApiCandidates("/api/planning")) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_ids: targetIds, status: null }),
        });
        if (!response.ok) throw new Error(`Request failed with ${response.status} for ${apiUrl}`);
        state.apiOrigin = new URL(apiUrl).origin;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    recordBehaviorSignal(run.representative, "restored");
    state.recentAction = { type: "considering", message: `${run.title} restored to Live Planning.` };
    showToast("Hidden run restored");
    await loadEvents();
  } catch (error) {
    console.error(error);
    showToast("Could not restore this run right now");
  } finally {
    targetIds.forEach((id) => state.pendingStatusIds.delete(id));
    state.pendingRunHideIds.delete(run.runId);
    render();
  }
}

async function markRunNotInterested(run) {
  if (state.pendingRunHideIds.has(run.runId)) return;
  const targetIds = getFamilyEventIds(run.representative).filter((id) => {
    const event = state.events.find((candidate) => candidate.id === id);
    return event && event.status !== "Booked" && event.status !== "Completed";
  });
  if (!targetIds.length) return;

  state.pendingRunHideIds.add(run.runId);
  targetIds.forEach((id) => state.pendingStatusIds.add(id));
  render();

  try {
    let lastError = null;
    for (const apiUrl of getApiCandidates("/api/planning")) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_ids: targetIds, status: "Not Interested" }),
        });
        if (!response.ok) throw new Error(`Request failed with ${response.status} for ${apiUrl}`);
        state.apiOrigin = new URL(apiUrl).origin;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    recordBehaviorSignal(run.representative, "hidden");
    state.recentAction = { type: "considering", message: `${run.title} hidden from the planning view. Use Restore hidden if you want it back.` };
    showToast("Hidden from Live Planning");
    targetIds.forEach((id) => state.pendingStatusIds.delete(id));
    await loadEvents();
  } catch (error) {
    console.error(error);
    showToast("Could not hide this run right now");
  } finally {
    targetIds.forEach((id) => state.pendingStatusIds.delete(id));
    state.pendingRunHideIds.delete(run.runId);
    render();
  }
}

async function moveEventToConsidering(event) {
  if (state.pendingConsideringIds.has(event.id)) return;
  state.pendingConsideringIds.add(event.id);
  render();

  try {
    await updateEventStatus(event.id, "Considering", `${event.title} moved into Considering for calmer review`);
  } catch (error) {
    console.error(error);
    showToast("Could not move event right now");
  } finally {
    state.pendingConsideringIds.delete(event.id);
    render();
  }
}

async function loadEvents({ forceRefresh = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  if (refreshButton) refreshButton.disabled = true;
  const refreshLabel = refreshButton?.textContent || "Refresh events";
  if (refreshButton) refreshButton.textContent = "Refreshing...";
  if (refreshButton) refreshButton.setAttribute("aria-busy", "true");

  try {
    const query = forceRefresh ? "?refresh=1" : "";
    const payload = await fetchJsonWithFallback("/api/events", query);
    state.events = (payload.events || []).map((event) => normalizeEventRecord(event));
    state.behaviorProfile = null;
    state.sources = payload.sources || [];
    ensureDefaultCategories();
    if (!getStoredPreferences()) {
      savePreferences();
    }
    render();
  } catch (error) {
    console.error(error);
    sourceSummary.textContent = "Load failed";
    showToast("Ceeg could not load live events right now");
  } finally {
    state.loading = false;
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = refreshLabel;
      refreshButton.setAttribute("aria-busy", "false");
    }
  }
}

loadEvents();
