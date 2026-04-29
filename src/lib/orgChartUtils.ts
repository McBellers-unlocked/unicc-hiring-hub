// Utility functions for building and transforming organizational chart data

export interface OrgNode {
  name: string;
  attributes: {
    id: string;
    sourceName?: string;
    title: string;
    division: string;
    grade: string;
    personnelType: string;
    affiliateType?: string;
    isAffiliate?: boolean;
    email: string;
    dutyStation?: string;
    directReports: number;
    isStack?: boolean;
    hasManagees?: boolean;
  };
  children: OrgNode[];
  stackMembers?: OrgNode[];
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  job_title?: string | null;
  division?: string | null;
  current_grade?: string | null;
  personnel_type?: string | null;
  affiliate_type?: string | null;
  line_manager?: string | null;
  duty_station?: string | null;
  has_managees?: boolean;
}

const TITLE_WORDS = new Set(['mr', 'ms', 'mrs', 'miss', 'dr', 'prof', 'sir', 'madam']);

export const hasReportingLine = (manager?: string | null): boolean => {
  const cleaned = manager?.trim();
  return !!cleaned && cleaned !== '-';
};

export const isAffiliatePersonnel = (user: Pick<UserData, 'personnel_type' | 'affiliate_type'>): boolean => {
  const type = `${user.personnel_type ?? ''} ${user.affiliate_type ?? ''}`.toLowerCase();
  return type.includes('affiliate') || ['ic', 'intern', 'unv', 'jpo'].some((label) => type.split(/\s+/).includes(label));
};

const formatNameToken = (token: string, forceUppercase = false): string => {
  if (!token) return token;
  if (forceUppercase) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
};

export const formatDisplayName = (name: string): string => {
  if (!name.includes(',')) return name.trim();

  const [lastName, rest] = name.split(',', 2);
  const firstTokens = tokenizeName(rest || '').map((token) => formatNameToken(token));
  const lastTokens = tokenizeName(lastName || '').map((token) => formatNameToken(token, true));
  const formatted = [...firstTokens, ...lastTokens].join(' ').trim();
  return formatted || name.trim();
};

const tokenizeName = (name: string): string[] =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s,-]/g, ' ')
    .split(/[\s,-]+/)
    .map((part) => part.trim())
    .filter((part) => part && !TITLE_WORDS.has(part));

const getNameKeys = (name: string): string[] => {
  const exact = name.toLowerCase().trim();
  const keys = new Set<string>([exact]);
  const tokens = tokenizeName(name);

  if (tokens.length) {
    keys.add(tokens.join(' '));
    keys.add([...tokens].sort().join(' '));
  }

  if (name.includes(',')) {
    const [lastName, rest] = name.split(',', 2);
    const reorderedTokens = [...tokenizeName(rest || ''), ...tokenizeName(lastName || '')];
    if (reorderedTokens.length) {
      keys.add(reorderedTokens.join(' '));
      keys.add([...reorderedTokens].sort().join(' '));
    }
  }

  return Array.from(keys).filter(Boolean);
};

const getPrimaryNameKey = (name: string): string => getNameKeys(name)[0] || name.toLowerCase().trim();

const findSameerChauhanKey = (users: UserData[], userKeys: Map<string, string>): string | null => {
  const sameer = users.find((user) => {
    const email = user.email?.toLowerCase().trim();
    const nameKeys = getNameKeys(user.name);
    return email === 'chauhan@unicc.org' || nameKeys.includes('sameer chauhan') || nameKeys.includes('chauhan sameer');
  });

  return sameer ? userKeys.get(sameer.id) ?? null : null;
};


export function markUsersWithManagees(users: UserData[]): UserData[] {
  const managerKeys = new Set<string>();

  users.forEach((user) => {
    if (hasReportingLine(user.line_manager)) {
      getNameKeys(user.line_manager).forEach((key) => managerKeys.add(key));
    }
  });

  return users.map((user) => ({
    ...user,
    has_managees: getNameKeys(user.name).some((key) => managerKeys.has(key)),
  }));
}

/**
 * Build a hierarchical org tree from flat user data
 * Uses line_manager field to establish parent-child relationships
 */
