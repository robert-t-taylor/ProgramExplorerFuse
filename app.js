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

/**
 * Note: we can also weight these, if necessary, as follows:
const fuseOptions = {
    threshold: 0.4,
    distance: 100,
    keys: [
        { name: "title", weight: 1.0 },
        { name: "credentials", weight: 0.7 },
        { name: "interests", weight: 0.5 },
        { name: "admissionRequirements", weight: 0.2 } // Lower priority
    ]
};
*/

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
    const levelsOfStudyDropdown   = document.getElementById('filter-levelsOfStudy');
    const locationsDropdown       = document.getElementById('filter-locations');
    const interestDropdown        = document.getElementById('filter-interests');
    const programFeaturesDropdown = document.getElementById('filter-programFeatures');

    // Get the 'q' parameter from the URL
    const queryParam = params.get('q');

    // If it exists, put it into the Program Finder's search box
    if (queryParam && searchInput) {
        searchInput.value = decodeURIComponent(queryParam);
    }

    // Use .getAll to catch multiple "levelsOfStudy=" keys from the form
    let rawlevelsOfStudyParams = params.getAll('levelsOfStudy'); 

    // Use .getAll to catch multiple "locations=" keys from the form
    let rawLocationsParams = params.getAll('locations'); 

    // Use .getAll to catch multiple "interests=" keys from the form
    let rawInterestsParams = params.getAll('interests'); 

     // Use .getAll to catch multiple "programFeatures=" keys from the form
    let rawProgramFeaturesParams = params.getAll('programFeatures');

    // Safety Check: If the form sent them as one string "A,B" 
    // instead of separate keys, we flatten and split them.
    activeLevelsOfStudy   = rawlevelsOfStudyParams.flatMap(item => item.split(',')).map(decodeURIComponent);
    activeLocations       = rawLocationsParams.flatMap(item => item.split(',')).map(decodeURIComponent);
    activeInterests       = rawInterestsParams.flatMap(item => item.split(',')).map(decodeURIComponent);
    activeProgramFeatures = rawProgramFeaturesParams.flatMap(item => item.split(',')).map(decodeURIComponent);

    if (activeLevelsOfStudy.length > 0) {
        if (levelsOfStudyDropdown) {
            levelsOfStudyDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = activeLevelsOfStudy.includes(cb.value);
            });
        }
    } else {
        // Clear state if no parameters are present (important for 'Back' button)
        activeLevelsOfStudy = [];
        if (levelsOfStudyDropdown) {
            levelsOfStudyDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    }

    if (activeLocations.length > 0) {
        if (locationsDropdown) {
            locationsDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = activeLocations.includes(cb.value);
            });
        }
    } else {
        // Clear state if no parameters are present (important for 'Back' button)
        activeLocations = [];
        if (locationsDropdown) {
            locationsDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    }

    if (activeInterests.length > 0) {
        if (interestDropdown) {
            interestDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = activeInterests.includes(cb.value);
            });
        }
    } else {
        // Clear state if no parameters are present (important for 'Back' button)
        activeInterests = [];
        if (interestDropdown) {
            interestDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    }

    if (activeProgramFeatures.length > 0) {
        if (programFeaturesDropdown) {
            programFeaturesDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = activeProgramFeatures.includes(cb.value);
            });
        }
    } else {
        // Clear state if no parameters are present (important for 'Back' button)
        activeProgramFeatures = [];
        if (programFeaturesDropdown) {
            programFeaturesDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    }
}

/**
 * Helper function to fix double encoding 
 */
function decodeHtmlEntities(str) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
}

/**
 * Data Processing & UI Setup
 */
