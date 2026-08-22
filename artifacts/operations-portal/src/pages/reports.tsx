import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { 
  useGetReports, 
  useUpdatePaymentStatus,
  useDeleteCollection,
  useUpdateCollection,
  getGetReportsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, IndianRupee, Search, Calendar, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr));
}

export default function Reports() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetReports({ month });

  const [paymentDialog, setPaymentDialog] = useState<{open: boolean, entry: any | null}>({ open: false, entry: null });
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');

  const [editDialog, setEditDialog] = useState<{open: boolean, entry: any | null, weightKg: string, ratePerKg: string}>({ open: false, entry: null, weightKg: '', ratePerKg: '' });

  const updatePayment = useUpdatePaymentStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Payment status updated." });
        queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
        setPaymentDialog({ open: false, entry: null });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDialog.entry) return;
    updatePayment.mutate({
      id: paymentDialog.entry.id,
      data: {
        paymentStatus: 'PAID',
        paymentDate,
        paidBy: paidBy || 'Admin'
      }
    });
  };

  const markPending = (id: number) => {
    updatePayment.mutate({
      id,
      data: { paymentStatus: 'PENDING', paymentDate: null, paidBy: null }
    });
  };

  const deleteCollection = useDeleteCollection({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Collection deleted successfully." });
        queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const updateCollection = useUpdateCollection({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Collection updated successfully." });
        queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
        setEditDialog({ open: false, entry: null, weightKg: '', ratePerKg: '' });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog.entry) return;
    updateCollection.mutate({
      id: editDialog.entry.id,
      data: {
        weightKg: Number(editDialog.weightKg),
        ratePerKg: Number(editDialog.ratePerKg)
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this collection entry? This action cannot be undone.')) {
      deleteCollection.mutate({ id });
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reports & Payments</h1>
              <p className="text-muted-foreground mt-1">View collections and manage payouts.</p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="sr-only">Filter by Month</Label>
                  <Input 
                    type="month" 
                    value={month} 
                    onChange={e => setMonth(e.target.value)} 
                    className="w-auto bg-background"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : data?.data.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p>No records found for the selected period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>Shop Details</TableHead>
                        <TableHead className="text-right">Weight (KG)</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right font-semibold">Total Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data.map((entry) => (
                        <TableRow key={entry.id} className="group">
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatDate(entry.collectionDate)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{entry.shop.shopName}</div>
                            <div className="text-xs text-muted-foreground">{entry.shop.shopId}</div>
                          </TableCell>
                          <TableCell className="text-right">{entry.weightKg.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">₹{entry.ratePerKg}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            {formatCurrency(entry.totalAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.paymentStatus === 'PAID' ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">PAID</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">PENDING</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {entry.paymentStatus === 'PENDING' ? (
                                <Button 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => setPaymentDialog({ open: true, entry })}
                                >
                                  Mark Paid
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => markPending(entry.id)}
                                >
                                  Revert
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => setEditDialog({ open: true, entry, weightKg: String(entry.weightKg), ratePerKg: String(entry.ratePerKg) })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(entry.id)}
                                disabled={deleteCollection.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter className="bg-primary/5">
                      <TableRow>
                        <TableCell colSpan={2} className="font-semibold text-lg py-4">Total</TableCell>
                        <TableCell className="text-right font-semibold text-lg">{data?.totalKg.toFixed(2)} KG</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-bold text-lg text-primary">
                          {formatCurrency(data?.totalAmount || 0)}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Dialog */}
        <Dialog open={paymentDialog.open} onOpenChange={(open) => !open && setPaymentDialog({ open: false, entry: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Mark payment as completed for <strong>{paymentDialog.entry?.shop.shopName}</strong>.
                <br/>
                Amount: <strong className="text-primary">{formatCurrency(paymentDialog.entry?.totalAmount || 0)}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input 
                  id="paymentDate" 
                  type="date" 
                  required 
                  value={paymentDate} 
                  onChange={e => setPaymentDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidBy">Paid By (Optional)</Label>
                <Input 
                  id="paidBy" 
                  placeholder="e.g. Cashier 1, Bank Transfer"
                  value={paidBy} 
                  onChange={e => setPaidBy(e.target.value)} 
                />
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setPaymentDialog({ open: false, entry: null })}>Cancel</Button>
                <Button type="submit" disabled={updatePayment.isPending}>
                  {updatePayment.isPending ? 'Saving...' : 'Confirm Payment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* Edit Collection Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null, weightKg: '', ratePerKg: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
              <DialogDescription>
                Update the weight and rate for <strong>{editDialog.entry?.shop.shopName}</strong>. Total amount will be recalculated automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weightKg">Weight (KG)</Label>
                  <Input 
                    id="weightKg" 
                    type="number" 
                    step="0.01"
                    required 
                    value={editDialog.weightKg} 
                    onChange={e => setEditDialog({ ...editDialog, weightKg: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ratePerKg">Rate per KG (₹)</Label>
                  <Input 
                    id="ratePerKg" 
                    type="number" 
                    step="0.01"
                    required 
                    value={editDialog.ratePerKg} 
                    onChange={e => setEditDialog({ ...editDialog, ratePerKg: e.target.value })} 
                  />
                </div>
              </div>
              <div className="rounded-md bg-muted p-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">New Total Amount</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency((Number(editDialog.weightKg) || 0) * (Number(editDialog.ratePerKg) || 0))}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialog({ open: false, entry: null, weightKg: '', ratePerKg: '' })}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCollection.isPending}>
                  {updateCollection.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
}
