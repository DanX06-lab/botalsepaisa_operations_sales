import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Shops from '@/pages/shops';
import Collections from '@/pages/collections';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';
import Routes from '@/pages/routes';
import RouteHistory from '@/pages/route-history';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

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
      <Route path="/collections" component={Collections} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route path="/routes" component={Routes} />
      <Route path="/routes/history" component={RouteHistory} />
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
