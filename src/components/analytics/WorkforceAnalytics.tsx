import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkforceSnapshot } from './WorkforceSnapshot';
import { WorkforceComposition, DivisionGenderData } from './WorkforceComposition';
import { HiringPipeline, PipelineStage, PipelineRequisition } from './HiringPipeline';
import { WorkforceForecasts } from './WorkforceForecasts';
import { AnalyticsFilterState } from './AnalyticsFilters';
import { Separator } from '@/components/ui/separator';

interface WorkforceAnalyticsProps {
  filters: AnalyticsFilterState;
}

// Map requisition status to pipeline stage
const mapStatusToStage = (status: string): string => {
  switch (status) {
    case 'draft':
    case 'submitted':
    case 'initial_request_approved':
      return 'Initial Request';
    case 'hr_review':
    case 'hr_reviewed':
    case 'chief_hr_review':
      return 'PD Review';
    case 'chief_of_division_review':
    case 'hiring_manager_review':
    case 'deputy_director_review':
    case 'director_review':
    case 'final_review':
      return 'Selection';
    case 'converted':
      return 'Offer';
    case 'completed':
      return 'Onboarding';
    default:
      return 'Initial Request';
  }
};

export const WorkforceAnalytics: React.FC<WorkforceAnalyticsProps> = ({ filters }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [workforceData, setWorkforceData] = useState<{
    division: string;
    gender: string;
    count: number;
  }[]>([]);
  const [requisitionsData, setRequisitionsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch workforce data by division and gender
        let workforceQuery = supabase
          .from('users')
          .select('division, gender')
          .not('division', 'is', null);

        if (filters.division) {
          workforceQuery = workforceQuery.eq('division', filters.division);
        }

        const { data: workforce, error: workforceError } = await workforceQuery;
        if (workforceError) throw workforceError;

        // Aggregate workforce data
        const aggregated: Record<string, Record<string, number>> = {};
        (workforce || []).forEach((row) => {
          const div = row.division || 'Unknown';
          const gen = row.gender || 'Unknown';
          if (!aggregated[div]) aggregated[div] = {};
          aggregated[div][gen] = (aggregated[div][gen] || 0) + 1;
        });

        const workforceResult = Object.entries(aggregated).flatMap(([division, genders]) =>
          Object.entries(genders).map(([gender, count]) => ({
            division,
            gender,
            count,
          }))
        );
        setWorkforceData(workforceResult);

        // Fetch requisitions for pipeline
        let reqQuery = supabase
          .from('job_requisitions')
          .select(`
            id,
            reference_number,
            unit_section_division,
            position_title,
            status,
            positions_available,
            created_at,
            start_date,
            created_by,
            users:created_by (name)
          `)
          .neq('status', 'draft');

        if (filters.division) {
          reqQuery = reqQuery.ilike('unit_section_division', `%${filters.division}%`);
        }

        if (filters.grade) {
          reqQuery = reqQuery.eq('grade', filters.grade);
        }

        if (filters.dateFrom) {
          reqQuery = reqQuery.gte('created_at', filters.dateFrom.toISOString());
        }

        if (filters.dateTo) {
          reqQuery = reqQuery.lte('created_at', filters.dateTo.toISOString());
        }

        const { data: requisitions, error: reqError } = await reqQuery;
        if (reqError) throw reqError;

        setRequisitionsData(requisitions || []);
      } catch (error) {
        console.error('Error fetching workforce data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  // Process workforce composition data
  const compositionData: DivisionGenderData[] = useMemo(() => {
    const divisionMap: Record<string, { women: number; men: number; other: number }> = {};

    workforceData.forEach((row) => {
      if (!divisionMap[row.division]) {
        divisionMap[row.division] = { women: 0, men: 0, other: 0 };
      }
      
      const gender = row.gender?.toLowerCase() || '';
      if (gender === 'woman' || gender === 'female') {
        divisionMap[row.division].women += row.count;
      } else if (gender === 'man' || gender === 'male') {
        divisionMap[row.division].men += row.count;
      } else {
        divisionMap[row.division].other += row.count;
      }
    });

    return Object.entries(divisionMap)
      .map(([division, counts]) => {
        const total = counts.women + counts.men + counts.other;
        const womenPercent = total > 0 ? (counts.women / total) * 100 : 0;
        const parityGap = 50 - womenPercent; // Positive = below parity, negative = above
        const womenNeededFor50 = Math.max(0, Math.ceil(total * 0.5) - counts.women);
        return {
          division,
          women: counts.women,
          men: counts.men,
          other: counts.other,
          total,
          womenPercent,
          parityGap,
          womenNeededFor50,
        };
      })
      .sort((a, b) => a.womenPercent - b.womenPercent); // Sort by Women % ascending (worst gaps first)
  }, [workforceData]);

  // Calculate totals for snapshot
  const snapshotData = useMemo(() => {
    const totalHeadcount = compositionData.reduce((sum, d) => sum + d.total, 0);
    const totalWomen = compositionData.reduce((sum, d) => sum + d.women, 0);
    const womenPercent = totalHeadcount > 0 ? (totalWomen / totalHeadcount) * 100 : 0;

    const divisionBreakdown = compositionData.map((d) => ({
      division: d.division,
      count: d.total,
    }));

    // Count open requisitions
    const openRequisitions = requisitionsData.filter(r => r.status !== 'converted').length;
    const plannedHires = requisitionsData
      .filter(r => r.status !== 'converted')
      .reduce((sum, r) => sum + (r.positions_available || 1), 0);

    return {
      totalHeadcount,
      womenPercent,
      divisionBreakdown,
      openRequisitions,
      plannedHires,
    };
  }, [compositionData, requisitionsData]);

  // Process pipeline data
  const pipelineData = useMemo(() => {
    const stageMap: Record<string, { count: number; positions: number }> = {};

    requisitionsData.forEach((req) => {
      const stage = mapStatusToStage(req.status);
      if (!stageMap[stage]) {
        stageMap[stage] = { count: 0, positions: 0 };
      }
      stageMap[stage].count += 1;
      stageMap[stage].positions += req.positions_available || 1;
    });

    const stageOrder = ['Initial Request', 'PD Review', 'Selection', 'Offer', 'Onboarding'];
    const stageData: PipelineStage[] = stageOrder
      .filter((stage) => stageMap[stage])
      .map((stage) => ({
        stage,
        count: stageMap[stage].count,
        positions: stageMap[stage].positions,
        color: '',
      }));

    const pipelineRequisitions: PipelineRequisition[] = requisitionsData.map((req) => ({
      id: req.id,
      reference_number: req.reference_number,
      division: req.unit_section_division?.split('/')[0] || 'Unknown',
      position_title: req.position_title || 'Untitled Position',
      stage: mapStatusToStage(req.status),
      positions_available: req.positions_available || 1,
      created_at: req.created_at,
      start_date: req.start_date,
      hiring_manager: req.users?.name || 'Unknown',
    }));

    return { stageData, pipelineRequisitions };
  }, [requisitionsData]);

  // Forecast data for projections
  const forecastPipelineData = useMemo(() => {
    return pipelineData.stageData.map((s) => ({
      stage: s.stage,
      count: s.count,
      positions: s.positions,
    }));
  }, [pipelineData]);

  return (
    <div className="space-y-8">
      {/* Section A: Workforce Snapshot */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Workforce Snapshot</h2>
        <WorkforceSnapshot
          totalHeadcount={snapshotData.totalHeadcount}
          divisionBreakdown={snapshotData.divisionBreakdown}
          womenPercent={snapshotData.womenPercent}
          openRequisitions={snapshotData.openRequisitions}
          plannedHires={snapshotData.plannedHires}
          isLoading={isLoading}
        />
      </section>

      <Separator />

      {/* Section B: Workforce Composition */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Workforce Composition</h2>
        <WorkforceComposition data={compositionData} isLoading={isLoading} />
      </section>

      <Separator />

      {/* Section C: Hiring Pipeline */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Hiring Pipeline</h2>
        <HiringPipeline
          stageData={pipelineData.stageData}
          requisitions={pipelineData.pipelineRequisitions}
          isLoading={isLoading}
        />
      </section>

      {/* Section D: Forecasts (only if projections enabled) */}
      {filters.includeProjections !== false && (
        <>
          <Separator />
          <section>
            <h2 className="text-lg font-semibold mb-4">Forecasts & Projections</h2>
            <WorkforceForecasts
              currentHeadcount={snapshotData.totalHeadcount}
              currentWomenPercent={snapshotData.womenPercent}
              pipelineData={forecastPipelineData}
              isLoading={isLoading}
            />
          </section>
        </>
      )}
    </div>
  );
};
