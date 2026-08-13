import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { 
  useListPickups,
  useUpdatePickupStatus,
  getListPickupsQueryKey,
  PickupStatusUpdateStatus
} from '@workspace/api-client-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from 'date-fns';
import { MessageSquare, Phone } from 'lucide-react';

function PickupsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const limit = 20;

  const { data, isLoading } = useListPickups({
    page,
    limit,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {})
  });

  const updateStatusMutation = useUpdatePickupStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        data: { status: newStatus as PickupStatusUpdateStatus }
      });
      
      toast({
        title: "Status updated",
        description: `Pickup request status changed to ${newStatus}.`,
      });
      
      queryClient.invalidateQueries({ queryKey: getListPickupsQueryKey() });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="secondary">Pending</Badge>;
      case 'ASSIGNED': return <Badge className="bg-blue-500">Assigned</Badge>;
      case 'PICKUP_IN_PROGRESS': return <Badge className="bg-orange-500">In Progress</Badge>;
      case 'COMPLETED': return <Badge className="bg-green-500">Completed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Pickups</h1>
          <p className="text-muted-foreground mt-2">Manage customer pickup requests from WhatsApp.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Pickup Requests</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="PICKUP_IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                  </TableRow>
                ) : !data?.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No pickup requests found.</TableCell>
                  </TableRow>
                ) : (
                  data.data.map((pickup) => (
                    <TableRow key={pickup._id}>
                      <TableCell className="font-medium">{pickup.ticket_id}</TableCell>
                      <TableCell>{format(parseISO(pickup.created_at), 'MMM d, h:mm a')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{pickup.customer_name}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {pickup.whatsapp_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{pickup.quantity_range} {pickup.weekend_batch && <span className="text-xs text-blue-500">(Weekend)</span>}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {pickup.landmark && <span className="text-sm font-medium">{pickup.landmark}</span>}
                          <a href={`https://maps.google.com/?q=${pickup.latitude},${pickup.longitude}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                            View on Map
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={pickup.status} 
                          onValueChange={(val) => handleStatusChange(pickup._id, val)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-transparent p-0">
                            {getStatusBadge(pickup.status)}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="ASSIGNED">Assigned</SelectItem>
                            <SelectItem value="PICKUP_IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                         <a href={`https://wa.me/${pickup.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                           <Button variant="outline" size="sm"><Phone className="h-4 w-4 mr-1" /> Chat</Button>
                         </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.total > limit && (
            <div className="flex items-center justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {page} of {Math.ceil(data.total / limit)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(data.total / limit)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Pickups() {
  return (
    <ProtectedRoute>
      <Layout>
        <PickupsPage />
      </Layout>
    </ProtectedRoute>
  );
}
