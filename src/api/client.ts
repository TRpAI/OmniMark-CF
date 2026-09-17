import { ApiResponse } from '../../packages/shared/types';

const TOKEN_STORAGE_KEY = 'omnimark_token';
const API_URL_STORAGE_KEY = 'omnimark_api_url';

class ApiClient {
  private baseUrl: string;

  constructor() {
    let url = '/api';
    try {
      const saved = localStorage.getItem(API_URL_STORAGE_KEY);
      if (saved) {
        url = saved;
      } else if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
        url = (import.meta as any).env.VITE_API_URL;
      }
    } catch {}
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    const cleaned = (url || '/api').trim().replace(/\/+$/, '');
    this.baseUrl = cleaned;
    try {
      if (cleaned && cleaned !== '/api') {
        localStorage.setItem(API_URL_STORAGE_KEY, cleaned);
      } else {
        localStorage.removeItem(API_URL_STORAGE_KEY);
      }
    } catch {}
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  public setToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to set token in storage:', e);
    }
  }

  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    return headers;
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async put<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status}`;
      try {
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await res.json();
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } else {
          errorMessage = await res.text();
        }
      } catch {}
      throw new Error(errorMessage);
    }

    if (contentType && contentType.includes('application/json')) {
      const json: ApiResponse<T> = await res.json();
      if (json && typeof json === 'object' && 'success' in json) {
        if (!json.success) {
          throw new Error(json.error || '请求失败');
        }
        return json.data as T;
      }
      return json as unknown as T;
    }

    return (await res.text()) as unknown as T;
  }
}

export const apiClient = new ApiClient();