export function buildOrgTree(
  users: UserData[],
  options: { attachDisconnectedToRoot?: boolean } = {}
): OrgNode[] {
  // Create a map for quick lookup by name (normalized)
  const nameToNodeMap = new Map<string, OrgNode>();
  const userPrimaryKeys = new Map<string, string>();
  
  // First pass: create all nodes and add to map
  users.forEach(user => {
    const normalizedName = getPrimaryNameKey(user.name);
    const isAffiliate = isAffiliatePersonnel(user);
    userPrimaryKeys.set(user.id, normalizedName);
    
    const node: OrgNode = {
      name: formatDisplayName(user.name),
      attributes: {
        id: user.id,
        sourceName: user.name,
        title: user.job_title || 'No title',
        division: user.division || 'Unknown',
        grade: isAffiliate ? '' : user.current_grade || '',
        personnelType: user.personnel_type || user.affiliate_type || 'Staff',
        affiliateType: user.affiliate_type || undefined,
        isAffiliate,
        email: user.email,
        dutyStation: user.duty_station || undefined,
        directReports: 0,
        hasManagees: user.has_managees || false,
      },
      children: [],
    };
    
    getNameKeys(user.name).forEach((key) => nameToNodeMap.set(key, node));
  });
  
  // Track root nodes (users with no manager or manager not in dataset)
  const rootNodes: OrgNode[] = [];
  const childNodes = new Set<string>();
  
  // Second pass: establish parent-child relationships
  users.forEach(user => {
    const normalizedName = userPrimaryKeys.get(user.id) ?? getPrimaryNameKey(user.name);
    const node = nameToNodeMap.get(normalizedName);
    
    if (!node) return;
    
    if (hasReportingLine(user.line_manager)) {
      const managerNode = getNameKeys(user.line_manager)
        .map((key) => nameToNodeMap.get(key))
        .find(Boolean);
      
      if (managerNode) {
        managerNode.children.push(node);
        managerNode.attributes.directReports++;
        childNodes.add(normalizedName);
      } else {
        // Manager not in dataset - this is a root node
        rootNodes.push(node);
      }
    } else {
      // No manager - this is a root node
      rootNodes.push(node);
    }
  });
  
  const markManageeStatus = (node: OrgNode) => {
    node.attributes.hasManagees = node.attributes.hasManagees || node.children.length > 0;
    node.children.forEach(markManageeStatus);
  };

  // Sort children alphabetically at each level
  const sortChildren = (node: OrgNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortChildren);
  };
  
  rootNodes.forEach(markManageeStatus);
  rootNodes.forEach(sortChildren);
  rootNodes.sort((a, b) => a.name.localeCompare(b.name));

  const sameerKey = findSameerChauhanKey(users, userPrimaryKeys);
  const sameerRoot = sameerKey ? nameToNodeMap.get(sameerKey) : null;

  if (sameerRoot) {
    const reachable = new Set<string>();
    const markReachable = (node: OrgNode) => {
      reachable.add(node.attributes.id);
      node.children.forEach(markReachable);
    };
    markReachable(sameerRoot);

    if (options.attachDisconnectedToRoot) {
      rootNodes
        .filter((node) => node.attributes.id !== sameerRoot.attributes.id && !reachable.has(node.attributes.id))
        .forEach((node) => {
          sameerRoot.children.push(node);
          markReachable(node);
        });
    }

    sameerRoot.attributes.directReports = sameerRoot.children.length;
    sortChildren(sameerRoot);
    return [sameerRoot];
  }
  
  return rootNodes;
}

const createLeafStackNode = (parent: OrgNode, leafChildren: OrgNode[]): OrgNode => ({
  name: `${leafChildren.length} team members`,
  attributes: {
    id: `${parent.attributes.id}-leaf-stack`,
    title: 'Bottom-layer direct reports',
    division: parent.attributes.division,
    grade: '',
    personnelType: 'Group',
    email: '',
    directReports: leafChildren.length,
    isStack: true,
  },
  children: [],
  stackMembers: leafChildren,
});

export function stackBottomLayerReports(nodes: OrgNode[], threshold = 3): OrgNode[] {
  const transformNode = (node: OrgNode): OrgNode => {
    const transformedChildren = node.children.map(transformNode);
    const leafChildren = transformedChildren.filter(
      (child) => child.children.length === 0 && !child.attributes.isStack && !child.attributes.hasManagees
    );

    if (leafChildren.length > threshold) {
      const nonLeafChildren = transformedChildren.filter((child) => child.children.length > 0 || child.attributes.isStack);
      const children = [...nonLeafChildren, createLeafStackNode(node, leafChildren)];

      return {
        ...node,
        attributes: {
          ...node.attributes,
          directReports: children.reduce((total, child) => total + (child.attributes.isStack ? child.attributes.directReports : 1), 0),
        },
        children,
      };
    }

    return {
      ...node,
      attributes: {
        ...node.attributes,
        directReports: transformedChildren.length,
      },
      children: transformedChildren,
    };
  };

  return nodes.map(transformNode);
}

/**
 * Filter the org tree by division
 */
