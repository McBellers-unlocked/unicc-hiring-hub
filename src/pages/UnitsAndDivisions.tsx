import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { DIVISIONS, DIVISION_UNITS } from '@/lib/organizationConstants';

interface UnitRow {
  id: string;
  fullName: string;
  unit: string;
  parentSection: string;
  division: string;
  manager: string;
}

const extractCode = (fullName: string): string => {
  const match = fullName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : '';
};

const buildInitialRows = (): UnitRow[] => {
  const rows: UnitRow[] = [];
  Object.keys(DIVISIONS).forEach((divCode) => {
    const units = DIVISION_UNITS[divCode] || [];
    const sorted = [...units].sort((a, b) => a.localeCompare(b));
    sorted.forEach((fullName, idx) => {
      rows.push({
        id: `${divCode}-${idx}`,
        fullName,
        unit: extractCode(fullName),
        parentSection: '',
        division: divCode,
        manager: '',
      });
    });
  });
  return rows;
};

export default function UnitsAndDivisions() {
  const navigate = useNavigate();
  const initialRows = useMemo(buildInitialRows, []);
  const [rows, setRows] = useState<UnitRow[]>(initialRows);

  const updateRow = (id: string, field: keyof UnitRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = () => {
    toast.success('Units and Divisions saved');
  };

  const handleReset = () => {
    setRows(buildInitialRows());
    toast.message('Reverted to default values');
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Units and Divisions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Editable directory of organizational units and sections used across the platform.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Unit full name</TableHead>
                    <TableHead className="w-[12%]">Unit</TableHead>
                    <TableHead className="w-[20%]">Parent Section</TableHead>
                    <TableHead className="w-[18%]">Division</TableHead>
                    <TableHead className="w-[22%]">Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium align-middle">
                        {row.fullName}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.parentSection}
                          onChange={(e) => updateRow(row.id, 'parentSection', e.target.value)}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.division}
                          onValueChange={(v) => updateRow(row.id, 'division', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(DIVISIONS).map(([code, label]) => (
                              <SelectItem key={code} value={code}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.manager}
                          onChange={(e) => updateRow(row.id, 'manager', e.target.value)}
                          placeholder="—"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
