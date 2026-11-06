import React from 'react';
import { X, Building, Phone, Clock, User, Calendar, CheckCircle, FileText, Tag } from 'lucide-react';

export default function LeadDetailsModal({ lead, onClose, onReset }) {
  if (!lead) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Locked_In_Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Follow_Up':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700">
              {lead.lead_id_code || `LEAD-${lead.id}`}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(lead.status)}`}>
              {lead.status.replace(/_/g, ' ')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Main Lead Info */}
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{lead.lead_name}</h2>
            {lead.company_or_details && (
              <p className="text-slate-600 mt-1">{lead.company_or_details}</p>
            )}
          </div>

          {/* Contact Numbers */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase block mb-1">Primary Phone</span>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span className="font-mono font-bold text-slate-900 text-base">{lead.phone_number}</span>
              </div>
            </div>

            {lead.alternate_phone && (
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase block mb-1">Alternate Phone</span>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-slate-700">{lead.alternate_phone}</span>
                </div>
              </div>
            )}
          </div>

          {/* Call Result / Notes (if contacted) */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Call Disposition & Telecaller Notes</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold block text-[11px]">Disposition:</span>
                <span className="text-slate-900 font-bold text-sm">
                  {lead.call_disposition || 'Not Contacted Yet'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold block text-[11px]">Assigned Agent:</span>
                <span className="text-slate-900 font-bold">
                  {lead.assigned_agent_name || 'None'}
                </span>
              </div>

              {lead.called_at && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold block text-[11px]">Called At:</span>
                  <span className="text-slate-900 font-medium">
                    {new Date(lead.called_at).toLocaleString()}
                  </span>
                </div>
              )}

              {lead.follow_up_date && (
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <span className="text-purple-700 font-semibold block text-[11px]">Follow-Up Scheduled:</span>
                  <span className="text-purple-900 font-bold">
                    {new Date(lead.follow_up_date).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">Agent Notes:</span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 text-xs min-h-[60px] whitespace-pre-wrap">
                {lead.agent_notes || 'No notes submitted yet.'}
              </div>
            </div>
          </div>

          {/* Extra Spreadsheet Data Attributes */}
          {lead.extra_data && typeof lead.extra_data === 'object' && Object.keys(lead.extra_data).length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Original Spreadsheet Columns</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(lead.extra_data).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-500 text-[11px] block">{k}</span>
                    <span className="text-slate-900 font-medium">{String(v || '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {lead.status !== 'Pending' && (
              <button
                type="button"
                onClick={() => onReset(lead.id)}
                className="px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition"
              >
                Re-queue to Pending
              </button>
            )}
          </div>

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
  );
}

