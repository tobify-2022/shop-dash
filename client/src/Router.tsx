import { Route, Switch } from 'wouter';
import { AppLayout } from './components/layout/AppLayout';
import ShopPayInstallmentsDashboard from './pages/ShopPayInstallmentsDashboard';
import ShopPayDashboard from './pages/ShopPayDashboard';
import Home from './pages/Home';
import Changelog from './pages/Changelog';
import FeatureRequests from './pages/FeatureRequests';
import { usePageTitle } from './hooks/usePageTitle';

function RouterContent() {
  usePageTitle();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop-pay-installments" component={ShopPayInstallmentsDashboard} />
      <Route path="/shop-pay" component={ShopPayDashboard} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/feature-requests" component={FeatureRequests} />
      <Route>
        {() => <Home />}
      </Route>
    </Switch>
  );
}

export function Router() {
  return (
    <AppLayout>
      <RouterContent />
    </AppLayout>
  );
}

