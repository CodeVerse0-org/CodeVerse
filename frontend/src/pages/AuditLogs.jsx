import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Search,
  Terminal,
  Layers,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.includes("localhost")
    ? rawApiUrl
    : rawApiUrl.replace(/^http:\/\//i, "https://");

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/audit-logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to pull audit streams: ${response.statusText}`);
      }

      const data = await response.json();
      setLogs(Array.isArray(data) ? data : data.logs || []);
    } catch (err) {
      console.error("Audit log stream error:", err);
      setError(err.message || "Failed to retrieve security tracking records.");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Filter logic pipeline
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.repository_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actor_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  // Extract unique actions safely for filter dropdown
  const uniqueActions = [
    "ALL",
    ...new Set(logs.map((l) => l.action).filter(Boolean)),
  ];

  // Action badge color styling map
  const getActionStyle = (action) => {
    const act = (action || "").toUpperCase();
    if (act.includes("GENERATE") || act.includes("CREATE") || act.includes("INVITE")) {
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
    if (act.includes("UPDATE") || act.includes("PUSH")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (
      act.includes("DELETE") ||
      act.includes("FAIL") ||
      act.includes("REMOVE")
    ) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  };

  return (
    <div className="flex-1 bg-[#020405] min-h-screen text-gray-300 p-8 overflow-y-auto">
      {/* Upper Meta Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/40 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Shield className="text-cyan-400" size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-500">
              Security & Analytics
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            System Audit Logs
          </h1>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Real-time tracking of assigned repository syncs, developer activities, and graph runs.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-bold tracking-tight hover:bg-white/5 hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Registry
        </button>
      </div>

      {/* Analytics Dashboard Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#05080c] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute right-4 bottom-2 opacity-5 pointer-events-none">
            <Terminal size={80} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
            Total Workspace Logs
          </p>
          <p className="text-3xl font-black text-white font-mono">
            {logs.length}
          </p>
        </div>
        <div className="bg-[#05080c] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute right-4 bottom-2 opacity-5 pointer-events-none">
            <Layers size={80} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-1">
            Filtered Stream
          </p>
          <p className="text-3xl font-black text-cyan-400 font-mono">
            {filteredLogs.length}
          </p>
        </div>
        <div className="bg-[#05080c] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute right-4 bottom-2 opacity-5 pointer-events-none">
            <Shield size={80} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">
            Monitoring Scope
          </p>
          <p className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mt-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Assigned Developers Only
          </p>
        </div>
      </div>

      {/* Control Filter Bar Panel */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#05080c] border border-white/5 p-4 rounded-2xl mb-6">
        <div className="relative w-full md:flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
            size={16}
          />
          <input
            type="text"
            placeholder="Search logs by repo or developer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-medium"
          />
        </div>

        <div className="w-full md:w-64">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-400 focus:outline-none focus:border-cyan-500/50 transition-colors font-bold tracking-tight appearance-none cursor-pointer"
          >
            {uniqueActions.map((action) => (
              <option
                key={action}
                value={action}
                className="bg-[#0a0f14] text-white"
              >
                ACTION: {action}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Stream Display Section */}
      <div className="bg-[#05080c] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="text-cyan-400 animate-spin" size={32} />
            <p className="text-gray-600 text-xs font-mono tracking-widest uppercase">
              Connecting to log node data...
            </p>
          </div>
        ) : error ? (
          <div className="py-20 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <AlertCircle className="text-rose-500 mb-4" size={36} />
            <h3 className="text-white font-bold text-sm uppercase tracking-wide">
              Stream Handshake Failed
            </h3>
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              {error}
            </p>
            <button
              onClick={fetchAuditLogs}
              className="mt-6 px-4 py-2 text-xs font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10 cursor-pointer"
            >
              Retry Pipeline Connection
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-gray-600 text-xs tracking-widest uppercase font-mono">
              Zero matching entries in current runtime state
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Timeline
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Actor / User
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Operation Action
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Target Repository
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Trace Logs Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[12px]">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/[0.01] transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-[11px] font-medium flex items-center gap-2">
                      <Calendar size={13} className="text-gray-600" />
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "N/A"}
                    </td>

                    {/* Actor Identity */}
                    <td className="px-6 py-4 whitespace-nowrap text-cyan-400 font-bold text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-500" />
                        {log.actor_name || "System Level"}
                      </div>
                    </td>

                    {/* Action Tag Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase border rounded-md ${getActionStyle(log.action)}`}
                      >
                        {log.action || "UNKNOWN"}
                      </span>
                    </td>

                    {/* Repository Scope */}
                    <td className="px-6 py-4 whitespace-nowrap text-white font-bold tracking-tight">
                      {log.repository_name || "System Level"}
                    </td>

                    {/* Log Text Details */}
                    <td className="px-6 py-4 text-gray-400 text-xs leading-relaxed max-w-md truncate group-hover:text-gray-300 transition-colors">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;