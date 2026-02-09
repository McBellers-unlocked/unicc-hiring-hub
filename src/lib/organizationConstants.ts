// Shared organizational constants used across Initial Request and Procurement TOR forms

export const LOCATIONS = [
  'Valencia',
  'Brindisi',
  'New York',
  'Geneva',
  'Rome',
  'Remote',
];

export const DIVISIONS: Record<string, string> = {
  "CS": "Cybersecurity division (CS)",
  "DD": "Digital Delivery division (DD)",
  "DS": "Digital Solutions Centre (DS)",
  "DO": "Director (DO)",
  "MS": "Management and Strategy (MS)",
  "OP": "Operations (OP)"
};

export const DIVISION_UNITS: Record<string, string[]> = {
  "CS": [
    "CISO Section (CISO)",
    "Investigative Support Unit (CSI)",
    "Cybersecurity Solutions & Strategy Unit (CSS)",
    "Cybersecurity Assurance & Architecture Section (CSA)",
    "Cybersecurity Engineering Unit (CSE)",
    "Cybersecurity Networking Unit (CSN)",
    "Cybersecurity Operations Section (CSO)",
    "Organizational Resilience Unit (CSR)"
  ],
  "DD": [
    "Data and Artificial Intelligence Section (DDA)",
    "Digital Development Center Section (DDC)",
    "Digital Business Solutions Section (DDD)",
    "Artificial Intelligence and Machine Learning Unit (DDAI)",
    "Data Management Unit (DDAM)",
    "Enterprise Service Management Unit (DDES)",
    "Enterprise Solutions Section (DDE)",
    "Hyperautomation Solutions Unit (DDHA)",
    "MS Dynamics Unit (DDMS)",
    "Projects & Programmes Section (DDP)",
    "Programme Portfolio Unit (DDPG)",
    "Project Portfolio Unit (DDPM)",
    "Governance PMO Unit (DDPO)"
  ],
  "DS": [
    "Digital Products Unit (DSDP)",
    "Business Solutions Unit (DSB)",
    "Digital Customer Services Unit (DSCS)",
    "Unite Digital Workspace Services Unit (DSDW)",
    "Learning Services Unit (DSL)",
    "Digital Public Solutions Unit (DSPS)"
  ],
  "DO": [
    "UNICC Directorate (DOD)",
    "External Relations and Strategic Partnerships Section (DOE)",
    "Digital ID Programme (DOP)",
    "Business Relationship Management Section (DBR)"
  ],
  "MS": [
    "Policy (Legal) Unit (MSL)",
    "Business Control Section (MSB)",
    "Process and Change Unit (MSBP)",
    "Finance and Accounting Section (MSF)",
    "GRC & QA Unit (MSG)",
    "Human Resources Section (MSH)",
    "Talent Unit (MSHT)",
    "Procurement Section (MSP)"
  ],
  "OP": [
    "Infrastructure and Platform Operations Unit (OPBO)",
    "Customer IT Resilience Team (OPBR)",
    "Data Center Support Unit (OPBS)",
    "Customer Services Centre (OPC)",
    "Service Desk Unit (OPCS)",
    "Cloud Services Section (OPD)",
    "Cloud Operations and Platform Service Unit (OPDA)",
    "Digital Workplace Service Unit (OPDM)",
    "Infrastructure and Operations Business Section (OPM)",
    "Service Excellence Unit (OPMX)",
    "On-premise Services (OPO)",
    "Platform Architecture and Service Automation Unit (OPOA)",
    "Oracle Unit (OPOU)",
    "SAP Unit (OPOS)"
  ]
};

export const FUNDING_OPTIONS = [
  'This request is totally funded by a current agreement with client',
  'This request is critical for service continuity (non-chargeable)',
  'This request is partially funded by a current agreement',
  'This request will be funded by an upcoming agreement, not yet executed',
];

export const ON_CALL_OPTIONS = [
  'One week per month',
  'May be required on an exceptional basis',
  'Not required',
];
