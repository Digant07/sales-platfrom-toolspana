import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, ShieldCheck, Lock, User, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/30 mb-4 border border-indigo-400/30">
          <PhoneCall className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Sequential Dialer CRM
        </h1>
        <p className="mt-2 text-sm text-indigo-200">
          Secure, single-lead telecalling queue for high-conversion sales teams
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-700 sm:px-10">
          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-3 text-rose-200 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username / Agent ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or agent1"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Demo Accounts:
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => quickFill('admin', 'admin123')}
                className="px-3 py-2 text-xs font-medium bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 text-left transition flex flex-col"
              >
                <span className="font-bold text-indigo-300">👑 Admin</span>
                <span className="text-[11px] text-slate-400">Full Control</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('agent1', 'agent123')}
                className="px-3 py-2 text-xs font-medium bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 text-left transition flex flex-col"
              >
                <span className="font-bold text-emerald-300">📞 Caller 1</span>
                <span className="text-[11px] text-slate-400">Rajesh S.</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('agent2', 'agent123')}
                className="px-3 py-2 text-xs font-medium bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 text-left transition flex flex-col"
              >
                <span className="font-bold text-emerald-300">📞 Caller 2</span>
                <span className="text-[11px] text-slate-400">Priya P.</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge callout */}
        <div className="mt-5 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-200">Zero Contact Leak Guarantee:</strong> Telecallers receive leads strictly one at a time via atomic database locking. Network payloads never contain bulk contact numbers.
          </span>
        </div>
      </div>
    </div>
  );
}

