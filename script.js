let selected = null;
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth();

const defaultTypes = [
    { key: "cabg", label: "❤️ CABG" },
    { key: "valve", label: "🫀 Valve" },
    { key: "thoracic", label: "🫁 Thoracic" },
    { key: "vascular", label: "🩸 Vascular" },
    { key: "tavr", label: "🫀 TAVR" }
];

const defaultData = Object.fromEntries(defaultTypes.map(type => [type.key, 0]));
const defaultKeySet = new Set(defaultTypes.map(type => type.key));

function ensureDefaultTypes() {
    const stored = JSON.parse(localStorage.getItem("cvorCaseTypes") || "null");
    const customTypes = Array.isArray(stored)
        ? stored.filter(type => !defaultKeySet.has(type.key))
        : [];

    caseTypes = [...defaultTypes, ...customTypes];
    localStorage.setItem("cvorCaseTypes", JSON.stringify(caseTypes));
}

function migrateLegacyCountsToRecords() {
    const legacyData = JSON.parse(localStorage.getItem("cvorCases") || "null");

    if (Array.isArray(legacyData)) {
        return legacyData.filter(item => item && typeof item.type === "string" && item.date);
    }

    if (legacyData && typeof legacyData === "object") {
        const migrated = [];
        Object.entries(legacyData).forEach(([type, count]) => {
            const total = Number(count || 0);
            for (let i = 0; i < total; i++) {
                migrated.push({
                    type,
                    date: new Date().toISOString()
                });
            }
        });
        return migrated;
    }

    return [];
}

let caseTypes = [];
let data = { ...defaultData };
let caseRecords = [];

ensureDefaultTypes();
try {
    const storedTypes = JSON.parse(localStorage.getItem("cvorCaseTypes") || "null");
    caseTypes = Array.isArray(storedTypes) && storedTypes.length ? storedTypes : [...defaultTypes];
    caseRecords = migrateLegacyCountsToRecords();
    data = { ...defaultData };
} catch (error) {
    caseTypes = [...defaultTypes];
    caseRecords = [];
    data = { ...defaultData };
}

ensureDefaultTypes();

function rebuildCountsFromRecords() {
    const nextData = { ...defaultData };

    caseTypes.forEach(type => {
        nextData[type.key] = 0;
    });

    caseRecords.forEach(record => {
        if (record && typeof record.type === "string" && nextData[record.type] !== undefined) {
            nextData[record.type] += 1;
        }
    });

    data = nextData;
}

function normalizeData() {
    const currentKeys = new Set(caseTypes.map(type => type.key));
    caseRecords = caseRecords.filter(record => record && typeof record.type === "string" && currentKeys.has(record.type));

    caseTypes.forEach(type => {
        if (data[type.key] === undefined) {
            data[type.key] = 0;
        }
    });

    rebuildCountsFromRecords();
}

function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function getTodayDate() {
    return new Date();
}

function getSelectedDate() {
    const currentDate = getTodayDate();
    return new Date(selectedYear, selectedMonth, currentDate.getDate());
}

function getCountColor(value) {
    const safeValue = Math.min(Math.max(Number(value) || 0, 0), 5);
    const ratio = safeValue / 5;
    const hue = 210 - (ratio * 18);
    const saturation = 72 + (ratio * 22);
    const lightness = 98 - (ratio * 52);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function updateDate() {
    const activeDate = getSelectedDate();
    const labelEl = document.getElementById("casesHeaderTitle");
    if (labelEl) {
        labelEl.textContent = new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric"
        }).format(activeDate);
    }

    document.getElementById("todayDate").textContent = formatDate(activeDate);
}

function goToToday() {
    selectedYear = new Date().getFullYear();
    selectedMonth = new Date().getMonth();
    switchView("casesView");
    renderCaseGrid();
    updateDate();
}

function renderCaseGrid() {
    const grid = document.getElementById("caseGrid");
    if (!grid) return;

    grid.innerHTML = "";

    caseTypes.forEach(type => {
        const card = document.createElement("div");
        card.className = "card";

        const typeCount = data[type.key] || 0;
        card.innerHTML = `
            <div class="label">${type.label}</div>
            <div class="num" id="${type.key}" style="color: ${getCountColor(typeCount)}">${typeCount}</div>
            <div class="case-actions">
                <button onclick="decrementCase('${type.key}')" class="mini-button danger" aria-label="Decrease ${type.label}">−</button>
                <button onclick="quick('${type.key}')" class="type">+ 1 Case</button>
            </div>
        `;
        grid.appendChild(card);
    });

    const totalCard = document.createElement("div");
    totalCard.className = "card total";
    totalCard.innerHTML = `
        <div class="label">TOTAL CASES</div>
        <div class="num" id="total">0</div>
    `;
    grid.appendChild(totalCard);

    updateDisplay();
}