export function filterTreeByDivision(nodes: OrgNode[], division: string): OrgNode[] {
  if (!division || division === 'all') return nodes;
  
  const filterNode = (node: OrgNode): OrgNode | null => {
    const isRootAnchor = node.attributes.email?.toLowerCase().trim() === 'chauhan@unicc.org';
    const nodeMatches = isRootAnchor || node.attributes.division === division;
    
    // Recursively filter children
    const filteredChildren = node.children
      .map(filterNode)
      .filter((n): n is OrgNode => n !== null);
    
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        attributes: {
          ...node.attributes,
          directReports: filteredChildren.length,
        },
        children: filteredChildren,
      };
    }
    
    return null;
  };
  
  return nodes.map(filterNode).filter((n): n is OrgNode => n !== null);
}

/**
 * Filter the org tree by personnel type
 */
export function filterTreeByPersonnelType(nodes: OrgNode[], types: string[]): OrgNode[] {
  if (!types.length) return nodes;
  
  const filterNode = (node: OrgNode): OrgNode | null => {
    const nodeMatches = types.includes(node.attributes.personnelType);
    
    const filteredChildren = node.children
      .map(filterNode)
      .filter((n): n is OrgNode => n !== null);
    
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        attributes: {
          ...node.attributes,
          directReports: filteredChildren.length,
        },
        children: filteredChildren,
      };
    }
    
    return null;
  };
  
  return nodes.map(filterNode).filter((n): n is OrgNode => n !== null);
}

/**
 * Limit tree depth
 */
export function limitTreeDepth(nodes: OrgNode[], maxDepth: number, currentDepth = 1): OrgNode[] {
  if (currentDepth >= maxDepth) {
    return nodes.map(node => ({
      ...node,
      attributes: {
        ...node.attributes,
        directReports: 0,
        hasManagees: node.attributes.hasManagees || node.children.length > 0,
      },
      children: [],
    }));
  }
  
  return nodes.map(node => {
    const children = limitTreeDepth(node.children, maxDepth, currentDepth + 1);
    return {
      ...node,
      attributes: {
        ...node.attributes,
        directReports: children.length,
      },
      children,
    };
  });
}

/**
 * Find a specific node by ID and return its subtree
 */
export function findNodeById(nodes: OrgNode[], id: string): OrgNode | null {
  for (const node of nodes) {
    if (node.attributes.id === id) {
      return node;
    }
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * Get statistics about the org tree
 */
export function getTreeStats(nodes: OrgNode[]) {
  let totalNodes = 0;
  let maxDepth = 0;
  let managersCount = 0;
  const divisionCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  
  const countPerson = (node: OrgNode) => {
    totalNodes++;

    const div = node.attributes.division;
    divisionCounts[div] = (divisionCounts[div] || 0) + 1;

    const type = node.attributes.personnelType;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  };

  const traverse = (nodeList: OrgNode[], depth: number) => {
    nodeList.forEach(node => {
      maxDepth = Math.max(maxDepth, depth);

      if (node.attributes.isStack) {
        node.stackMembers?.forEach(countPerson);
        return;
      }

      countPerson(node);
      
      if (node.children.length > 0) {
        managersCount++;
      }
      
      traverse(node.children, depth + 1);
    });
  };
  
  traverse(nodes, 1);
  
  return {
    totalNodes,
    maxDepth,
    managersCount,
    divisionCounts,
    typeCounts,
    averageSpanOfControl: managersCount > 0 
      ? ((totalNodes - nodes.length) / managersCount).toFixed(1) 
      : '0',
  };
}

/**
 * Get color for personnel type
 */
export function getPersonnelTypeColor(type: string): { bg: string; border: string; text: string } {
  switch (type) {
    case 'Staff':
      return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' };
    case 'IC':
      return { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700' };
    case 'Intern':
      return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700' };
    case 'UNV':
      return { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700' };
    case 'JPO':
      return { bg: 'bg-cyan-50', border: 'border-cyan-500', text: 'text-cyan-700' };
    case 'Affiliate':
      return { bg: 'bg-muted', border: 'border-primary/50', text: 'text-primary' };
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-700' };
  }
}

/**
 * Get division color
 */
export function getDivisionColor(division: string): string {
  const colors: Record<string, string> = {
    'CS': 'hsl(220, 90%, 56%)',
    'DS': 'hsl(280, 80%, 55%)',
    'OD': 'hsl(340, 82%, 52%)',
    'BS': 'hsl(45, 93%, 47%)',
    'TS': 'hsl(160, 84%, 39%)',
    'OICT': 'hsl(200, 85%, 45%)',
  };
  return colors[division] || 'hsl(220, 14%, 50%)';
}
