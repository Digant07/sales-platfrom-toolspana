import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import AgentWorkspace from './components/AgentWorkspace';
import AdminDashboard from './components/AdminDashboard';
import { Eye, Shield } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [adminViewMode, setAdminViewMode] = useState('admin'); // 'admin' | 'agent_preview'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-9 h-9 border-2 border-slate-800 border-t-slate-200 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-medium text-slate-400">Loading Sequential Dialer CRM...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Admin role can optionally toggle to see the Caller's Single-Lead view
  if (user.role === 'admin') {
    return (
      <div className="relative min-h-screen">
        {/* Floating Admin Mode Switcher */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setAdminViewMode(adminViewMode === 'admin' ? 'agent_preview' : 'admin')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-slate-200 shadow-xl border border-slate-700 hover:bg-slate-800 hover:text-white transition active:scale-[0.98]"
          >
            {adminViewMode === 'admin' ? (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Preview Caller View</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Back to Admin Console</span>
              </>
            )}
          </button>
        </div>

        {adminViewMode === 'admin' ? <AdminDashboard /> : <AgentWorkspace />}
      </div>
    );
  }

  // Agent role strictly gets restricted single-lead workspace
  return <AgentWorkspace />;
}

