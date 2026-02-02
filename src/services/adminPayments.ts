import { apiService } from './api';

export interface PaginatedResponse<T> {
    data: T[];
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface AdminPaymentTransaction {
    id: string;
    transactionId?: string;
    merchantOrderId?: string;
    paymentProviderTransactionId?: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    description: string;
    paymentMethodType?: string;
    paymentMethodId?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    createdAt: string;
    completedAt?: string;
    failureReason?: string;
}

export interface AdminWithdrawalRequest {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    fee: number;
    netAmount: number;
    status: string;
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifsc?: string;
    routingNumber: string;
    iban: string;
    swiftCode: string;
    last4: string;
    expiresAt: string;
    createdAt: string;
    processedAt?: string;
    processedBy?: string;
    rejectionReason?: string;
}

export interface AdminRefundRequest {
    id: string;
    userId: string;
    transactionId: string;
    amount: number;
    currency: string;
    reason: string;
    reasonDescription: string;
    status: string;
    destination: string;
    stripeRefundId: string;
    rejectionReason?: string;
    createdAt: string;
    processedAt?: string;
    processedBy?: string;
}

export interface AdminWalletAdjustment {
    userId: string;
    amount: number;
    type: 'Credit' | 'Debit';
    reason: string;
}

export interface UserDetail {
    id: string;
    fullName: string;
    email: string;
    walletBalance: number;
    phoneNumber?: string;
    role?: string;
    isApproved?: boolean;
    createdAt?: string;
    subscriptionStatus?: string;
    planName?: string;
}

export const adminPaymentsService = {
    // Transactions
    getTransactions: async (params?: {
        pageNumber?: number;
        pageSize?: number;
        type?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
    }) => {
        // The API returns paginated response, but the interceptor unwraps the 'data' field
        // So we get the array directly
        const response = await apiService.get<AdminPaymentTransaction[]>('/admin/payments/transactions', { params });
        return response || [];
    },

    getTransactionStatus: async (transactionId: string) => {
        return apiService.get<AdminPaymentTransaction>(`/payments/${transactionId}/status`);
    },

    // Withdrawals
    getPendingWithdrawals: async (params?: {
        pageNumber?: number;
        pageSize?: number;
        status?: string;
    }) => {
        return apiService.get<AdminWithdrawalRequest[]>('/admin/payments/withdrawals/pending', { params });
    },

    approveWithdrawal: async (withdrawalId: string, bankTransferReference?: string) => {
        return apiService.post(`/admin/payments/withdrawals/${withdrawalId}/approve`, { bankTransferReference });
    },

    rejectWithdrawal: async (withdrawalId: string, rejectionReason: string) => {
        return apiService.post(`/admin/payments/withdrawals/${withdrawalId}/reject`, { rejectionReason });
    },

    completeWithdrawal: async (withdrawalId: string, bankTransferReference?: string) => {
        return apiService.post(`/admin/payments/withdrawals/${withdrawalId}/complete`, { bankTransferReference });
    },

    // Refunds
    getPendingRefunds: async (params?: {
        pageNumber?: number;
        pageSize?: number;
        status?: string;
    }) => {
        return apiService.get<AdminRefundRequest[]>('/admin/payments/refunds/pending', { params });
    },

    approveRefund: async (refundId: string, adminNotes?: string) => {
        return apiService.post(`/admin/payments/refunds/${refundId}/approve`, { adminNotes });
    },

    rejectRefund: async (refundId: string, rejectionReason: string) => {
        return apiService.post(`/admin/payments/refunds/${refundId}/reject`, { rejectionReason });
    },

    // Wallet
    adjustWalletBalance: async (data: AdminWalletAdjustment) => {
        return apiService.post('/admin/payments/wallets/adjust-balance', data);
    },

    getUserDetails: async (userId: string) => {
        const response = await apiService.get<UserDetail>(`/admin/payments/wallets/user/${userId}`);
        return response;
    },

    getUserTransactions: async (userId: string) => {
        const response = await apiService.get<AdminPaymentTransaction[]>(`/admin/payments/wallets/user/${userId}/transactions`);
        return response || [];
    }
};
