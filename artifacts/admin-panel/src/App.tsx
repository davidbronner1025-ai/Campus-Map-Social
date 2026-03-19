import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import { Layout } from "@/components/layout";
import RootRedirect from "@/pages/root";
import SetupPage from "@/pages/setup";
import LocationsPage from "@/pages/locations";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/setup">
        <Layout>
          <SetupPage />
        </Layout>
      </Route>
      <Route path="/locations">
        <Layout>
          <LocationsPage />
        </Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
