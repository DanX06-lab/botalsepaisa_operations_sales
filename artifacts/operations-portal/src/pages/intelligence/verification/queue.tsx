import { useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetVerificationQueue,
  useBulkUpdateVerificationStatus,
  useGetCoverageOverview,
} from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const STATUS_COLORS: Record<string, string> = {
  'UNVERIFIED': 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  'VERIFIED': 'bg-green-100 text-green-800 hover:bg-green-200',
  'NEEDS_REVIEW': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  'REJECTED': 'bg-red-100 text-red-800 hover:bg-red-200',
  'DUPLICATE': 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  'CLOSED': 'bg-slate-100 text-slate-800 hover:bg-slate-200',
};

export default function VerificationQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ status: string; note: string } | null>(null);

  const { data: queueData, isLoading } = useGetVerificationQueue({
    page,
    limit: 50,
    status: filters.status || undefined,
    type: filters.type || undefined,
    search: filters.search || undefined,
  });

  const { data: overview } = useGetCoverageOverview();
  
  const bulkUpdateMutation = useBulkUpdateVerificationStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Bulk status updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['getVerificationQueue'] });
        queryClient.invalidateQueries({ queryKey: ['getCoverageOverview'] });
        setSelectedIds(new Set());
        setBulkAction(null);
      },
      onError: (err: any) => {
        toast({ title: 'Error', description: err?.message || 'Failed to update', variant: 'destructive' });
      },
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && queueData?.data) {
      setSelectedIds(new Set(queueData.data.map(b => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkSubmit = () => {
    if (!bulkAction || selectedIds.size === 0) return;
    bulkUpdateMutation.mutate({
      data: {
        business_ids: Array.from(selectedIds),
        status: bulkAction.status,
        note: bulkAction.note || undefined,
      }
    });
  };

  const businesses = queueData?.data || [];
  const allSelected = businesses.length > 0 && selectedIds.size === businesses.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Verification Queue</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Total Unverified</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{overview?.unverified || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Verified</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{overview?.verified || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Duplicates</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{overview?.duplicates || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium">Total DB Size</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{overview?.total || 0}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 items-center w-full md:w-auto">
              <Input 
                placeholder="Search name, phone, address..." 
                value={filters.search} 
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="max-w-xs"
              />
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v === 'ALL' ? '' : v)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                  <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Select onValueChange={(v) => setBulkAction({ status: v, note: '' })}>
                <SelectTrigger className="w-[180px]" disabled={selectedIds.size === 0}>
                  <SelectValue placeholder={`Bulk Action (${selectedIds.size})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VERIFIED">Mark Verified</SelectItem>
                  <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                  <SelectItem value="REJECTED">Reject</SelectItem>
                  <SelectItem value="CLOSED">Mark Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : businesses.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">No records found</TableCell></TableRow>
              ) : (
                businesses.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(b.id)} 
                        onCheckedChange={(c) => handleSelectRow(b.id, !!c)} 
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/intelligence/verification/${b.id}`}>
                        <a className="font-medium text-primary hover:underline">{b.name}</a>
                      </Link>
                    </TableCell>
                    <TableCell>{b.business_type}</TableCell>
                    <TableCell className="max-w-xs truncate">{b.address}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[b.verification_status || 'UNVERIFIED'] || 'bg-gray-100 text-gray-800'}>
                        {b.verification_status || 'UNVERIFIED'}
                      </Badge>
                    </TableCell>
                    <TableCell>{b.source}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing {businesses.length} records {queueData?.total ? `of ${queueData.total}` : ''}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" disabled={!queueData || businesses.length < 50} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              You are about to mark {selectedIds.size} businesses as {bulkAction?.status}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-1">Optional Note</label>
            <Textarea 
              value={bulkAction?.note || ''} 
              onChange={(e) => setBulkAction(prev => prev ? { ...prev, note: e.target.value } : null)}
              placeholder="Reason for this status change..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>Cancel</Button>
            <Button onClick={handleBulkSubmit} disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
