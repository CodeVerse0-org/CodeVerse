import React, { useEffect, useState } from "react";
import { Search, Plus, Trash2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/api/invite/manage`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => { fetchUsers(); }, []);

// Inside UserManagement.jsx

const handleRevoke = async (id, isInvite) => {
  if (!window.confirm("Are you sure you want to remove this user?")) return;
  
  try {
    // Pass the is_invite flag to the backend
    const res = await fetch(`${API_URL}/api/invite/revoke/${id}?is_invite=${isInvite}`, {
      method: "DELETE",
      headers: { 
        Authorization: `Bearer ${localStorage.getItem("token")}` 
      },
    });

    if (res.ok) {
      // OPTION 1: Re-fetch the whole list
      // fetchUsers(); 

      // OPTION 2: Update state locally (Faster UI response)
      setUsers((prevUsers) => prevUsers.filter((user) => {
          if (isInvite) return user.id !== id || user.status !== "Pending Invitation";
          return user.id !== id;
      }));
      
      alert("User access revoked successfully.");
    } else {
      const errorData = await res.json();
      alert(`Error: ${errorData.detail}`);
    }
  } catch (err) {
    console.error("Revoke error:", err);
    alert("Failed to revoke access.");
  }
};


  return (
    <div className="min-h-screen flex bg-black text-white">
      <Sidebar admin={{ name: "GitHub Admin" }} isConnected={true} />
      
      <main className="flex-1 p-10 bg-gradient-to-br from-black via-[#041a1f] to-black">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">User Access and Management</h1>
            <p className="text-gray-400">Manager developers and their access</p>
          </div>
          <button 
            onClick={() => navigate("/invite-users")}
            className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-lg flex items-center gap-2 font-bold"
          >
            <Plus size={20} /> Invite Users
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3 text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder="Search Users" 
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-12 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <button className="bg-cyan-900/50 border border-cyan-500/30 px-8 py-3 rounded-xl hover:bg-cyan-800">Search</button>
        </div>

        {/* Table */}
        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Users</th>
                <th className="px-6 py-4">Repositories Accessed</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs text-cyan-500/70">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs">
                      {user.repo_count} Repositories
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={user.status === "Active" ? "text-green-400" : "text-yellow-400"}>
                      ● {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{user.date}</td>
                  <td className="px-6 py-4 text-right">
<button 
  onClick={() => handleRevoke(user.id, user.status === "Pending Invitation")}
  className="text-red-500 hover:text-red-400 flex items-center gap-1 ml-auto text-sm font-bold"
>
  <Trash2 size={16} /> {user.status === "Pending Invitation" ? "Remove" : "Revoke access"}
</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default UserManagement;