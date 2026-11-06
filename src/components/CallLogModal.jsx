import React from 'react';
import { X, Phone, User, Calendar, Clock, FileText, CheckCircle2, AlertCircle, PhoneForwarded, Copy, Check } from 'lucide-react';

export default function CallLogModal({ log, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const handleCopyPhone = (num) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDispositionStyle = (disp) => {
    switch (disp) {
      case 'Answered - Interested':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20';
      case 'Call Back Later':
        return 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20';
      case 'Answered - Not Interested':
        return 'bg-rose-50 text-rose-800 border-rose-300 ring-rose-500/20';
      case 'No Answer / Busy':
        return 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-500/20';
      case 'Invalid / Wrong Number':
        return 'bg-red-50 text-red-800 border-red-300 ring-red-500/20';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-500/20';
    }
  };

  const formatDuration = (sec) => {
    const s = sec || 0;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem < 10 ? '0' : ''}${rem}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <PhoneForwarded className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500">
                  LOG #{log.id}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ring-1 ${getDispositionStyle(log.disposition)}`}>
                  {log.disposition}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Called on <span className="font-mono">{log.called_at ? new Date(log.called_at).toLocaleString() : 'N/A'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Telecaller identity strip */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Logged By Telecaller</span>
                <span className="font-bold text-base text-white">{log.agent_name || 'Unknown Agent'}</span>
                <span className="font-mono text-xs text-slate-400 ml-2">(@{log.agent_username})</span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Call Duration</span>
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(log.duration_seconds)} ({log.duration_seconds || 0}s)
                </span>
              </div>
            </div>
          </div>

          {/* Lead Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact Information</span>
              {log.lead_id_code && (
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {log.lead_id_code}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">{log.lead_name || 'N/A'}</h3>
              {log.company_or_details && (
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.company_or_details}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Phone Number</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{log.phone_number || 'N/A'}</span>
                </div>
                {log.phone_number && (
                  <button
                    onClick={() => handleCopyPhone(log.phone_number)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                    title="Copy phone"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {log.alternate_phone && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Alternate Phone</span>
                    <span className="font-mono text-slate-800 text-sm">{log.alternate_phone}</span>
                  </div>
                  <button
                    onClick={() => handleCopyPhone(log.alternate_phone)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                    title="Copy phone"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Follow Up Date Banner (if scheduled) */}
          {log.follow_up_date && (
            <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3.5 flex items-center gap-3 text-amber-900">
              <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="text-xs font-bold block">Follow-Up Scheduled</span>
                <span className="text-xs font-mono font-semibold text-amber-800">
                  {new Date(log.follow_up_date).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Agent Notes */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Full Conversation Notes</span>
            </h4>
            <div className="bg-slate-50 rounded-lg p-3.5 text-xs text-slate-800 border border-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
              {log.notes || 'No detailed notes recorded for this call.'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Audit Record ID: <code className="font-mono font-bold text-slate-700">CALL-{log.id}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

