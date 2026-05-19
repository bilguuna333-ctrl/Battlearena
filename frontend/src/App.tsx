import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BattleInviteNotification } from "@/components/BattleInviteNotification";
import { GoogleOAuthProvider } from "@react-oauth/google";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Problems from "@/pages/Problems";
import ProblemDetail from "@/pages/ProblemDetail";
import BattleQueue from "@/pages/BattleQueue";
import LiveBattle from "@/pages/LiveBattle";
import Lobby from "@/pages/Lobby";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import Seasons from "@/pages/Seasons";
import Replays from "@/pages/Replays";
import Replay from "@/pages/Replay";
import Missions from "@/pages/Missions";
import Social from "@/pages/Social";
import Messages from "@/pages/Messages";
import Hiring from "@/pages/Hiring";
import HiringDetail from "@/pages/HiringDetail";
import Bosses from "@/pages/Bosses";
import BossFight from "@/pages/BossFight";
import Analytics from "@/pages/Analytics";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Replace with your actual Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

function Router() {
  const [location] = useLocation();
  const isLiveBattle = /^\/battle\/[^/]+$/.test(location);

  return (
    <div className="min-h-screen bg-[#111111] text-gray-300 flex flex-col selection:bg-orange-500/30 font-sans">
      {!isLiveBattle && <Navbar />}
      <div className="flex-1 flex overflow-x-hidden">
        {!isLiveBattle && <LeftSidebar />}
        <main className="flex-1 flex flex-col overflow-x-hidden">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/problems" component={Problems} />
          <Route path="/problems/:slug" component={ProblemDetail} />
          <Route path="/battle" component={BattleQueue} />
          <Route path="/battle/:id" component={LiveBattle} />
          <Route path="/lobby/:code" component={Lobby} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/profile/:username" component={Profile} />
          <Route path="/seasons" component={Seasons} />
          <Route path="/replays" component={Replays} />
          <Route path="/replay/:id" component={Replay} />
          <Route path="/missions" component={Missions} />
          <Route path="/social" component={Social} />
          <Route path="/messages/:username" component={Messages} />
          <Route path="/hiring" component={Hiring} />
          <Route path="/hiring/:id" component={HiringDetail} />
          <Route path="/bosses" component={Bosses} />
          <Route path="/bosses/:slug" component={BossFight} />
          <Route path="/analytics" component={Analytics} />
          <Route component={NotFound} />
        </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <BattleInviteNotification />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
