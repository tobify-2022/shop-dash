import { Route, Switch } from 'wouter';
import Home from './pages/Home';

export function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route>404 - Page Not Found</Route>
    </Switch>
  );
}

