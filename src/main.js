import './styles.css';
import { config } from './config.js';
import { searchClients } from './services/clientApi.js';
import { namesToApiFilter, normalizeForLocalSearch } from './utils/normalizeSearch.js';
import { dedupeAndIndexRecords } from './utils/processRecords.js';
import { renderTableHead, createVirtualTable } from './ui/virtualTable.js';
import { setLoading, setStatus } from './ui/status.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="shell">
    <section class="search-panel" aria-labelledby="page-title">
      <div class="title-block">
        <p class="eyebrow">DSP2.0</p>
        <h1 id="page-title">Buscador de clientes</h1>
      </div>

      <form class="search-form" data-search-form>
        <label class="field field--wide">
          <span>Nombres</span>
          <textarea data-names-input rows="4" placeholder="mohammed&#10;jose, josé&#10;maria|maría"></textarea>
        </label>

        <label class="field">
          <span>Token</span>
          <input data-token-input type="password" autocomplete="off" placeholder="TOKEN" />
        </label>

        <button class="primary-button" data-search-button type="submit">
          <span class="button-text">Buscar</span>
          <span class="spinner" aria-hidden="true"></span>
        </button>
      </form>

      <div class="query-preview">
        <span>Filtro API</span>
        <code data-filter-preview>-</code>
      </div>

      <div data-status hidden></div>
    </section>

    <section class="results-panel" aria-label="Resultados">
      <div class="results-toolbar">
        <div class="metrics">
          <div>
            <span class="metric-label">Resultados</span>
            <strong data-total-count>0</strong>
          </div>
          <div>
            <span class="metric-label">Duplicados</span>
            <strong data-duplicate-count>0</strong>
          </div>
          <div>
            <span class="metric-label">Mostrando</span>
            <strong data-visible-count>0</strong>
          </div>
        </div>

        <label class="local-filter">
          <span>Filtrar cargados</span>
          <input data-local-filter type="search" placeholder="Nombre, telefono, ciudad..." disabled />
        </label>
      </div>

      <div class="table-card">
        <div class="table-viewport" data-table-viewport>
          <div data-table-spacer></div>
          <table>
            <thead data-table-head></thead>
            <tbody data-table-body></tbody>
          </table>
        </div>
        <div class="empty-state" data-empty-state>
          <h2>Listo para buscar</h2>
          <p>Introduce uno o varios nombres. Separalos por salto de linea, coma, punto y coma o barra vertical.</p>
        </div>
      </div>
    </section>
  </main>
