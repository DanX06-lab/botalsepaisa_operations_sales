import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { usePreviewIntelligenceImport, useConfirmIntelligenceImport, useGetIntelligenceImportHistory } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle2, AlertCircle, AlertTriangle, Info, RotateCcw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'upload' | 'mapping' | 'preview' | 'confirm' | 'result';

type AnnotatedRow = {
  _status: 'valid' | 'duplicate' | 'invalid' | 'missing_coords';
  errors: string[];
  warnings: string[];
  name: string;
  business_type: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  zone_id: string | null;
  area_id: string | null;
  source: string;
  [key: string]: any;
};

type PreviewResult = {
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    missingCoords: number;
    unassignedZones: number;
    cafes: number;
    restaurants: number;
  };
  rows: AnnotatedRow[];
};

const REQUIRED_FIELDS = ['name', 'business_type', 'latitude', 'longitude', 'address'];
const OPTIONAL_FIELDS = ['phone', 'website', 'cuisine', 'opening_hours', 'rating', 'source', 'source_id', 'source_url', 'price_range', 'review_count'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  valid: { label: 'Valid', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  duplicate: { label: 'Duplicate', color: 'bg-orange-100 text-orange-800', icon: Info },
  invalid: { label: 'Invalid', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  missing_coords: { label: 'Missing Coords', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IntelligenceImport() {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>('upload');
  const [filename, setFilename] = useState('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importResult, setImportResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: importHistory } = useGetIntelligenceImportHistory();

  const previewMutation = usePreviewIntelligenceImport({
    mutation: {
      onSuccess: (data: any) => {
        setPreviewResult(data);
        setStage('preview');
      },
      onError: (err: any) => {
        toast({ title: 'Preview Failed', description: err?.message || 'Could not preview data', variant: 'destructive' });
      },
    },
  });

  const confirmMutation = useConfirmIntelligenceImport({
    mutation: {
      onSuccess: (data: any) => {
        setImportResult(data);
        setStage('result');
      },
      onError: (err: any) => {
        toast({ title: 'Import Failed', description: err?.message || 'Import failed', variant: 'destructive' });
      },
    },
  });

  // ─── File parsing ──────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    setFilename(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    const processRows = (rows: any[]) => {
      if (!rows.length) { toast({ title: 'Empty File', description: 'No rows found', variant: 'destructive' }); return; }
      const cols = Object.keys(rows[0]);
      setColumns(cols);
      setRawRows(rows);
      // Auto-map columns that match field names exactly or closely
      const auto: Record<string, string> = {};
      for (const field of ALL_FIELDS) {
        const match = cols.find(c => c.toLowerCase().replace(/[^a-z0-9]/g, '_') === field || c.toLowerCase() === field);
        if (match) auto[field] = match;
      }
      setFieldMapping(auto);
      setStage('mapping');
    };

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (result) => processRows(result.data as any[]),
        error: (err) => toast({ title: 'Parse Error', description: err.message, variant: 'destructive' }),
      });
    } else if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          processRows(Array.isArray(data) ? data : data.rows || data.data || []);
        } catch {
          toast({ title: 'Invalid JSON', description: 'Could not parse JSON file', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    } else {
      toast({ title: 'Unsupported Format', description: 'Only .csv and .json files are accepted', variant: 'destructive' });
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const applyMapping = (row: any): any => {
    const mapped: any = {};
    for (const [field, col] of Object.entries(fieldMapping)) {
      if (col) mapped[field] = row[col];
    }
    return mapped;
  };

  const handleRunPreview = () => {
    const mappedRows = rawRows.map(applyMapping);
    previewMutation.mutate({ data: { filename, rows: mappedRows } });
  };

  const handleConfirm = () => {
    if (!previewResult) return;
    const mappedRows = rawRows.map(applyMapping);
    confirmMutation.mutate({ data: { filename, rows: mappedRows } });
  };

  const resetAll = () => {
    setStage('upload'); setFilename(''); setRawRows([]); setColumns([]); setFieldMapping({});
    setPreviewResult(null); setImportResult(null); setStatusFilter('all');
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const StageIndicator = () => {
    const stages: { key: Stage; label: string }[] = [
      { key: 'upload', label: '1. Upload' },
      { key: 'mapping', label: '2. Map Columns' },
      { key: 'preview', label: '3. Preview' },
      { key: 'confirm', label: '4. Confirm' },
      { key: 'result', label: '5. Done' },
    ];
    const stageOrder: Stage[] = ['upload', 'mapping', 'preview', 'confirm', 'result'];
    const currentIdx = stageOrder.indexOf(stage);
    return (
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {stages.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${i === currentIdx ? 'bg-primary text-primary-foreground' : i < currentIdx ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              {s.label}
            </span>
            {i < stages.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>
    );
  };

  // ─── Stages ───────────────────────────────────────────────────────────────

  // Stage 1: Upload
  if (stage === 'upload') return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">CSV / JSON Import</h1>
        <p className="text-muted-foreground mt-1">Secondary data ingestion — supplements the OpenStreetMap discovery engine.</p>
      </div>
      <StageIndicator />

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Accepts .csv and .json files. Maximum 5,000 rows per import.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400" />
            <div className="text-center">
              <p className="text-lg font-medium">Drop your CSV or JSON file here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <input id="file-input" type="file" accept=".csv,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        </CardContent>
      </Card>

      {importHistory && importHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Import History</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Inserted</TableHead>
                  <TableHead>Duplicates</TableHead>
                  <TableHead>Invalid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium"><FileText className="inline h-4 w-4 mr-1" />{h.filename}</TableCell>
                    <TableCell>{new Date(h.importedAt).toLocaleString()}</TableCell>
                    <TableCell>{h.stats?.total ?? '-'}</TableCell>
                    <TableCell className="text-green-700">{h.stats?.inserted ?? h.stats?.valid ?? '-'}</TableCell>
                    <TableCell className="text-orange-600">{h.stats?.duplicates ?? '-'}</TableCell>
                    <TableCell className="text-red-600">{h.stats?.invalid ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Stage 2: Column Mapping
  if (stage === 'mapping') return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Map Columns</h1>
        <Button variant="ghost" onClick={() => setStage('upload')}><RotateCcw className="h-4 w-4 mr-2" />Back</Button>
      </div>
      <StageIndicator />
      <Card>
        <CardHeader>
          <CardTitle><FileText className="inline h-5 w-5 mr-2" />{filename}</CardTitle>
          <CardDescription>{rawRows.length.toLocaleString()} rows detected. Map your CSV columns to the required fields below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALL_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-3">
                <div className="w-40 shrink-0">
                  <span className="text-sm font-medium">{field}</span>
                  {REQUIRED_FIELDS.includes(field) && <span className="text-red-500 ml-1">*</span>}
                </div>
                <Select value={fieldMapping[field] || '__none__'} onValueChange={(v) => setFieldMapping(p => ({ ...p, [field]: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Not mapped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not mapped</SelectItem>
                    {columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleRunPreview}
              disabled={previewMutation.isPending || REQUIRED_FIELDS.some(f => !fieldMapping[f])}
              size="lg"
            >
              {previewMutation.isPending ? 'Validating...' : 'Run Validation Preview →'}
            </Button>
          </div>
          {REQUIRED_FIELDS.some(f => !fieldMapping[f]) && (
            <p className="text-sm text-red-500 mt-2 text-right">Please map all required fields (*) before continuing.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Stage 3: Preview
  if (stage === 'preview' && previewResult) {
    const { stats, rows: annotatedRows } = previewResult;
    const filteredRows = statusFilter === 'all' ? annotatedRows : annotatedRows.filter(r => r._status === statusFilter);

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Validation Preview</h1>
          <Button variant="ghost" onClick={() => setStage('mapping')}><RotateCcw className="h-4 w-4 mr-2" />Back</Button>
        </div>
        <StageIndicator />

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-green-200"><CardContent className="pt-4"><div className="text-2xl font-bold text-green-700">{stats.valid}</div><div className="text-sm text-muted-foreground">Valid</div></CardContent></Card>
          <Card className="border-orange-200"><CardContent className="pt-4"><div className="text-2xl font-bold text-orange-600">{stats.duplicates}</div><div className="text-sm text-muted-foreground">Duplicates</div></CardContent></Card>
          <Card className="border-yellow-200"><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{stats.missingCoords}</div><div className="text-sm text-muted-foreground">Missing Coords</div></CardContent></Card>
          <Card className="border-red-200"><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{stats.invalid - stats.missingCoords}</div><div className="text-sm text-muted-foreground">Invalid</div></CardContent></Card>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div>Total rows: <strong>{stats.total}</strong></div>
          <div>Cafes: <strong>{stats.cafes}</strong></div>
          <div>Restaurants: <strong>{stats.restaurants}</strong></div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Row Details</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({stats.total})</SelectItem>
                <SelectItem value="valid">Valid ({stats.valid})</SelectItem>
                <SelectItem value="duplicate">Duplicate ({stats.duplicates})</SelectItem>
                <SelectItem value="missing_coords">Missing Coords ({stats.missingCoords})</SelectItem>
                <SelectItem value="invalid">Invalid ({stats.invalid})</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.slice(0, 200).map((row, i) => {
                  const cfg = STATUS_CONFIG[row._status] || STATUS_CONFIG.invalid;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={i}>
                      <TableCell><Badge className={`${cfg.color} gap-1`}><Icon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">{row.name || <span className="text-red-500 italic">missing</span>}</TableCell>
                      <TableCell>{row.business_type || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.address || '-'}</TableCell>
                      <TableCell>{row.zone_id || <span className="text-yellow-600">Unassigned</span>}</TableCell>
                      <TableCell className="text-xs text-red-600 max-w-[180px]">{row.errors.join('; ') || '-'}</TableCell>
                    </TableRow>
                  );
                })}
                {filteredRows.length > 200 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Showing first 200 of {filteredRows.length} rows</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => setStage('confirm')} disabled={stats.valid === 0} size="lg">
            Continue to Confirm ({stats.valid} valid records) →
          </Button>
        </div>
        {stats.valid === 0 && <p className="text-sm text-red-500 text-right">No valid records found. Please fix your data and re-upload.</p>}
      </div>
    );
  }

  // Stage 4: Confirm
  if (stage === 'confirm' && previewResult) {
    const { stats } = previewResult;
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Confirm Import</h1>
          <Button variant="ghost" onClick={() => setStage('preview')}><RotateCcw className="h-4 w-4 mr-2" />Back</Button>
        </div>
        <StageIndicator />

        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
            <CardDescription>Please review this summary carefully before importing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-2xl font-bold text-green-700">{stats.valid} records will be imported</p>
              <p className="text-sm text-green-600 mt-1">These are newly discovered records not currently in the database.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between border-b pb-2"><span>Duplicates skipped</span><span className="font-medium text-orange-600">{stats.duplicates}</span></div>
              <div className="flex justify-between border-b pb-2"><span>Invalid skipped</span><span className="font-medium text-red-600">{stats.invalid}</span></div>
              <div className="flex justify-between border-b pb-2"><span>Missing coords</span><span className="font-medium text-yellow-600">{stats.missingCoords}</span></div>
              <div className="flex justify-between border-b pb-2"><span>Unassigned zones</span><span className="font-medium">{stats.unassignedZones}</span></div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              <strong>Note:</strong> Imported records will be marked as <em>unverified</em>. Use the Verification Queue to review and approve them. Data coverage reflects discovered records, not real-world business presence.
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleConfirm} disabled={confirmMutation.isPending} size="lg" className="bg-green-600 hover:bg-green-700">
            {confirmMutation.isPending ? 'Importing...' : `Import ${stats.valid} Records`}
          </Button>
        </div>
      </div>
    );
  }

  // Stage 5: Result
  if (stage === 'result' && importResult) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">Import Complete</h1>
        <StageIndicator />

        <Card className="border-green-300">
          <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div>
              <p className="text-2xl font-bold">Import Successful</p>
              <p className="text-muted-foreground mt-1">File: {importResult.filename}</p>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-2 text-sm w-full max-w-sm">
              <div className="text-center"><div className="text-3xl font-bold text-green-700">{importResult.stats?.inserted ?? importResult.stats?.valid ?? 0}</div><div className="text-muted-foreground">New Records</div></div>
              <div className="text-center"><div className="text-3xl font-bold text-blue-700">{importResult.stats?.updated ?? 0}</div><div className="text-muted-foreground">Updated</div></div>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-3 w-full">
              All imported records are marked <em>unverified</em>. Review them in the Verification Queue before use.
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-2" />Start New Import</Button>
          <Button onClick={() => window.location.href = '/intelligence/verification/queue'}>Go to Verification Queue →</Button>
        </div>
      </div>
    );
  }

  return null;
}
