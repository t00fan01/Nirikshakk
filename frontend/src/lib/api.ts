export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin);

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('nirikshak_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getMuleStats: () => apiGet<{ total_accounts?: number; labels?: Record<string, number> }>('/api/mule/stats'),
  getWebSocketTicket: () => apiPost<{ ticket: string }>('/api/auth/ws-ticket', {}),
  getTopMuleAccounts: () => apiGet<Array<{ account_id?: string; label?: string }>>('/api/mule/top'),
  getAccounts: () => apiGet<Array<{ account_id?: string; label?: string; account_type?: string }>>('/api/accounts'),
  getTransactions: () => apiGet<Array<{ account_id?: string; timestamp?: string; transaction_id?: string }>>('/api/transactions'),
  getModelMetrics: () => apiGet<ModelMetricsResponse>('/api/model/metrics'),
  getModelFeatures: () => apiGet<{ features?: ModelFeatureImportance[] }>('/api/model/features'),
  getAlerts: (filters?: { severity?: string; status?: string; classification?: string; account_id?: string }) => {
    const params = new URLSearchParams();
    Object.entries(filters ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return apiGet<AlertRecord[]>(`/api/alerts${query ? `?${query}` : ''}`);
  },
  getAccountClassification: (accountId: string) => apiGet<Record<string, unknown>>(`/api/accounts/${encodeURIComponent(accountId)}/classification`),
  getAccountInvestigation: (accountId: string) => apiGet<AccountInvestigationResponse>(`/api/accounts/${encodeURIComponent(accountId)}/investigation`),
};

export interface InvestigationFeatureSet {
  [key: string]: string | number | null;
}

export interface InvestigationTransaction {
  transaction_id?: string;
  account_id?: string;
  sender_account_id?: string;
  receiver_account_id?: string;
  amount?: number;
  timestamp?: string;
  channel?: string;
  risk_flag?: boolean;
}

export interface InvestigationNetworkLink {
  source?: string;
  target?: string;
  direction?: string;
  suspicious?: boolean;
}

export interface InvestigationAlert {
  alert_id?: string;
  timestamp?: string;
  severity?: string;
  reason?: string;
  risk_score?: number;
  classification?: string;
  status?: string;
}

export interface AccountInvestigationResponse {
  account_id: string;
  classification?: string;
  probability?: number;
  confidence?: number;
  risk_score?: number;
  risk_level?: string;
  features?: InvestigationFeatureSet;
  feature_importance?: Record<string, number>;
  reasons?: string[];
  transactions?: InvestigationTransaction[];
  network?: {
    account_id?: string;
    connected_accounts?: string[];
    links?: InvestigationNetworkLink[];
  };
  alerts?: InvestigationAlert[];
  containment_status?: string;
}

export interface ModelFeatureImportance {
  name: string;
  importance: number;
  rank: number;
}

export interface ModelMetricsResponse {
  model_name?: string;
  model_version?: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  f1_score?: number;
  roc_auc?: number;
  train_samples?: number;
  test_samples?: number;
  total_samples?: number;
  evaluated_at?: string;
  evaluation_methodology?: string;
  class_distribution?: Record<string, number>;
  confusion_matrix?: number[][];
  confusion_matrix_labels?: string[];
}

export interface AlertRecord {
  alert_id?: string;
  account_id?: string;
  transaction_id?: string;
  timestamp?: string;
  severity?: string;
  classification?: string;
  risk_score?: number;
  mule_probability?: number;
  alert_type?: string;
  reason?: string;
  status?: string;
}
