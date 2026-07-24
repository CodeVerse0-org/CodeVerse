import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import AdminSignUp from "./pages/AdminSignup";
import DeveloperSignUp from "./pages/DeveloperSignup";
import ResetPassword from "./pages/ResetPassword";
import VerifyResetOTP from "./pages/VerifyResetOTP"; // From Code 1
import VerifyEmail from "./pages/VerifyEmail";
import MFA from "./pages/MFA";
import MFASetup from "./pages/MFASetup";
import SessionTimeoutHandler from "./components/SessionTimeoutHandler";

// Dashboard & Management
import AdminDashboard from "./pages/AdminDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import UserManagement from "./pages/UserManagement";
import InviteUsers from "./pages/InviteUsers";
import AcceptInvite from "./pages/AcceptInvite";
import AuditLogs from "./pages/AuditLogs"; // Added for Security & Audit Streams

// GitHub & Repos
import GitHubConnect from "./pages/GitHubConnect";
import GitHubConnectCallback from "./pages/GitHubConnectCallback";
import Repositories from "./pages/Repositories";
import GraphVisualizerPage from "./pages/GraphVisualizerPage";

// Visualization (From Code 2)
import RepoSelectionPage from "./pages/RepoSelectionPage";
import VisualizationPage from "./pages/VisualizationPage";
import FunctionVisualizationPage from "./pages/FunctionVisualizationPage";
import HistoryPage from "./pages/HistoryPage";
import FileSummary from "./pages/FileSummary";
import ChatPage from "./pages/ChatPage";
import ChatbotRepoSelectionPage from "./pages/ChatbotRepoSelectionPage";
import StateVisualization from "./pages/StateVisualization";

// Settings (From Code 1)
import Settings from "./pages/Settings";
import DeveloperSettings from "./pages/DeveloperSettings";
import ProfilePage from "./pages/ProfilePage";
import AnalyzeProject from "./pages/AnalyzeProject";

const App = () => {
  return (
    <div className="relative min-h-screen">
      {/* 🔥 GLOBAL SESSION HANDLER */}
      {/*<SessionTimeoutHandler timeoutLimit={120000} />*/}

      <Routes>
        {/* --- Public & Authentication Routes --- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-reset" element={<VerifyResetOTP />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />

        {/* --- Signup & Onboarding --- */}
        <Route path="/adminSignUp" element={<AdminSignUp />} />
        <Route path="/developerSignUp" element={<DeveloperSignUp />} />
        <Route path="/mfa-setup" element={<MFASetup />} />
        <Route path="/mfa" element={<MFA />} />

        {/* --- GitHub Integration --- */}
        <Route path="/github-connect" element={<GitHubConnect />} />
        <Route
          path="/github-connect-callback"
          element={<GitHubConnectCallback />}
        />

        {/* --- Admin Protected Routes --- */}
        <Route path="/adminDashboard" element={<AdminDashboard />} />
        <Route path="/repositories" element={<Repositories />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/invite-users" element={<InviteUsers />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />

        {/* --- Developer Protected Routes --- */}
        <Route path="/developerDashboard" element={<DeveloperDashboard />} />
        <Route path="/developersettings" element={<DeveloperSettings />} />

        {/* --- Visualization Tooling --- */}
        <Route path="/visualization/select" element={<RepoSelectionPage />} />
        <Route path="/visualization" element={<VisualizationPage />} />
        <Route path="/profilepage" element={<ProfilePage />} />
        <Route
          path="/function-visualization"
          element={<FunctionVisualizationPage />}
        />
        <Route path="/state-visualization" element={<StateVisualization />} />
        <Route path="/history" element={<HistoryPage />} />

        <Route
          path="/visualization/:owner/:repo"
          element={<VisualizationPage />}
        />
        <Route
          path="/graph-visualizer/:owner/:repo"
          element={<VisualizationPage />}
        />
        <Route path="/summaries" element={<FileSummary />} />
        <Route
          path="/graph-visualizer/:owner/:repo"
          element={<GraphVisualizerPage />}
        />
        <Route path="/chatbot" element={<ChatPage />} />
        <Route
          path="/chatbot-selection"
          element={<ChatbotRepoSelectionPage />}
        />
        <Route path="/analyze-repo" element={<AnalyzeProject />} />
      </Routes>
    </div>
  );
};

export default App;