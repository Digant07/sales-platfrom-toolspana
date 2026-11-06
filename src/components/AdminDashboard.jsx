import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import LeadDetailsModal from './LeadDetailsModal';
import CallLogModal from './CallLogModal';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  PlusCircle,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  PhoneCall,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Eye,
  Trash2,
  Sparkles,
  Shield,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  FileText,
  Headphones,
  PhoneForwarded,
  Copy,
  ArrowUpRight,
  History
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'call-logs' | 'leads' | 'upload' | 'manual' | 'agents'

  // Global feedback messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Analytics state
  const [analytics, setAnalytics] = useState({
    kpis: {
      totalLeads: 0,
      pendingLeads: 0,
      activeLeads: 0,
      completedLeads: 0,
      followUpLeads: 0,
      totalCallsToday: 0,
      avgDurationToday: 0,
      completionRate: 0,
    },
    dispositions: [],
  });

  // 2. Master leads table state
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAgent, setFilterAgent] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);

  // 3. Agent list state
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', username: '', password: '', phone: '' });
  const [creatingAgent, setCreatingAgent] = useState(false);

  // 4. Manual lead form state
  const [manualLead, setManualLead] = useState({
    lead_name: '',
    phone_number: '',
    alternate_phone: '',
    lead_id_code: '',
    company_or_details: '',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // 5. Excel / CSV File Upload & Column Mapping state
  const [uploadFile, setUploadFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({
    lead_name: '',
    phone_number: '',
    alternate_phone: '',
    company_or_details: '',
    lead_id_code: '',
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // 6. Call Activity & Audit Logs state (All Agents Call Details & Analytics)
  const [callLogs, setCallLogs] = useState([]);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [callLogsPagination, setCallLogsPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [callLogsSummary, setCallLogsSummary] = useState({
    total_calls: 0,
    total_duration_seconds: 0,
    avg_duration_seconds: 0,
    interested_count: 0,
    callback_count: 0,
    not_interested_count: 0,
    unreachable_count: 0,
    conversion_rate: 0,
  });
  const [agentBreakdown, setAgentBreakdown] = useState([]);
  const [callLogSearch, setCallLogSearch] = useState('');
  const [callLogAgent, setCallLogAgent] = useState('all');
  const [callLogDisposition, setCallLogDisposition] = useState('all');
  const [callLogDateRange, setCallLogDateRange] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month'
  const [selectedCallLog, setSelectedCallLog] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState('');

  // Initial load
  useEffect(() => {
    loadAnalytics();
    loadAgents();
    loadLeads(1);
    loadCallLogs(1);
  }, []);

  // When filters or search change for leads
  useEffect(() => {
    loadLeads(1);
  }, [filterStatus, filterAgent]);

  // When filters change for call logs
  useEffect(() => {
    if (activeTab === 'call-logs') {
      loadCallLogs(1);
    }
  }, [activeTab, callLogAgent, callLogDisposition, callLogDateRange]);

  const loadCallLogs = async (page = 1) => {
    try {
      setCallLogsLoading(true);
      const res = await api.admin.getCallLogs({
        page,
        limit: 25,
        search: callLogSearch,
        agent_id: callLogAgent,
        disposition: callLogDisposition,
        date_range: callLogDateRange,
      });
      setCallLogs(res.call_logs || []);
      setCallLogsPagination(res.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      setCallLogsSummary(res.summary || {
        total_calls: 0,
        total_duration_seconds: 0,
        avg_duration_seconds: 0,
        interested_count: 0,
        callback_count: 0,
        not_interested_count: 0,
        unreachable_count: 0,
        conversion_rate: 0,
      });
      setAgentBreakdown(res.agent_breakdown || []);
    } catch (err) {
      console.error('Call logs error:', err);
      setErrorMsg('Failed to load call audit logs: ' + err.message);
    } finally {
      setCallLogsLoading(false);
    }
  };

  const handleExportCallLogs = async () => {
    try {
      setSuccessMsg('Preparing call activity audit spreadsheet...');
      await api.admin.downloadCallLogsExport({
        search: callLogSearch,
        agent_id: callLogAgent,
        disposition: callLogDisposition,
        date_range: callLogDateRange,
      });
      setSuccessMsg('Call logs spreadsheet downloaded successfully!');
    } catch (err) {
      setErrorMsg('Call logs export failed: ' + err.message);
    }
  };

  const handleViewAgentLogs = (agentId) => {
    setCallLogAgent(String(agentId));
    setActiveTab('call-logs');
  };

  const copyNumber = (num) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedPhone(num);
    setTimeout(() => setCopiedPhone(''), 2000);
  };

  const formatDuration = (totalSec) => {
    const s = parseInt(totalSec, 10) || 0;
    if (s <= 0) return '0s';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m === 0) return `${rem}s`;
    return `${m}m ${rem < 10 ? '0' : ''}${rem}s`;
  };

  const formatTotalTime = (totalSec) => {
    const s = parseInt(totalSec, 10) || 0;
    if (s <= 0) return '0h 0m';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const loadAnalytics = async () => {
    try {
      const data = await api.admin.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics load error:', err);
    }
  };

  const loadAgents = async () => {
    try {
      setAgentsLoading(true);
      const data = await api.admin.getAgents();
      setAgents(data.agents || []);
    } catch (err) {
      console.error('Agents load error:', err);
    } finally {
      setAgentsLoading(false);
    }
  };

  const loadLeads = async (page = 1) => {
    try {
      setLeadsLoading(true);
      const res = await api.admin.getLeads({
        page,
        limit: 25,
        search: searchTerm,
        status: filterStatus,
        agent_id: filterAgent,
      });
      setLeads(res.leads || []);
      setPagination(res.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (err) {
      setErrorMsg('Failed to load leads: ' + err.message);
    } finally {
      setLeadsLoading(false);
    }
  };

  // Reset / Re-queue a single lead
  const handleResetLead = async (id) => {
    try {
      await api.admin.resetLead(id);
      setSuccessMsg(`Lead returned to Pending queue.`);
      loadLeads(pagination.page);
      loadAnalytics();
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(null);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Delete single lead
  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.admin.deleteLead(id);
      setSuccessMsg('Lead deleted.');
      loadLeads(pagination.page);
      loadAnalytics();
      if (selectedLead && selectedLead.id === id) setSelectedLead(null);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Clear pending queue
  const handleClearQueue = async () => {
    if (!window.confirm('Are you sure you want to clear all uncalled (Pending) leads from the queue?')) return;
    try {
      await api.admin.clearQueue();
      setSuccessMsg('Pending queue cleared.');
      loadLeads(1);
      loadAnalytics();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // One-click Seed Sample Data
  const handleSeedSample = async () => {
    try {
      setSuccessMsg('Loading Rajasthan power tool leads catalog...');
      const res = await api.admin.seedSampleLeads();
      setSuccessMsg(res.message);
      loadLeads(1);
      loadAnalytics();
    } catch (err) {
      setErrorMsg('Seed failed: ' + err.message);
    }
  };

  // One-Click Excel Export
  const handleExportExcel = async () => {
    try {
      setSuccessMsg('Preparing Excel spreadsheet with full call notes...');
      await api.admin.downloadExport();
      setSuccessMsg('Excel export downloaded successfully!');
    } catch (err) {
      setErrorMsg('Export failed: ' + err.message);
    }
  };

  // Handle Manual Lead Entry Submission
  const handleManualLeadSubmit = async (e) => {
    e.preventDefault();
    if (!manualLead.lead_name || !manualLead.phone_number) {
      setErrorMsg('Lead Name and Phone Number are required.');
      return;
    }

    try {
      setManualSubmitting(true);
      setErrorMsg('');
      const res = await api.admin.createManualLead(manualLead);
      setSuccessMsg(res.message);
      setManualLead({
        lead_name: '',
        phone_number: '',
        alternate_phone: '',
        lead_id_code: '',
        company_or_details: '',
      });
      loadLeads(1);
      loadAnalytics();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  // Handle File Upload Preview
  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      setErrorMsg('');
      setUploadFile(file);

      const formData = new FormData();
      formData.append('file', file);

      const res = await api.admin.previewFile(formData);
      setPreviewData(res);
      setColumnMapping(res.suggestedMapping || {});
    } catch (err) {
      setErrorMsg('Failed to parse file: ' + err.message);
      setPreviewData(null);
    } finally {
      setUploadLoading(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!previewData || !previewData.allRows) return;
    if (!columnMapping.lead_name || !columnMapping.phone_number) {
      setErrorMsg('Please map at least Lead Name and Phone Number columns.');
      return;
    }

    try {
      setImporting(true);
      setErrorMsg('');
      const res = await api.admin.importLeads({
        rows: previewData.allRows,
        mapping: columnMapping,
      });

      setSuccessMsg(res.message);
      setPreviewData(null);
      setUploadFile(null);
      setActiveTab('leads');
      loadLeads(1);
      loadAnalytics();
    } catch (err) {
      setErrorMsg('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Create Agent Account
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!newAgent.name || !newAgent.username || !newAgent.password) {
      setErrorMsg('Name, username, and password are required.');
      return;
    }

    try {
      setCreatingAgent(true);
      setErrorMsg('');
      const res = await api.admin.createAgent(newAgent);
      setSuccessMsg(res.message);
      setNewAgent({ name: '', username: '', password: '', phone: '' });
      loadAgents();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCreatingAgent(false);
    }
  };

  // Toggle Agent Active Status
  const handleToggleAgentStatus = async (agent) => {
    try {
      await api.admin.updateAgent(agent.id, { is_active: !agent.is_active });
      loadAgents();
      setSuccessMsg(`Agent '${agent.name}' ${agent.is_active ? 'deactivated' : 'activated'}.`);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Locked_In_Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Follow_Up':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-xs">
              <PhoneCall className="w-4 h-4 text-slate-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Sequential Dialer CRM</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Operations Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Logged in as <strong className="text-slate-700">{user?.name || user?.username}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition shadow-2xs"
              title="Download Excel with all disposition notes"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Leads Excel</span>
            </button>

            <button
              onClick={handleSeedSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition shadow-2xs"
              title="Reload Rajasthan industrial power tools leads catalog"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Reload Catalog</span>
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto border-t border-slate-100 scrollbar-none gap-1">
          <button
            onClick={() => { setActiveTab('overview'); loadAnalytics(); }}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-slate-900 text-slate-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & KPIs</span>
          </button>

          <button
            onClick={() => { setActiveTab('call-logs'); loadCallLogs(1); }}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'call-logs'
                ? 'border-slate-900 text-slate-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Call Activity & Audit Logs</span>
            {callLogsSummary.total_calls > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {callLogsSummary.total_calls}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('leads'); loadLeads(pagination.page); }}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'leads'
                ? 'border-slate-900 text-slate-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Master Lead Queue ({analytics.kpis.totalLeads})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-slate-900 text-slate-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Spreadsheet</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'manual'
                ? 'border-slate-900 text-slate-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manual Lead Entry</span>
          </button>

          <button
            onClick={() => { setActiveTab('agents'); loadAgents(); }}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'agents'
                ? 'border-slate-900 text-slate-950 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Telecallers ({agents.length})</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Alerts */}
        {successMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs">
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-700 hover:text-rose-900 text-xs">
              ✕
            </button>
          </div>
        )}

        {/* =========================================================
            TAB 1: OVERVIEW & ANALYTICS
            ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Leads</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{analytics.kpis.totalLeads}</p>
                <div className="mt-2 text-xs text-slate-600">
                  {analytics.kpis.completionRate}% processed
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending in Queue</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-amber-900 mt-2">{analytics.kpis.pendingLeads}</p>
                <div className="mt-2 text-xs text-amber-700">
                  Waiting for telecallers
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Currently Locked</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-blue-900 mt-2">{analytics.kpis.activeLeads}</p>
                <div className="mt-2 text-xs text-blue-700">
                  In progress right now
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed Calls</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-emerald-900 mt-2">{analytics.kpis.completedLeads}</p>
                <div className="mt-2 text-xs text-emerald-700">
                  +{analytics.kpis.followUpLeads} follow-ups scheduled
                </div>
              </div>
            </div>

            {/* Second Row: Disposition Breakdown & Today Calling Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Disposition Breakdown */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center justify-between">
                  <span>Call Disposition Breakdown</span>
                  <span className="text-xs font-normal text-slate-500">All submitted call logs</span>
                </h3>

                {analytics.dispositions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">No calls logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.dispositions.map((item) => {
                      const totalCompleted = analytics.kpis.completedLeads + analytics.kpis.followUpLeads || 1;
                      const pct = Math.round((item.count / totalCompleted) * 100);
                      return (
                        <div key={item.disposition}>
                          <div className="flex items-center justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-800">{item.disposition}</span>
                            <span className="text-slate-500 font-mono">{item.count} leads ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.disposition.includes('Interested')
                                  ? 'bg-emerald-500'
                                  : item.disposition.includes('Later')
                                  ? 'bg-amber-500'
                                  : item.disposition.includes('Not Interested')
                                  ? 'bg-rose-500'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Today Calling Velocity */}
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Today's Telecalling Velocity</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <span className="text-xs font-bold text-slate-500 uppercase">Calls Today</span>
                      <p className="text-2xl font-black text-slate-900 mt-1">{analytics.kpis.totalCallsToday}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <span className="text-xs font-bold text-slate-500 uppercase">Avg Call Duration</span>
                      <p className="text-2xl font-black text-indigo-600 mt-1 font-mono">
                        {Math.floor(analytics.kpis.avgDurationToday / 60)}m {analytics.kpis.avgDurationToday % 60}s
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Sequential Queue Security:</span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Atomic Locking Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB: CALL ACTIVITY & AUDIT LOGS (All Agents Call Details)
            ========================================================= */}
        {activeTab === 'call-logs' && (
          <div className="space-y-6">
            {/* Header with Title & Quick Export */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Telecaller Call Activity & Audit Logs
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {callLogsSummary.total_calls} Total Calls
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Comprehensive audit trail with timestamps, agent notes, call durations, and follow-up schedules.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleExportCallLogs}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition shadow-2xs"
                  title="Download all filtered call records to Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Call Logs to Excel</span>
                </button>

                <button
                  onClick={() => loadCallLogs(callLogsPagination.page)}
                  disabled={callLogsLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition shadow-2xs disabled:opacity-50"
                  title="Refresh call activity"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${callLogsLoading ? 'animate-spin text-indigo-600' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Calls</span>
                  <PhoneForwarded className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">{callLogsSummary.total_calls}</p>
                <span className="text-[11px] text-slate-500 block mt-0.5">Logged calls recorded</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Talk Time</span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">{formatTotalTime(callLogsSummary.total_duration_seconds)}</p>
                <span className="text-[11px] text-slate-500 block mt-0.5">{callLogsSummary.total_duration_seconds}s total connect time</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Avg Call Duration</span>
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-black text-indigo-600 mt-1.5 font-mono">{formatDuration(callLogsSummary.avg_duration_seconds)}</p>
                <span className="text-[11px] text-slate-500 block mt-0.5">Per conversation</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Interested Leads</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <p className="text-2xl font-black text-emerald-800 font-mono">{callLogsSummary.interested_count}</p>
                  <span className="text-xs font-bold text-emerald-600 font-mono">({callLogsSummary.conversion_rate}%)</span>
                </div>
                <span className="text-[11px] text-emerald-700 block mt-0.5">High-intent prospects</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-amber-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Follow-Ups Set</span>
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-black text-amber-800 mt-1.5 font-mono">{callLogsSummary.callback_count}</p>
                <span className="text-[11px] text-amber-700 block mt-0.5">Call back later requests</span>
              </div>
            </div>

            {/* Telecaller Performance Comparison Bar */}
            {agentBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Telecaller Productivity Breakdown:
                    </span>
                    <span className="text-[11px] text-slate-500">Click caller to filter activity logs</span>
                  </div>

                  {callLogAgent !== 'all' && (
                    <button
                      onClick={() => setCallLogAgent('all')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      <span>Clear caller filter (Show All)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {agentBreakdown.map((agent) => {
                    const isSelected = callLogAgent === String(agent.agent_id);
                    return (
                      <div
                        key={agent.agent_id}
                        onClick={() => setCallLogAgent(isSelected ? 'all' : String(agent.agent_id))}
                        className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs truncate">{agent.agent_name}</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {agent.calls_count} calls
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Talk: <strong className="text-slate-800">{formatTotalTime(agent.total_duration_seconds)}</strong></span>
                          <span>Interested: <strong className="text-emerald-700">{agent.interested_count} ({agent.conversion_rate}%)</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by lead name, phone number, telecaller, or call notes..."
                    value={callLogSearch}
                    onChange={(e) => setCallLogSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadCallLogs(1)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={callLogAgent}
                    onChange={(e) => setCallLogAgent(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Telecallers</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} (@{a.username})</option>
                    ))}
                  </select>

                  <select
                    value={callLogDisposition}
                    onChange={(e) => setCallLogDisposition(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Dispositions</option>
                    <option value="Answered - Interested">Answered - Interested</option>
                    <option value="Call Back Later">Call Back Later</option>
                    <option value="Answered - Not Interested">Answered - Not Interested</option>
                    <option value="No Answer / Busy">No Answer / Busy</option>
                    <option value="Invalid / Wrong Number">Invalid / Wrong Number</option>
                  </select>

                  <button
                    onClick={() => loadCallLogs(1)}
                    className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-2xs"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Date Range Quick Selector */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
                <span className="text-slate-500 font-semibold text-[11px] shrink-0">Date Range:</span>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'week', label: 'Last 7 Days' },
                  { id: 'month', label: 'Last 30 Days' },
                ].map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setCallLogDateRange(range.id)}
                    className={`px-3 py-1 rounded-lg font-medium transition text-xs whitespace-nowrap ${
                      callLogDateRange === range.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Master Call Activity Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3">Date & Time</th>
                      <th className="px-3.5 py-3">Telecaller</th>
                      <th className="px-3.5 py-3">Lead Contact</th>
                      <th className="px-3.5 py-3">Call Disposition</th>
                      <th className="px-3.5 py-3">Duration</th>
                      <th className="px-3.5 py-3">Conversation Notes</th>
                      <th className="px-3.5 py-3">Follow-Up</th>
                      <th className="px-3.5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {callLogsLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-medium">Loading call activity records...</span>
                          </div>
                        </td>
                      </tr>
                    ) : callLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <PhoneCall className="w-8 h-8 text-slate-300" />
                            <p className="font-semibold text-slate-700">No call activity recorded matching these filters.</p>
                            <p className="text-xs text-slate-400">Try selecting 'All Time' or clearing search terms.</p>
                            <button
                              onClick={() => {
                                setCallLogSearch('');
                                setCallLogAgent('all');
                                setCallLogDisposition('all');
                                setCallLogDateRange('all');
                              }}
                              className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition"
                            >
                              Reset All Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      callLogs.map((log) => {
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition group">
                            {/* Timestamp */}
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{log.called_at ? new Date(log.called_at).toLocaleString() : 'N/A'}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                LOG #{log.id}
                              </span>
                            </td>

                            {/* Telecaller */}
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span className="font-bold text-slate-900 block">{log.agent_name || 'Agent'}</span>
                              <span className="font-mono text-slate-400 text-[11px]">@{log.agent_username}</span>
                            </td>

                            {/* Lead Contact */}
                            <td className="px-3.5 py-3 max-w-[200px]">
                              <span
                                className="font-bold text-slate-900 block truncate cursor-pointer hover:text-indigo-600 transition"
                                onClick={() => setSelectedLead({
                                  id: log.lead_id,
                                  lead_name: log.lead_name,
                                  phone_number: log.phone_number,
                                  alternate_phone: log.alternate_phone,
                                  company_or_details: log.company_or_details,
                                  lead_id_code: log.lead_id_code,
                                  status: log.lead_current_status || 'Completed'
                                })}
                                title="Click to view full lead work dossier & activity timeline"
                              >
                                {log.lead_name || 'Unknown Lead'}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 mt-0.5">
                                <span>{log.phone_number}</span>
                                {log.phone_number && (
                                  <button
                                    onClick={() => copyNumber(log.phone_number)}
                                    className="p-0.5 rounded text-slate-400 hover:text-slate-700"
                                    title="Copy number"
                                  >
                                    {copiedPhone === log.phone_number ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                              {log.company_or_details && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5" title={log.company_or_details}>
                                  {log.company_or_details}
                                </p>
                              )}
                            </td>

                            {/* Disposition */}
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                log.disposition === 'Answered - Interested'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : log.disposition === 'Call Back Later'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : log.disposition === 'Answered - Not Interested'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : log.disposition === 'No Answer / Busy'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-red-50 text-red-800 border-red-300'
                              }`}>
                                {log.disposition === 'Answered - Interested' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {log.disposition === 'Call Back Later' && <Calendar className="w-3 h-3 text-amber-600" />}
                                <span>{log.disposition}</span>
                              </span>
                            </td>

                            {/* Duration */}
                            <td className="px-3.5 py-3 whitespace-nowrap font-mono font-medium text-slate-800">
                              {formatDuration(log.duration_seconds)}
                            </td>

                            {/* Conversation Notes Preview */}
                            <td className="px-3.5 py-3 max-w-[240px]">
                              {log.notes ? (
                                <p
                                  onClick={() => setSelectedCallLog(log)}
                                  className="text-slate-700 text-xs truncate cursor-pointer hover:text-indigo-600 leading-snug"
                                  title={log.notes}
                                >
                                  {log.notes}
                                </p>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No notes</span>
                              )}
                            </td>

                            {/* Follow-up date */}
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              {log.follow_up_date ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                                  <Calendar className="w-3 h-3 text-amber-600" />
                                  {new Date(log.follow_up_date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedCallLog(log)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                title="View full details and conversation notes"
                              >
                                View Log
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {callLogsPagination.totalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    Showing <strong>{((callLogsPagination.page - 1) * callLogsPagination.limit) + 1}</strong> to{' '}
                    <strong>{Math.min(callLogsPagination.page * callLogsPagination.limit, callLogsPagination.total)}</strong> of{' '}
                    <strong>{callLogsPagination.total}</strong> calls
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadCallLogs(callLogsPagination.page - 1)}
                      disabled={callLogsPagination.page <= 1}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    <span className="px-2 font-mono font-bold text-slate-800">
                      {callLogsPagination.page} / {callLogsPagination.totalPages}
                    </span>

                    <button
                      onClick={() => loadCallLogs(callLogsPagination.page + 1)}
                      disabled={callLogsPagination.page >= callLogsPagination.totalPages}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: MASTER LEAD QUEUE
            ========================================================= */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadLeads(1)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status & Agent Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending (In Queue)</option>
                  <option value="Locked_In_Progress">Locked In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Follow_Up">Follow Up</option>
                </select>

                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Agents</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => loadLeads(1)}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                  title="Refresh Table"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={handleClearQueue}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                  title="Clear uncalled leads from queue"
                >
                  Clear Pending
                </button>
              </div>
            </div>

            {/* Master Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">ID / Lead Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Details / Location</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assigned Caller</th>
                      <th className="px-4 py-3">Agent Work & Activity</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {leadsLoading ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          Loading leads...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                          No leads found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      leads.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[10px] text-slate-400 block font-semibold">
                              {l.lead_id_code || `#${l.id}`}
                            </span>
                            <span className="font-bold text-slate-900 text-sm block">
                              {l.lead_name}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-800">
                            <div>{l.phone_number}</div>
                            {l.alternate_phone && (
                              <div className="text-[11px] text-slate-400">{l.alternate_phone}</div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 max-w-xs truncate text-slate-600">
                            {l.company_or_details || '—'}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(l.status)}`}>
                              {l.status.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                            {l.assigned_agent_name ? (
                              <span className="font-medium text-slate-900">{l.assigned_agent_name}</span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 max-w-xs">
                            {l.status === 'Locked_In_Progress' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                In Call with {l.assigned_agent_name || 'Agent'}
                              </span>
                            ) : l.call_disposition ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    l.call_disposition === 'Answered - Interested'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : l.call_disposition === 'Call Back Later'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : l.call_disposition === 'Answered - Not Interested'
                                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                                      : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}>
                                    {l.call_disposition}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-500">
                                    {formatDuration(l.call_duration_seconds)}
                                  </span>
                                </div>
                                {l.agent_notes && (
                                  <p
                                    className="text-slate-600 text-[11px] line-clamp-1 italic cursor-pointer hover:text-indigo-600"
                                    onClick={() => setSelectedLead(l)}
                                    title={l.agent_notes}
                                  >
                                    "{l.agent_notes}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Uncontacted in Queue</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() => setSelectedLead(l)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                              title="Inspect complete agent work history and conversation audit"
                            >
                              <History className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Work History</span>
                            </button>

                            {l.status !== 'Pending' && (
                              <button
                                onClick={() => handleResetLead(l.id)}
                                className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Re-queue back to Pending"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteLead(l.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing {leads.length} of {pagination.total} leads (Page {pagination.page} of {pagination.totalPages || 1})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => loadLeads(pagination.page - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => loadLeads(pagination.page + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: EXCEL / CSV UPLOAD & COLUMN MAPPER
            ========================================================= */}
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
              <div className="text-center max-w-lg mx-auto mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Upload Leads Spreadsheet</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload any Excel (.xlsx, .xls) or CSV file. You will preview the first 5 rows and map spreadsheet headers to database fields.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              {!previewData && (
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 rounded-3xl p-8 text-center transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800">
                    Drop your spreadsheet here, or <span className="text-indigo-600 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Supports .xlsx, .xls, and .csv up to 25MB</p>

                  {uploadLoading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Reading file headers and sample rows...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Column Mapping & Preview Section */}
              {previewData && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-slate-500">Uploaded File:</span>
                      <p className="font-bold text-slate-900 text-sm">{uploadFile?.name}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                      {previewData.totalRows} Total Leads Detected
                    </span>
                  </div>

                  {/* Column Mapper Dropdowns */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Map Spreadsheet Columns to CRM Fields
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Lead Name */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Lead / Business Name <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={columnMapping.lead_name}
                          onChange={(e) => setColumnMapping({ ...columnMapping, lead_name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Select Column --</option>
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Primary Phone */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Primary Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={columnMapping.phone_number}
                          onChange={(e) => setColumnMapping({ ...columnMapping, phone_number: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Select Column --</option>
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Alternate Phone */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Alternate Contact (Optional)
                        </label>
                        <select
                          value={columnMapping.alternate_phone}
                          onChange={(e) => setColumnMapping({ ...columnMapping, alternate_phone: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- None / Skip --</option>
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Company / Details */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Company / Details / Pitch
                        </label>
                        <select
                          value={columnMapping.company_or_details}
                          onChange={(e) => setColumnMapping({ ...columnMapping, company_or_details: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- None / Skip --</option>
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Lead ID Code */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Lead ID Code (Optional)
                        </label>
                        <select
                          value={columnMapping.lead_id_code}
                          onChange={(e) => setColumnMapping({ ...columnMapping, lead_id_code: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Auto-generate LEAD-ID --</option>
                          {previewData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 5-Row Data Preview */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      First 5 Rows Preview
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr>
                            {previewData.headers.slice(0, 6).map((h) => (
                              <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {previewData.previewRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              {previewData.headers.slice(0, 6).map((h) => (
                                <td key={h} className="px-3 py-2 text-slate-700 truncate max-w-xs">
                                  {String(row[h] || '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => { setPreviewData(null); setUploadFile(null); }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Choose Different File
                    </button>

                    <button
                      type="button"
                      disabled={importing || !columnMapping.lead_name || !columnMapping.phone_number}
                      onClick={handleConfirmImport}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Importing Leads to Queue...' : `Confirm & Import ${previewData.totalRows} Leads`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: MANUAL LEAD ENTRY (User Requirement)
            ========================================================= */}
        {activeTab === 'manual' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Manually Enter Lead Data</h2>
                  <p className="text-xs text-slate-500">
                    Add an individual lead directly to the sequential dialing queue
                  </p>
                </div>
              </div>

              <form onSubmit={handleManualLeadSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lead / Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualLead.lead_name}
                    onChange={(e) => setManualLead({ ...manualLead, lead_name: e.target.value })}
                    placeholder="e.g. Balaji Hardware & Tools"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Primary Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={manualLead.phone_number}
                      onChange={(e) => setManualLead({ ...manualLead, phone_number: e.target.value })}
                      placeholder="e.g. +91 9829012345"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Alternate Contact (Optional)
                    </label>
                    <input
                      type="tel"
                      value={manualLead.alternate_phone}
                      onChange={(e) => setManualLead({ ...manualLead, alternate_phone: e.target.value })}
                      placeholder="e.g. +91 9414056789"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custom Lead ID / Reference Code
                  </label>
                  <input
                    type="text"
                    value={manualLead.lead_id_code}
                    onChange={(e) => setManualLead({ ...manualLead, lead_id_code: e.target.value })}
                    placeholder="e.g. PT-NUM-030"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Company / Town / Products / Pitch Notes
                  </label>
                  <textarea
                    rows={3}
                    value={manualLead.company_or_details}
                    onChange={(e) => setManualLead({ ...manualLead, company_or_details: e.target.value })}
                    placeholder="e.g. Jodhpur Road, Pali | In demand: Angle Grinders & Diamond Discs. Pitch 15-day rolling credit."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    {manualSubmitting ? 'Adding Lead...' : 'Add Lead to Sequential Queue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 5: AGENTS & PERFORMANCE
            ========================================================= */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Agent Performance List (8 Cols) */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center justify-between">
                  <span>Caller Performance & Live Status</span>
                  <button
                    onClick={loadAgents}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Agent</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Active Call</th>
                        <th className="px-3 py-2.5">Today Calls</th>
                        <th className="px-3 py-2.5">Lifetime</th>
                        <th className="px-3 py-2.5">Avg Time</th>
                        <th className="px-3 py-2.5 text-right">Account</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agents.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3">
                            <span className="font-bold text-slate-900 block">{a.name}</span>
                            <span className="font-mono text-slate-400 text-[11px]">@{a.username}</span>
                          </td>

                          <td className="px-3 py-3">
                            {a.is_online ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                                Offline
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-3 max-w-[130px] truncate text-slate-700">
                            {a.active_lead_name ? (
                              <span className="font-semibold text-blue-600 text-[11px] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                {a.active_lead_name}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3 font-bold text-slate-900 font-mono">
                            {a.calls_today}
                          </td>

                          <td className="px-3 py-3 text-slate-600 font-mono">
                            {a.total_calls_lifetime}
                          </td>

                          <td className="px-3 py-3 font-mono text-slate-600">
                            {a.avg_duration_seconds ? `${Math.floor(a.avg_duration_seconds / 60)}m ${a.avg_duration_seconds % 60}s` : '—'}
                          </td>

                          <td className="px-3 py-3 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleViewAgentLogs(a.id)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition inline-flex items-center gap-1"
                              title="View this agent's call logs"
                            >
                              <History className="w-3 h-3" />
                              <span>Call Logs</span>
                            </button>
                            <button
                              onClick={() => handleToggleAgentStatus(a)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                                a.is_active
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                  : 'text-slate-400 bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              {a.is_active ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Create Agent Account Card (4 Cols) */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Create Telecaller Account</span>
                </h3>

                <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      placeholder="e.g. Ramesh Verma"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Username (Login ID)</label>
                    <input
                      type="text"
                      required
                      value={newAgent.username}
                      onChange={(e) => setNewAgent({ ...newAgent, username: e.target.value })}
                      placeholder="e.g. agent3"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={newAgent.password}
                      onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={newAgent.phone}
                      onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                      placeholder="+91 9800000000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={creatingAgent}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                    >
                      {creatingAgent ? 'Creating Account...' : 'Create Agent Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onReset={handleResetLead}
        />
      )}

      {/* Call Activity Audit Log Modal */}
      {selectedCallLog && (
        <CallLogModal
          log={selectedCallLog}
          onClose={() => setSelectedCallLog(null)}
        />
      )}
    </div>
  );
}

