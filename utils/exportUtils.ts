import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../types/pregnancy';

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatTimestamp(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '—';
  try {
    return formatDate(ts.toDate());
  } catch {
    return '—';
  }
}

export function getSeverityLabel(severity: number): string {
  const labels: Record<number, string> = {
    1: 'Mild',
    2: 'Moderate',
    3: 'Noticeable',
    4: 'Severe',
    5: 'Very Severe',
  };
  return labels[severity] ?? 'Unknown';
}

export function generateReportHTML(
  pregnancy: Pregnancy,
  hospitalVisits: HospitalVisit[],
  symptoms: Symptom[],
  milestones: Milestone[],
  currentWeek: number
): string {
  // Sort visits and symptoms by date ascending
  const sortedVisits = [...hospitalVisits].sort(
    (a, b) => a.date.toDate().getTime() - b.date.toDate().getTime()
  );
  const sortedSymptoms = [...symptoms].sort(
    (a, b) => a.date.toDate().getTime() - b.date.toDate().getTime()
  );

  const visitsRows = sortedVisits
    .map(
      v => `
    <tr>
      <td>${formatTimestamp(v.date)}</td>
      <td>Week ${v.week}</td>
      <td>${v.type.charAt(0).toUpperCase() + v.type.slice(1)}</td>
      <td>${v.weight ? v.weight + ' kg' : '—'}</td>
      <td>${v.bloodPressure || '—'}</td>
      <td>${v.notes || '—'}</td>
    </tr>
  `
    )
    .join('');

  const symptomsRows = sortedSymptoms
    .map(
      s => `
    <tr>
      <td>${formatTimestamp(s.date)}</td>
      <td>Week ${s.week}</td>
      <td>${s.type.replace('_', ' ')}</td>
      <td>${getSeverityLabel(s.severity)} (${s.severity}/5)</td>
      <td>${s.notes || '—'}</td>
    </tr>
  `
    )
    .join('');

  const milestonesRows = milestones
    .map(
      m => `
    <tr>
      <td>${formatTimestamp(m.date)}</td>
      <td>Week ${m.week}</td>
      <td>${m.title}</td>
      <td>${m.description || '—'}</td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; color: #333; padding: 24px; }
  h1 { color: #81bec1; border-bottom: 2px solid #81bec1; padding-bottom: 8px; }
  h2 { color: #555; margin-top: 32px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
  .summary-card { background: #E0F2F3; border-radius: 8px; padding: 12px; }
  .label { font-size: 12px; color: #888; text-transform: uppercase; }
  .value { font-size: 16px; font-weight: bold; color: #333; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #81bec1; color: white; padding: 8px 12px; text-align: left; font-size: 13px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr:nth-child(even) { background: #f9f9f9; }
  .empty { color: #aaa; font-style: italic; padding: 16px 0; }
  .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
</style>
</head>
<body>
  <h1>Pregnancy Journal Report</h1>
  <p>Generated on ${formatDate(new Date())}</p>

  <h2>Pregnancy Summary</h2>
  <div class="summary-grid">
    <div class="summary-card"><div class="label">Mother</div><div class="value">${pregnancy.motherName}</div></div>
    <div class="summary-card"><div class="label">Current Week</div><div class="value">Week ${currentWeek} of 40</div></div>
    <div class="summary-card"><div class="label">Due Date</div><div class="value">${formatTimestamp(pregnancy.dueDate)}</div></div>
    <div class="summary-card"><div class="label">Baby Name</div><div class="value">${pregnancy.babyName || 'Not set'}</div></div>
    ${pregnancy.doctorName ? `<div class="summary-card"><div class="label">Doctor</div><div class="value">${pregnancy.doctorName}</div></div>` : ''}
    ${pregnancy.hospital ? `<div class="summary-card"><div class="label">Hospital</div><div class="value">${pregnancy.hospital}</div></div>` : ''}
    ${pregnancy.bloodType ? `<div class="summary-card"><div class="label">Blood Type</div><div class="value">${pregnancy.bloodType}</div></div>` : ''}
  </div>

  <h2>Hospital Visits (${sortedVisits.length})</h2>
  ${
    sortedVisits.length > 0
      ? `
  <table>
    <thead><tr><th>Date</th><th>Week</th><th>Type</th><th>Weight</th><th>Blood Pressure</th><th>Notes</th></tr></thead>
    <tbody>${visitsRows}</tbody>
  </table>`
      : '<p class="empty">No hospital visits recorded.</p>'
  }

  <h2>Symptoms (${sortedSymptoms.length})</h2>
  ${
    sortedSymptoms.length > 0
      ? `
  <table>
    <thead><tr><th>Date</th><th>Week</th><th>Type</th><th>Severity</th><th>Notes</th></tr></thead>
    <tbody>${symptomsRows}</tbody>
  </table>`
      : '<p class="empty">No symptoms recorded.</p>'
  }

  <h2>Milestones (${milestones.length})</h2>
  ${
    milestones.length > 0
      ? `
  <table>
    <thead><tr><th>Date</th><th>Week</th><th>Title</th><th>Description</th></tr></thead>
    <tbody>${milestonesRows}</tbody>
  </table>`
      : '<p class="empty">No milestones recorded.</p>'
  }

  <div class="footer">Generated by NewLifeJournal &middot; ${formatDate(new Date())}</div>
</body>
</html>`;
}
