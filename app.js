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
        "admissionRequirements",
        "credentials"
    ]
};

// global state
let activeInterests = [];
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
        
        populateDropdowns(allPrograms);
        
        // 1. Set dropdown states from URL first
        checkURLParameters(); 
        
        // 2. Then run one single filter/render pass
        applyFilters();
        
        bindEvents();
        
    } catch (error) {
        console.error("Initialization Error:", error);
        if (grid) grid.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

/**
* Check for parameters from the Interest Quiz row type 
*/
function checkURLParameters() {
    const params = new URLSearchParams(window.location.search);
    const interestDropdown = document.getElementById('filter-interests');

    // Get the 'q' parameter from the URL
    const queryParam = params.get('q');

    // If it exists, put it into the Program Finder's search box
    if (queryParam && searchInput) {
        searchInput.value = decodeURIComponent(queryParam);
    }

    // Use .getAll to catch multiple "interests=" keys from the form
    let rawParams = params.getAll('interests'); 

    // Safety Check: If the form sent them as one string "A,B" 
    // instead of separate keys, we flatten and split them.
    activeInterests = rawParams.flatMap(item => item.split(',')).map(decodeURIComponent);

    if (activeInterests.length > 0) {
        if (interestDropdown) {
            // Only show a value in the dropdown if exactly one interest is active
            interestDropdown.value = (activeInterests.length === 1) ? activeInterests[0] : "";
        }
    } else {
        // Clear state if no parameters are present (important for 'Back' button)
        activeInterests = [];
        if (interestDropdown) interestDropdown.value = "";
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

    // console.log("Filtering with Active Interests (URL):", activeInterests);

    let filteredResults = allPrograms.filter(p => {
        const selectedInterest = filters.interests;

        /**
         * Logic Flow:
         * 1. If user manually selected a specific interest in the dropdown, match ONLY that.
         * 2. If dropdown is "All" AND we have URL interests, match ANY in the activeInterests array.
         * 3. If dropdown is "All" AND no URL interests, return true (show everything).
         */
        let matchesInterests = false;

        if (selectedInterest !== "") {
            // Manual override: User picked one from the list
            matchesInterests = p.interests.includes(selectedInterest);
        } else if (activeInterests.length > 0) {
            // URL fallback: Match any of the multiple interests from the quiz
            matchesInterests = activeInterests.some(interest => p.interests.includes(interest));
        } else {
            // Default: No filters active
            matchesInterests = true;
        }

        return (filters.levelsOfStudy === "" || p.levelsOfStudy.includes(filters.levelsOfStudy)) &&
            (filters.locations === "" || p.locations.includes(filters.locations)) &&
            matchesInterests &&
            (filters.programFeatures === "" || p.programFeatures.includes(filters.programFeatures));
    });

    // Handle Search vs. Browse
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
        // Get the raw location name
        const primaryLoc = p.locations[0] || "Fredericton";

        // If it's "saint-john", use "stjohn", otherwise proceed with standard normalization
        const locClass = (primaryLoc === "saint-john") 
            ? "stjohn" 
            : primaryLoc.toLowerCase().replace(/[^a-z0-9]/g, '');
        
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
    // 1. Search input
    searchInput.addEventListener('input', applyFilters);

    // 2. Dropdowns (Handling specialized logic for Interests)
    dropdownIds.forEach(id => {
        const el = document.getElementById(`filter-${id}`);
        if (!el) return;

        el.addEventListener('change', (e) => {
            // Specialized logic for Interests to handle URL state handoff
            if (id === 'interests') {
                const newValue = e.target.value;

                // Clear the "Quiz" results as the user has now taken manual control
                activeInterests = [];

                // Update the URL to stay in sync with the new manual selection
                const params = new URLSearchParams(window.location.search);
                if (newValue) {
                    params.set('interests', newValue);
                } else {
                    params.delete('interests');
                }

                // Push to history so the 'Back' button returns to the previous state
                const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                history.pushState(null, '', newRelativePathQuery);
            }

            // Always run the filter after any dropdown change
            applyFilters();
        });
    });

    // 3. Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Hard reset of global state
            activeInterests = []; 
            
            // Clear all UI inputs
            searchInput.value = "";
            dropdownIds.forEach(id => {
                const el = document.getElementById(`filter-${id}`);
                if (el) el.value = "";
            });

            // Re-run the filter to show the full list
            applyFilters();

            // Clean the URL entirely
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    /**
     * Listen for Back/Forward navigation
     */
    window.addEventListener('popstate', () => {
        // 1. Re-read the URL parameters to set activeInterests
        checkURLParameters();
        
        // 2. Sync the search input if you choose to store it in the URL (Optional)
        // 3. Re-run the filter logic to update the UI
        applyFilters();
    });
}

// Start the app
init();