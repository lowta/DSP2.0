const columns = [
  ['Holder_Name', 'Nombre'],
  ['Receiver_Phone', 'Telefono'],
  ['Detail_Address', 'Direccion'],
  ['City', 'Ciudad'],
  ['Province', 'Provincia'],
  ['Description', 'Descripción'],
];

const headerHeight = 42;

export function createVirtualTable({ root, rowHeight }) {
  const viewport = root.querySelector('[data-table-viewport]');
  const spacer = root.querySelector('[data-table-spacer]');
  const tbody = root.querySelector('[data-table-body]');
  const dialog = document.createElement('dialog');
  dialog.className = 'contact-detail';
  dialog.innerHTML = '<div class="detail-header"><h2></h2><button type="button" aria-label="Cerrar detalle">Cerrar</button></div><p></p>';
  root.append(dialog);
  dialog.querySelector('button').onclick = () => dialog.close();
  tbody.addEventListener('click', event => {
    const button = event.target.closest('[data-detail]');
    if (!button) return;
    const row = rows[Number(button.dataset.row)];
    if (!row) return;
    dialog.querySelector('h2').textContent = button.dataset.detail === 'Detail_Address' ? 'Dirección completa' : 'Descripción';
    dialog.querySelector('p').textContent = row[button.dataset.detail] || '';
    dialog.showModal();
  });
  let rows = [];
  let frame = null;

  function render() {
    const scrollTop = viewport.scrollTop;
    const viewportHeight = viewport.clientHeight;
    const rowScrollTop = Math.max(0, scrollTop - headerHeight);
    const overscan = 10;
    const start = Math.max(0, Math.floor(rowScrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const end = Math.min(rows.length, start + visibleCount);

    tbody.style.transform = `translateY(${start * rowHeight}px)`;
    tbody.innerHTML = rows
      .slice(start, end)
      .map((row, index) => renderRow(row, start + index))
      .join('');
  }

  function scheduleRender() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      render();
    });
  }

  viewport.addEventListener('scroll', scheduleRender, { passive: true });

  return {
    setRows(nextRows) {
      rows = nextRows;
      spacer.style.height = `${headerHeight + rows.length * rowHeight}px`;
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
      render();
    },
    refresh: render,
  };
}

export function renderRow(row, index = 0) {
  return `<tr>${columns.map(([key]) => {
    const value = escapeHtml(row[key]);
    if (['Detail_Address', 'Description'].includes(key) && value) return `<td class="expandable-cell"><span title="${value}">${value}</span><button type="button" data-detail="${key}" data-row="${index}" aria-label="${key === 'Detail_Address' ? 'Ver dirección completa' : 'Ver descripción completa'} de ${escapeHtml(row.Holder_Name)}">Ver</button></td>`;
    return `<td>${value}</td>`;
  }).join('')}</tr>`;
}

export function renderTableHead(root) {
  root.querySelector('[data-table-head]').innerHTML = `<tr>${columns
    .map(([, label]) => `<th scope="col">${label}</th>`)
    .join('')}</tr>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
