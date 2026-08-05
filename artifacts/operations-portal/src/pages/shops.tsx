import { useState, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, Plus, Edit2, Trash2, MapPin, Phone, User, Store, Camera, X, Image } from 'lucide-react';
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

type FormData = {
  shopName: string;
  ownerName: string;
  mobile: string;
  address: string;
  remarks: string;
  photoBase64: string;
};

const EMPTY_FORM: FormData = { shopName: '', ownerName: '', mobile: '', address: '', remarks: '', photoBase64: '' };

export default function Shops() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useListShops({ 
    page, 
    limit: 10, 
    search: debouncedSearch || undefined 
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const createShop = useCreateShop({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Shop created successfully" });
        queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
        setIsAddOpen(false);
        setFormData(EMPTY_FORM);
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
    createShop.mutate({
      data: {
        shopName: formData.shopName,
        ownerName: formData.ownerName,
        mobile: formData.mobile,
        address: formData.address,
        ...(formData.remarks ? { remarks: formData.remarks } : {}),
        ...(formData.photoBase64 ? { photoBase64: formData.photoBase64 } : {}),
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    updateShop.mutate({
      id: selectedShop.id,
      data: {
        shopName: formData.shopName,
        ownerName: formData.ownerName,
        mobile: formData.mobile,
        address: formData.address,
        remarks: formData.remarks,
        photoBase64: formData.photoBase64,
      }
    });
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
      remarks: shop.remarks ?? '',
      photoBase64: shop.photoBase64 ?? '',
    });
    setIsEditOpen(true);
  };

  const openDelete = (shop: any) => {
    setSelectedShop(shop);
    setIsDeleteOpen(true);
  };

  // Handle file/camera input → convert to base64
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Photo too large", description: "Please use a photo under 5 MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, photoBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setFormData(prev => ({ ...prev, photoBase64: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              setFormData(EMPTY_FORM);
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
                            <div className="flex flex-col gap-1.5">
                              <Badge variant="secondary" className="font-mono text-xs w-fit">{shop.shopId}</Badge>
                              {shop.photoBase64 && (
                                <button
                                  type="button"
                                  onClick={() => { setViewPhoto(shop.photoBase64!); setIsPhotoOpen(true); }}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Image className="h-3 w-3" /> Photo
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">{shop.shopName}</div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <User className="h-3 w-3 mr-1" /> {shop.ownerName}
                            </div>
                            {shop.remarks && (
                              <div className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                                "{shop.remarks}"
                              </div>
                            )}
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

        {/* Add/Edit Dialog */}
        <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setIsEditOpen(false);
          }
        }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
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

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  id="remarks"
                  placeholder="Any notes about this shop or location…"
                  value={formData.remarks}
                  onChange={e => setFormData({...formData, remarks: e.target.value})}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Photo capture */}
              <div className="space-y-2">
                <Label>Shop Photo <span className="text-muted-foreground text-xs">(optional)</span></Label>
                {formData.photoBase64 ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={formData.photoBase64}
                      alt="Shop preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                      aria-label="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer bg-muted/30"
                  >
                    <Camera className="h-8 w-8" />
                    <span className="text-sm font-medium">Take photo or choose from gallery</span>
                    <span className="text-xs">Max 5 MB</span>
                  </button>
                )}
                {/* Hidden file input — capture="environment" opens rear camera on mobile */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
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

        {/* Photo Viewer */}
        <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
          <DialogContent className="max-w-lg p-2">
            <DialogHeader className="p-2 pb-0">
              <DialogTitle>Shop Photo</DialogTitle>
            </DialogHeader>
            {viewPhoto && (
              <img src={viewPhoto} alt="Shop" className="w-full rounded-lg object-contain max-h-[70vh]" />
            )}
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
