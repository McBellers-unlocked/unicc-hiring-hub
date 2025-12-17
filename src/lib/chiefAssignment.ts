// Utility to determine which Chief of Division should review a requisition

export interface ChiefInfo {
  name: string;
  email: string;
  division: string;
}

const CHIEF_ASSIGNMENTS: Record<string, ChiefInfo> = {
  'CS': {
    name: 'Tima Soni',
    email: 'soni@unicc.org',
    division: 'Cybersecurity (CS)'
  },
  'DS': {
    name: 'Anish Sethi',
    email: 'sethi@unicc.org',
    division: 'Digital Solutions (DS)'
  },
  'MS': {
    name: 'Milena Grecuccio',
    email: 'grecuccio@unicc.org',
    division: 'Management & Strategy (MS)'
  },
  'OP': {
    name: 'Milena Grecuccio',
    email: 'grecuccio@unicc.org',
    division: 'Operations (OP)'
  },
  'DD': {
    name: 'Marco Liuzzi',
    email: 'liuzzi@unicc.org',
    division: 'Digital Delivery (DD)'
  },
  'DO': {
    name: 'Sameer Chauhan',
    email: 'chauhan@unicc.org',
    division: 'Director (DO)'
  }
};

/**
 * Determines which Chief of Division should review a requisition based on its unit
 */
export function getAssignedChief(unitSectionDivision: string | null): ChiefInfo | null {
  if (!unitSectionDivision) return null;
  
  const upper = unitSectionDivision.toUpperCase();
  
  // Check for CS division first to avoid conflicts
  if (upper.includes('CSI') || upper.includes('CSO') || upper.includes('CSE') || 
      upper.includes('CSN') || upper.includes('CSS') || upper.includes('CSR') || 
      upper.includes('CISO') || upper.includes('CYBER') || upper.includes('CSA')) {
    return CHIEF_ASSIGNMENTS['CS'];
  }
  
  // Check for DD division (Digital Delivery)
  if (upper.includes('DD') || upper.includes('DDA') || upper.includes('DDC') || 
      upper.includes('DDD') || upper.includes('DDAI') || upper.includes('DDAM') ||
      upper.includes('DDES') || upper.includes('DDE') || upper.includes('DDHA') ||
      upper.includes('DDMS') || upper.includes('DDP') || upper.includes('DDPG') ||
      upper.includes('DDPM') || upper.includes('DDPO')) {
    return CHIEF_ASSIGNMENTS['DD'];
  }
  
  // Check for MS division
  if (upper.includes('MS') || upper.includes('MSHT') || upper.includes('MSL') ||
      upper.includes('MSB') || upper.includes('MSBP') || upper.includes('MSF') ||
      upper.includes('MSG') || upper.includes('MSH') || upper.includes('MSP')) {
    return CHIEF_ASSIGNMENTS['MS'];
  }
  
  // Check for OP division
  if (upper.includes('OP') && !upper.includes('DO')) {
    return CHIEF_ASSIGNMENTS['OP'];
  }
  
  // Check for DO division
  if (upper.includes('DO') || upper.includes('DOP') || upper.includes('DOE') ||
      upper.includes('DOD') || upper.includes('DBR')) {
    return CHIEF_ASSIGNMENTS['DO'];
  }
  
  // Check for DS division
  if (upper.includes('DS') || upper.includes('DSDP') || upper.includes('DSB') ||
      upper.includes('DSCS') || upper.includes('DSDW') || upper.includes('DSL') ||
      upper.includes('DSPS')) {
    return CHIEF_ASSIGNMENTS['DS'];
  }
  
  return null;
}

/**
 * Gets division code from unit name
 */
export function getDivisionCode(unitSectionDivision: string | null): string | null {
  const chief = getAssignedChief(unitSectionDivision);
  if (!chief) return null;
  
  // Extract division code from the chief's division string
  const match = chief.division.match(/\(([A-Z]+)\)/);
  return match ? match[1] : null;
}