`;

const elements = {
  form: app.querySelector('[data-search-form]'),
  namesInput: app.querySelector('[data-names-input]'),
  tokenInput: app.querySelector('[data-token-input]'),
  searchButton: app.querySelector('[data-search-button]'),
  filterPreview: app.querySelector('[data-filter-preview]'),
  status: app.querySelector('[data-status]'),
  totalCount: app.querySelector('[data-total-count]'),
  duplicateCount: app.querySelector('[data-duplicate-count]'),
  visibleCount: app.querySelector('[data-visible-count]'),
  localFilter: app.querySelector('[data-local-filter]'),
  emptyState: app.querySelector('[data-empty-state]'),
  tableCard: app.querySelector('.table-card'),
};

const state = {
  rows: [],
  indexedRows: [],
  filteredRows: [],
  abortController: null,
  filterTimer: null,
};

elements.tokenInput.value = localStorage.getItem('dsp2_api_token') || config.apiToken;
renderTableHead(app);
const virtualTable = createVirtualTable({
  root: app,
  rowHeight: config.virtualRowHeight,
});

elements.namesInput.addEventListener('input', updateFilterPreview);
elements.localFilter.addEventListener('input', () => {
  clearTimeout(state.filterTimer);
  state.filterTimer = setTimeout(applyLocalFilter, config.localFilterDebounceMs);
});
elements.form.addEventListener('submit', handleSearch);
updateFilterPreview();

async function handleSearch(event) {
  event.preventDefault();

  const filtroBusqueda = namesToApiFilter(elements.namesInput.value);
  const token = elements.tokenInput.value.trim();

  if (!filtroBusqueda) {
    setStatus(elements.status, 'warning', 'Introduce al menos un nombre para buscar.');
    return;
  }

  if (!token) {
    setStatus(elements.status, 'warning', 'Introduce el token de la API.');
    return;
  }

  localStorage.setItem('dsp2_api_token', token);
  state.abortController?.abort();
  state.abortController = new AbortController();
  setLoading(elements.searchButton, true);
  setStatus(elements.status, 'info', 'Consultando API...');
  setEmptyState(false);

  try {
    const response = await searchClients({
      filtroBusqueda,
      token,
      signal: state.abortController.signal,
    });

    if (response.status === 204) {
      resetRows();
      setStatus(elements.status, 'empty', 'No se encontraron resultados.');
      setEmptyState(true, 'No se encontraron resultados', 'Prueba con otra variante del nombre o agrega acentos si aplica.');
      return;
    }

    setStatus(elements.status, 'info', `Procesando ${response.results.length.toLocaleString('es-ES')} registros...`);

    const { unique, indexedRows, duplicateCount } = await dedupeAndIndexRecords(response.results, {
      onProgress({ processed, total, unique: uniqueCount }) {
        setStatus(
          elements.status,
          'info',
          `Procesando ${processed.toLocaleString('es-ES')} de ${total.toLocaleString('es-ES')} registros. ${uniqueCount.toLocaleString('es-ES')} unicos.`,
        );
      },
    });

    state.rows = unique;
    state.indexedRows = indexedRows;
    elements.duplicateCount.textContent = duplicateCount.toLocaleString('es-ES');
    elements.totalCount.textContent = unique.length.toLocaleString('es-ES');
    elements.localFilter.disabled = unique.length === 0;
    elements.localFilter.value = '';

    applyRows(unique);
    setStatus(
      elements.status,
      'success',
      `Busqueda completada. ${unique.length.toLocaleString('es-ES')} resultados unicos cargados.`,
    );
    setEmptyState(unique.length === 0);
  } catch (error) {
    if (error.name === 'AbortError') return;
    resetRows();
    setStatus(elements.status, 'error', error.message || 'Ocurrio un error consultando la API.');
    setEmptyState(true, 'No se pudo completar la busqueda', 'Revisa el token, la conexion o usa un gateway si el navegador bloquea CORS.');
  } finally {
    setLoading(elements.searchButton, false);
  }
}

function applyLocalFilter() {
  const term = normalizeForLocalSearch(elements.localFilter.value);
  if (!term) {
    applyRows(state.rows);
    return;
  }

  const filtered = [];
  for (const item of state.indexedRows) {
    if (item.searchBlob.includes(term)) filtered.push(item.row);
  }
  applyRows(filtered);
}

function applyRows(rows) {
  state.filteredRows = rows;
  virtualTable.setRows(rows);
  elements.visibleCount.textContent = rows.length.toLocaleString('es-ES');
  setEmptyState(rows.length === 0 && state.rows.length > 0, 'Sin coincidencias locales', 'Cambia el filtro local para ver los resultados cargados.');
}

function resetRows() {
  state.rows = [];
  state.indexedRows = [];
  state.filteredRows = [];
  virtualTable.setRows([]);
  elements.totalCount.textContent = '0';
  elements.duplicateCount.textContent = '0';
  elements.visibleCount.textContent = '0';
  elements.localFilter.value = '';
  elements.localFilter.disabled = true;
}

function updateFilterPreview() {
  const filter = namesToApiFilter(elements.namesInput.value);
  elements.filterPreview.textContent = filter || '-';
}

function setEmptyState(isVisible, title = 'Listo para buscar', message = 'Introduce uno o varios nombres. Separalos por salto de linea, coma, punto y coma o barra vertical.') {
  elements.emptyState.hidden = !isVisible;
  elements.emptyState.querySelector('h2').textContent = title;
  elements.emptyState.querySelector('p').textContent = message;
}
