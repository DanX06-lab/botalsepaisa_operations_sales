import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Shops from '@/pages/shops';
import Prospects from '@/pages/prospects';
import Pickups from '@/pages/pickups';
import Collections from '@/pages/collections';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';
import Routes from '@/pages/routes';
import RouteHistory from '@/pages/route-history';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import IntelligenceOverview from '@/pages/intelligence/overview';
import IntelligenceCafes from '@/pages/intelligence/cafes';
import IntelligenceRestaurants from '@/pages/intelligence/restaurants';
import IntelligenceMap from '@/pages/intelligence/map';
import IntelligenceZones from '@/pages/intelligence/zones';
import IntelligenceAreas from '@/pages/intelligence/areas';
import IntelligenceWards from '@/pages/intelligence/wards';
import IntelligenceBoroughs from '@/pages/intelligence/boroughs';
import IntelligenceDataSources from '@/pages/intelligence/data-sources';
import IntelligenceImport from '@/pages/intelligence/import';
import IntelligenceCoverage from '@/pages/intelligence/coverage';
import IntelligenceDuplicates from '@/pages/intelligence/duplicates';
import IntelligenceAnalytics from '@/pages/intelligence/analytics';
import VerificationQueue from '@/pages/intelligence/verification/queue';
import VerificationDetail from '@/pages/intelligence/verification/[id]';

const queryClient = new QueryClient();

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Redirect to={isAuthenticated ? "/dashboard" : "/login"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/index.html"><Redirect to="/" /></Route>
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/shops" component={Shops} />
      <Route path="/pickups" component={Pickups} />
      <Route path="/prospects" component={Prospects} />
      <Route path="/collections" component={Collections} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route path="/routes" component={Routes} />
      <Route path="/routes/history" component={RouteHistory} />
      <Route path="/intelligence/overview" component={IntelligenceOverview} />
      <Route path="/intelligence/cafes" component={IntelligenceCafes} />
      <Route path="/intelligence/restaurants" component={IntelligenceRestaurants} />
      <Route path="/intelligence/map" component={IntelligenceMap} />
      <Route path="/intelligence/zones" component={IntelligenceZones} />
      <Route path="/intelligence/areas" component={IntelligenceAreas} />
      <Route path="/intelligence/wards" component={IntelligenceWards} />
      <Route path="/intelligence/boroughs" component={IntelligenceBoroughs} />
      <Route path="/intelligence/data-sources" component={IntelligenceDataSources} />
      <Route path="/intelligence/import" component={IntelligenceImport} />
      <Route path="/intelligence/coverage" component={IntelligenceCoverage} />
      <Route path="/intelligence/duplicates" component={IntelligenceDuplicates} />
      <Route path="/intelligence/analytics" component={IntelligenceAnalytics} />
      <Route path="/intelligence/verification/queue" component={VerificationQueue} />
      <Route path="/intelligence/verification/:id" component={VerificationDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
