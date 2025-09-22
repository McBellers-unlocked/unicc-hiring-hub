// Country name to ISO 3166-1 alpha-2 code mapping for flag API
const countryToCode: { [key: string]: string } = {
  "Afghanistan": "af",
  "Albania": "al",
  "Algeria": "dz",
  "Andorra": "ad",
  "Angola": "ao",
  "Argentina": "ar",
  "Armenia": "am",
  "Australia": "au",
  "Austria": "at",
  "Azerbaijan": "az",
  "Bahrain": "bh",
  "Bangladesh": "bd",
  "Belarus": "by",
  "Belgium": "be",
  "Brazil": "br",
  "Bulgaria": "bg",
  "Cambodia": "kh",
  "Cameroon": "cm",
  "Canada": "ca",
  "Chile": "cl",
  "China": "cn",
  "Colombia": "co",
  "Croatia": "hr",
  "Cyprus": "cy",
  "Czech Republic": "cz",
  "Denmark": "dk",
  "Ecuador": "ec",
  "Egypt": "eg",
  "Estonia": "ee",
  "Ethiopia": "et",
  "Finland": "fi",
  "France": "fr",
  "Georgia": "ge",
  "Germany": "de",
  "Ghana": "gh",
  "Greece": "gr",
  "Hungary": "hu",
  "Iceland": "is",
  "India": "in",
  "Indonesia": "id",
  "Iran": "ir",
  "Iraq": "iq",
  "Ireland": "ie",
  "Israel": "il",
  "Italy": "it",
  "Japan": "jp",
  "Jordan": "jo",
  "Kazakhstan": "kz",
  "Kenya": "ke",
  "Kuwait": "kw",
  "Latvia": "lv",
  "Lebanon": "lb",
  "Lithuania": "lt",
  "Luxembourg": "lu",
  "Malaysia": "my",
  "Malta": "mt",
  "Mexico": "mx",
  "Morocco": "ma",
  "Netherlands": "nl",
  "New Zealand": "nz",
  "Nigeria": "ng",
  "Norway": "no",
  "Pakistan": "pk",
  "Peru": "pe",
  "Philippines": "ph",
  "Poland": "pl",
  "Portugal": "pt",
  "Qatar": "qa",
  "Romania": "ro",
  "Russia": "ru",
  "Saudi Arabia": "sa",
  "Serbia": "rs",
  "Singapore": "sg",
  "Slovakia": "sk",
  "Slovenia": "si",
  "South Africa": "za",
  "South Korea": "kr",
  "Spain": "es",
  "Sri Lanka": "lk",
  "Sweden": "se",
  "Switzerland": "ch",
  "Thailand": "th",
  "Turkey": "tr",
  "Ukraine": "ua",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "United States": "us",
  "Uruguay": "uy",
  "Vietnam": "vn",
};

export const getCountryFlagUrl = (countryName: string): string => {
  if (!countryName) return "";
  
  // Normalize country name (remove extra spaces, handle common variations)
  const normalizedName = countryName.trim();
  const countryCode = countryToCode[normalizedName];
  
  if (countryCode) {
    return `https://flagcdn.com/24x18/${countryCode}.png`;
  }
  
  // Log for debugging
  console.log('Country code not found for:', normalizedName, 'Available countries:', Object.keys(countryToCode).slice(0, 10));
  return ""; // Return empty string if country not found
};

export const formatExperienceYears = (totalMonths: number): string => {
  if (totalMonths === 0) return "";
  
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  if (years === 0) {
    return months === 1 ? "1 month" : `${months} months`;
  } else if (months === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  } else {
    const yearText = years === 1 ? "1 year" : `${years} years`;
    const monthText = months === 1 ? "1 month" : `${months} months`;
    return `${yearText}, ${monthText}`;
  }
};

export const getAvailabilityInfo = (status: string) => {
  switch (status) {
    case "available":
      return {
        label: "Available for work",
        description: "Actively seeking new opportunities",
        color: "bg-green-500"
      };
    case "employed_open":
      return {
        label: "Employed but open",
        description: "Currently employed but open to new opportunities",
        color: "bg-yellow-500"
      };
    case "not_available":
      return {
        label: "Not available",
        description: "Not currently seeking new opportunities",
        color: "bg-red-500"
      };
    default:
      return {
        label: "Status unknown",
        description: "Availability status not specified",
        color: "bg-gray-500"
      };
  }
};