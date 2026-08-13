import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSyncDiscovery, useGetDiscoveryHistory, getGetDiscoveryHistoryQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, Database, RefreshCw } from 'lucide-react';

export default function IntelligenceDataSources() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useSyncDiscovery({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Sync Complete",
          description: data.message || `Discovered ${data.history?.records_discovered ?? 0} records.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetDiscoveryHistoryQueryKey() });
      },
      onError: (error: any) => {
        toast({
          title: "Sync Failed",
          description: error?.message || "An error occurred during sync.",
          variant: "destructive"
        });
      }
    }
  });

  const { data: historyData, isLoading: isHistoryLoading } = useGetDiscoveryHistory();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Kolkata Intelligence - Data Sources</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              OpenStreetMap (Overpass API)
            </CardTitle>
            <CardDescription>Primary data source for geospatial intelligence</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Syncing pulls the latest points of interest and business data from OSM for the Kolkata region. 
              This process may take several seconds.
            </p>
            <Button 
              onClick={() => syncMutation.mutate()} 
              disabled={syncMutation.isPending}
              className="w-full sm:w-auto"
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Kolkata Data
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Sync History</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead className="text-right">Records Discovered</TableHead>
                  <TableHead className="text-right">New Records</TableHead>
                  <TableHead className="text-right">Updated Records</TableHead>
                  <TableHead className="text-right">Duplicates</TableHead>
                  <TableHead className="text-right">Invalid</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isHistoryLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !historyData || historyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No sync history available.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{item.records_discovered}</TableCell>
                      <TableCell className="text-right text-green-600">{item.new_records}</TableCell>
                      <TableCell className="text-right text-blue-600">{item.updated_records}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.duplicates}</TableCell>
                      <TableCell className="text-right text-orange-600">{item.invalid_records}</TableCell>
                      <TableCell className="text-right text-red-600">{item.errors}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
