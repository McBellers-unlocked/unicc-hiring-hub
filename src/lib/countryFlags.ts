// Country code to flag emoji mapping
const countryFlags: { [key: string]: string } = {
  "Afghanistan": "🇦🇫",
  "Albania": "🇦🇱",
  "Algeria": "🇩🇿",
  "Andorra": "🇦🇩",
  "Angola": "🇦🇴",
  "Argentina": "🇦🇷",
  "Armenia": "🇦🇲",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Azerbaijan": "🇦🇿",
  "Bahrain": "🇧🇭",
  "Bangladesh": "🇧🇩",
  "Belarus": "🇧🇾",
  "Belgium": "🇧🇪",
  "Brazil": "🇧🇷",
  "Bulgaria": "🇧🇬",
  "Cambodia": "🇰🇭",
  "Cameroon": "🇨🇲",
  "Canada": "🇨🇦",
  "Chile": "🇨🇱",
  "China": "🇨🇳",
  "Colombia": "🇨🇴",
  "Croatia": "🇭🇷",
  "Cyprus": "🇨🇾",
  "Czech Republic": "🇨🇿",
  "Denmark": "🇩🇰",
  "Ecuador": "🇪🇨",
  "Egypt": "🇪🇬",
  "Estonia": "🇪🇪",
  "Ethiopia": "🇪🇹",
  "Finland": "🇫🇮",
  "France": "🇫🇷",
  "Georgia": "🇬🇪",
  "Germany": "🇩🇪",
  "Ghana": "🇬🇭",
  "Greece": "🇬🇷",
  "Hungary": "🇭🇺",
  "Iceland": "🇮🇸",
  "India": "🇮🇳",
  "Indonesia": "🇮🇩",
  "Iran": "🇮🇷",
  "Iraq": "🇮🇶",
  "Ireland": "🇮🇪",
  "Israel": "🇮🇱",
  "Italy": "🇮🇹",
  "Japan": "🇯🇵",
  "Jordan": "🇯🇴",
  "Kazakhstan": "🇰🇿",
  "Kenya": "🇰🇪",
  "Kuwait": "🇰🇼",
  "Latvia": "🇱🇻",
  "Lebanon": "🇱🇧",
  "Lithuania": "🇱🇹",
  "Luxembourg": "🇱🇺",
  "Malaysia": "🇲🇾",
  "Malta": "🇲🇹",
  "Mexico": "🇲🇽",
  "Morocco": "🇲🇦",
  "Netherlands": "🇳🇱",
  "New Zealand": "🇳🇿",
  "Nigeria": "🇳🇬",
  "Norway": "🇳🇴",
  "Pakistan": "🇵🇰",
  "Peru": "🇵🇪",
  "Philippines": "🇵🇭",
  "Poland": "🇵🇱",
  "Portugal": "🇵🇹",
  "Qatar": "🇶🇦",
  "Romania": "🇷🇴",
  "Russia": "🇷🇺",
  "Saudi Arabia": "🇸🇦",
  "Serbia": "🇷🇸",
  "Singapore": "🇸🇬",
  "Slovakia": "🇸🇰",
  "Slovenia": "🇸🇮",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Spain": "🇪🇸",
  "Sri Lanka": "🇱🇰",
  "Sweden": "🇸🇪",
  "Switzerland": "🇨🇭",
  "Thailand": "🇹🇭",
  "Turkey": "🇹🇷",
  "Ukraine": "🇺🇦",
  "United Arab Emirates": "🇦🇪",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  "Uruguay": "🇺🇾",
  "Vietnam": "🇻🇳",
};

export const getCountryFlag = (countryName: string): string => {
  return countryFlags[countryName] || "🌍";
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