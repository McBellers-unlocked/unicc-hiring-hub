type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value)
  ? value as RecordValue : {};
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/** Normalize display-only skill aliases without changing the submitted record. */
export function applicationDisplaySkills(phfData: unknown): string[] {
  const phf = record(phfData), skills: string[] = [];
  const addText = (value: unknown) => { const item = text(value); if (item) skills.push(item); };
  const addFreeText = (value: unknown) => text(value).split(/[,;]/).forEach(addText);
  for (const value of [phf._skills, phf.skills]) {
    if (Array.isArray(value)) value.forEach(item => addText(typeof item === 'string' ? item : record(item).name));
    else if (typeof value === 'string') addFreeText(value);
    else addFreeText(record(value).additional_skills);
  }
  addFreeText(record(phf.additionalInformation).additional_skills);
  return [...new Set(skills)];
}

interface LanguageLevels { read?: string; speak?: string; write?: string }
interface DisplayLanguage extends LanguageLevels { language: string; proficiency?: string }
type DisplayProficiency = string | LanguageLevels;

const level = (value: unknown): string => text(value) || text(record(value).english);
const levels = (value: unknown): LanguageLevels => {
  const item = record(value);
  return {
    read: level(item.read) || level(item.reading),
    speak: level(item.speak) || level(item.speaking),
    write: level(item.write) || level(item.writing),
  };
};

/** Accept both PHF language groups and imported language arrays for rendering. */
export function applicationDisplayLanguages(value: unknown): {
  un_languages: Record<string, DisplayProficiency>; other_languages: DisplayLanguage[];
} {
  const data = record(value), un_languages: Record<string, DisplayProficiency> = {};
  for (const [name, proficiency] of Object.entries(record(data.un_languages))) {
    if (typeof proficiency === 'string') un_languages[name] = proficiency;
    else un_languages[name] = levels(proficiency);
  }
  const rows = Array.isArray(value) ? value : Array.isArray(data.other_languages) ? data.other_languages : [];
  const other_languages = rows.flatMap(row => {
    const item = record(row), language = text(item.language) || text(item.name);
    if (!language) return [];
    return [{ language, ...levels(item), proficiency: level(item.proficiency) }];
  });
  return { un_languages, other_languages };
}
