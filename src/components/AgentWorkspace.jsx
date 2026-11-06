import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { QRCodeSVG } from 'qrcode.react';
import {
  PhoneCall,
  Phone,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  MapPin,
  Building,
  User,
  FileText,
  Calendar,
  RefreshCw,
  Smartphone,
  Shield,
  ShieldCheck,
  Check,
  Headphones,
  Copy,
  History,
  X,
  ExternalLink,
  ChevronRight,
  PhoneForwarded,
  Filter
} from 'lucide-react';

export default function AgentWorkspace() {
  const { user, logout } = useAuth();

  const [activeLead, setActiveLead] = useState(null);
  const [stats, setStats] = useState({
    todayCalls: { total: 0, interested: 0, followups: 0, notInterested: 0, noAnswer: 0, avgSeconds: 0 },
    queueRemaining: 0,
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Call form state
  const [disposition, setDisposition] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTargetPhone, setQrTargetPhone] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Live Call Timer (in seconds)
  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef(null);

  // Load stats and active locked lead on mount
  useEffect(() => {
    loadWorkspace();
  }, []);

  // Timer logic: when a lead is active, count up
  useEffect(() => {
    if (activeLead) {
      setCallTimer(0);
      timerRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallTimer(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeLead]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      // 1. Fetch caller stats
      const statsRes = await api.agent.getStats();
      setStats(statsRes);

      // 2. Fetch current locked lead (Strictly returns 1 record or null)
      const leadRes = await api.agent.getCurrentLead();
      if (leadRes.lead) {
        setActiveLead(leadRes.lead);
        setQrTargetPhone(leadRes.lead.phone_number);
      } else {
        setActiveLead(null);
      }

      // 3. Load caller's recent logs in the background
      loadRecentCalls();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initialize caller workspace');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentCalls = async () => {
    try {
      setHistoryLoading(true);
      if (api.agent.getRecentCalls) {
        const res = await api.agent.getRecentCalls();
        setRecentLogs(res.logs || []);
      }
    } catch (e) {
      console.warn('Could not load recent calls:', e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Atomic Get Next Lead
  const handleGetNextLead = async () => {
    try {
      setAssigning(true);
      setErrorMessage('');
      setSuccessMessage('');

      const res = await api.agent.getNextLead();
      if (res.lead) {
        setActiveLead(res.lead);
        setQrTargetPhone(res.lead.phone_number);
        // Reset form inputs
        setDisposition('');
        setNotes('');
        setFollowUpDate('');
        if (res.alreadyLocked) {
          setSuccessMessage('Resumed your active locked lead. Please complete call notes to proceed.');
        }
      } else {
        setActiveLead(null);
        setErrorMessage(res.message || 'No pending leads available in queue.');
      }

      // Refresh stats
      const statsRes = await api.agent.getStats();
      setStats(statsRes);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch next lead');
    } finally {
      setAssigning(false);
    }
  };

  // Copy phone number to clipboard
  const handleCopyPhone = (number) => {
    if (!number) return;
    navigator.clipboard.writeText(number);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Validation: Mandatory Note Submission Gate
  const isNotesExempt = ['No Answer / Busy', 'Invalid / Wrong Number'].includes(disposition);
  const minRequiredLength = isNotesExempt ? 0 : 10;
  const isNotesValid = notes.trim().length >= minRequiredLength;
  const isFormValid = disposition && isNotesValid;

  // Submit Call Notes & Get Next Lead
  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!isFormValid || !activeLead) return;

    try {
      setSubmitting(true);
      setErrorMessage('');

      await api.agent.submitLead({
        lead_id: activeLead.id,
        call_disposition: disposition,
        agent_notes: notes.trim(),
        follow_up_date: followUpDate || null,
        call_duration_seconds: callTimer,
      });

      const leadRef = activeLead.lead_id_code || `#${activeLead.id}`;
      setSuccessMessage(`Lead ${leadRef} logged as "${disposition}". Dispensing next lead in queue...`);

      // Clear current form
      setActiveLead(null);
      setDisposition('');
      setNotes('');
      setFollowUpDate('');

      // Refresh recent logs
      loadRecentCalls();

      // Auto-load next lead in queue
      setTimeout(() => {
        handleGetNextLead();
      }, 600);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit call log');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return iso;
    }
  };

  const dispositionsList = [
    {
      id: 'Answered - Interested',
      label: 'Answered - Interested',
      desc: 'Prospect engaged, requested pricing or follow-up',
      tag: 'Converted / Hot',
      theme: 'border-emerald-300 bg-emerald-50/70 text-emerald-950 hover:bg-emerald-100/70',
      activeRing: 'ring-2 ring-emerald-600 border-emerald-500 bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      id: 'Call Back Later',
      label: 'Call Back Later',
      desc: 'Requested callback at specified time',
      tag: 'Follow-Up',
      theme: 'border-amber-300 bg-amber-50/70 text-amber-950 hover:bg-amber-100/70',
      activeRing: 'ring-2 ring-amber-600 border-amber-500 bg-amber-50',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'Answered - Not Interested',
      label: 'Answered - Not Interested',
      desc: 'Declined offer, not currently in market',
      tag: 'Unqualified',
      theme: 'border-rose-200 bg-rose-50/50 text-rose-950 hover:bg-rose-100/60',
      activeRing: 'ring-2 ring-rose-500 border-rose-400 bg-rose-50',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    {
      id: 'No Answer / Busy',
      label: 'No Answer / Busy',
      desc: 'Ringing out, call waiting, or voicemail',
      tag: 'Unreached',
      theme: 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100',
      activeRing: 'ring-2 ring-slate-800 border-slate-700 bg-slate-100',
      badge: 'bg-slate-200 text-slate-800 border-slate-300',
    },
    {
      id: 'Invalid / Wrong Number',
      label: 'Invalid / Wrong Number',
      desc: 'Number disconnected, out of service, or wrong party',
      tag: 'Bad Data',
      theme: 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100',
      activeRing: 'ring-2 ring-slate-800 border-slate-700 bg-slate-100',
      badge: 'bg-slate-200 text-slate-800 border-slate-300',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans">
      {/* =========================================================
          Top Industrial Telecaller Navigation
          ========================================================= */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 shadow-2xs">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-sm tracking-tight">Sequential Dialer Console</h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-emerald-400 border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                  Calling Station Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                <span>Single-Lead Lock Active · Telecaller: <strong className="text-slate-200">{user?.name || user?.username}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Shift Metrics HUD */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs">
              <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Shift Calls:</span>
              <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 tabular-nums">
                {stats.todayCalls.total}
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-emerald-400 text-[11px] uppercase font-bold tracking-wider">Interested:</span>
              <span className="font-mono font-bold text-emerald-300 tabular-nums">
                {stats.todayCalls.interested}
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">Queue:</span>
              <span className="font-mono font-bold text-slate-300 tabular-nums">
                {stats.queueRemaining}
              </span>
            </div>

            {/* My Calls Drawer Toggle */}
            <button
              onClick={() => {
                setShowHistoryDrawer(true);
                loadRecentCalls();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-800 text-xs font-semibold rounded-lg text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white transition shadow-2xs"
              title="View my logged calls today"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shift History</span>
              {recentLogs.length > 0 && (
                <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {recentLogs.length}
                </span>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title="Sign Out"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-800 text-xs font-semibold rounded-lg text-slate-400 bg-slate-900 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-900/50 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          Main Workspace Surface
          ========================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
        {/* System Feedback Banners */}
        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-xl flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-3 rounded-xl flex items-start gap-3 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-12 text-center my-auto max-w-md mx-auto w-full">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Synchronizing Station...</p>
          </div>
        ) : !activeLead ? (
          /* =========================================================
             SCREEN A: DISPATCH STATION (No Lead Currently Locked)
             ========================================================= */
          <div className="max-w-3xl mx-auto w-full space-y-6 my-auto py-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-6 sm:p-8 text-center">
              {/* Telecalling Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Lead Dispatch Terminal Ready
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight mb-2">
                Ready for Next Outbound Call
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                Dispense the next pending record from the master company queue. The contact will be atomically locked to your terminal until call notes are logged.
              </p>

              {/* Primary Dispatch CTA */}
              <button
                onClick={handleGetNextLead}
                disabled={assigning}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 text-xs sm:text-sm font-bold text-slate-950 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-950 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Locking Lead in Queue...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 text-slate-950" />
                    <span>Dispense Next Lead</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>

              {/* Shift Metrics Grid */}
              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Today Dialed</span>
                  <p className="text-xl font-bold font-mono text-slate-950 mt-0.5 tabular-nums">{stats.todayCalls.total}</p>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Interested / Hot</span>
                  <p className="text-xl font-bold font-mono text-emerald-900 mt-0.5 tabular-nums">{stats.todayCalls.interested}</p>
                </div>

                <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Callbacks</span>
                  <p className="text-xl font-bold font-mono text-amber-900 mt-0.5 tabular-nums">{stats.todayCalls.followups}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Queue Backlog</span>
                  <p className="text-xl font-bold font-mono text-slate-950 mt-0.5 tabular-nums">{stats.queueRemaining}</p>
                </div>
              </div>

              {/* Institutional guarantee note */}
              <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Single-lead atomic locking active. Contact list export restricted to administration.</span>
              </div>
            </div>

            {/* Recent Calls Logged Today Preview (if any) */}
            {recentLogs.length > 0 && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">My Recent Shift Logs</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{recentLogs.length} logged today</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {recentLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-3.5 px-5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400 text-[11px]">{formatTimestamp(log.called_at)}</span>
                        <div>
                          <p className="font-bold text-slate-900">{log.lead_name || 'Unnamed Contact'}</p>
                          <p className="font-mono text-[11px] text-slate-500">{log.phone_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                          {log.disposition}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {formatTime(log.duration_seconds || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================
             SCREEN B: ACTIVE CALLING WORKSPACE & MANDATORY NOTE GATE
             ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Lead Dossier & Dialing Command (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-5 sm:p-6">
                {/* Active Lead Header Strip */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white font-mono">
                      Lead #{activeLead.lead_id_code || activeLead.id}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono font-medium">
                      Queue Order #1
                    </span>
                  </div>

                  {/* High-Precision Digital Call Duration Timer */}
                  <div className="flex items-center gap-2 bg-slate-950 text-white px-3 py-1 rounded-lg text-xs font-mono border border-slate-800 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Talk Time:</span>
                    <span className="font-bold text-emerald-300 tracking-wider tabular-nums">
                      {formatTime(callTimer)}
                    </span>
                  </div>
                </div>

                {/* Lead Name & Details */}
                <div className="mb-5">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-0.5">
                    Lead / Business Entity
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-snug">
                    {activeLead.lead_name}
                  </h2>

                  {activeLead.company_or_details && (
                    <p className="mt-1.5 text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{activeLead.company_or_details}</span>
                    </p>
                  )}
                </div>

                {/* Dialing Command Bar */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 mb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Primary Contact Number
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl sm:text-3xl font-bold text-slate-950 font-mono tracking-wide tabular-nums">
                          {activeLead.phone_number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(activeLead.phone_number)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition"
                          title="Copy phone number"
                        >
                          {copiedPhone ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {activeLead.alternate_phone && (
                        <div className="mt-1 text-xs text-slate-600 flex items-center gap-2 font-mono">
                          <span className="text-slate-400">Alt:</span>
                          <span className="font-semibold text-slate-800">{activeLead.alternate_phone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(activeLead.alternate_phone)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded transition"
                            title="Copy alt number"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* QR Code Quick Dial Modal Trigger */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQrTargetPhone(activeLead.phone_number);
                          setShowQrModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg shadow-2xs transition"
                        title="Scan with phone camera to dial immediately"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-700" />
                        <span>Desktop QR Dial</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Dialing Buttons */}
                  <div className="mt-4 pt-3.5 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
                    <a
                      href={`tel:${activeLead.phone_number}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition text-center"
                    >
                      <Phone className="w-4 h-4 text-white" />
                      <span>Call Primary: {activeLead.phone_number}</span>
                    </a>

                    {activeLead.alternate_phone && (
                      <a
                        href={`tel:${activeLead.alternate_phone}`}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>Call Alt Number</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Spreadsheet Data Attributes (Dynamic Sheet Columns) */}
                {activeLead.extra_data && typeof activeLead.extra_data === 'object' && Object.keys(activeLead.extra_data).length > 0 && (
                  <div className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Lead Intelligence & Sheet Attributes
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(activeLead.extra_data).map(([key, val]) => (
                        <div key={key} className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">{key}:</span>
                          <span className="text-slate-900 font-medium text-xs break-words">{String(val || '—')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mandatory Call Disposition & Notes Console (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-5 sm:p-6 sticky top-16">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="font-bold text-slate-950 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span>Call Disposition & Notes</span>
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Mandatory Gate
                  </span>
                </div>

                <form onSubmit={handleSubmitLead} className="space-y-4">
                  {/* Step 1: Disposition Selector */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                      1. Select Call Outcome <span className="text-rose-500">*</span>
                    </label>

                    <div className="space-y-1.5">
                      {dispositionsList.map((d) => {
                        const selected = disposition === d.id;
                        return (
                          <label
                            key={d.id}
                            className={`flex items-start justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                              selected
                                ? d.activeRing
                                : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="radio"
                                name="disposition"
                                value={d.id}
                                checked={selected}
                                onChange={(e) => setDisposition(e.target.value)}
                                className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300 mt-0.5"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{d.label}</span>
                                <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">{d.desc}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${d.badge}`}>
                              {d.tag}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Follow-Up Date Scheduler (if Call Back Later) */}
                  {disposition === 'Call Back Later' && (
                    <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-lg space-y-1.5">
                      <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        <span>Schedule Callback Date & Time <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="block w-full text-xs bg-white border border-amber-300 rounded-lg p-2 text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Step 3: Agent Notes Textarea with Gate Character Counter */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        2. Conversation Notes <span className="text-rose-500">*</span>
                      </label>

                      {/* Character Counter Badge */}
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          isNotesValid
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isNotesExempt ? (
                          'Notes optional for unreached'
                        ) : (
                          `${notes.trim().length} / ${minRequiredLength} chars min`
                        )}
                      </span>
                    </div>

                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        isNotesExempt
                          ? 'Optional notes (e.g. rang out twice, subscriber switched off, busy)'
                          : 'Detail call discussion, product demand, objections, wholesale volume interest...'
                      }
                      className="block w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition placeholder:text-slate-400"
                    />

                    {!isNotesValid && disposition && (
                      <p className="mt-1.5 text-[11px] text-amber-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Enter at least {minRequiredLength - notes.trim().length} more characters to unlock submission.</span>
                      </p>
                    )}
                  </div>

                  {/* Step 4: Submission CTA */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={!isFormValid || submitting}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-xs font-bold text-white bg-slate-950 hover:bg-slate-900 active:scale-[0.99] border border-slate-800 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Logging Call & Dispensing Next...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Call & Next Lead</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-slate-500 leading-tight">
                    Submitting writes the call log to audit records, clears the record, and atomically fetches the next pending queue contact.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
          Slide-Out Drawer: Shift History (My Logged Calls Today)
          ========================================================= */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity" onClick={() => setShowHistoryDrawer(false)} />
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-xl flex flex-col border-l border-slate-200">
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-950 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Shift Calling Log</h3>
                  <p className="text-[11px] text-slate-400">
                    Your recent calls logged today ({recentLogs.length} total)
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {historyLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-slate-500">Loading call history...</p>
                  </div>
                ) : recentLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No Calls Logged Yet Today</p>
                    <p className="text-[11px] text-slate-400 mt-1">Dispense a lead to begin your calling shift.</p>
                  </div>
                ) : (
                  recentLogs.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-950">{log.lead_name || 'Unnamed Lead'}</span>
                        <span className="font-mono text-[11px] text-slate-400">{formatTimestamp(log.called_at)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-600 font-semibold">{log.phone_number}</span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          Duration: {formatTime(log.duration_seconds || 0)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-800">
                          {log.disposition}
                        </span>
                        {log.follow_up_date && (
                          <span className="text-[10px] text-amber-800 font-medium">
                            Callback: {new Date(log.follow_up_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {log.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          Desktop QR Code Dial Modal
          ========================================================= */}
      {showQrModal && activeLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-950">Scan to Dial on Mobile</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Point your smartphone camera at this code to dial instantly without manual typing.
            </p>

            <div className="bg-white p-4 rounded-lg border border-slate-200 inline-block shadow-2xs mb-4">
              <QRCodeSVG
                value={`tel:${qrTargetPhone}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <p className="font-mono font-bold text-slate-950 text-base mb-0.5 tracking-wider tabular-nums">
              {qrTargetPhone}
            </p>
            <p className="text-xs text-slate-500 mb-5 font-medium">
              {activeLead.lead_name}
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition shadow-2xs"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
