import React, { useState, useEffect } from 'react';
import { Folder, FileCode, ChevronRight, RefreshCw, MessageSquare } from 'lucide-react';

const FileSummaries = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock function to simulate fetching data from your FastAPI backend
  const fetchRepoData = async () => {
    setLoading(true);
    try {
      // Replace with your actual API endpoint: 
      // const res = await fetch('http://localhost:8000/api/summaries/process-repo?full_repo=ridafatima1157/blog1');
      // const data = await res.json();
      
      // Temporary Mock Data to match your screenshot
      const mockData = [
        { id: '1', name: 'userController.js', path: 'src/Controllers/userController.js', summary: "PURPOSE: This file serves as the controller for user-related operations. It handles incoming HTTP requests for endpoints like creating a new user.\n\nKEY FUNCTIONALITIES:\n- createUser: Validates and creates a new user.\n- getUserById: Retrieves a single user profile.\n- deleteUser: Handles logic for account removal.", dependencies: ['../models/user.js', '../utils/errorHandling.js'] },
        { id: '2', name: 'authController.js', path: 'src/Controllers/authController.js', summary: "PURPOSE: Manages authentication flows including login, registration, and JWT issuance.", dependencies: ['../models/user.js'] }
      ];
      setFiles(mockData);
    } catch (err) {
      console.error("Failed to fetch summaries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRepoData(); }, []);

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-300 font-sans">
      {/* SIDEBAR: File Navigation */}
      <div className="w-72 border-r border-gray-800 bg-[#010409] p-4">
        <div className="flex items-center gap-2 mb-6 text-white font-bold text-lg">
          <Folder className="text-blue-400" size={20} />
          <span>CodeVerse Explorer</span>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 p-2 text-sm text-gray-400 hover:bg-gray-800 rounded">
            <ChevronRight size={14} /> <Folder size={16} /> <span>src</span>
          </div>
          <div className="ml-4 space-y-1">
            <div className="flex items-center gap-2 p-2 text-sm text-gray-400">
               <ChevronRight size={14} /> <Folder size={16} /> <span>Controllers</span>
            </div>
            {files.map(file => (
              <button 
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center gap-2 ml-6 p-2 text-sm rounded transition ${selectedFile?.id === file.id ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'hover:bg-gray-800'}`}
              >
                <FileCode size={16} />
                <span>{file.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: AI Summary Card */}
      <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-[#0d1117] to-[#010409]">
        {selectedFile ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#1c2128]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileCode className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">{selectedFile.name}</h1>
                    <p className="text-xs text-gray-500">{selectedFile.path}</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  <RefreshCw size={16} /> Re-Generate
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-8">
                <section>
                  <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Purpose Summary</h3>
                  <p className="text-lg text-gray-200 leading-relaxed">
                    {selectedFile.summary.split('\n\n').replace('PURPOSE: ', '')}
                  </p>
                </section>

                <section>
                  <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Key Functionalities</h3>
                  <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-4 font-mono text-sm">
                    <pre className="whitespace-pre-wrap text-gray-400">
                      {selectedFile.summary.includes('KEY FUNCTIONALITIES:') ? selectedFile.summary.split('KEY FUNCTIONALITIES:') : "Analyzing logic..."}
                    </pre>
                  </div>
                </section>

                <section>
                  <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">File Dependencies</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedFile.dependencies.map((dep, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-[#1c2128] border border-gray-800 rounded-lg hover:border-blue-500 transition cursor-pointer group">
                        <span className="text-sm font-mono text-gray-400 group-hover:text-blue-400">{dep}</span>
                        <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-400" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#0d1117] border-t border-gray-700 flex justify-between items-center text-xs text-gray-500">
                <div className="flex gap-4">
                  <span>Was this summary helpful?</span>
                  <button className="hover:text-white">👍</button>
                  <button className="hover:text-white">👎</button>
                </div>
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-400">
                  <MessageSquare size={14} /> Ask AI about this file
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <FileCode size={64} className="mb-4 opacity-20" />
            <p>Select a source file to generate AI documentation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSummaries;