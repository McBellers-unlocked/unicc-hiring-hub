import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { OrganizationChart as OrgChartComponent } from '@/components/org-chart/OrganizationChart';
import { OrgChartControls } from '@/components/org-chart/OrgChartControls';
import { 
  buildOrgTree, 
  filterTreeByDivision, 
  filterTreeByPersonnelType, 
  limitTreeDepth,
  getTreeStats,
  stackBottomLayerReports,
  hasReportingLine,
  isAffiliatePersonnel,
  UserData
} from '@/lib/orgChartUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Layers, Building2, TrendingUp, Network } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface UserbaseOrgRow {
  id: string;
  full_name: string | null;
  samsaran_email_address: string | null;
  gsm_email_address: string | null;
  job_title: string | null;
  position_name: string | null;
  division: string | null;
  unit: string | null;
  current_grade: string | null;
  worker_type: string | null;
  category: string | null;
  line_manager: string | null;
  official_duty_station: string | null;
  office_location: string | null;
}

const cleanValue = (value?: string | null) => {
  const cleaned = value?.trim();
  return cleaned && cleaned !== '-' ? cleaned : null;
};

const mapUserbaseRowToOrgUser = (row: UserbaseOrgRow): UserData => ({
  id: row.id,
  name: cleanValue(row.full_name) ?? cleanValue(row.samsaran_email_address) ?? cleanValue(row.gsm_email_address) ?? 'Unknown',
  email: cleanValue(row.samsaran_email_address) ?? cleanValue(row.gsm_email_address) ?? '',
  job_title: cleanValue(row.job_title) ?? cleanValue(row.position_name),
  division: cleanValue(row.division) ?? cleanValue(row.unit),
  current_grade: cleanValue(row.current_grade),
  personnel_type: cleanValue(row.worker_type) ?? cleanValue(row.category),
  affiliate_type: cleanValue(row.category),
  line_manager: cleanValue(row.line_manager),
  duty_station: cleanValue(row.official_duty_station) ?? cleanValue(row.office_location),
});

const isSameerChauhan = (user: UserData) =>
  user.email?.toLowerCase().trim() === 'chauhan@unicc.org' || /sameer/i.test(user.name) && /chauhan/i.test(user.name);

export default function OrganizationChartPage() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDepth, setSelectedDepth] = useState(99);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [zoom, setZoom] = useState(0.7);

  // Fetch userbase records with line_manager data
  const { data: users, isLoading } = useQuery({
    queryKey: ['org-chart-users-clean'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_clean')
        .select('id, full_name, samsaran_email_address, gsm_email_address, job_title, position_name, division, unit, current_grade, worker_type, category, line_manager, official_duty_station, office_location')
        .not('full_name', 'is', null)
        .order('full_name');
      
      if (error) throw error;
      return (data as UserbaseOrgRow[]).map(mapUserbaseRowToOrgUser);
    },
  });

  // Build and filter org tree
  const { orgTree, stats, divisions, personnelTypes } = useMemo(() => {
    if (!users) return { orgTree: [], stats: null, divisions: [], personnelTypes: [] };

    const chartUsers = users
      .filter((user) => hasReportingLine(user.line_manager) || isSameerChauhan(user))
      .map((user) => {
        const isAffiliate = isAffiliatePersonnel(user);
        return {
          ...user,
          current_grade: isAffiliate ? null : user.current_grade,
          affiliate_type: isAffiliate ? user.affiliate_type || user.personnel_type || 'Affiliate' : user.affiliate_type,
        };
      });

    // Get unique divisions and personnel types
    const divSet = new Set<string>();
    const typeSet = new Set<string>();
    
    chartUsers.forEach(u => {
      if (u.division) divSet.add(u.division);
      if (u.personnel_type) typeSet.add(u.personnel_type);
    });

    const visibleUsers = selectedDivision === 'all'
      ? chartUsers
      : chartUsers.filter((user) => isSameerChauhan(user) || user.division === selectedDivision);

    // Build tree
    let tree = buildOrgTree(visibleUsers, {
      attachDisconnectedToRoot: selectedDivision !== 'all',
    });
    
    // Apply filters
    tree = filterTreeByDivision(tree, selectedDivision);
    tree = filterTreeByPersonnelType(tree, selectedTypes);
    tree = limitTreeDepth(tree, selectedDepth);
    tree = stackBottomLayerReports(tree);
    
    const treeStats = getTreeStats(tree);

    return {
      orgTree: tree,
      stats: treeStats,
      divisions: Array.from(divSet).sort(),
      personnelTypes: Array.from(typeSet).sort(),
    };
  }, [users, selectedDivision, selectedTypes, selectedDepth]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3));
  const handleReset = () => setZoom(0.7);

  const handleExport = async () => {
    if (!chartRef.current) return;
    
    try {
      const dataUrl = await toPng(chartRef.current, { 
        backgroundColor: '#ffffff',
        quality: 1,
      });
      
      const link = document.createElement('a');
      link.download = 'uniqtalent-org-chart.png';
      link.href = dataUrl;
      link.click();
      
      toast.success('Organization chart exported as PNG');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export chart');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8 text-primary" />
            Organization Chart
          </h1>
          <p className="text-muted-foreground mt-1">
            Interactive visualization of the UNICC organizational structure
          </p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalNodes}</div>
                    <div className="text-xs text-muted-foreground">Total People</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.maxDepth}</div>
                    <div className="text-xs text-muted-foreground">Max Depth</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.managersCount}</div>
                    <div className="text-xs text-muted-foreground">Managers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.averageSpanOfControl}</div>
                    <div className="text-xs text-muted-foreground">Avg Span of Control</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-cyan-500" />
                  <div>
                    <div className="text-2xl font-bold">{Object.keys(stats.divisionCounts).length}</div>
                    <div className="text-xs text-muted-foreground">Divisions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <OrgChartControls
          divisions={divisions}
          selectedDivision={selectedDivision}
          onDivisionChange={setSelectedDivision}
          personnelTypes={personnelTypes}
          selectedTypes={selectedTypes}
          onTypesChange={setSelectedTypes}
          maxDepth={stats?.maxDepth || 5}
          selectedDepth={selectedDepth}
          onDepthChange={setSelectedDepth}
          orientation={orientation}
          onOrientationChange={setOrientation}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onExport={handleExport}
        />

        {/* Chart */}
        <div ref={chartRef} className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="h-[650px] w-full overflow-hidden rounded-lg bg-background">
                <OrgChartComponent 
                  data={orgTree} 
                  orientation={orientation}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Division breakdown */}
        {stats && (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Division</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.divisionCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([div, count]) => (
                      <div key={div} className="flex items-center justify-between">
                        <span className="text-sm">{div}</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${(count / stats.totalNodes) * 200}px` }}
                          />
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Personnel Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.typeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{type}</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 bg-secondary rounded-full"
                            style={{ width: `${(count / stats.totalNodes) * 200}px` }}
                          />
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
