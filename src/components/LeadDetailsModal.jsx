import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  X,
  Phone,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  FileText,
  Tag,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  History,
  PhoneCall,
  CheckCircle,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function LeadDetailsModal({ lead, onClose, onReset }) {
  const [activeSubTab, setActiveSubTab] = useState('activity'); // 'activity' | 'info' | 'spreadsheet'
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (lead?.id) {
      loadLeadActivity(lead.id);
    }
  }, [lead?.id]);

  const loadLeadActivity = async (leadId) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.admin.getLeadActivity(leadId);
      setActivityData(data);
    } catch (err) {
      console.error('Failed to load lead activity:', err);
      setError('Could not load call history: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  const currentLead = activityData?.lead || lead;
  const callLogs = activityData?.call_logs || [];
  const stats = activityData?.stats || {
    total_calls: callLogs.length,
    total_talk_time_seconds: currentLead.call_duration_seconds || 0,
    unique_agents_count: currentLead.assigned_agent_name ? 1 : 0,
    first_called_at: currentLead.called_at,
    latest_called_at: currentLead.called_at,
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const formatDuration = (totalSec) => {
    const s = parseInt(totalSec, 10) || 0;
    if (s <= 0) return '0s';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m === 0) return `${rem}s`;
    return `${m}m ${rem < 10 ? '0' : ''}${rem}s`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Locked_In_Progress':
        return 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-500/20';
      case 'Pending':
        return 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20';
      case 'Follow_Up':
        return 'bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-500/20';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getDispositionStyle = (disp) => {
    switch (disp) {
      case 'Answered - Interested':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Call Back Later':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Answered - Not Interested':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'No Answer / Busy':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Invalid / Wrong Number':
        return 'bg-red-50 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-200 text-slate-800 border border-slate-300">
              {currentLead.lead_id_code || `LEAD-${currentLead.id}`}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(currentLead.status)}`}>
              {currentLead.status.replace(/_/g, ' ')}
            </span>
            {currentLead.status === 'Locked_In_Progress' && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                In Live Call with {currentLead.assigned_agent_name || 'Telecaller'}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Hero Overview Card */}
        <div className="bg-slate-900 text-white px-6 py-4.5 border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{currentLead.lead_name}</h2>
              </div>
              {currentLead.company_or_details && (
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {currentLead.company_or_details}
                </p>
              )}
            </div>

            {/* Quick Contact & Talk Time Stats */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Talk Time</span>
                <span className="font-mono font-bold text-emerald-400 text-sm flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(stats.total_talk_time_seconds)}
                </span>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Call Attempts</span>
                <span className="font-mono font-bold text-white text-sm flex items-center gap-1.5 mt-0.5">
                  <PhoneCall className="w-3.5 h-3.5 text-indigo-400" />
                  {stats.total_calls} calls
                </span>
              </div>
            </div>
          </div>

          {/* Milestone Pipeline Tracker */}
          <div className="mt-4 pt-3.5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">1. Imported</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentLead.created_at ? new Date(currentLead.created_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                currentLead.assigned_agent_name ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {currentLead.assigned_agent_name ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>}
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">2. Assigned Agent</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[130px] block">
                  {currentLead.assigned_agent_name || 'Not assigned'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                stats.total_calls > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {stats.total_calls > 0 ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>}
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">3. Dialed & Talked</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {stats.total_calls > 0 ? `${stats.total_calls} calls (${formatDuration(stats.total_talk_time_seconds)})` : 'Pending'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                currentLead.call_disposition ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {currentLead.call_disposition ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>}
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-[11px]">4. Outcome Logged</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[130px] block">
                  {currentLead.call_disposition || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Inside Modal */}
        <div className="border-b border-slate-200 px-6 flex gap-6 bg-slate-50/60 text-xs">
          <button
            onClick={() => setActiveSubTab('activity')}
            className={`py-3 font-bold border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Agent Work & Call Audit ({callLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('info')}
            className={`py-3 font-bold border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'info'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Contact & Details</span>
          </button>

          {currentLead.extra_data && (
            <button
              onClick={() => setActiveSubTab('spreadsheet')}
              className={`py-3 font-bold border-b-2 transition flex items-center gap-2 ${
                activeSubTab === 'spreadsheet'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Original Spreadsheet Data</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* =========================================================
              SUBTAB 1: AGENT WORK & CALL AUDIT HISTORY (MAIN FOCUS)
              ========================================================= */}
          {activeSubTab === 'activity' && (
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">Loading chronological call records...</span>
                </div>
              ) : callLogs.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500">
                  <PhoneCall className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No Calls Logged on this Lead Yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    This lead is currently in the sequential queue with status: <strong>{currentLead.status}</strong>.
                    As soon as a telecaller contacts the customer and submits notes, the complete conversation audit will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Chronological Call History ({callLogs.length} attempts recorded)
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Total Duration: <strong>{formatDuration(stats.total_talk_time_seconds)}</strong>
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {callLogs.map((log, idx) => {
                      const attemptNumber = callLogs.length - idx;
                      return (
                        <div
                          key={log.id}
                          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition"
                        >
                          {/* Attempt Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                                Attempt #{attemptNumber}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${getDispositionStyle(log.disposition)}`}>
                                {log.disposition}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {log.called_at ? new Date(log.called_at).toLocaleString() : 'N/A'}
                              </span>
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                {formatDuration(log.duration_seconds)}
                              </span>
                            </div>
                          </div>

                          {/* Telecaller identity who performed this work */}
                          <div className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-700">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>Work logged by: <strong>{log.agent_name || 'Telecaller'}</strong></span>
                              <span className="font-mono text-slate-400 text-[11px]">(@{log.agent_username})</span>
                            </div>

                            {log.follow_up_date && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                Callback: {new Date(log.follow_up_date).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Full Agent Notes Box */}
                          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Telecaller Conversation Notes & Feedback:
                            </span>
                            <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-sans text-xs">
                              {log.notes || 'No detailed conversation notes provided for this call.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              SUBTAB 2: CONTACT & LOCATION DETAILS
              ========================================================= */}
          {activeSubTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Primary Phone Number</span>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono font-bold text-slate-900 text-sm">{currentLead.phone_number}</span>
                    <button
                      onClick={() => handleCopy(currentLead.phone_number)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 ml-1"
                      title="Copy phone"
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {currentLead.alternate_phone && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alternate Phone</span>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="font-mono text-slate-800 text-sm">{currentLead.alternate_phone}</span>
                      <button
                        onClick={() => handleCopy(currentLead.alternate_phone)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 ml-1"
                        title="Copy alternate phone"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {currentLead.company_or_details && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Company / Town / Pitch Notes</span>
                  <p className="text-slate-800 leading-relaxed font-sans">{currentLead.company_or_details}</p>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              SUBTAB 3: ORIGINAL SPREADSHEET COLUMNS
              ========================================================= */}
          {activeSubTab === 'spreadsheet' && currentLead.extra_data && (
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Spreadsheet Raw Columns ({Object.keys(currentLead.extra_data).length} fields)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(currentLead.extra_data).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-500 text-[11px] block">{key}</span>
                    <span className="text-slate-900 font-medium text-xs mt-0.5 block">{String(val || '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {currentLead.status !== 'Pending' && (
              <button
                type="button"
                onClick={() => onReset(currentLead.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition shadow-2xs"
                title="Return this lead to the pending dialer queue"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-queue Lead to Pending</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
