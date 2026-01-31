import { apiService } from './api';

export const adminService = {
  // User Management
  getAllUsers: async (pageSize: number = 100, page: number = 1, params?: Record<string, any>) =>
    apiService.get(`/users?PageSize=${pageSize}&Page=${page}`, { params }),

  getUserById: async (userId: string) =>
    apiService.get(`/users/${userId}`),

  updateUser: async (userId: string, data: any) =>
    apiService.put(`/users/${userId}`, data),

  deleteUser: async (userId: string) =>
    apiService.delete(`/users/${userId}`),

  changeUserStatus: async (userId: string, status: 'active' | 'inactive' | 'banned') =>
    apiService.post(`/admin/users/${userId}/status`, { status }),

  // Get list of instructors requiring approval
  getInstructorApplications: async () => {
    try {
      const res = await apiService.get('/users?PageSize=100&Page=1');
      const responseData = (res as any)?.data || res;
      const allUsers = Array.isArray(responseData) ? responseData : responseData?.items || [];
      console.log('adminService.getInstructorApplications - users fetched:', allUsers.length, allUsers.slice(0, 3));

      const filtered = allUsers.filter((u: any) => {
        const rawRole = u.role ?? (u.roles ? (Array.isArray(u.roles) ? u.roles.join(',') : u.roles) : '');
        const roleStr = String(rawRole).toLowerCase();
        const isInstructor = roleStr.includes('instructor');

        const requiresApproval = !!(u.requiresApproval || u.requiresApproval === true || u.requiresApproval === 'true' || u.requiresApproval === 1);
        const notApproved = !(u.isApproved === true || u.isApproved === 'true' || u.isApproved === 1);

        return isInstructor && requiresApproval && notApproved;
      });

      console.log('adminService.getInstructorApplications - filtered instructors count:', filtered.length);
      return filtered;
    } catch (err) {
      console.error('Error fetching users for approval filter:', err);
      throw err;
    }
  },

  // Instructor Management
  reviewInstructor: async (userId: string, data: { approve: boolean; notes?: string }) =>
    apiService.post(`/admin/instructors/${userId}/review`, {
      applicationId: userId,
      approve: data.approve,
      notes: data.notes || '',
    }),

  getInstructorStats: async (instructorId: string) =>
    apiService.get(`/admin/instructors/${instructorId}/stats`),

  suspendInstructor: async (instructorId: string, reason: string) =>
    apiService.post(`/admin/instructors/${instructorId}/suspend`, { reason }),

  // Content Moderation
  getUnreviewedContent: async (contentType: 'quiz' | 'topic' | 'paragraph', params?: Record<string, any>) =>
    apiService.get(`/admin/content/${contentType}/unreviewed`, { params }),

  approveContent: async (contentType: string, contentId: string, feedback?: string) =>
    apiService.post(`/admin/content/${contentType}/${contentId}/approve`, { feedback }),

  rejectContent: async (contentType: string, contentId: string, reason: string) =>
    apiService.post(`/admin/content/${contentType}/${contentId}/reject`, { reason }),

  // Referral settings
  getReferralSettings: async () =>
    apiService.get('/admin/referrals/settings'),

  updateReferralSettings: async (data: any) =>
    apiService.put('/admin/referrals/settings', data),

  // Analytics
  getDashboardStats: async () =>
    apiService.get('/admin/analytics/dashboard'),

  getUserAnalytics: async (params?: Record<string, any>) =>
    apiService.get('/admin/analytics/users', { params }),

  getRevenueAnalytics: async (params?: Record<string, any>) =>
    apiService.get('/admin/analytics/revenue', { params }),

  getEngagementMetrics: async (params?: Record<string, any>) =>
    apiService.get('/admin/analytics/engagement', { params }),

  // Payment Management (delegated from paymentsService but also available here)
  getTransactions: async (params?: Record<string, any>) =>
    apiService.get('/admin/payments/transactions', { params }),

  getPendingWithdrawals: async (params?: Record<string, any>) =>
    apiService.get('/admin/payments/withdrawals/pending', { params }),

  approveWithdrawal: async (withdrawalId: string) =>
    apiService.post(`/admin/payments/withdrawals/${withdrawalId}/approve`),

  rejectWithdrawal: async (withdrawalId: string, reason?: string) =>
    apiService.post(`/admin/payments/withdrawals/${withdrawalId}/reject`, { reason }),

  completeWithdrawal: async (withdrawalId: string) =>
    apiService.post(`/admin/payments/withdrawals/${withdrawalId}/complete`),

  getPendingRefunds: async (params?: Record<string, any>) =>
    apiService.get('/admin/payments/refunds/pending', { params }),

  approveRefund: async (refundId: string) =>
    apiService.post(`/admin/payments/refunds/${refundId}/approve`),

  rejectRefund: async (refundId: string, reason?: string) =>
    apiService.post(`/admin/payments/refunds/${refundId}/reject`, { reason }),

  adjustWalletBalance: async (userId: string, amount: number, reason?: string) =>
    apiService.post('/admin/payments/wallets/adjust-balance', { userId, amount, reason }),

  // System Management
  getSystemLogs: async (params?: Record<string, any>) =>
    apiService.get('/admin/logs', { params }),

  getSiteSettings: async () =>
    apiService.get('/admin/settings'),

  updateSiteSettings: async (settings: Record<string, any>) =>
    apiService.put('/admin/settings', settings),

  // Support/Tickets
  getSupportTickets: async (params?: Record<string, any>) =>
    apiService.get('/admin/support/tickets', { params }),

  // Admin Management
  getAdmins: async () => {
    try {
      // Increased page size to ensure we catch the new admin if they are created recently
      const res = await apiService.get('/users?PageSize=1000&Page=1');
      const responseData = (res as any)?.data || res;
      const allUsers = Array.isArray(responseData) ? responseData : responseData?.items || [];

      console.log('getAdmins: Fetched users', allUsers.length);

      const admins = allUsers.filter((u: any) => {
        const role = String(u.role || '').toLowerCase();
        // Log roles for debugging if needed (can be removed later)
        // console.log(`User ${u.email} has role: ${role}`); 
        return role === 'admin';
      });

      console.log('getAdmins: Filtered admins', admins.length);
      return admins;
    } catch (err) {
      console.error('Error fetching admins:', err);
      return [];
    }
  },

  createUser: async (data: any) =>
    apiService.post('/users', data),

  createAdmin: async (data: any) =>
    apiService.post('/admin/create-admin', data),

  resendVerificationEmail: async (userId: string) =>
    apiService.post(`/users/${userId}/resend-verification`, { userId }),

  resolveTicket: async (ticketId: string, resolution: string) =>
    apiService.post(`/admin/support/tickets/${ticketId}/resolve`, { resolution }),
};

export default adminService;
