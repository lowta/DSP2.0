export const csvColumns = [
  'Tracking_id',
  'Holder_Name',
  'Receiver_Phone',
  'Detail_Address',
  'City',
  'Province',
];

export function rowsToCsv(rows) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    csvColumns.join(','),
    ...rows.map((row) => csvColumns.map((column) => escapeCell(row[column])).join(',')),
  ].join('\n');
}
