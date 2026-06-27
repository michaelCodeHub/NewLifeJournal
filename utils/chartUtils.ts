import { HospitalVisit } from '../types/pregnancy';

export interface WeightDataPoint {
  week: number;
  weight: number;
  date: Date;
}

export interface BPDataPoint {
  week: number;
  systolic: number;
  diastolic: number;
  date: Date;
}

export function parseBloodPressure(
  bp: string | undefined | null
): { systolic: number; diastolic: number } | null {
  if (!bp) return null;
  const parts = bp.split('/');
  if (parts.length !== 2) return null;
  const systolic = parseInt(parts[0].trim(), 10);
  const diastolic = parseInt(parts[1].trim(), 10);
  if (isNaN(systolic) || isNaN(diastolic)) return null;
  return { systolic, diastolic };
}

export function getWeightDataPoints(visits: HospitalVisit[]): WeightDataPoint[] {
  return visits
    .filter(v => v.weight != null && v.weight > 0)
    .map(v => ({ week: v.week, weight: v.weight!, date: v.date.toDate() }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getBPDataPoints(visits: HospitalVisit[]): BPDataPoint[] {
  return visits
    .filter(v => v.bloodPressure != null)
    .map(v => {
      const parsed = parseBloodPressure(v.bloodPressure);
      if (!parsed) return null;
      return {
        week: v.week,
        systolic: parsed.systolic,
        diastolic: parsed.diastolic,
        date: v.date.toDate(),
      };
    })
    .filter((v): v is BPDataPoint => v !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function formatWeekLabel(week: number): string {
  return `W${week}`;
}
