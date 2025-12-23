import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { STORAGE_KEYS } from '../constants';

const getBaseUrl = () => {
  // In development, use the direct absolute URL to bypass Vite proxy
  // This ensures API requests share the same domain/cookies as the direct SignalR connection (Sticky Sessions)
  if (import.meta.env.DEV) {
    return 'https://edutalks-backend.lemonfield-c795bfef.centralindia.azurecontainerapps.io/api/v1';
  }

  // In production, use the environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // Check if the URL already ends with /api/v1
    if (envUrl.endsWith('/api/v1')) {
      return envUrl;
    }
    // Check if it ends with /api
    if (envUrl.endsWith('/api')) {
      return `${envUrl}/v1`;
    }
    // Otherwise append the full path
    return `${envUrl}/api/v1`;
  }

  // Fallback for production if env var is missing (though it shouldn't be)
  return 'https://edutalks-backend.lemonfield-c795bfef.centralindia.azurecontainerapps.io/api/v1';
};

const API_BASE_URL = getBaseUrl();

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh and errors
    this.api.interceptors.response.use(
      (response) => {
        // Backend returns: { data: {...}, messages, succeeded, statusCode }
        // Unwrap the .data field so callers get the payload directly
        const axiosData = response.data || response;

        // Debug logging
        // console.log('API Response interceptor - raw response.data:', response.data);

        // Only unwrap if response has the wrapper structure
        if (axiosData && typeof axiosData === 'object' && 'data' in axiosData && axiosData.data !== undefined) {
          const result = axiosData.data;
          // If result is an array and there is pagination info in parent, attach it
          if (Array.isArray(result)) {
            if (axiosData.totalPages !== undefined) (result as any).totalPages = axiosData.totalPages;
            if (axiosData.currentPage !== undefined) (result as any).currentPage = axiosData.currentPage;
            if (axiosData.totalCount !== undefined) (result as any).totalCount = axiosData.totalCount;
            if (axiosData.hasNextPage !== undefined) (result as any).hasNextPage = axiosData.hasNextPage;
            if (axiosData.hasPreviousPage !== undefined) (result as any).hasPreviousPage = axiosData.hasPreviousPage;
          }
          return result;
        }

        return axiosData;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        const errorData = (error.response?.data as any) || {};

        // Log detailed error info for debugging
        console.error('API Error:', {
          status: error.response?.status,
          message: errorData.message || error.message,
          data: errorData,
          url: error.config?.url,
        });

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

          // Only try to refresh if we have a refresh token
          if (refreshToken) {
            try {
              // Create a new instance to avoid interceptor loops
              const refreshApi = axios.create({
                baseURL: API_BASE_URL,
                headers: { 'Content-Type': 'application/json' }
              });

              const response = await refreshApi.post('/auth/refresh-token', {
                refreshToken,
              });

              // Handle various response structures
              const responseData = response.data;
              const token = responseData?.accessToken || responseData?.data?.accessToken || responseData?.token;
              const newRefreshToken = responseData?.refreshToken || responseData?.data?.refreshToken;

              if (token) {
                localStorage.setItem(STORAGE_KEYS.TOKEN, token);
                if (newRefreshToken) {
                  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
                }

                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.api(originalRequest);
              }
            } catch (refreshError) {
              // Refresh failed, clear auth and redirect to login
              console.error('Token refresh failed:', refreshError);
              localStorage.removeItem(STORAGE_KEYS.TOKEN);
              localStorage.removeItem(STORAGE_KEYS.USER);
              localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
              window.location.href = '/login';
              return Promise.reject(refreshError);
            }
          }
        }

        // Handle other errors
        if (error.response?.status === 400) {
          return Promise.reject({
            ...error,
            validationErrors: errorData.errors || errorData.message,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  public async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: any
  ): Promise<T> {
    try {
      const response = await this.api({
        method,
        url,
        data,
        ...config,
      });
      return response as T;
    } catch (error) {
      throw error;
    }
  }

  // GET request
  public get<T>(url: string, config?: any): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  // POST request
  public post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  // PUT request
  public put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  // PATCH request
  public patch<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.request<T>('PATCH', url, data, config);
  }

  // DELETE request
  public delete<T>(url: string, config?: any): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  // Upload file
  public uploadFile<T>(
    url: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    }

    return this.request<T>('POST', url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  public getClient(): AxiosInstance {
    return this.api;
  }
}

export const apiService = new ApiService();