function populateDropdowns(data) {
    const sets = {
        levelsOfStudy: new Map(),
        interests: new Map(),
        locations: new Map(),
        programFeatures: new Map()
    };

    data.forEach(p => {
        if (Array.isArray(p.levelsOfStudy)) {
            p.levelsOfStudy.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    sets.levelsOfStudy.set(item.value, item.label || item.value);
                } else {
                    sets.levelsOfStudy.set(item, item);
                }
            });
        }

        if (Array.isArray(p.interests)) {
            p.interests.forEach((item, i) => {
                const value = typeof item === 'object' && item !== null
                    ? item.value
                    : item;

                const label = Array.isArray(p.interestsLabels) && p.interestsLabels[i]
                    ? p.interestsLabels[i]
                    : value;

                sets.interests.set(value, label);
            });
        }

        if (Array.isArray(p.locations)) {
            p.locations.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    sets.locations.set(item.value, item.label || item.value);
                } else {
                    sets.locations.set(item, item);
                }
            });
        }

        if (Array.isArray(p.programFeatures)) {
            p.programFeatures.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    sets.programFeatures.set(item.value, item.label || item.value);
                } else {
                    sets.programFeatures.set(item, item);
                }
            });
        }
    });

    function formatOptionLabel(val) {
        return val
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    Object.keys(sets).forEach(key => {
        const list = document.getElementById(`filter-${key}`);
        if (list) {
            Array.from(sets[key].entries())
                .sort((a, b) => a[1].localeCompare(b[1]))
                .forEach(([val, label]) => {
                    const displayLabel = (key === 'interests')
                        ? (label || formatOptionLabel(val))
                        : formatOptionLabel(val);
                    const text = decodeHtmlEntities(displayLabel)
                        .replace("Co Op", "Co-Op")
                        .replace("Course Based", "Course-Based")
                        .replace("Research Based", "Research-Based");
                    const id = `filter-${key}-${val.replace(/[^a-z0-9]/gi, '-')}`;

                    const li = document.createElement('li');
                    li.className = 'filter-dropdown__item';

                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.value = val;
                    cb.id = id;

                    const lbl = document.createElement('label');
                    lbl.htmlFor = id;
                    lbl.textContent = text;

                    li.appendChild(cb);
                    li.appendChild(lbl);
                    list.appendChild(li);
                });
        }
    });
}

/**
 * Helper function now that multiple selections are allowed
 */
function getSelectedValues(containerEl) {
    return Array.from(containerEl.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);
}

/**
 * Filtering & Searching Logic
 */
