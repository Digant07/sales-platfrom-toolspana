const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('dialer_crm_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('dialer_crm_token', token);
  } else {
    localStorage.removeItem('dialer_crm_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMe: () => request('/auth/me'),

  // Agent Endpoints (Strictly 1 record at a time)
  agent: {
    getStats: () => request('/agent/stats'),
    getCurrentLead: () => request('/agent/current-lead'),
    getNextLead: () => request('/agent/next-lead', { method: 'POST' }),
    submitLead: (payload) =>
      request('/agent/submit-lead', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Admin Endpoints
  admin: {
    getAnalytics: () => request('/admin/analytics'),
    getLeads: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/admin/leads?${q}`);
    },
    getLeadActivity: (id) => request(`/admin/leads/${id}/activity`),
    resetLead: (id) => request(`/admin/leads/${id}/reset`, { method: 'POST' }),
    deleteLead: (id) => request(`/admin/leads/${id}`, { method: 'DELETE' }),
    clearQueue: () => request('/admin/leads/clear-queue', { method: 'POST' }),

    previewFile: (formData) =>
      request('/admin/leads/preview-file', {
        method: 'POST',
        body: formData,
      }),
    importLeads: (payload) =>
      request('/admin/leads/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    createManualLead: (payload) =>
      request('/admin/leads/manual', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    getAgents: () => request('/admin/agents'),
    createAgent: (payload) =>
      request('/admin/agents', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateAgent: (id, payload) =>
      request(`/admin/agents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    seedSampleLeads: () => request('/admin/leads/seed-sample', { method: 'POST' }),

    // Call Activity & Audit Logs
    getCallLogs: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/admin/call-logs?${q}`);
    },
    downloadCallLogsExport: async (params = {}) => {
      const token = getToken();
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`/api/admin/call-logs/export?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download call logs export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Agent_Call_Logs_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    },

    getExportUrl: () => {
      const token = getToken();
      return `/api/admin/leads/export?token=${encodeURIComponent(token || '')}`;
    },
    downloadExport: async () => {
      const token = getToken();
      const res = await fetch('/api/admin/leads/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sequential_Dialer_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    },
  },
};

