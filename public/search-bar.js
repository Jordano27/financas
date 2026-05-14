/**
 * Reusable search bar component (vanilla JS, no dependencies).
 *
 * @param {object}   config
 * @param {string}   config.containerId   – id of the wrapper <div> in the HTML
 * @param {string[]} config.fields        – item property names to search within
 * @param {string}  [config.placeholder]  – input placeholder text
 * @param {number}  [config.debounceMs]   – keystroke debounce delay (default: 300)
 * @param {function} config.onFilter      – called with (filteredItems, isFiltered: boolean)
 * @returns {{ setItems(items): void, reset(): void, destroy(): void }}
 */
function createSearchBar({ containerId, fields, placeholder = 'Buscar…', debounceMs = 300, onFilter }) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`createSearchBar: #${containerId} not found`);

    let _items = [];
    let _query = '';
    let _timer = null;

    function normalize(str) {
        return String(str ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    }

    function applyFilter() {
        const q = normalize(_query);
        const filtered = q
            ? _items.filter(item => fields.some(f => normalize(item[f]).includes(q)))
            : _items.slice();

        const hasQuery = _query.length > 0;
        const countEl = container.querySelector('.search-bar__count');
        const clearEl = container.querySelector('.search-bar__clear');

        clearEl.classList.toggle('hidden', !hasQuery);

        if (hasQuery) {
            countEl.textContent = `${filtered.length} de ${_items.length} resultado${_items.length !== 1 ? 's' : ''}`;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }

        onFilter(filtered, hasQuery);
    }

    container.innerHTML = `
    <div class="search-bar">
      <svg class="search-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input class="search-bar__input" type="search" autocomplete="off" spellcheck="false"
             placeholder="${placeholder}" aria-label="${placeholder}" />
      <span class="search-bar__count hidden" aria-live="polite"></span>
      <button class="search-bar__clear hidden" type="button" aria-label="Limpar busca">✕</button>
    </div>
  `;

    const input = container.querySelector('.search-bar__input');
    const clearEl = container.querySelector('.search-bar__clear');

    function onInput() {
        clearTimeout(_timer);
        _query = input.value;
        _timer = setTimeout(applyFilter, debounceMs);
    }

    function onClear() {
        _query = '';
        input.value = '';
        clearTimeout(_timer);
        applyFilter();
        input.focus();
    }

    input.addEventListener('input', onInput);
    clearEl.addEventListener('click', onClear);

    return {
        /** Replace the internal item list and immediately apply the current query. */
        setItems(items) {
            _items = Array.isArray(items) ? items : [];
            applyFilter();
        },
        /** Clear the query and input value without triggering onFilter (call before setItems). */
        reset() {
            _query = '';
            input.value = '';
            clearTimeout(_timer);
            const countEl = container.querySelector('.search-bar__count');
            const clearEl2 = container.querySelector('.search-bar__clear');
            if (countEl) countEl.classList.add('hidden');
            if (clearEl2) clearEl2.classList.add('hidden');
        },
        /** Remove DOM content and event listeners. */
        destroy() {
            clearTimeout(_timer);
            input.removeEventListener('input', onInput);
            clearEl.removeEventListener('click', onClear);
            container.innerHTML = '';
        }
    };
}