function renderTypeList() {
    const typeList = document.getElementById("typeList");
    if (!typeList) return;

    typeList.innerHTML = "";

    caseTypes.forEach(type => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "type";
        button.textContent = type.label;
        button.onclick = () => selectType(type.key, button);

        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.appendChild(button);

        if (!defaultKeySet.has(type.key)) {
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-type";
            removeButton.textContent = "×";
            removeButton.title = "Remove case type";
            removeButton.onclick = (event) => {
                event.stopPropagation();
                removeCaseType(type.key);
            };
            wrapper.appendChild(removeButton);
        }

        typeList.appendChild(wrapper);
    });
}

function saveCaseTypes() {
    localStorage.setItem("cvorCaseTypes", JSON.stringify(caseTypes));
}

function getAvailableYears() {
    const years = new Set([new Date().getFullYear()]);

    caseRecords.forEach(record => {
        if (record && record.date) {
            const date = new Date(record.date);
            if (!Number.isNaN(date.getTime())) {
                years.add(date.getFullYear());
            }
        }
    });

    return Array.from(years).sort((a, b) => a - b);
}

function getYearTotal(year = selectedYear) {
    return caseRecords.filter(record => {
        if (!record || !record.date) return false;
        const date = new Date(record.date);
        return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
    }).length;
}

function renderYearSelector() {
    const label = document.getElementById("statsYearLabel");
    const yearTotalEl = document.getElementById("yearTotalDisplay");
    const caseYearTotalEl = document.getElementById("caseYearTotal");
    if (label) {
        label.textContent = String(selectedYear);
    }

    const yearTotal = getYearTotal(selectedYear);
    if (yearTotalEl) {
        yearTotalEl.textContent = String(yearTotal);
    }

    if (caseYearTotalEl) {
        caseYearTotalEl.textContent = String(yearTotal);
    }

    const prevBtn = document.getElementById("prevYearBtn");
    const nextBtn = document.getElementById("nextYearBtn");

    if (prevBtn) {
        prevBtn.disabled = false;
        prevBtn.style.opacity = "1";
    }

    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = "1";
    }
}

function renderMonthlyStats() {
    const container = document.getElementById("monthlyStats");
    if (!container) return;

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const monthTotalColor = (value) => {
        const safeValue = Math.min(Math.max(Number(value) || 0, 0), 15);
        const ratio = safeValue / 15;
        const hue = 210 - (ratio * 18);
        const saturation = 72 + (ratio * 22);
        const lightness = 98 - (ratio * 52);
        return `hsl(${hue} ${saturation}% ${lightness}%)`;
    };

    const grouped = monthNames.map((month, index) => {
        const typeCounts = caseTypes.map(type => {
            const count = caseRecords.filter(record => {
                const date = new Date(record.date);
                return (
                    record.type === type.key &&
                    !Number.isNaN(date.getTime()) &&
                    date.getFullYear() === selectedYear &&
                    date.getMonth() === index
                );
            }).length;

            return {
                key: type.key,
                label: type.label,
                count
            };
        });

        return {
            month,
            total: typeCounts.reduce((sum, item) => sum + item.count, 0),
            typeCounts
        };
    });

    container.innerHTML = grouped.map((item, index) => `
        <div class="month-card">
            <div class="month-header">
                <button type="button" class="month-name-btn" data-month-index="${index}" onclick="goToMonth(${index})">
                    <span>${item.month}</span>
                    <b style="color: ${monthTotalColor(item.total)}">${item.total}</b>
                </button>
            </div>
            <div class="month-list">
                ${item.typeCounts.map(type => `
                    <div class="month-type-box">
                        <span class="month-type-label">${type.label}</span>
                        <strong style="color: ${getCountColor(type.count)}">${type.count}</strong>
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");

    renderYearSelector();
}

function switchView(viewName) {
    document.querySelectorAll(".view").forEach(view => {
        view.classList.toggle("active", view.id === viewName);
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.view === viewName);
    });
}