function applyFilters() {
    console.log('applyFilters called');
    console.log('searchInput.value:', searchInput.value);

    const query = searchInput.value.trim();

    // Get current values of all dropdowns (all multi-select)
    const filters = {};
    dropdownIds.forEach(id => {
        const selectEl = document.getElementById(`filter-${id}`);
        filters[id] = getSelectedValues(selectEl); // always an array
    });

    console.log('filters.levelsOfStudy:', filters.levelsOfStudy);
    console.log('filters.locations:', filters.locations);
    console.log('filters.interests:', filters.interests);
    console.log('filters.programFeatures:', filters.programFeatures);

    let filteredResults = allPrograms.filter(p => {
        console.log('levels filter:', filters.levelsOfStudy);
        console.log('program levels:', p.levelsOfStudy);
        console.log('locations filter:', filters.locations);
        console.log('program locations:', p.locations);
        console.log('interests filter:', filters.interests);
        console.log('program interests:', p.interests);
        console.log('features filter:', filters.programFeatures);
        console.log('program features:', p.programFeatures);

        // Multi-select levelsOfStudy
        const levelsFilter = filters.levelsOfStudy;
        const matchesLevels =
            levelsFilter.length === 0 ||
            levelsFilter.some(level =>
                p.levelsOfStudy && p.levelsOfStudy.includes(level)
            );

        // Multi-select locations
        const locationsFilter = filters.locations;
        const matchesLocations =
            locationsFilter.length === 0 ||
            locationsFilter.some(location =>
                p.locations && p.locations.includes(location)
            );

        // Multi-select interests (with URL fallback logic)
        const selectedInterests = filters.interests;
        let matchesInterests = false;

        if (selectedInterests.length > 0) {
            // Manual override: match ANY of the selected interests
            matchesInterests = selectedInterests.some(interest =>
                p.interests && p.interests.includes(interest)
            );
        } else if (activeInterests.length > 0) {
            // URL fallback: match ANY in activeInterests
            matchesInterests = activeInterests.some(interest =>
                p.interests && p.interests.includes(interest)
            );
        } else {
            // No interests filter active
            matchesInterests = true;
        }

        // Multi-select program features
        const featuresFilter = filters.programFeatures;
        const matchesFeatures =
            featuresFilter.length === 0 ||
            featuresFilter.some(feature =>
                p.programFeatures && p.programFeatures.includes(feature)
            );

        return matchesLevels && matchesLocations && matchesInterests && matchesFeatures;
    });

    console.log('filteredResults count:', filteredResults.length);

    // Handle Search vs. Browse
    if (query.length > 1) {
        const fuse = new Fuse(filteredResults, fuseOptions);
        const searchResults = fuse.search(query);
        renderPrograms(searchResults.map(result => result.item), true);
    } else {
        const sortedResults = sortProgramsAlphabetically(filteredResults);
        renderPrograms(sortedResults, false);
    }

    updateFilterCounts();

    // Call the tag generator
    renderActiveFilterTags();
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
        var primaryLoc = p.locations[0] || "Fredericton";

        // If it's "saint-john", use "stjohn" (used for background color), otherwise proceed with standard normalization
        const locClass = (primaryLoc === "saint-john") 
            ? "saint-john" 
            : primaryLoc.toLowerCase().replace(/[^a-z0-9]/g, '');

        // handle issue with saint-john being hyphenated
        if (primaryLoc === "saint-john") {
            primaryLoc = " Saint John"
        } 
        const tagsHTML = (p.programFeatures || [])
            .map(tag => `<span class="program-cards__item__tag">${tag}</span>`)
            .join('');

        return `
            <a class="program-cards__item" href="${p.link || '#'}">
                <div class="program-cards__item__text">
                    <p class="program-cards__item__degree">${p.levelsOfStudy[0] || ''}</p>
                    <h3 class="program-cards__item__title">
                        ${p.title}
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

function updateFilterCounts() {
    dropdownIds.forEach(id => {
        const container = document.getElementById(`filter-${id}`);
        const countEl = container?.closest('.select__wrapper')?.querySelector('.select__count');
        if (!countEl) return;
        const n = container.querySelectorAll('input[type="checkbox"]:checked').length;
        countEl.textContent = n > 0 ? `(${n})` : '';
    });
}

/**
 * Renders the "Active Filter" tags
 */
function renderActiveFilterTags() {
    const container = document.getElementById('active-filters-tags');
    const resetBtn = document.getElementById('reset-filters');
    if (!container) return;

    container.innerHTML = '';

    const allChecked = document.querySelectorAll('.filter-dropdown input[type="checkbox"]:checked');

    allChecked.forEach(cb => {
        const labelText = cb.nextElementSibling.textContent;
        const tag = document.createElement('button');
        tag.className = 'active-filter-tag';
        tag.innerHTML = `${labelText} <span>&times;</span>`;

        tag.addEventListener('click', () => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        });

        container.appendChild(tag);
    });

    if (resetBtn) {
        resetBtn.style.display = allChecked.length > 0 ? 'inline-block' : 'none';
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

        el.addEventListener('change', () => {
            // Specialized logic for Interests to handle URL state handoff
            if (id === 'interests') {
                // Clear the "Quiz" results as the user has now taken manual control
                activeInterests = [];

                const checkedValues = Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

                // Update the URL to stay in sync with the new manual selection
                const params = new URLSearchParams(window.location.search);
                params.delete('interests');
                checkedValues.forEach(v => params.append('interests', v));

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
                if (el) el.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            });

            // Re-run the filter to show the full list
            applyFilters();

            // Clean the URL entirely
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    // 4. Select wrappers
    function closeWrapper(w) {
        w.classList.remove('select__wrapper--open');
        const t = w.querySelector('.select__toggle');
        if (t) { t.setAttribute('aria-expanded', 'false'); t.textContent = '+'; }
    }

    function openWrapper(w) {
        document.querySelectorAll('.select__wrapper--open').forEach(other => closeWrapper(other));
        w.classList.add('select__wrapper--open');
        const t = w.querySelector('.select__toggle');
        if (t) { t.setAttribute('aria-expanded', 'true'); t.textContent = '−'; }
    }

    document.querySelectorAll('.select__wrapper').forEach(wrapper => {
        const btn = wrapper.querySelector('.select__toggle');
        const dropdown = wrapper.querySelector('.filter-dropdown');

        // Toggle the dropdown on click (mouse or keyboard).
        // e.detail === 0 means the click was keyboard-triggered (Enter or Space on
        // the button); in that case move focus into the first list item after open.
        wrapper.addEventListener('click', e => {
            e.stopPropagation();
            if (e.target.closest('.filter-dropdown')) return;

            if (wrapper.classList.contains('select__wrapper--open')) {
                closeWrapper(wrapper);
            } else {
                openWrapper(wrapper);
                if (e.detail === 0) {
                    setTimeout(() => dropdown?.querySelector('input[type="checkbox"]')?.focus(), 0);
                }
            }
        });

        // Keyboard navigation inside the open dropdown
        dropdown?.addEventListener('keydown', e => {
            const items = Array.from(dropdown.querySelectorAll('input[type="checkbox"]'));
            const idx = items.indexOf(document.activeElement);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items[Math.min(idx + 1, items.length - 1)]?.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                items[Math.max(idx - 1, 0)]?.focus();
            } else if (e.key === 'Enter') {
                // Enter toggles the checkbox (Space already does this natively)
                e.preventDefault();
                const cb = document.activeElement;
                if (cb?.type === 'checkbox') {
                    cb.checked = !cb.checked;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (e.key === 'Escape') {
                closeWrapper(wrapper);
                btn?.focus();
            }
        });
    });

    // Close any open wrapper when focus moves outside it (handles Tab-out)
    document.addEventListener('focusin', () => {
        document.querySelectorAll('.select__wrapper--open').forEach(w => {
            if (!w.contains(document.activeElement)) closeWrapper(w);
        });
    });

    // Close on outside mouse click
    document.addEventListener('click', () => {
        document.querySelectorAll('.select__wrapper--open').forEach(w => closeWrapper(w));
    });

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