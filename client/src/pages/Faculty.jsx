import { useState, useEffect, useRef } from 'react';
import {
  Search, Upload, Download, Plus, Edit, Trash2,
  UserCheck, AlertCircle, CheckCircle2, XCircle, ChevronDown
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─────────────────────────────────────────────────────────
//  Faculty Page
// ─────────────────────────────────────────────────────────

export default function Faculty() {
  // ── Data state ────────────────────────────────────────
  const [faculty, setFaculty]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Add/Edit modal ────────────────────────────────────
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isEditMode, setIsEditMode]     = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [formData, setFormData] = useState({ faculty_name: '', department: '' });
  const [formErrors, setFormErrors] = useState({});

  // ── Import modal ──────────────────────────────────────
  const [isImportOpen, setIsImportOpen]         = useState(false);
  const [importFile, setImportFile]             = useState(null);
  const [parsedData, setParsedData]             = useState(null);
  const [importResult, setImportResult]         = useState(null);
  const fileInputRef = useRef(null);

  // ── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });

  // ── Fetch all faculty ─────────────────────────────────
  const fetchFaculty = async () => {
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty`);
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

  // ── Filter + paginate ─────────────────────────────────
  const filtered = faculty.filter(f =>
    f.faculty_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages      = Math.ceil(filtered.length / FACULTY_PER_PAGE);
  const paginated       = filtered.slice(
    (currentPage - 1) * FACULTY_PER_PAGE,
    currentPage * FACULTY_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

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
      const res  = await fetch(`${API_BASE}/api/students/faculty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Faculty added successfully');
        closeModal();
        fetchFaculty();
      } else {
        showToast(data.error || 'Failed to add faculty', 'error');
      }
    } catch {
      showToast('Failed to connect to server', 'error');
    }
  };

  // ── Update faculty ────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setFormErrors(e2); return; }
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty/${selectedFaculty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Faculty updated successfully');
        closeModal();
        fetchFaculty();
      } else {
        showToast(data.error || 'Failed to update faculty', 'error');
      }
    } catch {
      showToast('Failed to connect to server', 'error');
    }
  };

  // ── Delete faculty ────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this faculty member?')) return;
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Faculty deleted successfully');
        fetchFaculty();
      } else {
        showToast(data.error || 'Failed to delete faculty', 'error');
      }
    } catch {
      showToast('Failed to connect to server', 'error');
    }
  };

  // ── Modal helpers ─────────────────────────────────────
  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedFaculty(null);
    setFormData({ faculty_name: '', department: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setIsEditMode(true);
    setSelectedFaculty(member);
    setFormData({ faculty_name: member.faculty_name, department: member.department });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedFaculty(null);
    setFormData({ faculty_name: '', department: '' });
    setFormErrors({});
  };

  // ── Excel parse ───────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showToast('Please select a valid Excel file (.xlsx or .xls)', 'error');
      return;
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

        if (parsed.length === 0) {
          showToast('No valid faculty data found in the file', 'error');
          return;
        }
        setParsedData(parsed);
        showToast(`Parsed ${parsed.length} faculty records`, 'success');
      } catch {
        showToast('Failed to parse Excel file', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Bulk import ───────────────────────────────────────
  const handleBulkImport = async () => {
    if (!parsedData) return;
    try {
      const res  = await fetch(`${API_BASE}/api/students/faculty/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.data);
        setParsedData(null);
        showToast(`Imported ${data.data.successful} faculty records`, 'success');
        fetchFaculty();
      } else {
        showToast(data.error || 'Import failed', 'error');
      }
    } catch {
      showToast('Failed to connect to server', 'error');
    }
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
    setIsImportOpen(false);
    setImportFile(null);
    setParsedData(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────
  return (
    <div className="p-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <UserCheck className="w-8 h-8 text-amber-500" />
            Faculty Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage faculty members and their departments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-amber-500 hover:bg-amber-600 text-gray-900 dark:text-white"
          >
            <Plus className="w-4 h-4" /> Add Faculty
          </button>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────── */}
      <div
        className="rounded-lg p-4 mb-6 flex items-center gap-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search faculty..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        {!isLoading && (
          <p className="text-sm ml-auto" style={{ color: 'var(--text-muted)' }}>
            Showing {paginated.length} of {filtered.length} faculty
          </p>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading faculty...</span>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Faculty Name', 'Department', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((member, idx) => (
                    <tr
                      key={member.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.03))'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {(currentPage - 1) * FACULTY_PER_PAGE + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(238,162,58,0.15)' }}
                          >
                            <UserCheck className="w-4 h-4 text-amber-500" />
                          </div>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {member.faculty_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: 'rgba(238,162,58,0.12)', color: 'var(--accent-amber, #EEA23A)' }}
                        >
                          {member.department}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1.5 rounded transition-colors text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-1.5 rounded transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {searchTerm ? 'No matching faculty found' : 'No faculty members yet'}
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
            className="rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              {isEditMode ? 'Edit Faculty' : 'Add Faculty'}
            </h2>

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
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{ background: 'var(--bg-main)', border: `1px solid ${formErrors.faculty_name ? '#ef4444' : 'var(--border)'}`, color: 'var(--text-primary)' }}
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
                    className="w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
                    style={{ background: 'var(--bg-main)', border: `1px solid ${formErrors.department ? '#ef4444' : 'var(--border)'}`, color: formData.department ? 'var(--text-primary)' : 'var(--text-muted)' }}
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
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white transition-colors bg-amber-500 hover:bg-amber-600"
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
            className="rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Bulk Import Faculty
              </h2>
              <button onClick={closeImportModal} style={{ color: 'var(--text-muted)' }}>
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
                  className="border-2 border-dashed rounded-lg p-8 text-center"
                  style={{ borderColor: 'var(--border)' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileChange({ target: { files: [f] } });
                  }}
                >
                  {importFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{importFile.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(importFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={() => { setImportFile(null); setParsedData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Drag & drop or click to browse
                      </p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                          ref={fileInputRef}
                        />
                        <span className="px-4 py-2 rounded-md text-sm font-medium bg-amber-500 hover:bg-amber-600 text-gray-900 dark:text-white">
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
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {/* Import result */}
              {importResult && (
                <div className="p-4 rounded-md" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Import Results</h3>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        Imported: {importResult.successful}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        Failed: {importResult.failed}
                      </span>
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 max-h-28 overflow-y-auto">
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
                <div className="p-4 rounded-md" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Preview — {parsedData.length} records
                  </h3>
                  <div className="overflow-x-auto max-h-44">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th className="text-left py-1 px-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Faculty Name</th>
                          <th className="text-left py-1 px-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="py-1.5 px-2" style={{ color: 'var(--text-primary)' }}>{r.faculty_name}</td>
                            <td className="py-1.5 px-2" style={{ color: 'var(--text-primary)' }}>{r.department}</td>
                          </tr>
                        ))}
                        {parsedData.length > 5 && (
                          <tr>
                            <td colSpan={2} className="py-1.5 px-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                              ...and {parsedData.length - 5} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              {parsedData && !importResult && (
                <button
                  onClick={handleBulkImport}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors"
                >
                  Import to Database
                </button>
              )}
              <button
                onClick={closeImportModal}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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
          onClose={() => setToast(p => ({ ...p, show: false }))}
        />
      )}
    </div>
  );
}