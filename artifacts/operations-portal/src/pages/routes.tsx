import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Navigation, CheckCircle, XCircle, Clock, Route as RouteIcon, Loader2, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useGetTodayRoute, useGetEligibleShops, useGenerateRoute, useStartRoute, useCompleteRoute, useVisitStop, useSkipStop, useCreateCollection, useGetSettings } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RouteMap from '@/components/RouteMap';

export default function Routes() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showShopSelection, setShowShopSelection] = useState(false);
  const [selectedShops, setSelectedShops] = useState<number[]>([]);
  const [skipReason, setSkipReason] = useState('');
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipStopId, setSkipStopId] = useState<number | null>(null);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [collectionStopId, setCollectionStopId] = useState<number | null>(null);
  const [collectionShopId, setCollectionShopId] = useState<number | null>(null);
  const [collectionWeight, setCollectionWeight] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: todayRoute, isLoading: isLoadingRoute, refetch: refetchRoute } = useGetTodayRoute();
  const { data: eligibleShops, isLoading: isLoadingShops } = useGetEligibleShops();
  const { data: settings } = useGetSettings();
  
  const generateRoute = useGenerateRoute({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Route generated successfully" });
        setShowShopSelection(false);
        setSelectedShops([]);
        refetchRoute();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to generate route", variant: "destructive" });
      }
    }
  });

  const startRoute = useStartRoute({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Route started" });
        refetchRoute();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const completeRoute = useCompleteRoute({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Route completed" });
        refetchRoute();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const visitStop = useVisitStop({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Stop marked as visited" });
        refetchRoute();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const skipStop = useSkipStop({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Stop skipped" });
        setSkipDialogOpen(false);
        setSkipReason('');
        setSkipStopId(null);
        refetchRoute();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  const createCollection = useCreateCollection({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Success", description: "Collection recorded successfully" });
        setCollectionDialogOpen(false);
        setCollectionWeight('');
        setCollectionStopId(null);
        setCollectionShopId(null);
        
        // Mark the stop as visited with the collection ID
        if (todayRoute?.id && collectionStopId !== null) {
          visitStop.mutate({
            path: { id: todayRoute.id, stopId: collectionStopId },
            data: { collectionId: data.id }
          });
        }
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  useEffect(() => {
    refetchRoute();
  }, [selectedDate, refetchRoute]);

  const handleGenerateRoute = () => {
    if (selectedShops.length === 0) {
      toast({ title: "Error", description: "Please select at least one shop", variant: "destructive" });
      return;
    }
    
    generateRoute.mutate({
      data: {
        routeDate: selectedDate,
        shopIds: selectedShops
      }
    });
  };

  const handleStartRoute = () => {
    if (!todayRoute?.id) return;
    startRoute.mutate({
      path: { id: todayRoute.id }
    });
  };

  const handleCompleteRoute = () => {
    if (!todayRoute?.id) return;
    
    const pendingStops = todayRoute.stops?.filter((s: any) => s.status === 'PENDING') || [];
    if (pendingStops.length > 0) {
      toast({ title: "Error", description: "Complete or skip all remaining shops before finishing the route", variant: "destructive" });
      return;
    }
    
    completeRoute.mutate({
      path: { id: todayRoute.id }
    });
  };

  const handleVisitStop = (stopSequence: number, shopId: number) => {
    setCollectionStopId(stopSequence);
    setCollectionShopId(shopId);
    setCollectionDialogOpen(true);
  };

  const handleCreateCollection = () => {
    if (!collectionShopId) {
      toast({ title: "Error", description: "Shop ID missing", variant: "destructive" });
      return;
    }
    
    const weight = parseFloat(collectionWeight);
    if (isNaN(weight) || weight <= 0) {
      toast({ title: "Error", description: "Weight must be greater than 0", variant: "destructive" });
      return;
    }
    
    createCollection.mutate({
      data: {
        shopId: collectionShopId,
        collectionDate: selectedDate,
        weightKg: weight,
        routeId: todayRoute?.id,
        routeStopSequence: collectionStopId
      }
    });
  };

  const handleSkipStop = (stopSequence: number) => {
    setSkipStopId(stopSequence);
    setSkipDialogOpen(true);
  };

  const handleConfirmSkip = () => {
    if (!todayRoute?.id || skipStopId === null) return;
    
    if (!skipReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for skipping", variant: "destructive" });
      return;
    }
    
    skipStop.mutate({
      path: { id: todayRoute.id, stopId: skipStopId },
      data: { skipReason: skipReason.trim() }
    });
  };

  const handleNavigate = (latitude: number, longitude: number) => {
    // Open device's default map application
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const handleSelectAll = () => {
    if (eligibleShops) {
      setSelectedShops(eligibleShops.map((s: any) => s.id));
    }
  };

  const handleClearAll = () => {
    setSelectedShops([]);
  };

  const toggleShop = (shopId: number) => {
    setSelectedShops(prev => 
      prev.includes(shopId) 
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    );
  };

  const formatDistance = (km: number) => {
    return `${km.toFixed(1)} km`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Route Planner</h1>
              <p className="text-muted-foreground mt-1">Plan and manage your collection routes.</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-md border border-border bg-background"
            />
          </div>

          {isLoadingRoute ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !todayRoute ? (
            <Card>
              <CardHeader>
                <CardTitle>No Route Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  No route has been generated for {selectedDate}.
                </p>
                <Button onClick={() => setShowShopSelection(true)}>
                  Generate Today's Route
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Route Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Today's Collection Route</CardTitle>
                    <Badge variant={todayRoute.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {todayRoute.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatDistance(todayRoute.totalDistanceKm)}</div>
                      <div className="text-sm text-muted-foreground">Total Distance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{todayRoute.totalShops}</div>
                      <div className="text-sm text-muted-foreground">Shops</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatDuration(todayRoute.estimatedDurationMinutes)}</div>
                      <div className="text-sm text-muted-foreground">Est. Duration</div>
                    </div>
                  </div>
                  
                  {todayRoute.status === 'PLANNED' && (
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleStartRoute}
                      disabled={startRoute.isPending}
                    >
                      {startRoute.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RouteIcon className="mr-2 h-4 w-4" />
                      )}
                      Start Route
                    </Button>
                  )}
                  
                  {todayRoute.status === 'IN_PROGRESS' && (
                    <Button 
                      className="w-full" 
                      size="lg" 
                      variant="default"
                      onClick={handleCompleteRoute}
                      disabled={completeRoute.isPending}
                    >
                      {completeRoute.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Complete Route
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Map */}
              <Card>
                <CardHeader>
                  <CardTitle>Route Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteMap route={todayRoute} />
                </CardContent>
              </Card>

              {/* Route Stops */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Route Stops</h2>
                {todayRoute.stops.map((stop: any, index: number) => (
                  <Card key={stop.sequence}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {stop.sequence}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{stop.shopName}</h3>
                            <Badge variant={
                              stop.status === 'VISITED' ? 'default' :
                              stop.status === 'SKIPPED' ? 'destructive' : 'secondary'
                            }>
                              {stop.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistance(stop.distanceFromPreviousKm)} from previous
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ETA: {formatDuration(stop.estimatedArrivalMinutes)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleNavigate(stop.latitude, stop.longitude)}
                            >
                              <Navigation className="mr-2 h-3 w-3" />
                              Navigate
                            </Button>
                            {stop.status === 'PENDING' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleVisitStop(stop.sequence, stop.shopId)}
                                  disabled={visitStop.isPending}
                                >
                                  {visitStop.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Collect'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleSkipStop(stop.sequence)}
                                >
                                  <XCircle className="mr-2 h-3 w-3" />
                                  Skip
                                </Button>
                              </>
                            )}
                            {stop.status === 'VISITED' && (
                              <Button size="sm" variant="ghost" disabled>
                                <CheckCircle className="mr-2 h-3 w-3" />
                                Visited
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Return Home */}
              <Card className="border-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      🏠
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Return Home</h3>
                      <p className="text-sm text-muted-foreground">Final destination</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Shop Selection Dialog */}
          <Dialog open={showShopSelection} onOpenChange={setShowShopSelection}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Shops for Route</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSelectAll} disabled={isLoadingShops}>
                    Select All
                  </Button>
                  <Button variant="outline" onClick={handleClearAll} disabled={isLoadingShops}>
                    Clear All
                  </Button>
                </div>
                
                {isLoadingShops ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : eligibleShops && eligibleShops.length > 0 ? (
                  <div className="space-y-2">
                    {eligibleShops.map((shop: any) => (
                      <div key={shop.id} className="flex items-center gap-3 p-3 border rounded-md">
                        <Checkbox
                          checked={selectedShops.includes(shop.id)}
                          onCheckedChange={() => toggleShop(shop.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{shop.shopName}</div>
                          <div className="text-sm text-muted-foreground">
                            {shop.ownerName} • {shop.mobile}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          ✓ GPS Available
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No shops with GPS coordinates available. Please add GPS to shops first.
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowShopSelection(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerateRoute}
                    disabled={selectedShops.length === 0 || generateRoute.isPending}
                  >
                    {generateRoute.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Generate Route'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Skip Reason Dialog */}
          <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Skip Shop</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skipReason">Reason for skipping</Label>
                  <Textarea
                    id="skipReason"
                    placeholder="e.g., Shop closed, Owner unavailable, No bottles..."
                    value={skipReason}
                    onChange={(e) => setSkipReason(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmSkip}
                    disabled={skipStop.isPending || !skipReason.trim()}
                  >
                    {skipStop.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Skip'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Collection Dialog */}
          <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weightKg">Weight (KG)</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="e.g., 5.5"
                    value={collectionWeight}
                    onChange={(e) => setCollectionWeight(e.target.value)}
                  />
                </div>
                
                {settings && (
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rate:</span>
                      <span className="font-medium">₹{settings.pricePerKg}/KG</span>
                    </div>
                    {collectionWeight && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Estimated Total:</span>
                        <span className="font-medium text-primary">
                          ₹{(parseFloat(collectionWeight) * settings.pricePerKg).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCollectionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCollection}
                    disabled={createCollection.isPending || !collectionWeight}
                  >
                    {createCollection.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Package className="mr-2 h-4 w-4" />
                        Record Collection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
