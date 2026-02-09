import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ProjectView = () => {
  const { owner, repo } = useParams(); // owner/repo split
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRepoContents = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/github/repos/${owner}/contents/${repo}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch repo contents");
        const data = await res.json();
        setFiles(data); // data is an array of files/folders
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoContents();
  }, [owner, repo]);

  if (loading)
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

  if (error)
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-cyan-900 text-white p-8">
      <button onClick={() => navigate(-1)} className="mb-6 text-cyan-400 hover:text-white">
        &larr; Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold mb-4">{repo}</h1>
      <div className="bg-black/40 p-6 rounded-xl border border-white/10">
        <ul>
          {files.map((file) => (
            <li key={file.sha} className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="font-mono">{file.name}</span>
              {file.type === "dir" ? (
                <span className="text-cyan-400">Folder</span>
              ) : (
                <a
                  href={file.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-white"
                >
                  View File
                </a>
              )}
            </li>
          ))}
        </ul>
        {files.length === 0 && <p className="text-gray-400 mt-4">No files in this repository.</p>}
      </div>
    </div>
  );
};
export default ProjectView