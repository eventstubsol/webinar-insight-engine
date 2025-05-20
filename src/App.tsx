
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Webinars from "./pages/Webinars";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/webinars" element={<Webinars />} />
          {/* Add these routes but redirect to Dashboard for now as placeholders */}
          <Route path="/analytics" element={<Navigate to="/dashboard" />} />
          <Route path="/reports" element={<Navigate to="/dashboard" />} />
          <Route path="/filters" element={<Navigate to="/dashboard" />} />
          <Route path="/team" element={<Navigate to="/dashboard" />} />
          <Route path="/sharing" element={<Navigate to="/dashboard" />} />
          <Route path="/settings" element={<Navigate to="/dashboard" />} />
          <Route path="/onboarding" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
