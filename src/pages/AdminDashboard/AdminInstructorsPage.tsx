import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader, X, Eye, Trash2, ArrowLeft } from 'lucide-react';
import { RootState } from '../../store';
import { adminService } from '../../services/admin';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';

interface InstructorData {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatar?: string;
  role: string;
  requiresApproval?: boolean;
  isApproved?: boolean;
  emailConfirmed?: boolean;
  phoneNumberConfirmed?: boolean;
  createdAt?: string;
  bio?: string;
  expertise?: string[];
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const AdminInstructorsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allInstructors, setAllInstructors] = useState<InstructorData[]>([]);
  const [filteredInstructors, setFilteredInstructors] = useState<InstructorData[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // Check if user is admin
  if (!user || String(user.role).toLowerCase() !== 'admin') {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
          <div className="text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Only admins can access this page.</p>
            <Button variant="primary" onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await adminService.getAllUsers(1000, 1);
      const responseData = (res as any)?.data || res;
      const allUsers = Array.isArray(responseData) ? responseData : responseData?.items || [];

      // Filter only instructors
      const instructors = allUsers.filter((u: any) =>
        String(u.role).toLowerCase().includes('instructor')
      );

      setAllInstructors(instructors);
      calculateStats(instructors);
      filterInstructors(instructors, 'all', '');
    } catch (err: any) {
      console.error('Error loading instructors:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to load instructors');
      setAllInstructors([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (instructorData: InstructorData[]) => {
    const pending = instructorData.filter(i => !i.isApproved).length;
    const approved = instructorData.filter(i => i.isApproved).length;

    setStats({
      total: instructorData.length,
      pending,
      approved,
      rejected: 0 // Would need additional tracking from backend
    });
  };

  const filterInstructors = (data: InstructorData[], status: FilterStatus, search: string) => {
    let filtered = data;

    // Filter by approval status
    if (status !== 'all') {
      if (status === 'pending') {
        filtered = filtered.filter(i => !i.isApproved);
      } else if (status === 'approved') {
        filtered = filtered.filter(i => i.isApproved);
      }
    }

    // Filter by search
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.fullName?.toLowerCase().includes(lowerSearch) ||
        i.email?.toLowerCase().includes(lowerSearch) ||
        i.phoneNumber?.includes(search)
      );
    }

    setFilteredInstructors(filtered);
  };

  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    filterInstructors(allInstructors, status, searchTerm);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    setSearchTerm(search);
    filterInstructors(allInstructors, filterStatus, search);
  };

  const handleReview = async (id: string, approve: boolean) => {
    try {
      setActionLoading(id);
      await adminService.reviewInstructor(id, { approve, notes: '' });

      // Update local state immediately
      const updatedInstructors = allInstructors.map(i =>
        i.id === id ? { ...i, isApproved: approve } : i
      );
      setAllInstructors(updatedInstructors);

      // Recalculate stats
      calculateStats(updatedInstructors);

      // Reapply filters with updated data
      filterInstructors(updatedInstructors, filterStatus, searchTerm);

      alert(approve ? '✓ Instructor approved successfully!' : '✗ Instructor rejected.');
      setShowDetails(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update';
      alert(`Error: ${msg}`);
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-white dark:bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors text-blue-600 dark:text-blue-400"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Instructor Management</h1>
                <p className="text-slate-600 dark:text-slate-400">Review and approve instructor applications</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium mb-2">Total Instructors</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 p-6 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm text-yellow-600 dark:text-yellow-300 font-medium mb-2">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-6 rounded-lg border border-green-200 dark:border-green-700">
              <p className="text-sm text-green-600 dark:text-green-300 font-medium mb-2">Approved</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.approved}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-6 rounded-lg border border-purple-200 dark:border-purple-700">
              <p className="text-sm text-purple-600 dark:text-purple-300 font-medium mb-2">Actions</p>
              <Button variant="primary" size="sm" onClick={loadInstructors} className="w-full text-xs">
                Refresh
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
                <Button variant="secondary" size="sm" onClick={loadInstructors} className="mt-2">Retry</Button>
              </div>
            </div>
          )}

          {/* Filter and Search */}
          <div className="mb-6 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Search Instructors</label>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                >
                  All ({allInstructors.length})
                </button>
                <button
                  onClick={() => handleFilterChange('pending')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                >
                  Pending ({stats.pending})
                </button>
                <button
                  onClick={() => handleFilterChange('approved')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'approved'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                >
                  Approved ({stats.approved})
                </button>
              </div>
            </div>
          </div>

          {/* Instructors List */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-blue-500 mr-3" size={32} />
                <span className="text-slate-600 dark:text-slate-400">Loading instructors...</span>
              </div>
            ) : filteredInstructors.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <AlertCircle className="text-slate-400 mr-3" size={32} />
                <span className="text-slate-600 dark:text-slate-400">No instructors found</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredInstructors.map((instructor) => (
                      <tr key={instructor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {instructor.avatar && (
                              <img src={instructor.avatar} alt={instructor.fullName} className="w-8 h-8 rounded-full" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{instructor.fullName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{instructor.email}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{instructor.phoneNumber || '-'}</td>
                        <td className="px-6 py-4">
                          {instructor.isApproved ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              <CheckCircle size={14} /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                              <AlertCircle size={14} /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                          {instructor.createdAt ? new Date(instructor.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedInstructor(instructor);
                                setShowDetails(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 text-xs font-medium transition"
                            >
                              <Eye size={14} /> View
                            </button>
                            {!instructor.isApproved && (
                              <button
                                onClick={() => handleReview(instructor.id, true)}
                                disabled={actionLoading === instructor.id}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 text-xs font-medium transition disabled:opacity-50"
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Instructor Details Modal */}
          {showDetails && selectedInstructor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg max-w-lg w-full border border-slate-200 dark:border-slate-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Instructor Details</h2>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    {selectedInstructor.avatar && (
                      <img src={selectedInstructor.avatar} alt={selectedInstructor.fullName} className="w-20 h-20 rounded-full mx-auto" />
                    )}
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Full Name</label>
                      <p className="text-slate-900 dark:text-white font-medium">{selectedInstructor.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</label>
                      <p className="text-slate-900 dark:text-white">{selectedInstructor.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Phone</label>
                      <p className="text-slate-900 dark:text-white">{selectedInstructor.phoneNumber || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</label>
                      <div className="mt-1">
                        {selectedInstructor.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            <CheckCircle size={14} /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                            <AlertCircle size={14} /> Pending Approval
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedInstructor.bio && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Bio</label>
                        <p className="text-slate-900 dark:text-white text-sm mt-1">{selectedInstructor.bio}</p>
                      </div>
                    )}
                    {selectedInstructor.expertise && selectedInstructor.expertise.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Expertise</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedInstructor.expertise.map((exp, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                              {exp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Member Since</label>
                      <p className="text-slate-900 dark:text-white">
                        {selectedInstructor.createdAt ? new Date(selectedInstructor.createdAt).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex gap-3">
                    {!selectedInstructor.isApproved && (
                      <>
                        <Button
                          variant="danger"
                          onClick={() => handleReview(selectedInstructor.id, false)}
                          isLoading={actionLoading === selectedInstructor.id}
                          className="flex-1"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => handleReview(selectedInstructor.id, true)}
                          isLoading={actionLoading === selectedInstructor.id}
                          className="flex-1"
                        >
                          Approve
                        </Button>
                      </>
                    )}
                    {selectedInstructor.isApproved && (
                      <Button
                        variant="secondary"
                        onClick={() => setShowDetails(false)}
                        className="w-full"
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminInstructorsPage;
