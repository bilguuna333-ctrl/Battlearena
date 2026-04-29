import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Problems from "@/pages/Problems";
import ProblemDetail from "@/pages/ProblemDetail";
import BattleQueue from "@/pages/BattleQueue";
import LiveBattle from "@/pages/LiveBattle";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import Seasons from "@/pages/Seasons";
import Replays from "@/pages/Replays";
import Replay from "@/pages/Replay";
import Missions from "@/pages/Missions";
import Social from "@/pages/Social";
import Messages from "@/pages/Messages";
import Mentor from "@/pages/Mentor";
import MentorGroup from "@/pages/MentorGroup";
import Hiring from "@/pages/Hiring";
import HiringDetail from "@/pages/HiringDetail";
import Bosses from "@/pages/Bosses";
import BossFight from "@/pages/BossFight";
import Analytics from "@/pages/Analytics";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/30">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/problems" component={Problems} />
          <Route path="/problems/:slug" component={ProblemDetail} />
          <Route path="/battle" component={BattleQueue} />
          <Route path="/battle/:id" component={LiveBattle} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/profile/:username" component={Profile} />
          <Route path="/seasons" component={Seasons} />
          <Route path="/replays" component={Replays} />
          <Route path="/replay/:id" component={Replay} />
          <Route path="/missions" component={Missions} />
          <Route path="/social" component={Social} />
          <Route path="/messages/:username" component={Messages} />
          <Route path="/mentor" component={Mentor} />
          <Route path="/mentor/:id" component={MentorGroup} />
          <Route path="/hiring" component={Hiring} />
          <Route path="/hiring/:id" component={HiringDetail} />
          <Route path="/bosses" component={Bosses} />
          <Route path="/bosses/:slug" component={BossFight} />
          <Route path="/analytics" component={Analytics} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
