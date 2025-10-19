import { Route, Switch } from 'wouter';
import { AppLayout } from './components/layout/AppLayout';
import Home from './pages/Home';

// Placeholder pages for navigation
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-full bg-background">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground mt-2">Coming soon...</p>
    </div>
  </div>
);

export function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/merchants">
          {() => <PlaceholderPage title="All Merchants" />}
        </Route>
        <Route path="/calls">
          {() => <PlaceholderPage title="Calls" />}
        </Route>
        <Route path="/opportunities">
          {() => <PlaceholderPage title="Opportunities" />}
        </Route>
        <Route path="/success-plans">
          {() => <PlaceholderPage title="Success Plans" />}
        </Route>
        <Route path="/goals/nrr">
          {() => <PlaceholderPage title="NRR Goals" />}
        </Route>
        <Route path="/goals/ipp">
          {() => <PlaceholderPage title="IPP Goals" />}
        </Route>
        <Route path="/goals/wdoll">
          {() => <PlaceholderPage title="WDOLL Goals" />}
        </Route>
        <Route path="/reports">
          {() => <PlaceholderPage title="Reports" />}
        </Route>
        <Route path="/settings">
          {() => <PlaceholderPage title="Settings" />}
        </Route>
        <Route>
          {() => <PlaceholderPage title="404 - Page Not Found" />}
        </Route>
      </Switch>
    </AppLayout>
  );
}

