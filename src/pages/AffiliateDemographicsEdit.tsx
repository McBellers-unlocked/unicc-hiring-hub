import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Search, Users, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface AffiliateUser {
  id: string;
  name: string;
  email: string;
  affiliate_type: string | null;
  division: string | null;
  unit: string | null;
  job_title: string | null;
  line_manager: string | null;
  duty_station: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  current_grade: string | null;
  staff_number: string | null;
  nationality: string | null;
  gender: string | null;
  first_incumbency_date: string | null;
}

interface EditingCell {
  id: string;
  field: keyof AffiliateUser;
}

interface PendingChange {
  id: string;
  field: keyof AffiliateUser;
  value: string | null;
}

export default function AffiliateDemographicsEdit() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  // Fetch all affiliates
  const { data: affiliates, isLoading } = useQuery({
    queryKey: ['affiliate-demographics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, affiliate_type, division, unit, job_title, line_manager, duty_station, contract_start_date, contract_end_date, current_grade, staff_number, nationality, gender, first_incumbency_date')
        .eq('personnel_type', 'Affiliate')
        .order('name');

      if (error) throw error;
      return data as AffiliateUser[];
    },
  });

  // Filter affiliates
  const filteredAffiliates = affiliates?.filter(affiliate => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      affiliate.name?.toLowerCase().includes(searchLower) ||
      affiliate.email?.toLowerCase().includes(searchLower) ||
      affiliate.job_title?.toLowerCase().includes(searchLower) ||
      affiliate.division?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (change: PendingChange) => {
      const { error } = await supabase
        .from('users')
        .update({ [change.field]: change.value })
        .eq('id', change.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-demographics'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-personnel'] });
    },
    onError: (error) => {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    },
  });

  // Handle cell edit start
  const startEditing = (id: string, field: keyof AffiliateUser, currentValue: string | null) => {
    setEditingCell({ id, field });
    setEditValue(currentValue || '');
  };

  // Handle cell edit save
  const saveEdit = async () => {
    if (!editingCell) return;

    const originalAffiliate = affiliates?.find(a => a.id === editingCell.id);
    const originalValue = originalAffiliate?.[editingCell.field];

    // Only save if value changed
    if (editValue !== (originalValue || '')) {
      await saveMutation.mutateAsync({
        id: editingCell.id,
        field: editingCell.field,
        value: editValue || null,
      });
      toast.success('Saved');
    }

    setEditingCell(null);
    setEditValue('');
  };

  // Handle cancel edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Render editable cell
  const renderEditableCell = (
    affiliate: AffiliateUser,
    field: keyof AffiliateUser,
    type: 'text' | 'select' | 'date' = 'text',
    options?: string[]
  ) => {
    const isEditing = editingCell?.id === affiliate.id && editingCell?.field === field;
    const value = affiliate[field] as string | null;

    if (isEditing) {
      if (type === 'select' && options) {
        return (
          <Select value={editValue} onValueChange={(v) => { setEditValue(v); }}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      if (type === 'date') {
        const dateValue = editValue ? parseISO(editValue) : null;
        return (
          <DatePicker
            selected={dateValue}
            onChange={(date: Date | null) => setEditValue(date ? format(date, 'yyyy-MM-dd') : '')}
            dateFormat="yyyy-MM-dd"
            className="h-8 w-full px-2 border rounded text-sm"
            placeholderText="Select date"
            onBlur={saveEdit}
          />
        );
      }

      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
      );
    }

    // Display mode
    const displayValue = type === 'date' && value 
      ? format(parseISO(value), 'dd MMM yyyy')
      : value || '-';

    return (
      <div
        className={cn(
          'cursor-pointer px-2 py-1 rounded hover:bg-muted min-h-8 flex items-center',
          field === 'email' && 'cursor-not-allowed opacity-70'
        )}
        onClick={() => field !== 'email' && startEditing(affiliate.id, field, value)}
      >
        <span className="text-sm truncate">{displayValue}</span>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/affiliate-personnel">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Edit Demographics
              </h1>
              <p className="text-sm text-muted-foreground">
                Click any cell to edit. Changes save automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, job title, or division..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Editable Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Affiliate Personnel ({filteredAffiliates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No affiliates found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Name</TableHead>
                      <TableHead className="w-48">Email</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead className="w-32">Division</TableHead>
                      <TableHead className="w-32">Unit</TableHead>
                      <TableHead className="w-40">Job Title</TableHead>
                      <TableHead className="w-32">Line Manager</TableHead>
                      <TableHead className="w-28">Duty Station</TableHead>
                      <TableHead className="w-28">Start Date</TableHead>
                      <TableHead className="w-28">End Date</TableHead>
                      <TableHead className="w-24">Grade</TableHead>
                      <TableHead className="w-28">Staff Number</TableHead>
                      <TableHead className="w-28">Nationality</TableHead>
                      <TableHead className="w-24">Gender</TableHead>
                      <TableHead className="w-28">First Incumbency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell className="font-medium">
                          {renderEditableCell(affiliate, 'name')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {affiliate.email}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'affiliate_type', 'select', ['IC', 'Intern', 'UNV'])}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'division')}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'unit')}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'job_title')}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'line_manager')}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'duty_station')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {affiliate.contract_start_date ? format(parseISO(affiliate.contract_start_date), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {affiliate.contract_end_date ? format(parseISO(affiliate.contract_end_date), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'current_grade')}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'staff_number')}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'nationality')}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'gender', 'select', ['Male', 'Female'])}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(affiliate, 'first_incumbency_date', 'date')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
