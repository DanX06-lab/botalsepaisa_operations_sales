import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { 
  useGetApiProspects, 
  usePostApiProspects, 
  usePutApiProspectsIdConvert,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Search, Plus, MapPin, Users, Store, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';

const ZONES = ['All', 'North', 'South', 'East', 'Central', 'Salt Lake', 'New Town'];

type FormData = {
  name: string;
  address: string;
  zone: string;
};

const EMPTY_FORM: FormData = { name: '', address: '', zone: '' };

export default function Prospects() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [activeZone, setActiveZone] = useState('All');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prospectsData, isLoading } = useGetApiProspects({
    search: debouncedSearch || undefined,
    zone: activeZone === 'All' ? undefined : activeZone
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const createProspect = usePostApiProspects({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Prospect added successfully" });
        queryClient.invalidateQueries({ queryKey: ['getApiProspects'] });
        setIsAddOpen(false);
        setFormData(EMPTY_FORM);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to add prospect", variant: "destructive" });
      }
    }
  });

  const convertToShop = usePutApiProspectsIdConvert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Prospect converted to shop successfully" });
        queryClient.invalidateQueries({ queryKey: ['getApiProspects'] });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to convert prospect", variant: "destructive" });
      }
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.zone) {
      toast({ title: "Validation Error", description: "Name, Address, and Zone are required", variant: "destructive" });
      return;
    }
    
    createProspect.mutate({
      data: {
        name: formData.name,
        address: formData.address,
        zone: formData.zone,
      }
    });
  };

  const handleConvert = (id: string) => {
    convertToShop.mutate({ id });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cafe Prospects</h1>
              <p className="text-muted-foreground mt-1">Manage potential partner cafes and convert them to shops.</p>
            </div>
            <Button onClick={() => {
              setFormData(EMPTY_FORM);
              setIsAddOpen(true);
            }} size="lg" className="shadow-md">
              <Plus className="h-5 w-5 mr-2" />
              Add Prospect
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search prospects..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full bg-background"
                />
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {ZONES.map(zone => (
                  <Button
                    key={zone}
                    variant={activeZone === zone ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setActiveZone(zone)}
                  >
                    {zone}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : prospectsData?.data?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-1">No prospects found</h3>
              <p>Try adjusting your search or filters.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setActiveZone('All'); }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prospectsData?.data?.map((prospect: any) => (
                <Card key={prospect.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50">
                  <div className="h-2 w-full bg-gradient-to-r from-primary/60 to-primary" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                          {prospect.name}
                        </CardTitle>
                        <Badge variant="secondary" className="font-medium bg-secondary/50">
                          {prospect.zone}
                        </Badge>
                      </div>
                      {prospect.status === 'converted' ? (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-2 rounded-full">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="bg-primary/10 text-primary p-2 rounded-full">
                          <Store className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-muted-foreground/70" />
                      <span className="line-clamp-2">{prospect.address}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 pb-4 bg-muted/20 border-t">
                    {prospect.status === 'converted' ? (
                      <div className="w-full text-center text-sm font-medium text-muted-foreground py-2 flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Converted to Shop
                      </div>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant="default"
                        onClick={() => handleConvert(prospect.id)}
                        disabled={convertToShop.isPending}
                      >
                        {convertToShop.isPending ? 'Converting...' : (
                          <>
                            Convert to Shop
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add Dialog */}
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setFormData(EMPTY_FORM);
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add Cafe Prospect</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-6 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Cafe Name</Label>
                <Input required id="name" placeholder="E.g. The Daily Roast" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="focus-visible:ring-primary/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Select value={formData.zone} onValueChange={value => setFormData({...formData, zone: value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONES.filter(z => z !== 'All').map(zone => (
                      <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea 
                  required 
                  id="address" 
                  placeholder="Enter complete street address..." 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  className="min-h-[100px] resize-none"
                />
              </div>
              
              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { 
                  setIsAddOpen(false); 
                  setFormData(EMPTY_FORM);
                }}>Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={createProspect.isPending}
                >
                  {createProspect.isPending ? 'Adding...' : 'Add Prospect'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
}
