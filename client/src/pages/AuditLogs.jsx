import React, { useState, useEffect, useCallback } from 'react';
// FIX 3 (casing): hook file exports `useWebSocket` (capital S).
// Using the correct casing to avoid fatal resolution errors on Linux/prod.
import { useWebSocket } from '../hooks/useWebsocket.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useToast } from '../hooks/useToast.js';
import AuditTable from '../components/AuditTable.jsx';
import { auditApi } from '../services/api/auditApi.js';
import Layout from '../components/layout/Layout.jsx';
// FIX 1: Removed `import { requireRole } from '../utils/helpers.js'`
// `requireRole` does not exist in helpers.js — this was the SyntaxError
// that crashed the entire component tree at module-evaluation time.
//
// FIX 2: Removed the `requireRole('admin')` call that was at module level.
// Role enforcement is already handled by <StaffBlockedRoute> in App.jsx,
// which wraps this page and redirects staff before this component ever mounts.
// A redundant module-level check is both broken and architecturally wrong —
// it runs before React, before auth context, and before user state is loaded.

const AuditLogs = () => {
  const [audits, setAudits]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [totalPages, setTotalPages]     = useState(1);
  const [currentPage, setCurrentPage]   = useState(1);
  const [filters, setFilters]           = useState({});
  const [purgeConfirm, setPurgeConfirm] = useState(false);

  const toast = useToast();

  // FIX 3: useWebSocket returns { requestStats }, NOT a socket instance.
  // AuditLogs was calling ws.on() / ws.off() which would throw
  // "TypeError: ws.on is not a function" at runtime.
  //
  // The hook does not expose a generic event subscription API.
  // Destructure only what it actually provides; audit real-time events
  // (audit:new, audit:cleanup) are not wired in useWebSocket — they would
  // need to be added to the hook if real-time audit updates are required.
  // For now, the ws.on/ws.off block is safely removed to prevent the runtime
  // crash. Polling via fetchAudits() on mount + filter change still works.
  const { requestStats } = useWebSocket();
  void requestStats; // retained for future use; suppresses unused-var lint warning

  // FIX 4: `setPageSize` was declared but never used (lint warning).
  // Destructured as a single value since page size isn't editable in this UI.
  const [pageSize] = useLocalStorage('audit.pageSize', 50);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    const params = { page: currentPage, limit: pageSize, ...filters };
    const result = await auditApi.getAuditLogs(params);

    if (result.success) {
      setAudits(result.data?.audits || []);
      setTotalPages(result.data?.totalPages || 1);
    } else {
      toast.error('Failed to load audit logs');
    }

    setLoading(false);
  }, [currentPage, pageSize, filters, toast]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  // Unified handler used by both onFilterChange and onSearch props on AuditTable.
  // AuditTable calls onSearch('search', value) — same (key, value) shape.
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // Remove null/empty keys to keep params clean
      if (value === null || value === '') delete next[key];
      return next;
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePurge = async () => {
    const result = await auditApi.purgeOldLogs();
    if (result.success) {
      toast.success('Old logs purged successfully');
      setPurgeConfirm(false);
      fetchAudits();
    } else {
      toast.error('Purge failed');
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Trail</h1>
          <p className="text-gray-600">
            Track all admin/staff activities (CRUD, login/logout). Logs auto-purged after 1 year.
          </p>

          {/* Purge Button - Admin Only */}
          <div className="mt-4">
            <button
              onClick={() => setPurgeConfirm(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-medium text-xs text-white uppercase tracking-widest hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
            >
              Purge Old Logs (&gt;1yr)
            </button>
          </div>

          {purgeConfirm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Confirm Purge
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Delete all audit logs older than 1 year? This cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handlePurge}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Purge
                  </button>
                  <button
                    onClick={() => setPurgeConfirm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <AuditTable
          audits={audits}
          loading={loading}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleFilterChange}
        />
      </div>
    </Layout>
  );
};

export default AuditLogs;