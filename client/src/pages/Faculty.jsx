import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Upload, Download, Plus, Edit, Trash2,
  UserCheck, AlertCircle, CheckCircle2, XCircle, ChevronDown,
  Users, BookOpen, X
} from 'lucide-react';
import Toast from '../components/Toast';
import Pagination from '../components/books/Pagination';

// ─────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────

const FACULTY_PER_PAGE = 10;

const DEPARTMENTS = [
  { code: 'CIT',  label: 'CIT – College of Information Technology' },
  { code: 'CCJE', label: 'CCJE – College of Criminal Justice Education' },
  { code: 'CEAS', label: 'CEAS – College of Education, Arts and Sciences' },
  { code: 'CBE',  label: 'CBE – College of Business Education' },
  { code: 'HS',   label: 'HS – Highschool' },
];

// Department color palette — navy/gold brand theme
const DEPT_COLORS = {
  CIT:  { bg: 'rgba(30,58,123,0.1)',   text: '#2d4fa3', badge: 'rgba(30,58,123,0.08)'   },
  CCJE: { bg: 'rgba(238,162,58,0.12)', text: '#b87a1a', badge: 'rgba(238,162,58,0.1)'   },
  CEAS: { bg: 'rgba(30,58,123,0.07)',  text: '#1e3a7b', badge: 'rgba(30,58,123,0.06)'   },
  CBE:  { bg: 'rgba(238,162,58,0.08)', text: '#c8860e', badge: 'rgba(238,162,58,0.08)'  },
  HS:   { bg: 'rgba(45,79,163,0.1)',   text: '#3a5fbf', badge: 'rgba(45,79,163,0.08)'   },
};
const DEFAULT_COLOR = { bg: 'rgba(30,58,123,0.08)', text: '#2d4fa3', badge: 'rgba(30,58,123,0.06)' };

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
});

// ─────────────────────────────────────────────────────────
//  Faculty Page
// ─────────────────────────────────────────────────────────

