import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  PhoneCall,
  Phone,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  ArrowRight,
  MapPin,
  Building,
  User,
  FileText,
  Calendar,
  RefreshCw,
  Smartphone,
  Shield,
  Layers,
  Check,
  Headphones
} from 'lucide-react';

export default function AgentWorkspace() {
  const { user, logout } = useAuth();

  const [activeLead, setActiveLead] = useState(null);
  const [stats, setStats] = useState({
    todayCalls: { total: 0, interested: 0, followups: 0, notInterested: 0, noAnswer: 0, avgSeconds: 0 },
    queueRemaining: 0,
  });

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
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initialize caller workspace');
    } finally {
      setLoading(false);
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
          setSuccessMessage('Resumed your active locked lead. Please complete notes to proceed.');
        }
      } else {
        setActiveLead(null);
        setErrorMessage(res.message || 'No pending leads available in the queue.');
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

      // Celebration confetti if lead was interested!
      if (disposition === 'Answered - Interested') {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
        });
      }

      setSuccessMessage(`Lead #${activeLead.lead_id_code || activeLead.id} logged as "${disposition}". Loading next lead...`);

      // Clear current form
      setActiveLead(null);
      setDisposition('');
      setNotes('');
      setFollowUpDate('');

      // Auto-load next lead in queue
      setTimeout(() => {
        handleGetNextLead();
      }, 700);
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

  const dispositionsList = [
    { id: 'Answered - Interested', label: 'Answered - Interested', color: 'border-emerald-500 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/70', badge: 'bg-emerald-600 text-white' },
    { id: 'Call Back Later', label: 'Call Back Later', color: 'border-amber-500 bg-amber-50/50 text-amber-800 hover:bg-amber-100/70', badge: 'bg-amber-600 text-white' },
    { id: 'Answered - Not Interested', label: 'Answered - Not Interested', color: 'border-rose-400 bg-rose-50/50 text-rose-800 hover:bg-rose-100/70', badge: 'bg-rose-600 text-white' },
    { id: 'No Answer / Busy', label: 'No Answer / Busy', color: 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100', badge: 'bg-slate-600 text-white' },
    { id: 'Invalid / Wrong Number', label: 'Invalid / Wrong Number', color: 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100', badge: 'bg-slate-700 text-white' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Telecaller Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base">Sequential Dialer Workspace</h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1.5"></span>
                  Active Calling Session
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>Single-Lead Restricted Mode • Telecaller: <strong>{user?.name || user?.username}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Today Call Counter Badges */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-500">Calls Today:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md shadow-2xs border border-slate-200">
                {stats.todayCalls.total}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Pending Queue:</span>
              <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {stats.queueRemaining}
              </span>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-rose-600 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Feedback banners */}
        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-2xs animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-600 font-medium">Checking locked lead session...</p>
          </div>
        ) : !activeLead ? (
          /* =========================================================
             SCREEN A: START CALLING / EMPTY QUEUE SCREEN
             ========================================================= */
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden text-center p-8 sm:p-12 max-w-2xl mx-auto w-full">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-5 shadow-inner">
              <Headphones className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              Ready for Your Next Call
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-8">
              Click below to dispense the next lead in queue. The lead will be exclusively locked to your screen.
            </p>

            <button
              onClick={handleGetNextLead}
              disabled={assigning}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl shadow-xl shadow-indigo-600/30 transition transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Locking Next Lead...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                  <span>Get Next Lead</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Today Caller Summary Dashboard */}
            <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Today's Calls</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.todayCalls.total}</p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">Interested</span>
                <p className="text-2xl font-black text-emerald-800 mt-1">{stats.todayCalls.interested}</p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-amber-700 uppercase">Follow-Ups</span>
                <p className="text-2xl font-black text-amber-800 mt-1">{stats.todayCalls.followups}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Queue Remaining</span>
                <p className="text-2xl font-black text-indigo-600 mt-1">{stats.queueRemaining}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Zero contact lists accessible. Sequential atomic dispensing enforced.</span>
            </div>
          </div>
        ) : (
          /* =========================================================
             SCREEN B: ACTIVE SINGLE-LEAD WORKSPACE & NOTE GATE
             ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Lead Info Card & Dialing Integration (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-7 relative overflow-hidden">
                {/* Active lead badge & Call timer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Active Lead #{activeLead.lead_id_code || activeLead.id}
                    </span>
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                      Queue Order #1
                    </span>
                  </div>

                  {/* Live Call Duration */}
                  <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-mono font-semibold shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Call Time: {formatTime(callTimer)}</span>
                  </div>
                </div>

                {/* Business / Lead Name */}
                <div className="mb-6">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-600">
                    Lead Name / Business
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 leading-tight">
                    {activeLead.lead_name}
                  </h2>

                  {activeLead.company_or_details && (
                    <p className="mt-2 text-sm text-slate-600 flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{activeLead.company_or_details}</span>
                    </p>
                  )}
                </div>

                {/* Dialing Options Section */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Primary Number */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">
                        Primary Phone Contact
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-wide">
                          {activeLead.phone_number}
                        </span>
                      </div>
                      {activeLead.alternate_phone && (
                        <div className="mt-1 text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                          <span>Alt: {activeLead.alternate_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Desktop Scannable QR Code Quick Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQrTargetPhone(activeLead.phone_number);
                          setShowQrModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl shadow-2xs transition"
                        title="Scan with phone camera to dial"
                      >
                        <QrCode className="w-4 h-4 text-indigo-600" />
                        <span>Desktop QR Dial</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary "Call Lead Now" Action (Mobile Optimized) */}
                  <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row gap-3">
                    <a
                      href={`tel:${activeLead.phone_number}`}
                      className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-600/30 transition text-center"
                    >
                      <Phone className="w-5 h-5 text-emerald-100 animate-bounce" />
                      <span>Call Lead Now</span>
                    </a>

                    {activeLead.alternate_phone && (
                      <a
                        href={`tel:${activeLead.alternate_phone}`}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl transition"
                      >
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span>Call Alt Number</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Extra Spreadsheet Data Attributes (if present) */}
                {activeLead.extra_data && typeof activeLead.extra_data === 'object' && Object.keys(activeLead.extra_data).length > 0 && (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                      Lead Intelligence & Pitch Data
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(activeLead.extra_data).map(([key, val]) => (
                        <div key={key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-600 block text-[11px]">{key}:</span>
                          <span className="text-slate-900 font-medium">{String(val || '—')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mandatory Note Submission Gate (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-7 sticky top-20">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Call Disposition & Notes</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Required Gate
                  </span>
                </div>

                <form onSubmit={handleSubmitLead} className="space-y-5">
                  {/* Step 1: Disposition Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      1. Select Outcome (Disposition) <span className="text-rose-500">*</span>
                    </label>

                    <div className="space-y-1.5">
                      {dispositionsList.map((d) => {
                        const selected = disposition === d.id;
                        return (
                          <label
                            key={d.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                              selected
                                ? `${d.color} ring-2 ring-indigo-500 shadow-2xs`
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="disposition"
                                value={d.id}
                                checked={selected}
                                onChange={(e) => setDisposition(e.target.value)}
                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                              />
                              <span>{d.label}</span>
                            </div>
                            {selected && <Check className="w-4 h-4 text-indigo-600" />}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Follow-Up Date (if Call Back Later) */}
                  {disposition === 'Call Back Later' && (
                    <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        <span>Schedule Follow-Up Date & Time</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="block w-full text-xs bg-white border border-amber-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Step 3: Agent Notes Textarea with Minimum Char Gate */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        2. Detailed Call Notes <span className="text-rose-500">*</span>
                      </label>

                      {/* Character Counter Badge */}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isNotesValid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isNotesExempt ? (
                          'Notes optional for busy/invalid'
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
                          ? 'Optional notes (e.g. rang out twice, switched off)'
                          : 'Describe lead discussion, key objections, products demanded, wholesale interest...'
                      }
                      className="block w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder:text-slate-400"
                    />

                    {!isNotesValid && disposition && (
                      <p className="mt-1.5 text-[11px] text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Type at least {minRequiredLength - notes.trim().length} more characters to unlock submission.</span>
                      </p>
                    )}
                  </div>

                  {/* Step 4: Submission Action Button */}
                  <button
                    type="submit"
                    disabled={!isFormValid || submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-lg shadow-indigo-600/25 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting Notes & Next...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit & Get Next Lead</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-slate-500">
                    Submitting logs the call with timestamp, clears this screen, and immediately assigns the next lead in queue.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Scannable Desktop-to-Phone QR Modal */}
      {showQrModal && activeLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Scan to Dial Instant</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Point your smartphone camera at this QR code to dial without typing the number!
            </p>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 inline-block shadow-inner mb-4">
              <QRCodeSVG
                value={`tel:${qrTargetPhone}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <p className="font-mono font-bold text-slate-900 text-base mb-1">
              {qrTargetPhone}
            </p>
            <p className="text-xs text-slate-400 mb-5">
              {activeLead.lead_name}
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

