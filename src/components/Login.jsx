import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, ShieldCheck, Lock, User, ArrowRight, AlertCircle, Crown, Headphones, Users } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/30 mb-4 border border-indigo-400/20">
          <PhoneCall className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Sequential Dialer CRM
        </h1>
        <p className="mt-2 text-xs text-slate-400">
          Outbound sales queue with single-lead atomic security
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-3 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username / Agent ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or agent1"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins without emoji */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Quick Switch Accounts:
            </span>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => quickFill('admin', 'admin123')}
                className="px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700/80 text-left transition flex flex-col group"
              >
                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-indigo-400" />
                  Admin
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Full Console</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('agent1', 'agent123')}
                className="px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700/80 text-left transition flex flex-col group"
              >
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                  Caller 1
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Rajesh S.</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('agent2', 'agent123')}
                className="px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700/80 text-left transition flex flex-col group"
              >
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                  Caller 2
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Priya P.</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge callout */}
        <div className="mt-5 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-200">Zero Contact Leak Guarantee:</strong> Callers receive strictly 1 active record at a time via atomic locks. Bulk contact lists are strictly Admin-only.
          </span>
        </div>
      </div>
    </div>
  );
}

