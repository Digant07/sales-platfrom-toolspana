import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import LeadDetailsModal from './LeadDetailsModal';
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
  FileText
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'leads' | 'upload' | 'manual' | 'agents'

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

  // Initial load
  useEffect(() => {
    loadAnalytics();
    loadAgents();
    loadLeads(1);
  }, []);

  // When filters or search change
  useEffect(() => {
    loadLeads(1);
  }, [filterStatus, filterAgent]);

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base">Sequential Dialer CRM</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Operations Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Logged in as <strong>{user?.name || user?.username}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition shadow-2xs"
              title="Download Excel with all disposition notes"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Updated Excel</span>
            </button>

            <button
              onClick={handleSeedSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition shadow-2xs"
              title="Reload the 29 Rajasthan power tool leads catalog"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Load Sample Leads</span>
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-rose-600 border border-slate-300 rounded-xl transition shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => { setActiveTab('overview'); loadAnalytics(); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & KPIs</span>
          </button>

          <button
            onClick={() => { setActiveTab('leads'); loadLeads(pagination.page); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'leads'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Master Lead Queue ({analytics.kpis.totalLeads})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Spreadsheet</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manual Lead Entry</span>
          </button>

          <button
            onClick={() => { setActiveTab('agents'); loadAgents(); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'agents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
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
                      <th className="px-4 py-3">Call Outcome</th>
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
                            {l.call_disposition ? (
                              <div>
                                <span className="font-semibold text-slate-900 block">{l.call_disposition}</span>
                                {l.agent_notes && (
                                  <span className="text-slate-500 text-[11px] line-clamp-1 italic">
                                    "{l.agent_notes}"
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() => setSelectedLead(l)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View Full Details"
                            >
                              <Eye className="w-4 h-4" />
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

                          <td className="px-3 py-3 text-right">
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
    </div>
  );
}

