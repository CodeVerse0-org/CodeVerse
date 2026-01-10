import React, { useEffect, useState } from "react";
import {
  Bell,
  User,
  LayoutDashboard,
  Folder,
  Eye,
  Settings,
  LogOut,
  Upload
} from "lucide-react";

const SidebarItem = ({ icon, label, active }) => (
  <div
    className={`flex items-center gap-4 px-5 py-3 rounded-lg cursor-pointer text-base
    ${
      active
        ? "bg-cyan-600/20 text-white"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    }`}
  >
    {icon}
    {label}
  </div>
);

const ProjectRow = ({ project, onView, onDelete }) => (
  <tr className="border-b border-cyan-700/20">
    <td className="py-4">{project.name}</td>
    <td className="py-4 text-gray-400">{project.lastSync}</td>
    <td className="py-4 text-right space-x-3">
      <button
        onClick={() => onView(project)}
        className="text-sm bg-white/10 px-4 py-2 rounded hover:bg-white/20"
      >
        View
      </button>
      <button
        onClick={() => onDelete(project.id)}
        className="text-sm bg-red-500/20 px-4 py-2 rounded hover:bg-red-500/30"
      >
        Delete
      </button>
    </td>
  </tr>
);

const Panel = ({ title, children }) => (
  <div className="bg-gradient-to-tr from-cyan-800/40 to-black/60 border border-cyan-700/30 rounded-xl p-6">
    <h3 className="font-semibold text-lg mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Notification = ({ text }) => (
  <div className="text-base text-gray-300 bg-white/5 p-3 rounded">
    {text}
  </div>
);

const Activity = ({ text, time }) => (
  <div className="text-base bg-white/5 p-3 rounded">
    <p className="text-gray-300">{text}</p>
    <span className="text-sm text-gray-500">{time}</span>
  </div>
);

const DeveloperDashboard = () => {
  const [user, setUser] = useState({
    first_name: "",
    last_name: "",
    email: ""
  });
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState([
    {
      id: 1,
      name: "codeverse/frontend-app",
      lastSync: "2023-10-27 10:45 AM"
    },
    {
      id: 2,
      name: "Blog-Platform/full-project",
      lastSync: "2023-10-27 3:45 PM"
    },
    {
      id: 3,
      name: "AI-Visualizer/backend-api",
      lastSync: "2023-10-28 12:10 PM"
    }
  ]);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [API_URL]);

  const handleView = (project) => {
    console.log("Viewing project:", project);
    alert(`Viewing project: ${project.name}`);
  };

  const handleDelete = (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white text-xl">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black to-cyan-900 text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-cyan-800/40 to-black/60 border-r border-cyan-700/30 flex flex-col justify-between p-8">
        <div>
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <p className="text-base font-semibold">
                {user.first_name || "User"} {user.last_name || ""}
              </p>
              <p className="text-sm text-gray-400">
                {user.email || "email@example.com"}
              </p>
            </div>
          </div>

          <nav className="space-y-3">
            <SidebarItem
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
              active
            />
            <SidebarItem icon={<Folder size={20} />} label="Local Projects" />
            <SidebarItem
              icon={<Eye size={20} />}
              label="Visualization Tools"
            />
            <SidebarItem icon={<Settings size={20} />} label="Settings" />
          </nav>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 text-gray-400 hover:text-white text-base"
        >
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded bg-cyan-600 flex items-center justify-center font-bold text-lg">
              C
            </div>
            <span className="font-semibold text-xl">CodeVerse</span>
          </div>

          <div className="flex items-center gap-6">
            <Bell size={22} className="text-gray-300 hover:text-white" />
            <User size={22} className="text-gray-300 hover:text-white" />
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold">
              Welcome Back, {user.first_name || "Developer"}!
            </h1>
            <p className="text-gray-400 text-base mt-1">
              Here's an overview of your projects and recent activities.
            </p>
          </div>

          <button className="flex items-center gap-3 bg-cyan-600 px-6 py-3 rounded-lg text-base font-semibold hover:bg-cyan-500">
            <Upload size={18} /> Upload Local Projects
          </button>
        </div>

        <input
          type="text"
          placeholder="Search assigned projects or paste public GitHub repo URL..."
          className="w-full rounded-md bg-gray-800 border border-gray-600 text-white px-5 py-4 mb-10 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gradient-to-tr from-cyan-800/40 to-black/60 border border-cyan-700/30 rounded-xl p-8">
            <h2 className="font-semibold text-xl mb-6">Projects</h2>

            <table className="w-full text-base">
              <thead className="text-gray-400 border-b border-cyan-700/30">
                <tr>
                  <th className="text-left py-3">PROJECT NAME</th>
                  <th className="text-left py-3">LAST SYNC</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onView={handleView}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-8">
            <Panel title="Notifications">
              <Notification text="Repo sync completed successfully" />
              <Notification text="New visualization generated" />
            </Panel>

            <Panel title="Recent Activity">
              <Activity
                text="Analyzed Express API routes"
                time="15 min ago"
              />
              <Activity
                text="Updated React visualization graph"
                time="3 hours ago"
              />
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeveloperDashboard;
