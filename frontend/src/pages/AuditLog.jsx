import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User
} from "lucide-react";

import GraphBackground from "../components/GraphBackground";
import AdminNavbar from "../components/AdminNavbar";
import Sidebar from "../components/Sidebar";

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const logsPerPage = 10;

  const memoizedBG = useMemo(() => <GraphBackground />, []);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/audit-logs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);

      // fallback data
      setLogs([
        { id: 1, user: "admin@codeverse.io", action: "USER_DELETION", resource: "dev_user_89", timestamp: "2024-03-20 14:22:01", status: "SUCCESS", ip: "192.168.1.1" },
        { id: 2, user: "system_root", action: "CONFIG_UPDATE", resource: "auth_service", timestamp: "2024-03-20 13:45:10", status: "WARNING", ip: "10.0.0.5" },
        { id: 3, user: "dev_lead@codeverse.io", action: "REPO_ACCESS", resource: "core_engine", timestamp: "2024-03-20 12:10:55", status: "SUCCESS", ip: "172.16.254.1" },
        { id: 4, user: "unknown", action: "FAILED_LOGIN", resource: "admin_panel", timestamp: "2024-03-20 11:05:22", status: "FAILURE", ip: "45.33.12.155" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" || log.status === filterType;

    return matchesSearch && matchesFilter;
  });

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const getStatusStyle = (status) => {
    switch (status) {
      case "SUCCESS":
        return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
      case "FAILURE":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      case "WARNING":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden relative flex flex-col">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        {memoizedBG}
      </div>

      {/* ✅ FULL WIDTH NAVBAR */}
      <div className="relative z-20">
        <AdminNavbar
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          adminName="Admin User"
        />
      </div>

      {/* ✅ SIDEBAR + CONTENT ROW */}
      <div className="flex flex-1 min-h-0 relative z-10">

        {/* Sidebar */}
        <Sidebar
          admin={{ name: "Admin User" }}
          isConnected={true}
          isOpen={isSidebarOpen}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 p-6 lg:p-10 overflow-hidden">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="text-cyan-500" size={24} />
                <div className="text-cyan-500 font-black text-xs uppercase tracking-[0.4em]">
                  Security & Governance
                </div>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tighter leading-none">
                AUDIT<span className="text-cyan-500">LOGS</span>
              </h1>
              <p className="text-gray-500 mt-4 text-sm font-bold uppercase tracking-widest">
                System-wide activity registry
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchLogs}
                className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              >
                <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
              </button>

              <button className="flex items-center gap-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative group col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-12 py-4 text-sm outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">ALL</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="WARNING">WARNING</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col">

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-xs">Time</th>
                    <th className="px-6 py-4 text-xs">User</th>
                    <th className="px-6 py-4 text-xs">Action</th>
                    <th className="px-6 py-4 text-xs">Resource</th>
                    <th className="px-6 py-4 text-xs">Status</th>
                    <th className="px-6 py-4 text-xs">IP</th>
                  </tr>
                </thead>

                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5">
                      <td className="px-6 py-4 text-xs">{log.timestamp}</td>
                      <td className="px-6 py-4 text-xs">{log.user}</td>
                      <td className="px-6 py-4 text-xs">{log.action}</td>
                      <td className="px-6 py-4 text-xs">{log.resource}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`px-2 py-1 rounded ${getStatusStyle(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 flex justify-between">
              <span className="text-xs">
                {indexOfFirstLog + 1} - {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length}
              </span>

              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft />
                </button>

                <button
                  disabled={indexOfLastLog >= filteredLogs.length}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;