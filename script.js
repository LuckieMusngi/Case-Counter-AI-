let selected = null;

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

let caseTypes = [];
let data = { ...defaultData };

ensureDefaultTypes();
try {
    const storedTypes = JSON.parse(localStorage.getItem("cvorCaseTypes") || "null");
    const storedData = JSON.parse(localStorage.getItem("cvorCases") || "null");
    caseTypes = Array.isArray(storedTypes) && storedTypes.length ? storedTypes : [...defaultTypes];
    data = storedData && typeof storedData === "object" ? { ...storedData } : { ...defaultData };
} catch (error) {
    caseTypes = [...defaultTypes];
    data = { ...defaultData };
}

ensureDefaultTypes();

function normalizeData() {
    const currentKeys = new Set(caseTypes.map(type => type.key));
    Object.keys(data).forEach(key => {
        if (!currentKeys.has(key)) {
            delete data[key];
        }
    });

    caseTypes.forEach(type => {
        if (data[type.key] === undefined) {
            data[type.key] = 0;
        }
    });
}

function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function updateDate() {
    document.getElementById("todayDate").textContent = formatDate(new Date());
}

function renderCaseGrid() {
    const grid = document.getElementById("caseGrid");
    if (!grid) return;

    grid.innerHTML = "";

    caseTypes.forEach(type => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="label">${type.label}</div>
            <div class="num" id="${type.key}">${data[type.key] || 0}</div>
            <button onclick="quick('${type.key}')" class="type">+ 1 Case</button>
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

function updateDisplay() {
    let total = 0;

    caseTypes.forEach(type => {
        const element = document.getElementById(type.key);
        if (element) {
            element.textContent = data[type.key] || 0;
            total += Number(data[type.key] || 0);
        }
    });

    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.textContent = total;
}

function saveData() {
    localStorage.setItem("cvorCases", JSON.stringify(data));
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
        data[type]++;
        saveData();
        updateDisplay();
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

    caseTypes = caseTypes.filter(type => type.key !== key);
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

normalizeData();
updateDate();
renderCaseGrid();
