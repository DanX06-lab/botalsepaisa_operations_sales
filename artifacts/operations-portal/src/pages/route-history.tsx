import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useListRoutes } from '@workspace/api-client-react';

export default function RouteHistory() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const { data: routes, isLoading } = useListRoutes();

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

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateStr));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Planned</Badge>;
    }
  };

  const filteredRoutes = routes?.filter((route: any) => 
    route.routeDate.startsWith(selectedMonth)
  ) || [];

  const completedCount = filteredRoutes.filter((r: any) => r.status === 'COMPLETED').length;
  const totalDistance = filteredRoutes.reduce((sum: number, r: any) => sum + (r.status === 'COMPLETED' ? r.totalDistanceKm : 0), 0);
  const totalShops = filteredRoutes.reduce((sum: number, r: any) => sum + (r.status === 'COMPLETED' ? r.totalShops : 0), 0);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Route History</h1>
              <p className="text-muted-foreground mt-1">View your past collection routes.</p>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-md border border-border bg-background"
            />
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Routes Completed</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="text-2xl font-bold">{completedCount}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Distance</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="text-2xl font-bold">{formatDistance(totalDistance)}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Shops Visited</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="text-2xl font-bold">{totalShops}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Route List */}
          <Card>
            <CardHeader>
              <CardTitle>Routes for {selectedMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No routes found for {selectedMonth}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRoutes.map((route: any) => (
                    <div key={route.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{formatDate(route.routeDate)}</h3>
                            {getStatusBadge(route.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Route #{route.id}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{route.totalShops} stops</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(route.estimatedDurationMinutes)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{formatDistance(route.totalDistanceKm)}</span>
                        </div>
                      </div>

                      {/* Stop Summary */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            {route.stops.filter((s: any) => s.status === 'VISITED').length} visited
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-destructive" />
                            {route.stops.filter((s: any) => s.status === 'SKIPPED').length} skipped
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {route.stops.filter((s: any) => s.status === 'PENDING').length} pending
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
