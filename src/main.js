import './styles.css';
import { signInWithPassword, signOut, signUpWithPassword, getSession, onAuthStateChange } from './services/authService.js';
import { searchClients } from './services/clientApi.js';
import { namesToApiFilter, normalizeForLocalSearch } from './utils/normalizeSearch.js';
import { dedupeAndIndexRecords } from './utils/processRecords.js';
import { renderTableHead, createVirtualTable } from './ui/virtualTable.js';
import { setLoading, setStatus } from './ui/status.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="shell">
    <section class="auth-panel" data-auth-panel aria-labelledby="auth-title">
      <div class="title-block">
        <p class="eyebrow">DSP2.0</p>
        <h1 id="auth-title">Acceso privado</h1>
      </div>

      <form class="auth-form" data-auth-form>
        <label class="field">
          <span>Email</span>
          <input data-auth-email type="email" autocomplete="email" placeholder="tu@email.com" value="ltrlambrecht@gmail.com" />
        </label>

        <label class="field">
          <span>Contrasena</span>
          <input data-auth-password type="password" autocomplete="current-password" placeholder="Contrasena" />
        </label>

        <div class="auth-actions">
          <button class="primary-button" data-auth-login type="submit">Entrar</button>
          <button class="secondary-button" data-auth-signup type="button">Crear acceso</button>
        </div>
      </form>

      <div data-auth-status hidden></div>
    </section>

    <section class="session-panel" data-session-panel hidden>
      <span data-session-email></span>
      <button class="secondary-button secondary-button--small" data-signout-button type="button">Salir</button>
    </section>

    <section class="search-panel" data-app-panel aria-labelledby="page-title" hidden>
      <div class="title-block">
        <p class="eyebrow">DSP2.0</p>
        <h1 id="page-title">Buscador de clientes</h1>
      </div>

      <form class="search-form search-form--gateway" data-search-form>
        <label class="field field--wide">
          <span>Nombres</span>
          <textarea data-names-input rows="4" placeholder="mohammed&#10;jose, jose&#10;maria|maria"></textarea>
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

    <section class="results-panel" data-results-panel aria-label="Resultados" hidden>
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
  authPanel: app.querySelector('[data-auth-panel]'),
  authForm: app.querySelector('[data-auth-form]'),
  authEmail: app.querySelector('[data-auth-email]'),
  authPassword: app.querySelector('[data-auth-password]'),
  authSignUp: app.querySelector('[data-auth-signup]'),
  authStatus: app.querySelector('[data-auth-status]'),
  sessionPanel: app.querySelector('[data-session-panel]'),
  sessionEmail: app.querySelector('[data-session-email]'),
  signOutButton: app.querySelector('[data-signout-button]'),
  appPanel: app.querySelector('[data-app-panel]'),
  resultsPanel: app.querySelector('[data-results-panel]'),
  form: app.querySelector('[data-search-form]'),
  namesInput: app.querySelector('[data-names-input]'),
  searchButton: app.querySelector('[data-search-button]'),
  filterPreview: app.querySelector('[data-filter-preview]'),
  status: app.querySelector('[data-status]'),
  totalCount: app.querySelector('[data-total-count]'),
  duplicateCount: app.querySelector('[data-duplicate-count]'),
  visibleCount: app.querySelector('[data-visible-count]'),
  localFilter: app.querySelector('[data-local-filter]'),
  emptyState: app.querySelector('[data-empty-state]'),
};

const state = {
  session: null,
  rows: [],
  indexedRows: [],
  filteredRows: [],
  abortController: null,
  filterTimer: null,
};

renderTableHead(app);
const virtualTable = createVirtualTable({
  root: app,
  rowHeight: 52,
});

elements.namesInput.addEventListener('input', updateFilterPreview);
elements.localFilter.addEventListener('input', () => {
  clearTimeout(state.filterTimer);
  state.filterTimer = setTimeout(applyLocalFilter, 120);
});
elements.form.addEventListener('submit', handleSearch);
elements.authForm.addEventListener('submit', handleLogin);
elements.authSignUp.addEventListener('click', handleSignUp);
elements.signOutButton.addEventListener('click', handleSignOut);
updateFilterPreview();
initAuth();

async function initAuth() {
  try {
    setAuthSession(await getSession());
    onAuthStateChange(setAuthSession);
  } catch (error) {
    setStatus(elements.authStatus, 'error', error.message || 'No se pudo cargar la sesion.');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  await runAuthAction(async () => {
    await signInWithPassword({
      email: elements.authEmail.value.trim(),
      password: elements.authPassword.value,
    });
  }, 'Sesion iniciada.');
}

async function handleSignUp() {
  await runAuthAction(async () => {
    await signUpWithPassword({
      email: elements.authEmail.value.trim(),
      password: elements.authPassword.value,
    });
  }, 'Usuario creado. Si Supabase pide confirmacion, revisa el email antes de entrar.');
}

async function handleSignOut() {
  try {
    await signOut();
    resetRows();
  } catch (error) {
    setStatus(elements.status, 'error', error.message || 'No se pudo cerrar sesion.');
  }
}

async function runAuthAction(action, successMessage) {
  if (!elements.authEmail.value.trim() || !elements.authPassword.value) {
    setStatus(elements.authStatus, 'warning', 'Introduce email y contrasena.');
    return;
  }

  elements.authForm.dataset.loading = 'true';
  setStatus(elements.authStatus, 'info', 'Validando acceso...');
  try {
    await action();
    setStatus(elements.authStatus, 'success', successMessage);
    elements.authPassword.value = '';
  } catch (error) {
    setStatus(elements.authStatus, 'error', error.message || 'No se pudo validar el acceso.');
  } finally {
    elements.authForm.dataset.loading = 'false';
  }
}

function setAuthSession(session) {
  state.session = session;
  const isSignedIn = Boolean(session?.user);

  elements.authPanel.hidden = isSignedIn;
  elements.sessionPanel.hidden = !isSignedIn;
  elements.appPanel.hidden = !isSignedIn;
  elements.resultsPanel.hidden = !isSignedIn;
  elements.searchButton.disabled = !isSignedIn;
  elements.sessionEmail.textContent = session?.user?.email || '';

  if (!isSignedIn) {
    resetRows();
  }
}

async function handleSearch(event) {
  event.preventDefault();

  const filtroBusqueda = namesToApiFilter(elements.namesInput.value);

  if (!filtroBusqueda) {
    setStatus(elements.status, 'warning', 'Introduce al menos un nombre para buscar.');
    return;
  }

  if (!state.session?.user) {
    setStatus(elements.status, 'warning', 'Inicia sesion para buscar.');
    return;
  }

  state.abortController?.abort();
  state.abortController = new AbortController();
  setLoading(elements.searchButton, true);
  setStatus(elements.status, 'info', 'Consultando gateway seguro...');
  setEmptyState(false);

  try {
    const response = await searchClients({
      filtroBusqueda,
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
    setStatus(elements.status, 'error', error.message || 'Ocurrio un error consultando el gateway.');
    setEmptyState(true, 'No se pudo completar la busqueda', 'Revisa tu sesion o la configuracion del gateway de Supabase.');
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
