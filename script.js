// Currently selected case type
let selected = null;

// Default data if this is the first time
// the user opens the website
const defaultData = {
    cabg: 0,
    valve: 0,
    thoracic: 0,
    vascular: 0,
    tavr: 0
};

// Try to load previously saved data.
// If there isn't any, use defaultData.
let data = JSON.parse(
    localStorage.getItem("cvorCases")
) || defaultData;

// Update all numbers on the page
function updateDisplay() {
    let total = 0;

    for (const type in data) {
        const element = document.getElementById(type);

        if (element) {
            element.textContent = data[type];
            total += data[type];
        }
    }

    // Update today's total
    document.getElementById("total").textContent = total;

    // For now, use the current total for these values.
    // These can later be changed to use actual dates.
    document.getElementById("weekTotal").textContent = total;
    document.getElementById("monthTotal").textContent = total;
    document.getElementById("yearTotal").textContent = total;

    // Monthly breakdown
    document.getElementById("monthCabg").textContent = data.cabg;
    document.getElementById("monthValve").textContent = data.valve;
    document.getElementById("monthThoracic").textContent = data.thoracic;
    document.getElementById("monthVascular").textContent = data.vascular;
    document.getElementById("monthTavr").textContent = data.tavr;
}

// Save the data to the browser
function saveData() {
    localStorage.setItem(
        "cvorCases",
        JSON.stringify(data)
    );
}

// Open the Add Case modal
function openModal() {
    document.getElementById("modal").style.display = "flex";
}

// Close the Add Case modal
function closeModal() {
    document.getElementById("modal").style.display = "none";
}

// Select a case type in the modal
function selectType(type, button) {
    selected = type;

    // Remove selected state from all buttons
    document
        .querySelectorAll(".types .type")
        .forEach(button => {
            button.classList.remove("selected");
        });

    // Highlight selected button
    button.classList.add("selected");
}

// Add one case
function quick(type) {
    if (data[type] !== undefined) {
        data[type]++;

        saveData();

        updateDisplay();
    }
}

// Save a case from the modal
function saveCase() {
    if (!selected) {
        alert("Select a case type");

        return;
    }

    if (selected !== "other") {
        quick(selected);
    }

    closeModal();

    // Reset selection
    selected = null;

    // Remove selected styling
    document
        .querySelectorAll(".types .type")
        .forEach(button => {
            button.classList.remove("selected");
        });
}

// Load saved data when the page opens
updateDisplay();
