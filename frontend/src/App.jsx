import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import AdminSignUp from "./pages/AdminSignup";
import DeveloperSignUp from "./pages/DeveloperSignup";
import ResetPassword from "./pages/ResetPassword";
import MFA from "./pages/MFA";
import MFASetup from "./pages/MFASetup";
import AdminDashboard from "./pages/AdminDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import GitHubConnect from "./pages/GitHubConnect";
import GitHubConnectCallback from "./pages/GitHubConnectCallback";
import Repositories from "./pages/Repositories";
import VerifyEmail from "./pages/VerifyEmail";
import InviteUsers from "./pages/InviteUsers";
import AcceptInvite from "./pages/AcceptInvite";
import UserManagement from "./pages/UserManagement";


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/adminSignUp" element={<AdminSignUp />} />
      <Route path="/developerSignUp" element={<DeveloperSignUp />} />

      <Route path="/mfa-setup" element={<MFASetup />} />
      <Route path="/mfa" element={<MFA />} />

      {/* GitHub connect */}
      <Route path="/github-connect" element={<GitHubConnect />} />
      <Route path="/github-connect-callback" element={<GitHubConnectCallback />} />

      {/* Dashboards */}
      <Route path="/adminDashboard" element={<AdminDashboard />} />
      <Route path="/repositories" element={<Repositories />} />
       <Route path="/users" element={<UserManagement />} />


      <Route path="/developerDashboard" element={<DeveloperDashboard />} />


      {/* Verify Email */}
     
     <Route path="/verify-email" element={<VerifyEmail />} />
     <Route path="/invite-users" element={<InviteUsers />} />
     <Route path="/accept-invite/:token" element={<AcceptInvite />} />

    </Routes>
  );
};

export default App;
