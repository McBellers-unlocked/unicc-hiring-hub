import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface University {
  name: string;
  alternative_names: string[];
  country: string;
}

// Parse university entry: "University Name (Abbreviation)" or "Name (Local Name)"
function parseUniversityEntry(entry: string, country: string): University | null {
  if (!entry || entry.length < 3) return null;
  
  // Remove leading numbers like "1. ", "12. ", etc.
  const cleaned = entry.replace(/^\d+\.\s*/, '').trim();
  if (!cleaned) return null;
  
  // Extract main name and any alternative names in parentheses
  const match = cleaned.match(/^([^(]+)(?:\s*\(([^)]+)\))?$/);
  if (!match) {
    return {
      name: cleaned,
      alternative_names: [],
      country
    };
  }
  
  const mainName = match[1].trim();
  const altName = match[2]?.trim();
  
  // Filter out short abbreviations (likely just acronyms)
  const alternativeNames: string[] = [];
  if (altName && altName.length > 3) {
    // Check if it's an abbreviation or actual alternative name
    if (!/^[A-Z]{2,5}$/.test(altName)) {
      alternativeNames.push(altName);
    }
  }
  
  return {
    name: mainName,
    alternative_names: alternativeNames,
    country
  };
}

// Parse the PDF text content to extract universities
function parseWHEDContent(content: string): University[] {
  const universities: University[] = [];
  const lines = content.split('\n');
  
  let currentCountry = '';
  const countryPatterns = [
    /^#\s*(\d+\.\s*)?(Afghan|Albanian|Algerian|Andorran|Angolan|Antiguan|Argentine|Armenian|Australian|Austrian|Azerbaijani|Bahamian|Bahraini|Bangladeshi|Barbadian|Belarusian|Belgian|Belizean|Beninese|Bhutanese|Bolivian|Bosnian|Botswanan|Brazilian|Bruneian|Bulgarian|Burkinabé|Burundian|Cabo Verdean|Cambodian|Cameroonian|Canadian|Central African|Chadian|Chilean|Chinese|Colombian|Comorian|Congolese|Costa Rican|Croatian|Cuban|Cypriot|Czech|Danish|Djiboutian|Dominican|Dutch|Ecuadorian|Egyptian|Emirati|Equatoguinean|Eritrean|Estonian|Ethiopian|Fijian|Finnish|French|Gabonese|Gambian|Georgian|German|Ghanaian|Greek|Grenadian|Guatemalan|Guinean|Guyanese|Haitian|Honduran|Hungarian|Icelandic|Indian|Indonesian|Iranian|Iraqi|Irish|Israeli|Italian|Ivorian|Jamaican|Japanese|Jordanian|Kazakh|Kenyan|Kiribati|Korean|Kuwaiti|Kyrgyz|Lao|Latvian|Lebanese|Lesotho|Liberian|Libyan|Liechtenstein|Lithuanian|Luxembourgian|Macedonian|Malagasy|Malawian|Malaysian|Maldivian|Malian|Maltese|Marshallese|Mauritanian|Mauritian|Mexican|Micronesian|Moldovan|Monacan|Mongolian|Montenegrin|Moroccan|Mozambican|Myanmar|Namibian|Nauruan|Nepalese|New Zealand|Nicaraguan|Nigerian|Nigerien|Norwegian|Omani|Pakistani|Palauan|Palestinian|Panamanian|Papua New Guinean|Paraguayan|Peruvian|Philippine|Polish|Portuguese|Qatari|Romanian|Russian|Rwandan|Saint Kitts|Saint Lucian|Saint Vincent|Salvadoran|Samoan|San Marinese|Sao Tomean|Saudi|Senegalese|Serbian|Seychellois|Sierra Leonean|Singaporean|Slovak|Slovenian|Solomon Islands|Somali|South African|South Korean|South Sudanese|Spanish|Sri Lankan|Sudanese|Surinamese|Swazi|Swedish|Swiss|Syrian|Tajik|Tanzanian|Thai|Timorese|Togolese|Tongan|Trinidadian|Tunisian|Turkish|Turkmen|Tuvaluan|Ugandan|Ukrainian|United Arab Emirates|United Kingdom|United States|Uruguayan|Uzbek|Vanuatuan|Vatican|Venezuelan|Vietnamese|Yemeni|Zambian|Zimbabwean)\s+Universities?/i,
    /^#\s*Universities\s+(?:in|of)\s+([A-Za-z\s]+)/i,
  ];
  
  // Country name mapping for detection
  const countryMap: Record<string, string> = {
    'afghan': 'Afghanistan',
    'albanian': 'Albania',
    'algerian': 'Algeria',
    'andorran': 'Andorra',
    'angolan': 'Angola',
    'antiguan': 'Antigua and Barbuda',
    'argentine': 'Argentina',
    'armenian': 'Armenia',
    'australian': 'Australia',
    'austrian': 'Austria',
    'azerbaijani': 'Azerbaijan',
    'bahamian': 'Bahamas',
    'bahraini': 'Bahrain',
    'bangladeshi': 'Bangladesh',
    'barbadian': 'Barbados',
    'belarusian': 'Belarus',
    'belgian': 'Belgium',
    'belizean': 'Belize',
    'beninese': 'Benin',
    'bhutanese': 'Bhutan',
    'bolivian': 'Bolivia',
    'bosnian': 'Bosnia and Herzegovina',
    'botswanan': 'Botswana',
    'brazilian': 'Brazil',
    'bruneian': 'Brunei',
    'bulgarian': 'Bulgaria',
    'burkinabé': 'Burkina Faso',
    'burundian': 'Burundi',
    'cabo verdean': 'Cabo Verde',
    'cambodian': 'Cambodia',
    'cameroonian': 'Cameroon',
    'canadian': 'Canada',
    'central african': 'Central African Republic',
    'chadian': 'Chad',
    'chilean': 'Chile',
    'chinese': 'China',
    'colombian': 'Colombia',
    'comorian': 'Comoros',
    'congolese': 'Republic of the Congo',
    'costa rican': 'Costa Rica',
    'croatian': 'Croatia',
    'cuban': 'Cuba',
    'cypriot': 'Cyprus',
    'czech': 'Czech Republic',
    'danish': 'Denmark',
    'djiboutian': 'Djibouti',
    'dominican': 'Dominican Republic',
    'dutch': 'Netherlands',
    'ecuadorian': 'Ecuador',
    'egyptian': 'Egypt',
    'emirati': 'United Arab Emirates',
    'equatoguinean': 'Equatorial Guinea',
    'eritrean': 'Eritrea',
    'estonian': 'Estonia',
    'ethiopian': 'Ethiopia',
    'fijian': 'Fiji',
    'finnish': 'Finland',
    'french': 'France',
    'gabonese': 'Gabon',
    'gambian': 'Gambia',
    'georgian': 'Georgia',
    'german': 'Germany',
    'ghanaian': 'Ghana',
    'greek': 'Greece',
    'grenadian': 'Grenada',
    'guatemalan': 'Guatemala',
    'guinean': 'Guinea',
    'guyanese': 'Guyana',
    'haitian': 'Haiti',
    'honduran': 'Honduras',
    'hungarian': 'Hungary',
    'icelandic': 'Iceland',
    'indian': 'India',
    'indonesian': 'Indonesia',
    'iranian': 'Iran',
    'iraqi': 'Iraq',
    'irish': 'Ireland',
    'israeli': 'Israel',
    'italian': 'Italy',
    'ivorian': 'Ivory Coast',
    'jamaican': 'Jamaica',
    'japanese': 'Japan',
    'jordanian': 'Jordan',
    'kazakh': 'Kazakhstan',
    'kenyan': 'Kenya',
    'kiribati': 'Kiribati',
    'korean': 'South Korea',
    'kuwaiti': 'Kuwait',
    'kyrgyz': 'Kyrgyzstan',
    'lao': 'Laos',
    'latvian': 'Latvia',
    'lebanese': 'Lebanon',
    'lesotho': 'Lesotho',
    'liberian': 'Liberia',
    'libyan': 'Libya',
    'liechtenstein': 'Liechtenstein',
    'lithuanian': 'Lithuania',
    'luxembourgian': 'Luxembourg',
    'macedonian': 'North Macedonia',
    'malagasy': 'Madagascar',
    'malawian': 'Malawi',
    'malaysian': 'Malaysia',
    'maldivian': 'Maldives',
    'malian': 'Mali',
    'maltese': 'Malta',
    'marshallese': 'Marshall Islands',
    'mauritanian': 'Mauritania',
    'mauritian': 'Mauritius',
    'mexican': 'Mexico',
    'micronesian': 'Micronesia',
    'moldovan': 'Moldova',
    'monacan': 'Monaco',
    'mongolian': 'Mongolia',
    'montenegrin': 'Montenegro',
    'moroccan': 'Morocco',
    'mozambican': 'Mozambique',
    'myanmar': 'Myanmar',
    'namibian': 'Namibia',
    'nauruan': 'Nauru',
    'nepalese': 'Nepal',
    'new zealand': 'New Zealand',
    'nicaraguan': 'Nicaragua',
    'nigerian': 'Nigeria',
    'nigerien': 'Niger',
    'norwegian': 'Norway',
    'omani': 'Oman',
    'pakistani': 'Pakistan',
    'palauan': 'Palau',
    'palestinian': 'Palestine',
    'panamanian': 'Panama',
    'papua new guinean': 'Papua New Guinea',
    'paraguayan': 'Paraguay',
    'peruvian': 'Peru',
    'philippine': 'Philippines',
    'polish': 'Poland',
    'portuguese': 'Portugal',
    'qatari': 'Qatar',
    'romanian': 'Romania',
    'russian': 'Russia',
    'rwandan': 'Rwanda',
    'saint kitts': 'Saint Kitts and Nevis',
    'saint lucian': 'Saint Lucia',
    'saint vincent': 'Saint Vincent and the Grenadines',
    'salvadoran': 'El Salvador',
    'samoan': 'Samoa',
    'san marinese': 'San Marino',
    'sao tomean': 'Sao Tome and Principe',
    'saudi': 'Saudi Arabia',
    'senegalese': 'Senegal',
    'serbian': 'Serbia',
    'seychellois': 'Seychelles',
    'sierra leonean': 'Sierra Leone',
    'singaporean': 'Singapore',
    'slovak': 'Slovakia',
    'slovenian': 'Slovenia',
    'solomon islands': 'Solomon Islands',
    'somali': 'Somalia',
    'south african': 'South Africa',
    'south korean': 'South Korea',
    'south sudanese': 'South Sudan',
    'spanish': 'Spain',
    'sri lankan': 'Sri Lanka',
    'sudanese': 'Sudan',
    'surinamese': 'Suriname',
    'swazi': 'Eswatini',
    'swedish': 'Sweden',
    'swiss': 'Switzerland',
    'syrian': 'Syria',
    'tajik': 'Tajikistan',
    'tanzanian': 'Tanzania',
    'thai': 'Thailand',
    'timorese': 'Timor-Leste',
    'togolese': 'Togo',
    'tongan': 'Tonga',
    'trinidadian': 'Trinidad and Tobago',
    'tunisian': 'Tunisia',
    'turkish': 'Turkey',
    'turkmen': 'Turkmenistan',
    'tuvaluan': 'Tuvalu',
    'ugandan': 'Uganda',
    'ukrainian': 'Ukraine',
    'united arab emirates': 'United Arab Emirates',
    'united kingdom': 'United Kingdom',
    'united states': 'United States',
    'uruguayan': 'Uruguay',
    'uzbek': 'Uzbekistan',
    'vanuatuan': 'Vanuatu',
    'vatican': 'Vatican City',
    'venezuelan': 'Venezuela',
    'vietnamese': 'Vietnam',
    'yemeni': 'Yemen',
    'zambian': 'Zambia',
    'zimbabwean': 'Zimbabwe',
  };
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and page numbers
    if (!trimmed || /^Página \d+ de \d+$/.test(trimmed)) continue;
    if (trimmed.startsWith('###') || trimmed.startsWith('WORLD HIGHER EDUCATION')) continue;
    
    // Check for country header
    for (const pattern of countryPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const countryWord = match[1] || match[2] || '';
        const normalized = countryWord.toLowerCase().trim();
        for (const [key, country] of Object.entries(countryMap)) {
          if (normalized.includes(key)) {
            currentCountry = country;
            break;
          }
        }
        break;
      }
    }
    
    // Check for numbered university entry
    const uniMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (uniMatch && currentCountry) {
      const uni = parseUniversityEntry(uniMatch[2], currentCountry);
      if (uni) {
        universities.push(uni);
      }
    }
  }
  
  return universities;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, content } = await req.json();

    if (action === 'parse') {
      // Parse the provided content
      console.log('Parsing WHED content...');
      const universities = parseWHEDContent(content);
      console.log(`Parsed ${universities.length} universities`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: universities.length,
          universities: universities.slice(0, 50), // Return preview of first 50
          countries: [...new Set(universities.map(u => u.country))].sort()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'import') {
      // Parse and import universities
      console.log('Starting WHED import...');
      const universities = parseWHEDContent(content);
      console.log(`Parsed ${universities.length} universities to import`);

      if (universities.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No universities found in content' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Clear existing data first
      const { error: deleteError } = await supabase
        .from('whed_universities')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('Error clearing existing data:', deleteError);
      }

      // Insert in batches of 500
      const batchSize = 500;
      let inserted = 0;
      let errors: string[] = [];

      for (let i = 0; i < universities.length; i += batchSize) {
        const batch = universities.slice(i, i + batchSize);
        const { error } = await supabase
          .from('whed_universities')
          .insert(batch.map(u => ({
            name: u.name,
            alternative_names: u.alternative_names,
            country: u.country,
            is_active: true
          })));

        if (error) {
          console.error(`Error inserting batch ${i / batchSize}:`, error);
          errors.push(error.message);
        } else {
          inserted += batch.length;
        }
      }

      console.log(`Import complete. Inserted ${inserted} universities`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          inserted,
          total: universities.length,
          countries: [...new Set(universities.map(u => u.country))].length,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "parse" or "import"' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
