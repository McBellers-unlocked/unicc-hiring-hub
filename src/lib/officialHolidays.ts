import { addDays, parseISO, isWeekend, format } from 'date-fns';

/**
 * Official holidays per duty station for 2026 (excluding floating days).
 * Dates in YYYY-MM-DD format.
 */
const HOLIDAYS_2026: Record<string, string[]> = {
  geneva: [
    '2026-01-01', // New Year's Day
    '2026-04-03', // Good Friday
    '2026-04-06', // Easter Monday
    '2026-09-10', // Jeûne Genevois
    '2026-09-11', // Extra Day
    '2026-12-25', // Christmas Day
    '2026-12-28', // In lieu of Boxing Day
    '2026-12-31', // New Year's Eve
  ],
  'new york': [
    '2026-01-01', // New Year's Day
    '2026-03-20', // Eid Al-Fitr
    '2026-04-03', // Good Friday
    '2026-05-25', // Memorial Day
    '2026-05-27', // Eid al-Adha
    '2026-07-03', // Independence Day (observed)
    '2026-09-07', // Labour Day
    '2026-11-26', // Thanksgiving Day
    '2026-12-25', // Christmas Day
  ],
  rome: [
    '2026-01-01', // New Year's Day
    '2026-02-16', // Chinese Lunar New Year
    '2026-03-20', // Eid Al-Fitr
    '2026-04-06', // Easter Monday
    '2026-05-01', // International Workers' Day
    '2026-11-02', // In lieu of All Saint's Day
    '2026-12-25', // Christmas Day
    '2026-12-28', // In lieu of Boxing Day
  ],
  brindisi: [
    '2026-01-01', // New Year's Day
    '2026-03-20', // Eid Al-Fitr
    '2026-04-06', // Easter Monday
    '2026-05-01', // International Workers' Day
    '2026-05-27', // Eid al-Adha
    '2026-08-14', // Assumption Day in lieu
    '2026-12-08', // Immaculate Conception
    '2026-12-25', // Christmas Day
    '2026-12-28', // In lieu of Boxing Day
  ],
  valencia: [
    '2026-01-01', // New Year's Day
    '2026-03-20', // Eid Al-Fitr
    '2026-04-03', // Good Friday
    '2026-04-06', // Easter Monday
    '2026-05-01', // International Workers' Day
    '2026-05-27', // Eid al-Adha
    '2026-10-09', // Valencian Community's Day
    '2026-10-12', // Spanish National Day
    '2026-12-25', // Christmas Day
  ],
  madrid: [
    '2026-01-01', // New Year's Day
    '2026-03-20', // Eid Al-Fitr
    '2026-04-03', // Good Friday
    '2026-04-06', // Easter Monday
    '2026-05-01', // International Workers' Day
    '2026-05-27', // Eid al-Adha
    '2026-10-09', // Valencian Community's Day
    '2026-10-12', // Spanish National Day
    '2026-12-25', // Christmas Day
  ],
};

/**
 * Resolve the duty station string to a key in the holidays map.
 * Case-insensitive partial matching (e.g. "Valencia, Spain" → "valencia").
 */
function resolveDutyStation(dutyStation: string): string | null {
  const lower = dutyStation.toLowerCase().trim();
  for (const key of Object.keys(HOLIDAYS_2026)) {
    if (lower.includes(key) || key.includes(lower)) {
      return key;
    }
  }
  return null;
}

/**
 * Check if a date falls on an official holiday for the given duty station.
 */
function isOfficialHoliday(date: Date, stationKey: string | null): boolean {
  if (!stationKey) return false;
  const holidays = HOLIDAYS_2026[stationKey];
  if (!holidays) return false;
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.includes(dateStr);
}

/**
 * Calculate the CB return date:
 * 1. Add 31 calendar days to the separation date
 * 2. Advance day-by-day past weekends and duty station holidays
 */
export function calculateCBReturnDate(separationDate: string, dutyStation: string): string {
  const stationKey = resolveDutyStation(dutyStation);
  let date = addDays(parseISO(separationDate), 31);

  while (isWeekend(date) || isOfficialHoliday(date, stationKey)) {
    date = addDays(date, 1);
  }

  return format(date, 'yyyy-MM-dd');
}
