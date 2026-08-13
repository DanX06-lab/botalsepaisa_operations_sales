import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Download, RefreshCcw, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  useGetCoverageOverview,
  useGetZoneCoverage,
  useGetAreaCoverage,
  useGetWardCoverage,
  useGetBoroughCoverage,
  useGetSourceCoverage,
  useGetQualityCoverage,
  GetCoverageOverviewParams
} from '@workspace/api-client-react';

export default function IntelligenceCoverage() {
  const [filters, setFilters] = useState<GetCoverageOverviewParams>({
    zone_id: '',
    area_id: '',
    ward_id: '',
    borough_id: '',
    business_type: '',
    verification_status: '',
    source: ''
  });

  const [activeTab, setActiveTab] = useState('zone');

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '')
  );

  const { data: overview, isLoading: overviewLoading } = useGetCoverageOverview(activeFilters);
  const { data: zoneData, isLoading: zoneLoading } = useGetZoneCoverage(activeFilters);
  const { data: areaData, isLoading: areaLoading } = useGetAreaCoverage(activeFilters);
  const { data: wardData, isLoading: wardLoading } = useGetWardCoverage(activeFilters);
  const { data: boroughData, isLoading: boroughLoading } = useGetBoroughCoverage(activeFilters);
  const { data: sourceData, isLoading: sourceLoading } = useGetSourceCoverage(activeFilters);
  const { data: qualityData, isLoading: qualityLoading } = useGetQualityCoverage(activeFilters);

  const handleFilterChange = (key: keyof GetCoverageOverviewParams, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      zone_id: '',
      area_id: '',
      ward_id: '',
      borough_id: '',
      business_type: '',
      verification_status: '',
      source: ''
    });
  };

  const handleExportCSV = () => {
    let dataToExport: any[] = [];
    let filename = 'export.csv';

    switch (activeTab) {
      case 'zone':
        dataToExport = zoneData || [];
        filename = 'zone_coverage.csv';
        break;
      case 'area':
        dataToExport = areaData || [];
        filename = 'area_coverage.csv';
        break;
      case 'ward':
        dataToExport = wardData || [];
        filename = 'ward_coverage.csv';
        break;
      case 'borough':
        dataToExport = boroughData || [];
        filename = 'borough_coverage.csv';
        break;
      case 'source':
        dataToExport = sourceData || [];
        filename = 'source_coverage.csv';
        break;
    }

    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Data Coverage</h1>
              <p className="text-muted-foreground mt-1">Monitor intelligence data coverage across regions.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetFilters}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset Filters
              </Button>
              <Button onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Input placeholder="Zone ID" value={filters.zone_id} onChange={(e) => handleFilterChange('zone_id', e.target.value)} />
                <Input placeholder="Area ID" value={filters.area_id} onChange={(e) => handleFilterChange('area_id', e.target.value)} />
                <Input placeholder="Borough ID" value={filters.borough_id} onChange={(e) => handleFilterChange('borough_id', e.target.value)} />
                <Input placeholder="Ward ID" value={filters.ward_id} onChange={(e) => handleFilterChange('ward_id', e.target.value)} />
                <Input placeholder="Business Type" value={filters.business_type} onChange={(e) => handleFilterChange('business_type', e.target.value)} />
                <Input placeholder="Status" value={filters.verification_status} onChange={(e) => handleFilterChange('verification_status', e.target.value)} />
                <Input placeholder="Source" value={filters.source} onChange={(e) => handleFilterChange('source', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <MetricCard title="Total" value={overview?.total} loading={overviewLoading} />
            <MetricCard title="Cafes" value={overview?.cafes} loading={overviewLoading} />
            <MetricCard title="Restaurants" value={overview?.restaurants} loading={overviewLoading} />
            <MetricCard title="Verified" value={overview?.verified} loading={overviewLoading} />
            <MetricCard title="Unverified" value={overview?.unverified} loading={overviewLoading} />
            <MetricCard title="Duplicates" value={overview?.duplicates} loading={overviewLoading} />
            <MetricCard title="Unassigned" value={overview?.unassigned} loading={overviewLoading} />
          </div>

          {qualityData && (
            <Card className="border-destructive bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Coverage Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm font-medium">
                  <div>Missing Coords: {qualityData.missing_coordinates || 0}</div>
                  <div>Missing Address: {qualityData.missing_address || 0}</div>
                  <div>Missing Phone: {qualityData.missing_phone || 0}</div>
                  <div>Missing Website: {qualityData.missing_website || 0}</div>
                  <div>Missing Rating: {qualityData.missing_rating || 0}</div>
                  <div>Unassigned Area: {qualityData.unassigned_zone_area || 0}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Zone Distribution</CardTitle>
                <CardDescription>Businesses across zones</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="zone_id" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <CardHeader className="pb-0 border-b">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                    <TabsTrigger value="zone" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Zone</TabsTrigger>
                    <TabsTrigger value="area" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Area</TabsTrigger>
                    <TabsTrigger value="ward" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Ward</TabsTrigger>
                    <TabsTrigger value="borough" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Borough</TabsTrigger>
                    <TabsTrigger value="source" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Source</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="p-0">
                  <TabsContent value="zone" className="m-0">
                    <DataTable data={zoneData} loading={zoneLoading} columns={['Zone ID', 'Total', 'Cafes', 'Restaurants', 'Verified']} dataKeys={['zone_id', 'total', 'cafes', 'restaurants', 'verified']} />
                  </TabsContent>
                  <TabsContent value="area" className="m-0">
                    <DataTable data={areaData} loading={areaLoading} columns={['Area ID', 'Zone ID', 'Total']} dataKeys={['area_id', 'zone_id', 'total']} />
                  </TabsContent>
                  <TabsContent value="ward" className="m-0">
                    <DataTable data={wardData} loading={wardLoading} columns={['Ward ID', 'Borough ID', 'Total']} dataKeys={['ward_id', 'borough_id', 'total']} />
                  </TabsContent>
                  <TabsContent value="borough" className="m-0">
                    <DataTable data={boroughData} loading={boroughLoading} columns={['Borough ID', 'Total']} dataKeys={['borough_id', 'total']} />
                  </TabsContent>
                  <TabsContent value="source" className="m-0">
                    <DataTable data={sourceData} loading={sourceLoading} columns={['Source', 'Total']} dataKeys={['source', 'total']} />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function MetricCard({ title, value, loading }: { title: string; value?: number; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-bold">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

function DataTable({ data, loading, columns, dataKeys }: { data?: any[]; loading: boolean; columns: string[]; dataKeys: string[] }) {
  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }
  
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No currently discovered records</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {dataKeys.map(key => (
                <TableCell key={key}>
                  {row[key] === 0 ? "No currently discovered records" : row[key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
