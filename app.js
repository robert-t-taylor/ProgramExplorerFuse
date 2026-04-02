/**
 * University Program Finder
 * Features: Fuse.js Fuzzy Search, Multi-Select Filtering, Alphabetical Sorting
 */

const fuseOptions = {
    threshold: 0.4,
    distance: 100,
    keys: [
        "title",
        "disciplines",
        "levelsOfStudy",
        "interests",
        "locations",
        "programFeatures",
        "admissionRequirements"
    ]
};

let allPrograms = [];

// DOM Elements
const grid = document.querySelector('.program-cards__wrapper');
const countText = document.getElementById('results-count');
const searchInput = document.getElementById('program-search');
const resetBtn = document.getElementById('reset-filters');
const dropdownIds = ['levelsOfStudy', 'interests', 'locations', 'programFeatures'];

/**
 * Initialization
 */
async function init() {
    try {
        const response = await fetch('programs.json');
        if (!response.ok) throw new Error('Failed to fetch programs data.');
        
        allPrograms = await response.json();
        
        // 1. Setup UI
        populateDropdowns(allPrograms);
        
        // 2. Initial Render (Sorted Alphabetically)
        applyFilters();
        
        // 3. Bind Events
        bindEvents();
        
    } catch (error) {
        console.error("Initialization Error:", error);
        if (grid) grid.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

/**
 * Data Processing & UI Setup
 */
function populateDropdowns(data) {
    const sets = {
        levelsOfStudy: new Set(),
        interests: new Set(),
        locations: new Set(),
        programFeatures: new Set()
    };

    data.forEach(p => {
        if (Array.isArray(p.levelsOfStudy)) p.levelsOfStudy.forEach(val => sets.levelsOfStudy.add(val));
        if (Array.isArray(p.interests)) p.interests.forEach(val => sets.interests.add(val));
        if (Array.isArray(p.locations)) p.locations.forEach(val => sets.locations.add(val));
        if (Array.isArray(p.programFeatures)) p.programFeatures.forEach(val => sets.programFeatures.add(val));
    });

    Object.keys(sets).forEach(key => {
        const select = document.getElementById(`filter-${key}`);
        if (select) {
            Array.from(sets[key]).sort().forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                select.appendChild(opt);
            });
        }
    });
}

/**
 * Filtering & Searching Logic
 */
function applyFilters() {
    const query = searchInput.value.trim();
    
    // Get current values of all dropdowns
    const filters = {};
    dropdownIds.forEach(id => {
        filters[id] = document.getElementById(`filter-${id}`).value;
    });

    // Step 1: Filter by Dropdowns (Mechanical/Exact match against arrays)
    let filteredResults = allPrograms.filter(p => {
        return (filters.levelsOfStudy === "" || p.levelsOfStudy.includes(filters.levelsOfStudy)) &&
               (filters.locations === "" || p.locations.includes(filters.locations)) &&
               (filters.interests === "" || p.interests.includes(filters.interests)) &&
               (filters.programFeatures === "" || p.programFeatures.includes(filters.programFeatures));
    });

    // Step 2: Handle Search vs. Browse
    if (query.length > 1) {
        // Use Fuse.js on the filtered subset for relevance-based search
        const fuse = new Fuse(filteredResults, fuseOptions);
        const searchResults = fuse.search(query);
        renderPrograms(searchResults.map(result => result.item), true);
    } else {
        // No search query: Sort alphabetically for browsing
        const sortedResults = sortProgramsAlphabetically(filteredResults);
        renderPrograms(sortedResults, false);
    }
}

/**
 * Sorting Helper
 */
function sortProgramsAlphabetically(data) {
    return [...data].sort((a, b) => {
        return a.title.localeCompare(b.title, undefined, {
            sensitivity: 'base',
            numeric: true
        });
    });
}

/**
 * Rendering Logic
 */
function renderPrograms(data, isSearching) {
    if (!grid) return;

    if (data.length === 0) {
        grid.innerHTML = `<div class="program-finder__no-results">No programs found matching your criteria.</div>`;
        updateCount(0);
        return;
    }

    grid.innerHTML = data.map(p => {
        // Normalize location for CSS class (e.g., "St. John" -> "stjohn")
        const primaryLoc = p.locations[0] || "General";
        const locClass = primaryLoc.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const tagsHTML = (p.programFeatures || [])
            .map(tag => `<span class="program-cards__item__tag">${tag}</span>`)
            .join('');

        return `
            <a class="program-cards__item" href="${p.link || '#'}">
                <div class="program-cards__item__text">
                    <p class="program-cards__item__degree">${p.levelsOfStudy[0] || ''}</p>
                    <h3 class="program-cards__item__title">
                        ${p.title} <span class="program-cards__item__title__indicator"></span>›
                    </h3>
                    <div class="program-cards__item__attributes">
                        <p class="program-cards__item__course__numbers">${(p.credentials || []).join(', ')}</p>
                        <div class="program-cards__item__tags">
                            ${tagsHTML}
                        </div>
                    </div>
                </div>
                <div class="program-cards__item__location program-cards__item__location--${locClass}">
                    <svg aria-hidden="true" height="21" width="21">
                        <use href="../../../_assets/images/svg/definitions.svg#location"></use>
                    </svg>
                    ${primaryLoc}
                </div>
            </a>
        `;
    }).join('');

    updateCount(data.length);
}

function updateCount(num) {
    if (countText) {
        countText.innerText = `Showing ${num} program${num === 1 ? '' : 's'}`;
    }
}

/**
 * Event Bindings
 */
function bindEvents() {
    // Search input with basic debounce-like feel via 'input' event
    searchInput.addEventListener('input', applyFilters);

    // Dropdowns
    dropdownIds.forEach(id => {
        const el = document.getElementById(`filter-${id}`);
        if (el) el.addEventListener('change', applyFilters);
    });

    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            searchInput.value = "";
            dropdownIds.forEach(id => {
                const el = document.getElementById(`filter-${id}`);
                if (el) el.value = "";
            });
            applyFilters();
        });
    }
}

// Start the app
init();