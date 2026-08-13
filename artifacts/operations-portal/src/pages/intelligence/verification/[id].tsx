import { useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  useGetVerificationHistory,
  useUpdateVerificationStatus,
  useUpdateIntelligenceBusiness,
  useMarkAsDuplicate,
  IntelligenceBusiness,
  customFetch
} from '@workspace/api-client-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Fix leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  'UNVERIFIED': 'bg-gray-100 text-gray-800',
  'VERIFIED': 'bg-green-100 text-green-800',
  'NEEDS_REVIEW': 'bg-yellow-100 text-yellow-800',
  'REJECTED': 'bg-red-100 text-red-800',
  'DUPLICATE': 'bg-orange-100 text-orange-800',
  'CLOSED': 'bg-slate-100 text-slate-800',
};

export default function VerificationDetail() {
  const [, params] = useRoute('/intelligence/verification/:id');
  const id = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusDialog, setStatusDialog] = useState<{ open: boolean; status: string; note: string }>({ open: false, status: '', note: '' });
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; targetId: string; note: string }>({ open: false, targetId: '', note: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', latitude: 0, longitude: 0 });

  const { data: business, isLoading: loadingBusiness } = useQuery<IntelligenceBusiness>({
    queryKey: ['getIntelligenceBusiness', id],
    queryFn: () => customFetch(`/api/intelligence/businesses/${id}`),
    enabled: !!id,
  });

  const { data: history, isLoading: loadingHistory } = useGetVerificationHistory(id || '', {
    query: { enabled: !!id }
  });

  const updateStatusMutation = useUpdateVerificationStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Status updated' });
        queryClient.invalidateQueries({ queryKey: ['getIntelligenceBusiness', id] });
        queryClient.invalidateQueries({ queryKey: ['getVerificationHistory', id] });
        setStatusDialog({ open: false, status: '', note: '' });
      },
      onError: (err: any) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  });

  const updateBusinessMutation = useUpdateIntelligenceBusiness({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Business details updated' });
        queryClient.invalidateQueries({ queryKey: ['getIntelligenceBusiness', id] });
        setIsEditing(false);
      },
      onError: (err: any) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  });

  const markDuplicateMutation = useMarkAsDuplicate({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Marked as duplicate' });
        queryClient.invalidateQueries({ queryKey: ['getIntelligenceBusiness', id] });
        setDuplicateDialog({ open: false, targetId: '', note: '' });
      },
      onError: (err: any) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  });

  if (!id) return <div>Invalid ID</div>;
  if (loadingBusiness) return <div className="p-8 text-center">Loading...</div>;
  if (!business) return <div className="p-8 text-center text-red-500">Business not found</div>;

  const handleEditClick = () => {
    setEditForm({
      name: business.name || '',
      phone: business.phone || '',
      latitude: business.latitude || 0,
      longitude: business.longitude || 0,
    });
    setIsEditing(true);
  };

  const handleEditSave = () => {
    updateBusinessMutation.mutate({
      id,
      data: {
        name: editForm.name,
        business_type: business.business_type,
        address: business.address,
        phone: editForm.phone,
        latitude: editForm.latitude,
        longitude: editForm.longitude,
      }
    });
  };

  const submitStatus = () => {
    updateStatusMutation.mutate({
      id,
      data: { status: statusDialog.status, note: statusDialog.note }
    });
  };

  const submitDuplicate = () => {
    markDuplicateMutation.mutate({
      id,
      data: { target_id: duplicateDialog.targetId, note: duplicateDialog.note }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {business.name}
            <Badge className={STATUS_COLORS[business.verification_status || 'UNVERIFIED']}>
              {business.verification_status || 'UNVERIFIED'}
            </Badge>
          </h1>
          <p className="text-gray-500 mt-1">{business.business_type} • {business.address}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50" onClick={() => setStatusDialog({ open: true, status: 'VERIFIED', note: '' })}>✓ Verify</Button>
          <Button variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-50" onClick={() => setStatusDialog({ open: true, status: 'NEEDS_REVIEW', note: '' })}>⚠ Needs Review</Button>
          <Button variant="outline" className="border-red-500 text-red-700 hover:bg-red-50" onClick={() => setStatusDialog({ open: true, status: 'REJECTED', note: '' })}>✕ Reject</Button>
          <Button variant="outline" onClick={() => setStatusDialog({ open: true, status: 'CLOSED', note: '' })}>Closed</Button>
          <Button variant="outline" onClick={() => setDuplicateDialog({ open: true, targetId: '', note: '' })}>Duplicate</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Business Details</CardTitle>
              {!isEditing && <Button variant="ghost" onClick={handleEditClick}>Edit</Button>}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Latitude</Label>
                      <Input type="number" step="any" value={editForm.latitude} onChange={e => setEditForm(p => ({...p, latitude: parseFloat(e.target.value)}))} />
                    </div>
                    <div>
                      <Label>Longitude</Label>
                      <Input type="number" step="any" value={editForm.longitude} onChange={e => setEditForm(p => ({...p, longitude: parseFloat(e.target.value)}))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleEditSave} disabled={updateBusinessMutation.isPending}>Save Changes</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div><span className="text-gray-500 block mb-1">Phone</span>{business.phone || '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Website</span>{business.website ? <a href={business.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{business.website}</a> : '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Rating</span>{business.rating ? `${business.rating} (${business.review_count} reviews)` : '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Price Range</span>{business.price_range || '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Cuisine</span>{Array.isArray(business.cuisine) && business.cuisine.length > 0 ? business.cuisine.join(', ') : '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Opening Hours</span>{business.opening_hours || '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Zone</span>{business.zone_id || <span className="text-yellow-600">Unassigned</span>}</div>
                  <div><span className="text-gray-500 block mb-1">Area</span>{business.area_id || <span className="text-yellow-600">Unassigned</span>}</div>
                  <div><span className="text-gray-500 block mb-1">Ward</span>{business.ward_id || <span className="text-yellow-600">Unassigned</span>}</div>
                  <div><span className="text-gray-500 block mb-1">Borough</span>{business.borough_id || <span className="text-yellow-600">Unassigned</span>}</div>
                  <div><span className="text-gray-500 block mb-1">Coordinates</span>{business.latitude && business.longitude ? `${business.latitude}, ${business.longitude}` : <span className="text-red-500">Missing</span>}</div>
                  <div><span className="text-gray-500 block mb-1">Source</span>{business.source || '-'}</div>
                  <div className="md:col-span-2"><span className="text-gray-500 block mb-1">Source ID</span>{business.source_id || '-'}</div>
                  <div className="md:col-span-2"><span className="text-gray-500 block mb-1">Source URL</span>{business.source_url ? <a href={business.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{business.source_url}</a> : '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Last Synced</span>{business.last_synced ? new Date(business.last_synced).toLocaleString() : '-'}</div>
                  <div><span className="text-gray-500 block mb-1">Last Updated</span>{business.last_updated ? new Date(business.last_updated).toLocaleString() : '-'}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Verification History</CardTitle></CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="py-4 text-center">Loading history...</div>
              ) : !history || history.length === 0 ? (
                <div className="py-4 text-center text-gray-500">No history available</div>
              ) : (
                <div className="space-y-4">
                  {history.map(item => (
                    <div key={item.id} className="border-l-2 border-gray-200 pl-4 py-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {item.changed_by || 'System'} changed status
                        {item.previous_status && <Badge variant="outline">{item.previous_status}</Badge>}
                        <span>→</span>
                        <Badge className={STATUS_COLORS[item.new_status]}>{item.new_status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(item.changed_at).toLocaleString()}</div>
                      {item.reason_note && <div className="text-sm mt-2 p-2 bg-gray-50 rounded italic">"{item.reason_note}"</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="p-0 h-[300px] bg-gray-100 rounded-b-xl overflow-hidden relative">
              {business.latitude && business.longitude ? (
                <MapContainer 
                  center={[business.latitude, business.longitude]} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker position={[business.latitude, business.longitude]}>
                    <Popup>{business.name}</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Coordinates not available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDialog.open} onOpenChange={open => !open && setStatusDialog({ open: false, status: '', note: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as {statusDialog.status}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Note (optional)</Label>
            <Textarea 
              value={statusDialog.note} 
              onChange={e => setStatusDialog(p => ({...p, note: e.target.value}))}
              placeholder="Add details about this verification decision..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog({ open: false, status: '', note: '' })}>Cancel</Button>
            <Button onClick={submitStatus} disabled={updateStatusMutation.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialog.open} onOpenChange={open => !open && setDuplicateDialog({ open: false, targetId: '', note: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Duplicate</DialogTitle>
            <CardDescription>Link this business to the canonical original record.</CardDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="mb-2 block">Target Business ID</Label>
              <Input 
                value={duplicateDialog.targetId} 
                onChange={e => setDuplicateDialog(p => ({...p, targetId: e.target.value}))}
                placeholder="Enter the ID of the original business"
              />
            </div>
            <div>
              <Label className="mb-2 block">Note (optional)</Label>
              <Textarea 
                value={duplicateDialog.note} 
                onChange={e => setDuplicateDialog(p => ({...p, note: e.target.value}))}
                placeholder="Why is this a duplicate?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog({ open: false, targetId: '', note: '' })}>Cancel</Button>
            <Button onClick={submitDuplicate} disabled={markDuplicateMutation.isPending || !duplicateDialog.targetId}>Confirm Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
