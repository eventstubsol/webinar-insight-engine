
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import Index from "@/pages/Index";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Webinars from "@/pages/Webinars";
import Profile from "@/pages/Profile";
import WebinarDashboard from "@/pages/WebinarDashboard";
import WorkspaceSettingsPage from "@/pages/WorkspaceSettingsPage";
import WorkspaceMembersPage from "@/pages/WorkspaceMembersPage";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import "./App.css";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="webinar-insight-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <WorkspaceProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/webinars"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Webinars />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/webinars/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <WebinarDashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspace/settings"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <WorkspaceSettingsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspace/members"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <WorkspaceMembersPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </WorkspaceProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