function goToMonth(monthIndex) {
    selectedMonth = monthIndex;
    switchView("casesView");
    updateDate();
    renderCaseGrid();
}

function getMonthDataForSelectedPeriod() {
    const nextData = { ...defaultData };

    caseTypes.forEach(type => {
        nextData[type.key] = 0;
    });

    caseRecords.forEach(record => {
        if (!record || typeof record.type !== "string") return;
        if (nextData[record.type] === undefined) return;

        const recordDate = new Date(record.date);
        if (Number.isNaN(recordDate.getTime())) return;

        if (recordDate.getFullYear() === selectedYear && recordDate.getMonth() === selectedMonth) {
            nextData[record.type] += 1;
        }
    });

    return nextData;
}

function updateDisplay() {
    const monthData = getMonthDataForSelectedPeriod();
    data = monthData;
    renderMonthlyStats();

    let total = 0;

    caseTypes.forEach(type => {
        const element = document.getElementById(type.key);
        const value = Number(data[type.key] || 0);
        if (element) {
            element.textContent = value;
            element.style.color = getCountColor(value);
            total += value;
        }
    });

    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.textContent = total;
}

function saveData() {
    localStorage.setItem("cvorCases", JSON.stringify(caseRecords));
}

function openModal() {
    renderTypeList();
    document.getElementById("modal").style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";

    const input = document.getElementById("newTypeName");
    if (input) input.value = "";

    selected = null;
    document.querySelectorAll(".types .type").forEach(button => button.classList.remove("selected"));
}

function selectType(type, button) {
    selected = type;

    document.querySelectorAll(".types .type").forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
}

function quick(type) {
    if (data[type] !== undefined) {
        caseRecords.push({
            type,
            date: getSelectedDate().toISOString()
        });
        saveData();
        updateDisplay();
    }
}

function decrementCase(type) {
    if (data[type] !== undefined) {
        const monthMatches = [...caseRecords].reverse().findIndex(record => {
            if (!record || record.type !== type) return false;
            const recordDate = new Date(record.date);
            return !Number.isNaN(recordDate.getTime())
                && recordDate.getFullYear() === selectedYear
                && recordDate.getMonth() === selectedMonth;
        });

        const fallbackIndex = [...caseRecords].reverse().findIndex(record => record && record.type === type);
        const indexToUse = monthMatches !== -1 ? monthMatches : fallbackIndex;

        if (indexToUse !== -1) {
            const actualIndex = caseRecords.length - 1 - indexToUse;
            caseRecords.splice(actualIndex, 1);
            saveData();
            updateDisplay();
        }
    }
}

function addCaseType() {
    const input = document.getElementById("newTypeName");
    if (!input) return;

    const name = input.value.trim();
    if (!name) return;

    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "custom";
    const uniqueKey = `${key}_${Date.now().toString().slice(-4)}`;

    const newType = { key: uniqueKey, label: name };
    caseTypes.push(newType);
    data[uniqueKey] = 0;

    saveCaseTypes();
    saveData();
    renderCaseGrid();
    renderTypeList();
    input.value = "";
}

function removeCaseType(key) {
    if (defaultKeySet.has(key)) {
        alert("Default case types cannot be removed.");
        return;
    }

    if (caseTypes.length <= 1) {
        alert("Keep at least one case type.");
        return;
    }

    const typeToRemove = caseTypes.find(type => type.key === key);
    const typeLabel = typeToRemove ? typeToRemove.label : "This case type";
    const confirmed = window.confirm(
        `Are you sure you want to remove "${typeLabel}"? This will permanently delete all saved cases for this type from every month and year.`
    );

    if (!confirmed) {
        return;
    }

    caseTypes = caseTypes.filter(type => type.key !== key);
    caseRecords = caseRecords.filter(record => record.type !== key);
    delete data[key];
    saveCaseTypes();
    saveData();
    renderCaseGrid();
    renderTypeList();

    if (selected === key) selected = null;
}

function saveCase() {
    if (!selected) {
        alert("Select a case type");
        return;
    }

    quick(selected);
    closeModal();
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view));
});

document.getElementById("prevYearBtn")?.addEventListener("click", () => {
    selectedYear -= 1;
    renderMonthlyStats();
});

document.getElementById("nextYearBtn")?.addEventListener("click", () => {
    selectedYear += 1;
    renderMonthlyStats();
});

normalizeData();
updateDate();
renderCaseGrid();
renderMonthlyStats();
