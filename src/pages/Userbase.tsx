import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Upload as UploadIcon, Search } from 'lucide-react';

interface MergedData {
  columns: string[];
  rows: Record<string, string>[];
  generatedAt: string;
}

export default function Userbase() {
  const navigate = useNavigate();
  const [data, setData] = useState<MergedData | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('userbase:merged');
      if (raw) setData(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to read merged userbase', e);
    }
  }, []);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((row) =>
      data.columns.some((c) => (row[c] ?? '').toString().toLowerCase().includes(q)),
    );
  }, [data, query]);

  const handleDownload = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(filteredRows, { header: data.columns });
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `userbase-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) {
    return (
      <Layout>
        <div className="container mx-auto py-8 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Userbase</CardTitle>
              <CardDescription>
                No merged dataset is available in this session. Import GSM and Samsaran extracts to generate one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin/import-userbase')}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Go to Import Userbase
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-[95vw]">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Userbase</h1>
          <p className="text-sm text-muted-foreground">
            {data.rows.length} rows · merged{' '}
            {new Date(data.generatedAt).toLocaleString()}
            {filteredRows.length !== data.rows.length && (
              <> · showing {filteredRows.length}</>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search across all columns…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>

        <div className="border rounded-md max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {data.columns.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row, i) => (
                <TableRow key={i}>
                  {data.columns.map((c) => (
                    <TableCell key={c} className="whitespace-nowrap text-sm">
                      {row[c] ?? ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={data.columns.length} className="text-center text-muted-foreground py-8">
                    No matching rows.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
