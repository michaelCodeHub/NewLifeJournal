import { Pregnancy, HospitalVisit, Symptom, Milestone } from '../types/pregnancy';

export interface TimelineSummary {
  totalVisits: number;
  totalSymptoms: number;
  totalMilestones: number;
  firstVisitDate: string | null;
  latestWeight: number | null;
  latestBP: string | null;
  currentWeek: number;
}

export function buildTimelineSummary(
  pregnancy: Pregnancy,
  hospitalVisits: HospitalVisit[],
  symptoms: Symptom[],
  milestones: Milestone[],
  currentWeek: number
): TimelineSummary {
  const sortedVisits = [...hospitalVisits].sort(
    (a, b) => a.date.toDate().getTime() - b.date.toDate().getTime()
  );
  const visitsWithWeight = hospitalVisits.filter(v => v.weight != null);
  const latestWeightVisit =
    visitsWithWeight.length > 0
      ? visitsWithWeight.reduce((a, b) =>
          a.date.toDate() > b.date.toDate() ? a : b
        )
      : null;
  const visitsWithBP = hospitalVisits.filter(v => v.bloodPressure);
  const latestBPVisit =
    visitsWithBP.length > 0
      ? visitsWithBP.reduce((a, b) =>
          a.date.toDate() > b.date.toDate() ? a : b
        )
      : null;

  return {
    totalVisits: hospitalVisits.length,
    totalSymptoms: symptoms.length,
    totalMilestones: milestones.length,
    firstVisitDate:
      sortedVisits.length > 0
        ? sortedVisits[0].date
            .toDate()
            .toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
        : null,
    latestWeight: latestWeightVisit?.weight ?? null,
    latestBP: latestBPVisit?.bloodPressure ?? null,
    currentWeek,
  };
}

export function generateTimelineText(
  pregnancy: Pregnancy,
  hospitalVisits: HospitalVisit[],
  symptoms: Symptom[],
  milestones: Milestone[],
  currentWeek: number
): string {
  const summary = buildTimelineSummary(
    pregnancy,
    hospitalVisits,
    symptoms,
    milestones,
    currentWeek
  );
  const dueDate = pregnancy.dueDate.toDate().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const lines = [
    `🤱 ${pregnancy.motherName}'s Pregnancy Journey`,
    `Week ${summary.currentWeek} of 40 · Due ${dueDate}`,
    '',
    '📊 Journey So Far',
    `  🏥 Hospital visits: ${summary.totalVisits}`,
    `  💊 Symptoms logged: ${summary.totalSymptoms}`,
    `  🌟 Milestones: ${summary.totalMilestones}`,
  ];

  if (summary.latestWeight) lines.push(`  ⚖️  Latest weight: ${summary.latestWeight} kg`);
  if (summary.latestBP) lines.push(`  ❤️  Latest BP: ${summary.latestBP}`);
  if (summary.firstVisitDate) lines.push(`  📅 First visit: ${summary.firstVisitDate}`);

  if (milestones.length > 0) {
    lines.push('', '🌟 Milestones');
    const sorted = [...milestones].sort(
      (a, b) => a.date.toDate().getTime() - b.date.toDate().getTime()
    );
    sorted.slice(0, 5).forEach(m => {
      lines.push(`  • Week ${m.week}: ${m.title}`);
    });
    if (milestones.length > 5) lines.push(`  … and ${milestones.length - 5} more`);
  }

  lines.push('', `Shared from NewLifeJournal · ${new Date().toLocaleDateString()}`);
  return lines.join('\n');
}

export function generateTimelineHTML(
  pregnancy: Pregnancy,
  hospitalVisits: HospitalVisit[],
  symptoms: Symptom[],
  milestones: Milestone[],
  currentWeek: number
): string {
  const summary = buildTimelineSummary(
    pregnancy,
    hospitalVisits,
    symptoms,
    milestones,
    currentWeek
  );
  const dueDate = pregnancy.dueDate.toDate().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const sortedMilestones = [...milestones].sort(
    (a, b) => a.date.toDate().getTime() - b.date.toDate().getTime()
  );

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; color: #333; padding: 24px; max-width: 600px; margin: 0 auto; }
  h1 { color: #81bec1; } h2 { color: #555; margin-top: 28px; }
  .stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0; }
  .stat { background: #E0F2F3; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-num { font-size: 28px; font-weight: bold; color: #81bec1; }
  .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
  .milestone { padding: 8px 0; border-bottom: 1px solid #eee; }
  .week-badge { display: inline-block; background: #81bec1; color: white; border-radius: 12px; padding: 2px 8px; font-size: 12px; margin-right: 8px; }
  .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
</style>
</head>
<body>
  <h1>🤱 ${pregnancy.motherName}'s Pregnancy Journey</h1>
  <p>Week <strong>${currentWeek}</strong> of 40 · Due <strong>${dueDate}</strong>${pregnancy.babyName ? ` · Baby ${pregnancy.babyName}` : ''}</p>
  <div class="stat-grid">
    <div class="stat"><div class="stat-num">${summary.totalVisits}</div><div class="stat-label">🏥 Visits</div></div>
    <div class="stat"><div class="stat-num">${summary.totalSymptoms}</div><div class="stat-label">💊 Symptoms</div></div>
    <div class="stat"><div class="stat-num">${summary.totalMilestones}</div><div class="stat-label">🌟 Milestones</div></div>
  </div>
  ${summary.latestWeight || summary.latestBP ? `
  <h2>Latest Stats</h2>
  ${summary.latestWeight ? `<p>⚖️ Weight: <strong>${summary.latestWeight} kg</strong></p>` : ''}
  ${summary.latestBP ? `<p>❤️ Blood Pressure: <strong>${summary.latestBP}</strong></p>` : ''}` : ''}
  ${sortedMilestones.length > 0 ? `
  <h2>Milestones (${sortedMilestones.length})</h2>
  ${sortedMilestones
    .map(
      m => `
    <div class="milestone">
      <span class="week-badge">Week ${m.week}</span>
      <strong>${m.title}</strong>
      ${m.description ? `<br/><small>${m.description}</small>` : ''}
    </div>`
    )
    .join('')}` : ''}
  <div class="footer">Shared from NewLifeJournal · ${new Date().toLocaleDateString()}</div>
</body>
</html>`;
}
