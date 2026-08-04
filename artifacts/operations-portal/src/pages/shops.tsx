import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { 
  useListShops, 
  useCreateShop, 
  useUpdateShop, 
  useDeleteShop,
  getListShopsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Plus, Edit2, Trash2, MapPin, Phone, User, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';

export default function Shops() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListShops({ 
    page, 
    limit: 10, 
    search: debouncedSearch || undefined 
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [formData, setFormData] = useState({ shopName: '', ownerName: '', mobile: '', address: '' });

  const createShop = useCreateShop({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Shop created successfully" });
        queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
        setIsAddOpen(false);
        setFormData({ shopName: '', ownerName: '', mobile: '', address: '' });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const updateShop = useUpdateShop({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Shop updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
        setIsEditOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const deleteShop = useDeleteShop({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Shop deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
        setIsDeleteOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShop.mutate({ data: formData });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    updateShop.mutate({ id: selectedShop.id, data: formData });
  };

  const handleDelete = () => {
    if (!selectedShop) return;
    deleteShop.mutate({ id: selectedShop.id });
  };

  const openEdit = (shop: any) => {
    setSelectedShop(shop);
    setFormData({
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      mobile: shop.mobile,
      address: shop.address,
    });
    setIsEditOpen(true);
  };

  const openDelete = (shop: any) => {
    setSelectedShop(shop);
    setIsDeleteOpen(true);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Partner Shops</h1>
              <p className="text-muted-foreground mt-1">Manage shop partners and their details.</p>
            </div>
            <Button onClick={() => {
              setFormData({ shopName: '', ownerName: '', mobile: '', address: '' });
              setIsAddOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Shop
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search by ID, shop name, owner, or mobile..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="max-w-md bg-background"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : data?.data.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p>No shops found matching your search.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[120px]">Shop ID</TableHead>
                        <TableHead>Shop Details</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data.map((shop) => (
                        <TableRow key={shop.id}>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">{shop.shopId}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">{shop.shopName}</div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <User className="h-3 w-3 mr-1" /> {shop.ownerName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Phone className="h-3.5 w-3.5 mr-1.5" /> {shop.mobile}
                              </div>
                              <div className="flex items-start">
                                <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 shrink-0" /> 
                                <span className="line-clamp-1">{shop.address}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEdit(shop)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => openDelete(shop)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {data && data.total > data.limit && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * data.limit) + 1} to {Math.min(page * data.limit, data.total)} of {data.total}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page * data.limit >= data.total}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialogs */}
        <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setIsEditOpen(false);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditOpen ? 'Edit Shop' : 'Add New Shop'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={isEditOpen ? handleEditSubmit : handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name</Label>
                <Input required id="shopName" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input required id="ownerName" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input required id="mobile" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input required id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}>Cancel</Button>
                <Button type="submit" disabled={createShop.isPending || updateShop.isPending}>
                  {createShop.isPending || updateShop.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete <strong>{selectedShop?.shopName}</strong> and remove their data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleteShop.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </ProtectedRoute>
  );
}
