import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { useGetDashboard } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Package, IndianRupee, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of operations and collections.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover-elevate transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Shops</CardTitle>
                <div className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center">
                  <Store className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-foreground">{data?.totalShops}</div>
                )}
              </CardContent>
            </Card>
            
            <Card className="hover-elevate transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total KG Collected</CardTitle>
                <div className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-3xl font-bold text-foreground">{data?.totalKgCollected} KG</div>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
                <div className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-3xl font-bold text-foreground">
                    {formatCurrency(data?.totalAmountPayable || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-shadow border-destructive/20 bg-destructive/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Pending Payments</CardTitle>
                <div className="h-8 w-8 bg-destructive/10 rounded-md flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-destructive/20" />
                ) : (
                  <div className="text-3xl font-bold text-destructive">{data?.pendingPayments}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Collections</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : data?.recentCollections?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent collections found.</div>
              ) : (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.recentCollections.map((col) => (
                        <TableRow key={col.id}>
                          <TableCell className="font-medium">{formatDate(col.collectionDate)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{col.shop?.shopName}</span>
                              <span className="text-xs text-muted-foreground">{col.shop?.shopId}</span>
                            </div>
                          </TableCell>
                          <TableCell>{col.weightKg} KG</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(col.totalAmount)}</TableCell>
                          <TableCell>
                            {col.paymentStatus === 'PAID' ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">PAID</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">PENDING</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