export default function Faculty() {
  // ── Data state ────────────────────────────────────────
  const [faculty, setFaculty]         = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // ── AJAX search & filter state ────────────────────────
  const [searchTerm, setSearchTerm]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching]       = useState(false);
  const [activeDept, setActiveDept]         = useState('All');

  // ── Add/Edit modal ────────────────────────────────────
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [isEditMode, setIsEditMode]           = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [formData, setFormData]               = useState({ faculty_name: '', department: '' });
  const [formErrors, setFormErrors]           = useState({});

  // ── Import modal ──────────────────────────────────────
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile]     = useState(null);
  const [parsedData, setParsedData]     = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // ── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });

  // ── Fetch all faculty ─────────────────────────────────
  const fetchFaculty = async () => {
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty`, withCreds());
      const data = await res.json();
      if (data.success) setFaculty(data.data);
      else showToast('Failed to load faculty', 'error');
    } catch {
      showToast('Could not connect to server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFaculty(); }, []);

  // ── Debounce search input (AJAX-style) ────────────────
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Reset page on dept filter change ─────────────────
  useEffect(() => { setCurrentPage(1); }, [activeDept]);

  // ── Derived stats ─────────────────────────────────────
  const stats = {
    total: faculty.length,
    byDept: DEPARTMENTS.map(d => ({
      ...d,
      count: faculty.filter(f => f.department === d.code).length,
    })).filter(d => d.count > 0),
  };

  // ── Filter + paginate ─────────────────────────────────
  const filtered = faculty.filter(f => {
    const matchesSearch =
      !debouncedSearch ||
      f.faculty_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      f.department.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesDept = activeDept === 'All' || f.department === activeDept;
    return matchesSearch && matchesDept;
  });

  const totalPages = Math.ceil(filtered.length / FACULTY_PER_PAGE);
  const paginated  = filtered.slice(
    (currentPage - 1) * FACULTY_PER_PAGE,
    currentPage * FACULTY_PER_PAGE
  );

  // ── Form validation ───────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.faculty_name.trim()) e.faculty_name = 'Name is required';
    if (!formData.department)          e.department   = 'Department is required';
    return e;
  };

  // ── Create faculty ────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setFormErrors(e2); return; }
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty`,
        withCreds({ method: 'POST', body: JSON.stringify(formData) })
      );
      const data = await res.json();
      if (data.success) { showToast('Faculty added successfully'); closeModal(); fetchFaculty(); }
      else showToast(data.error || 'Failed to add faculty', 'error');
    } catch { showToast('Failed to connect to server', 'error'); }
  };

  // ── Update faculty ────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setFormErrors(e2); return; }
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty/${selectedFaculty.id}`,
        withCreds({ method: 'PUT', body: JSON.stringify(formData) })
      );
      const data = await res.json();
      if (data.success) { showToast('Faculty updated successfully'); closeModal(); fetchFaculty(); }
      else showToast(data.error || 'Failed to update faculty', 'error');
    } catch { showToast('Failed to connect to server', 'error'); }
  };

  // ── Delete faculty ────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this faculty member?')) return;
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty/${id}`, withCreds({ method: 'DELETE' }));
      const data = await res.json();
      if (data.success) { showToast('Faculty deleted successfully'); fetchFaculty(); }
      else showToast(data.error || 'Failed to delete faculty', 'error');
    } catch { showToast('Failed to connect to server', 'error'); }
  };

  // ── Modal helpers ─────────────────────────────────────
  const openAddModal = () => {
    setIsEditMode(false); setSelectedFaculty(null);
    setFormData({ faculty_name: '', department: '' }); setFormErrors({});
    setIsModalOpen(true);
  };
  const openEditModal = (member) => {
    setIsEditMode(true); setSelectedFaculty(member);
    setFormData({ faculty_name: member.faculty_name, department: member.department });
    setFormErrors({}); setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false); setIsEditMode(false); setSelectedFaculty(null);
    setFormData({ faculty_name: '', department: '' }); setFormErrors({});
  };

  // ── Excel parse ───────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showToast('Please select a valid Excel file (.xlsx or .xls)', 'error'); return;
    }
    setImportFile(file);
    parseExcel(file);
  };

  const parseExcel = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const parsed = rows
          .map(row => ({
            faculty_name: (row['Faculty Name'] || row['faculty_name'] || row['Name'] || '').toString().trim(),
            department:   (row['Department']   || row['department']   || '').toString().trim(),
          }))
          .filter(r => r.faculty_name && r.department);
        if (parsed.length === 0) { showToast('No valid faculty data found in the file', 'error'); return; }
        setParsedData(parsed);
        showToast(`Parsed ${parsed.length} faculty records`, 'success');
      } catch { showToast('Failed to parse Excel file', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Bulk import ───────────────────────────────────────
  const handleBulkImport = async () => {
    if (!parsedData) return;

    const validCodes = DEPARTMENTS.map(d => d.code);
    const invalidRows = parsedData.filter(r => !validCodes.includes(r.department));
    if (invalidRows.length > 0) {
      const names = [...new Set(invalidRows.map(r => `"${r.department}"`))]
        .slice(0, 3).join(', ');
      const extra = invalidRows.length > 3 ? ` and ${invalidRows.length - 3} more` : '';
      showToast(
        `Invalid department code(s): ${names}${extra}. Valid: ${validCodes.join(', ')}.`,
        'error'
      );
      return;
    }

    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty/bulk-import`,
        withCreds({ method: 'POST', body: JSON.stringify(parsedData) })
      );
      const data = await res.json();
      if (data.success) {
        setImportResult(data.data); setParsedData(null);
        showToast(`Imported ${data.data.successful} faculty records`, 'success');
        fetchFaculty();
      } else { showToast(data.error || 'Import failed', 'error'); }
    } catch { showToast('Failed to connect to server', 'error'); }
  };

  // ── Download template ─────────────────────────────────
  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws   = XLSX.utils.json_to_sheet([
      { 'Faculty Name': 'Juan Dela Cruz', 'Department': 'CIT' },
      { 'Faculty Name': 'Maria Santos',   'Department': 'CEAS' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty');
    XLSX.writeFile(wb, 'faculty_import_template.xlsx');
  };

  const closeImportModal = () => {
    setIsImportOpen(false); setImportFile(null); setParsedData(null); setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* ══════════════════════════════════════════════════
          Page Header - Replicated from Attendance.jsx
      ══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
            style={{ color: "var(--text-primary)" }}>
            <Users size={22} style={{ color: "var(--accent-amber)" }} />
            Faculty Management
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Manage faculty members, departments, and bulk import functionality
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[.98]"
            style={{
              background: "rgba(45,122,71,0.1)",
              border: "1.5px solid rgba(45,122,71,0.35)",
              color: "#2d7a47",
            }}
          >
            <Upload size={14} />
            Bulk Import
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ 
              background: "var(--accent-amber)", 
              boxShadow: "0 2px 8px rgba(238,162,58,.3)" 
            }}
          >
            <Plus size={14} /> Add Faculty
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          Statistics Cards - Consistent with Attendance/Students
      ══════════════════════════════════════════════════ */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Faculty */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(30,58,123,0.1)' }}>
              <Users size={16} style={{ color: '#1e3a7b' }} />
            </div>
            <div>
              <p className="text-[20px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{isLoading ? '—' : stats.total}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Total Faculty</p>
            </div>
          </div>

          {/* Department cards */}
          {stats.byDept.slice(0, 5).map((dept, idx) => {
            const c = DEPT_COLORS[dept.code] || DEFAULT_COLOR;
            return (
              <div key={dept.code}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:shadow-md transition-all"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                onClick={() => setActiveDept(dept.code)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: c.bg }}>
                  <BookOpen size={16} style={{ color: c.text }} />
                </div>
                <div>
                  <p className="text-[20px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{dept.count}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{dept.code}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          Department Filter Tabs
      ══════════════════════════════════════════════════ */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Label */}
          <div className="flex items-center gap-1.5 mr-1">
            <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Department
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 self-center" style={{ background: 'var(--border)' }} />

          {/* All tab */}
          {['All', ...DEPARTMENTS.map(d => d.code)].map(dept => {
            const isActive = activeDept === dept;
            const count = dept === 'All'
              ? faculty.length
              : faculty.filter(f => f.department === dept).length;
            return (
              <button
                key={dept}
                onClick={() => setActiveDept(dept)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
                style={isActive ? {
                  background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(30,58,123,0.35)',
                  border: '1px solid transparent',
                } : {
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={e => {
                  if (!isActive) { e.currentTarget.style.borderColor = '#2d4fa3'; e.currentTarget.style.color = '#2d4fa3'; }
                }}
                onMouseLeave={e => {
                  if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }
                }}
              >
                {dept}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                  style={isActive ? {
                    background: 'rgba(255,255,255,0.25)', color: '#ffffff',
                  } : {
                    background: 'var(--bg-input)', color: 'var(--text-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          Search & Results Bar
      ══════════════════════════════════════════════════ */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search input with AJAX indicator */}
          <div className="relative" style={{ minWidth: '260px' }}>
            {isSearching ? (
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-b-transparent animate-spin"
                style={{ borderColor: '#2d4fa3', borderBottomColor: 'transparent' }}
              />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            )}
            <input
              type="text"
              placeholder="Search by name or department…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeDept !== 'All' && (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(30,58,123,0.1)', color: '#2d4fa3', border: '1px solid rgba(30,58,123,0.2)' }}
              >
                {activeDept}
                <button onClick={() => setActiveDept('All')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {debouncedSearch && (
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(238,162,58,0.1)', color: '#b87a1a', border: '1px solid rgba(238,162,58,0.25)' }}
              >
                "{debouncedSearch}"
                <button onClick={() => setSearchTerm('')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Results count */}
          {!isLoading && (
            <p className="text-sm font-medium ml-auto whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
              Showing{' '}
              <span style={{ color: 'var(--text-primary)' }}>{paginated.length}</span>
              {' '}of{' '}
              <span style={{ color: 'var(--text-primary)' }}>{filtered.length}</span>
              {' '}faculty
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          Faculty Table
      ══════════════════════════════════════════════════ */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" />
            <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading faculty…</span>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Faculty Member', 'Department', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((member, idx) => {
                    const c = DEPT_COLORS[member.department] || DEFAULT_COLOR;
                    return (
                      <tr
                        key={member.id}
                        style={{ borderBottom: '1px solid var(--border-light)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Row number */}
                        <td className="py-3.5 px-4 text-sm font-mono" style={{ color: 'var(--text-muted)', width: '56px' }}>
                          {(currentPage - 1) * FACULTY_PER_PAGE + idx + 1}
                        </td>

                        {/* Faculty name with avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{
                                background: 'linear-gradient(135deg, rgba(30,58,123,0.12) 0%, rgba(45,79,163,0.15) 100%)',
                                color: '#2d4fa3',
                                border: '1px solid rgba(30,58,123,0.2)',
                              }}
                            >
                              {member.faculty_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {member.faculty_name}
                            </span>
                          </div>
                        </td>

                        {/* Department badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold"
                            style={{ background: c.bg, color: c.text, border: `1px solid ${c.badge}` }}
                          >
                            {member.department}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-1.5 rounded-lg transition-colors duration-150"
                              style={{ color: '#2d4fa3' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,58,123,0.1)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="p-1.5 rounded-lg transition-colors duration-150"
                              style={{ color: '#dc2626' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <AlertCircle className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {debouncedSearch || activeDept !== 'All' ? 'No matching faculty found' : 'No faculty members yet'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {debouncedSearch || activeDept !== 'All'
                ? 'Try adjusting your search or department filter'
                : 'Add faculty manually or use bulk import'}
            </p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          Add / Edit Modal
      ══════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)' }}
              >
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {isEditMode ? 'Edit Faculty Member' : 'Add Faculty Member'}
              </h2>
            </div>

            <form onSubmit={isEditMode ? handleUpdate : handleCreate} className="space-y-4">
              {/* Faculty Name */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Faculty Name *
                </label>
                <input
                  type="text"
                  value={formData.faculty_name}
                  onChange={e => {
                    setFormData(p => ({ ...p, faculty_name: e.target.value }));
                    setFormErrors(p => ({ ...p, faculty_name: '' }));
                  }}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
                  style={{
                    background: 'var(--bg-input)',
                    border: `1px solid ${formErrors.faculty_name ? '#ef4444' : 'var(--border)'}`,
                    color: 'var(--text-primary)',
                  }}
                />
                {formErrors.faculty_name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.faculty_name}</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Department *
                </label>
                <div className="relative">
                  <select
                    value={formData.department}
                    onChange={e => {
                      setFormData(p => ({ ...p, department: e.target.value }));
                      setFormErrors(p => ({ ...p, department: '' }));
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 appearance-none transition-colors"
                    style={{
                      background: 'var(--bg-input)',
                      border: `1px solid ${formErrors.department ? '#ef4444' : 'var(--border)'}`,
                      color: formData.department ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.code}>{d.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
                {formErrors.department && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.department}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)',
                    boxShadow: '0 2px 6px rgba(30,58,123,0.35)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {isEditMode ? 'Save Changes' : 'Add Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          Bulk Import Modal
      ══════════════════════════════════════════════════ */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)' }}
                >
                  <Upload className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Bulk Import Faculty
                </h2>
              </div>
              <button
                onClick={closeImportModal}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Drop zone */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Upload Excel File
                </label>
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileChange({ target: { files: [f] } });
                  }}
                >
                  {importFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(50,127,79,0.12)' }}>
                        <CheckCircle2 className="w-7 h-7 text-green-500" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{importFile.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(importFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={() => { setImportFile(null); setParsedData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-input)' }}>
                        <Upload className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Drag & drop or click to browse</p>
                      <label className="cursor-pointer">
                        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                        <span
                          className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-block"
                          style={{ background: 'linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)' }}
                        >
                          Choose File
                        </span>
                      </label>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Supports .xlsx and .xls</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Download template */}
              <div className="flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d4fa3'; e.currentTarget.style.color = '#2d4fa3'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {/* Import result */}
              {importResult && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Import Results</h3>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(50,127,79,0.12)' }}>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {importResult.successful} imported
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.08)' }}>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {importResult.failed} failed
                      </span>
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg max-h-28 overflow-y-auto" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">
                          Row {err.index + 2}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {parsedData && !importResult && (
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    Preview — <span style={{ color: '#2d4fa3' }}>{parsedData.length} records</span>
                  </h3>
                  <div className="overflow-x-auto max-h-44 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                          <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Faculty Name</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td className="py-2 px-3 text-sm" style={{ color: 'var(--text-primary)' }}>{r.faculty_name}</td>
                            <td className="py-2 px-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                                style={{ background: (DEPT_COLORS[r.department] || DEFAULT_COLOR).bg, color: (DEPT_COLORS[r.department] || DEFAULT_COLOR).text }}>
                                {r.department}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {parsedData.length > 5 && (
                          <tr>
                            <td colSpan={2} className="py-2 px-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                              …and {parsedData.length - 5} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              {parsedData && !importResult && (
                <button
                  onClick={handleBulkImport}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #1e5e38 0%, #2d7a47 100%)',
                    boxShadow: '0 2px 6px rgba(45,122,71,0.3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Import to Database
                </button>
              )}
              <button
                onClick={closeImportModal}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────── */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.show}
          onClose={() => setToast(p => ({ ...p, show: false }))}
        />
      )}
    </div>
  );
}