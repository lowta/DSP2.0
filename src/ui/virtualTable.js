const columns = [
  ['Holder_Name', 'Nombre'],
  ['Receiver_Phone', 'Telefono'],
  ['Detail_Address', 'Direccion'],
  ['City', 'Ciudad'],
  ['Province', 'Provincia'],
];

const headerHeight = 42;

export function createVirtualTable({ root, rowHeight }) {
  const viewport = root.querySelector('[data-table-viewport]');
  const spacer = root.querySelector('[data-table-spacer]');
  const tbody = root.querySelector('[data-table-body]');
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
      .map((row) => renderRow(row))
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

function renderRow(row) {
  return `<tr>${columns.map(([key]) => `<td>${escapeHtml(row[key])}</td>`).join('')}</tr>`;
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
