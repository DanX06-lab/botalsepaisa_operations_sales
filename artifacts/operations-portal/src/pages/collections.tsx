import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { 
  useCreateCollection,
  useListShops,
  useGetSettings,
  getListCollectionsQueryKey,
  getGetDashboardQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IndianRupee, Info, Search, Check, ChevronsUpDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export default function Collections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [shopId, setShopId] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [openShopSelect, setOpenShopSelect] = useState(false);

  const { data: shopsData } = useListShops({ limit: 1000 }); // get all for combo
  const { data: settings } = useGetSettings();

  const createCollection = useCreateCollection({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Collection recorded successfully." });
        queryClient.invalidateQueries({ queryKey: getListCollectionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setLocation('/dashboard');
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) {
      toast({ title: "Required", description: "Please select a shop.", variant: "destructive" });
      return;
    }
    
    createCollection.mutate({
      data: {
        shopId: parseInt(shopId, 10),
        collectionDate
      }
    });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Record Collection</h1>
            <p className="text-muted-foreground mt-1">Enter daily/weekly plastic collection from a partner shop.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collection Entry</CardTitle>
              <CardDescription>Record a new pickup from a shop. Weight and price will be updated later.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="shop">Select Shop</Label>
                  <Popover open={openShopSelect} onOpenChange={setOpenShopSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openShopSelect}
                        className="justify-between bg-background"
                      >
                        {shopId
                          ? shopsData?.data.find((shop) => shop.id.toString() === shopId)?.shopName || 'Unknown Shop'
                          : "Search and select a shop..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search shop..." />
                        <CommandList>
                          <CommandEmpty>No shop found.</CommandEmpty>
                          <CommandGroup>
                            {shopsData?.data.map((shop) => (
                              <CommandItem
                                key={shop.id}
                                value={`${shop.shopId} ${shop.shopName} ${shop.ownerName}`}
                                onSelect={() => {
                                  setShopId(shop.id.toString());
                                  setOpenShopSelect(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    shopId === shop.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{shop.shopName}</span>
                                  <span className="text-xs text-muted-foreground">{shop.shopId} • {shop.ownerName}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">Collection Date</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      required 
                      value={collectionDate}
                      onChange={(e) => setCollectionDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg" 
                  disabled={createCollection.isPending || !settings}
                >
                  {createCollection.isPending ? 'Saving...' : 'Record Collection'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
