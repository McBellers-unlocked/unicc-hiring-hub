/**
 * UN regional groups and UN member states.
 *
 * Used by the Talent Pool filters (Region / Member State / Nationality).
 * Country names follow the canonical English short forms used by the UN.
 */

export const UN_REGIONAL_GROUPS = [
  "Africa",
  "Asia-Pacific",
  "Eastern Europe",
  "Latin America & Caribbean (GRULAC)",
  "Western Europe & Others (WEOG)",
] as const;

export type UnRegion = (typeof UN_REGIONAL_GROUPS)[number];

const AFRICA = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon",
  "Central African Republic","Chad","Comoros","Congo","Cote d'Ivoire",
  "Democratic Republic of the Congo","Djibouti","Egypt","Equatorial Guinea","Eritrea",
  "Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho",
  "Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco",
  "Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome and Principe","Senegal",
  "Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Togo",
  "Tunisia","Uganda","United Republic of Tanzania","Zambia","Zimbabwe",
];

const ASIA_PACIFIC = [
  "Afghanistan","Bahrain","Bangladesh","Bhutan","Brunei Darussalam","Cambodia","China",
  "Cyprus","Democratic People's Republic of Korea","Fiji","India","Indonesia",
  "Iran (Islamic Republic of)","Iraq","Japan","Jordan","Kazakhstan","Kiribati","Kuwait",
  "Kyrgyzstan","Lao People's Democratic Republic","Lebanon","Malaysia","Maldives",
  "Marshall Islands","Micronesia (Federated States of)","Mongolia","Myanmar","Nauru","Nepal",
  "Oman","Pakistan","Palau","Papua New Guinea","Philippines","Qatar","Republic of Korea",
  "Samoa","Saudi Arabia","Singapore","Solomon Islands","Sri Lanka","Syrian Arab Republic",
  "Tajikistan","Thailand","Timor-Leste","Tonga","Turkmenistan","Tuvalu","United Arab Emirates",
  "Uzbekistan","Vanuatu","Viet Nam","Yemen",
];

const EASTERN_EUROPE = [
  "Albania","Armenia","Azerbaijan","Belarus","Bosnia and Herzegovina","Bulgaria","Croatia",
  "Czechia","Estonia","Georgia","Hungary","Latvia","Lithuania","Montenegro",
  "North Macedonia","Poland","Republic of Moldova","Romania","Russian Federation","Serbia",
  "Slovakia","Slovenia","Ukraine",
];

const GRULAC = [
  "Antigua and Barbuda","Argentina","Bahamas","Barbados","Belize","Bolivia (Plurinational State of)",
  "Brazil","Chile","Colombia","Costa Rica","Cuba","Dominica","Dominican Republic","Ecuador",
  "El Salvador","Grenada","Guatemala","Guyana","Haiti","Honduras","Jamaica","Mexico","Nicaragua",
  "Panama","Paraguay","Peru","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Suriname","Trinidad and Tobago","Uruguay","Venezuela (Bolivarian Republic of)",
];

const WEOG = [
  "Andorra","Australia","Austria","Belgium","Canada","Denmark","Finland","France","Germany",
  "Greece","Iceland","Ireland","Israel","Italy","Liechtenstein","Luxembourg","Malta","Monaco",
  "Netherlands","New Zealand","Norway","Portugal","San Marino","Spain","Sweden","Switzerland",
  "Turkey","United Kingdom","United States of America",
];

export const UN_MEMBER_STATES: string[] = [
  ...AFRICA, ...ASIA_PACIFIC, ...EASTERN_EUROPE, ...GRULAC, ...WEOG,
].sort((a, b) => a.localeCompare(b));

const REGION_MAP: Record<string, UnRegion> = {};
const addAll = (list: string[], region: UnRegion) => {
  for (const c of list) REGION_MAP[c.toLowerCase()] = region;
};
addAll(AFRICA, "Africa");
addAll(ASIA_PACIFIC, "Asia-Pacific");
addAll(EASTERN_EUROPE, "Eastern Europe");
addAll(GRULAC, "Latin America & Caribbean (GRULAC)");
addAll(WEOG, "Western Europe & Others (WEOG)");

