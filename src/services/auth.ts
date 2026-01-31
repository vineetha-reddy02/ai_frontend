import { apiService } from './api';
import { API_ENDPOINTS } from '../constants';
import { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authService = {
  // Register: only allow 'user' or 'instructor' roles from the client.
  // Admin accounts must be created server-side and should not be
  // registrable via the public register endpoint.
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const payload = { ...data } as any;
    // Normalize role: default to 'user' and prevent creating 'admin'
    if (!payload.role) payload.role = 'user';
    if (payload.role === 'admin') payload.role = 'user';

    // Backend expects capitalized role strings like 'User' or 'Instructor'.
    // Convert client-side values ('user'/'instructor') to that format.
    if (typeof payload.role === 'string') {
      const roleLower = payload.role.toLowerCase();
      if (roleLower === 'instructor') payload.role = 'Instructor';
      else payload.role = 'User';
    }

    return apiService.post(API_ENDPOINTS.REGISTER, payload);
  },

  login: async (data: any): Promise<any> => {
    // Backend expects: { identifier, password, rememberMe }
    const payload = {
      identifier: data.identifier || data.email,
      password: data.password,
      rememberMe: data.rememberMe !== undefined ? data.rememberMe : true,
    };
    console.log('authService.login - sending payload:', { ...payload, password: '***' });
    const response = await apiService.post(API_ENDPOINTS.LOGIN, payload);
    console.log('authService.login - response received:', response);
    return response;
  },

  logout: async (): Promise<void> => {
    await apiService.post(API_ENDPOINTS.LOGOUT, {});
  },

  getProfile: async (): Promise<any> => {
    return apiService.get(API_ENDPOINTS.GET_PROFILE);
  },

  updateProfile: async (data: any): Promise<any> => {
    return apiService.put(API_ENDPOINTS.UPDATE_PROFILE, data);
  },

  refreshToken: async (refreshToken: string): Promise<any> => {
    return apiService.post(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken });
  },

  verifyEmail: async (email: string, token: string): Promise<any> => {
    return apiService.get(API_ENDPOINTS.VERIFY_EMAIL, { params: { email, token } });
  },

  resendOtp: async (email: string): Promise<any> => {
    return apiService.post('/auth/resend-otp', { email });
  },

  forgotPassword: async (email: string): Promise<any> => {
    return apiService.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
  },

  resendEmailConfirmation: async (email: string): Promise<any> => {
    return apiService.post(API_ENDPOINTS.RESEND_EMAIL_CONFIRMATION, { email });
  },

  resetPassword: async (payload: { userId: string; token: string; newPassword: string }): Promise<any> => {
    return apiService.post(API_ENDPOINTS.RESET_PASSWORD, payload);
  },

  changePassword: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<any> => {
    return apiService.put('/auth/change-password', data);
  },
};
