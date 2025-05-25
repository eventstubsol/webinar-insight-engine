
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Webinars from "./pages/Webinars";
import WebinarDashboard from "./pages/WebinarDashboard";
import NotFound from "./pages/NotFound";

// Create QueryClient with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/webinars" element={
                  <ProtectedRoute>
                    <Webinars />
                  </ProtectedRoute>
                } />
                <Route path="/webinars/:webinarId" element={
                  <ProtectedRoute>
                    <WebinarDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute requiredRoles={['admin', 'host']}>
                    <Navigate to="/dashboard" />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" />
                  </ProtectedRoute>
                } />
                <Route path="/filters" element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" />
                  </ProtectedRoute>
                } />
                <Route path="/team" element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <Navigate to="/dashboard" />
                  </ProtectedRoute>
                } />
                <Route path="/sharing" element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding" element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
