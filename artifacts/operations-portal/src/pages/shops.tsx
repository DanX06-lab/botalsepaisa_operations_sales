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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, Plus, Edit2, Trash2, Phone, User, Store, Camera, X, Image, MapPin, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { value: "+91", label: "🇮🇳 +91 (IN)" },
  { value: "+1", label: "🇺🇸 +1 (US)" },
  { value: "+44", label: "🇬🇧 +44 (UK)" },
  { value: "+61", label: "🇦🇺 +61 (AU)" },
  { value: "+971", label: "🇦🇪 +971 (AE)" },
];

type FormData = {
  shopName: string;
  ownerName: string;
  phoneNumber: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photoBase64: string;
  remark: string;
};

const EMPTY_FORM: FormData = { shopName: '', ownerName: '', phoneNumber: '', countryCode: '+91', latitude: null, longitude: null, accuracy: null, photoBase64: '', remark: '' };

const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

const isValidPhone = (phone: string) => {
  const normalized = normalizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(normalized);
};

export default function Shops() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error, refetch } = useListShops({ 
    page, 
    limit: 10, 
    search: debouncedSearch || undefined 
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string>('');
  
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; shop: any | null }>({
    open: false,
    shop: null,
  });
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const createShop = useCreateShop({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Shop created successfully" });
        queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
        setIsAddOpen(false);
        setFormData(EMPTY_FORM);
        setPhoneTouched(false);
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
        setPhoneTouched(false);
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
    setPhoneTouched(true);
    
    if (!formData.shopName || !formData.ownerName || !formData.phoneNumber) {
      toast({ title: "Validation Error", description: "Shop name, owner name, and mobile are required", variant: "destructive" });
      return;
    }

    if (!isValidPhone(formData.phoneNumber)) {
      toast({ title: "Validation Error", description: "Enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }
    
    if (formData.latitude === null || formData.longitude === null) {
      toast({ title: "GPS Required", description: "GPS location capture is required to add a new shop", variant: "destructive" });
      return;
    }
    
    if (!formData.photoBase64) {
      toast({ title: "Photo Required", description: "Camera permission is required to capture the shop photo", variant: "destructive" });
      return;
    }
    
    createShop.mutate({
      data: {
        shopName: formData.shopName,
        ownerName: formData.ownerName,
        mobile: normalizePhoneNumber(formData.phoneNumber),
        latitude: formData.latitude ?? undefined,
        longitude: formData.longitude ?? undefined,
        accuracy: formData.accuracy ?? undefined,
        photoBase64: formData.photoBase64,
        remark: formData.remark,
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    setPhoneTouched(true);

    if (!formData.phoneNumber || !isValidPhone(formData.phoneNumber)) {
      toast({ title: "Validation Error", description: "Enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }

    updateShop.mutate({
      id: selectedShop.id,
      data: {
        shopName: formData.shopName,
        ownerName: formData.ownerName,
        mobile: normalizePhoneNumber(formData.phoneNumber),
        ...(formData.latitude !== null && { latitude: formData.latitude }),
        ...(formData.longitude !== null && { longitude: formData.longitude }),
        ...(formData.accuracy !== null && { accuracy: formData.accuracy }),
        ...(formData.photoBase64 && formData.photoBase64.startsWith('data:') && { photoBase64: formData.photoBase64 }),
        ...(formData.remark !== undefined && { remark: formData.remark }),
      }
    });
  };

  const handleDelete = () => {
    if (!selectedShop) return;
    deleteShop.mutate({ id: selectedShop.id });
  };

  const openEdit = (shop: any) => {
    setSelectedShop(shop);
    let phoneNumber = shop.mobile || '';
    if (phoneNumber.startsWith('+91') && phoneNumber.length === 13) {
      phoneNumber = phoneNumber.slice(3);
    }
    setFormData({
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      phoneNumber: shop.mobile,
      countryCode: '+91',
      latitude: shop.latitude || null,
      longitude: shop.longitude ?? null,
      accuracy: shop.accuracy ?? null,
      photoBase64: shop.photoUrl ?? '',
      remark: shop.remark || '',
    });
    setPhoneTouched(false);
    setLocationStatus('idle');
    setIsEditOpen(true);
  };

  const openDelete = (shop: any) => {
    setSelectedShop(shop);
    setIsDeleteOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS Not Supported", description: "Geolocation is not supported by your browser", variant: "destructive" });
      return;
    }

    setLocationStatus('capturing');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }));
        setLocationStatus('success');
        toast({ 
          title: "Location Captured", 
          description: `GPS accuracy: ${Math.round(position.coords.accuracy)}m` 
        });
      },
      (error) => {
        setLocationStatus('error');
        let errorMessage = 'Failed to capture location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable GPS access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        toast({ title: "GPS Error", description: errorMessage, variant: "destructive" });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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
              setPhoneTouched(false);
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
              ) : isError ? (
                <Alert variant="destructive" className="my-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Shops</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>There was a problem loading the shops data. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit">
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
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
                              {shop.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => { setViewPhoto(shop.photoUrl!); setIsPhotoOpen(true); }}
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
                            {shop.remark && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Remark:</span> {shop.remark}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Phone className="h-3.5 w-3.5 mr-1.5" /> {shop.mobile}
                              </div>
                              {shop.latitude && shop.longitude && (
                                <div className="flex items-center">
                                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                                  <span className="text-xs">
                                    {shop.latitude.toFixed(4)}, {shop.longitude.toFixed(4)}
                                  </span>
                                  {shop.accuracy && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      (±{Math.round(shop.accuracy)}m)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setViewDialog({ open: true, shop })}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
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

        <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setIsEditOpen(false);
            setPhoneTouched(false);
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
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.countryCode}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, countryCode: value }))}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="+91" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    required 
                    id="phoneNumber" 
                    name="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={formData.phoneNumber} 
                    onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))} 
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="9876543210" 
                    className="flex-1"
                  />
                </div>
                {phoneTouched && !isValidPhone(formData.phoneNumber) && (
                  <p className="text-xs text-destructive">Enter a valid 10-digit mobile number.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">Remark (Optional)</Label>
                <Input id="remark" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} placeholder="Any additional details..." />
              </div>

              <div className="space-y-2">
                <Label>GPS Location <span className="text-red-500 text-xs">(required)</span></Label>
                {locationStatus === 'success' ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-900 dark:text-green-100">✓ Location captured</div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        GPS accuracy: {formData.accuracy ? Math.round(formData.accuracy) : 'N/A'}m
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleCaptureLocation}>
                      Recapture
                    </Button>
                  </div>
                ) : locationStatus === 'error' ? (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-900 dark:text-red-100">GPS capture failed</div>
                      <div className="text-xs text-red-700 dark:text-red-300">{locationError}</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleCaptureLocation}>
                      Retry
                    </Button>
                  </div>
                ) : locationStatus === 'capturing' ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">Capturing GPS location...</div>
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleCaptureLocation}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Capture Current GPS Location
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Shop Photo {isEditOpen ? <span className="text-muted-foreground text-xs">(optional)</span> : <span className="text-red-500 text-xs">(required)</span>}</Label>
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
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      ✓ Shop photo captured
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer bg-muted/30"
                  >
                    <Camera className="h-8 w-8" />
                    <span className="text-sm font-medium">Capture Shop Photo</span>
                    <span className="text-xs">Camera required</span>
                  </button>
                )}
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
                <Button type="button" variant="outline" onClick={() => { 
                  setIsAddOpen(false); 
                  setIsEditOpen(false); 
                  setLocationStatus('idle');
                  setFormData(EMPTY_FORM);
                }}>Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={createShop.isPending || updateShop.isPending || locationStatus === 'capturing'}
                >
                  {createShop.isPending || updateShop.isPending ? 'Saving...' : 'Save Shop'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete <strong>{selectedShop?.shopName}</strong> and remove their data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteShop.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleteShop.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleteShop.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={viewDialog.open} onOpenChange={(open) => !open && setViewDialog({ open: false, shop: null })}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Shop Details</DialogTitle>
            </DialogHeader>
            
            {viewDialog.shop && (
              <div className="space-y-6">
                {viewDialog.shop.photoUrl && (
                  <div className="w-full h-48 relative rounded-md overflow-hidden bg-muted">
                    <img src={viewDialog.shop.photoUrl} alt="Shop photo" className="object-cover w-full h-full" />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Shop ID</Label>
                      <div className="font-medium">{viewDialog.shop.shopId || viewDialog.shop.id}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Shop Name</Label>
                      <div className="font-medium">{viewDialog.shop.shopName}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Owner Name</Label>
                      <div className="font-medium">{viewDialog.shop.ownerName}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Mobile</Label>
                      <div className="font-medium">{viewDialog.shop.mobile}</div>
                    </div>
                  </div>

                  {viewDialog.shop.latitude && viewDialog.shop.longitude && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Location Coordinates</Label>
                      <div className="font-medium flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-1 text-primary" />
                        {viewDialog.shop.latitude.toFixed(6)}, {viewDialog.shop.longitude.toFixed(6)}
                        {viewDialog.shop.accuracy && (
                          <span className="text-muted-foreground ml-2">(±{Math.round(viewDialog.shop.accuracy)}m)</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {viewDialog.shop.remark && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Remark</Label>
                      <div className="text-sm p-3 bg-muted rounded-md mt-1 border">
                        {viewDialog.shop.remark}
                      </div>
                    </div>
                  )}
                  
                  {viewDialog.shop.createdAt && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Created At</Label>
                      <div className="font-medium text-sm">
                        {new Date(viewDialog.shop.createdAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter className="sm:justify-end mt-4">
              <Button variant="secondary" onClick={() => setViewDialog({ open: false, shop: null })}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
}