/** Common short-form / informal name aliases → canonical UN member-state name. */
const COUNTRY_ALIASES: Record<string, string> = {
  "usa": "United States of America",
  "u.s.a.": "United States of America",
  "us": "United States of America",
  "u.s.": "United States of America",
  "united states": "United States of America",
  "america": "United States of America",
  "uk": "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  "england": "United Kingdom",
  "scotland": "United Kingdom",
  "wales": "United Kingdom",
  "northern ireland": "United Kingdom",
  "uae": "United Arab Emirates",
  "russia": "Russian Federation",
  "south korea": "Republic of Korea",
  "korea, south": "Republic of Korea",
  "korea (south)": "Republic of Korea",
  "north korea": "Democratic People's Republic of Korea",
  "korea, north": "Democratic People's Republic of Korea",
  "korea (north)": "Democratic People's Republic of Korea",
  "iran": "Iran (Islamic Republic of)",
  "syria": "Syrian Arab Republic",
  "laos": "Lao People's Democratic Republic",
  "vietnam": "Viet Nam",
  "brunei": "Brunei Darussalam",
  "tanzania": "United Republic of Tanzania",
  "moldova": "Republic of Moldova",
  "bolivia": "Bolivia (Plurinational State of)",
  "venezuela": "Venezuela (Bolivarian Republic of)",
  "micronesia": "Micronesia (Federated States of)",
  "ivory coast": "Cote d'Ivoire",
  "côte d'ivoire": "Cote d'Ivoire",
  "cape verde": "Cabo Verde",
  "swaziland": "Eswatini",
  "macedonia": "North Macedonia",
  "czech republic": "Czechia",
  "republic of the congo": "Congo",
  "drc": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "congo (drc)": "Democratic Republic of the Congo",
  "congo-kinshasa": "Democratic Republic of the Congo",
  "congo-brazzaville": "Congo",
  "burma": "Myanmar",
  "east timor": "Timor-Leste",
  "palestine": "", // not a UN member state; ignored
  "vatican": "",   // observer; ignored
  "holy see": "",
  "taiwan": "",
};

function normalizeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\.$/g, "")
    .replace(/\s+/g, " ");
}

/** Resolve a free-form country / location token to a canonical UN member-state name. */
export function resolveCountryName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = normalizeName(raw);
  if (!cleaned) return null;
  if (COUNTRY_ALIASES[cleaned] !== undefined) {
    return COUNTRY_ALIASES[cleaned] || null;
  }
  // direct match against member states (case-insensitive)
  if (REGION_MAP[cleaned]) {
    // Find canonical casing
    const canonical = UN_MEMBER_STATES.find((m) => m.toLowerCase() === cleaned);
    return canonical ?? null;
  }
  return null;
}

/** Get the UN regional group for a country/location string. */
export function getRegionForCountry(raw: string | null | undefined): UnRegion | null {
  const canonical = resolveCountryName(raw);
  if (!canonical) return null;
  return REGION_MAP[canonical.toLowerCase()] ?? null;
}

/**
 * Extract all candidate country names from a free-form location string.
 * "Rome, Italy" → ["Italy"]; "Geneva, Switzerland" → ["Switzerland"].
 * Each comma-separated token is resolved; only resolvable tokens are returned.
 */
export function extractCountriesFromLocation(location: string | null | undefined): string[] {
  if (!location) return [];
  const tokens = location.split(/[,/|]/).map((t) => t.trim()).filter(Boolean);
  const out = new Set<string>();
  for (const tok of tokens) {
    const c = resolveCountryName(tok);
    if (c) out.add(c);
  }
  // also try the whole string as a country
  const whole = resolveCountryName(location);
  if (whole) out.add(whole);
  return [...out];
}
