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
    const error = new Error(text || `Request failed: ${response.status}`);
    (error as { status?: number }).status = response.status;
    throw error;
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
    const error = new Error(text || `Request failed: ${response.status}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

async function apiUpload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed: ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) message = parsed.detail;
    } catch {
      // not JSON
    }
    const error = new Error(message);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getMuleStats: () => apiGet<{ total_accounts?: number; labels?: Record<string, number> }>('/api/mule/stats'),
  getWebSocketTicket: () => apiPost<{ ticket: string }>('/api/auth/ws-ticket', {}),
  getTopMuleAccounts: () => apiGet<Array<{ account_id?: string; label?: string }>>('/api/mule/top'),
  getTransactions: () => apiGet<Array<{ account_id?: string; timestamp?: string; transaction_id?: string }>>('/api/transactions'),
  getModelMetrics: () => apiGet<ModelMetricsResponse>('/api/model/metrics'),
  getModelFeatures: () => apiGet<{ features?: ModelFeatureImportance[] }>('/api/model/features'),
  getAlerts: async (filters?: { severity?: string; status?: string; classification?: string; account_id?: string; limit?: number; min_risk_score?: number; risk_level?: string }) => {
    const params = new URLSearchParams();
    Object.entries(filters ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const query = params.toString();
    const result = await apiGet<AlertRecord[] | { total_alerts?: number; alerts?: AlertRecord[]; total_leads?: number; leads?: AlertRecord[] }>(`/api/alerts${query ? `?${query}` : ''}`);
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.alerts)) return result.alerts;
    if (result && Array.isArray((result as { leads?: AlertRecord[] }).leads)) return (result as { leads?: AlertRecord[] }).leads!;
    return [];
  },
  
  // Phase 5/6 Bitcoin Graph API
  getGraphStats: () => apiGet<GraphStatsResponse>('/api/graph/stats'),
  searchGraph: (query: string, limit: number = 20) => 
    apiGet<GraphSearchResponse>(`/api/graph/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  getEntityDetails: (entityId: string) => 
    apiGet<GraphEntityDetails>(`/api/graph/${encodeURIComponent(entityId)}`),
  getEntitySubgraph: (
    entityId: string, 
    hops: number = 1, 
    maxNodes: number = 100, 
    minRiskScore?: number, 
    riskLevel?: string
  ) => {
    const params = new URLSearchParams({
      hops: String(hops),
      max_nodes: String(maxNodes),
    });
    if (minRiskScore !== undefined && minRiskScore !== null) {
      params.set('min_risk_score', String(minRiskScore));
    }
    if (riskLevel) {
      params.set('risk_level', riskLevel);
    }
    return apiGet<GraphSubgraphResponse>(`/api/graph/${encodeURIComponent(entityId)}/subgraph?${params.toString()}`);
  },
  getGraphPath: (source: string, target: string, maxHops: number = 10) =>
    apiGet<GraphPathResponse>(`/api/graph/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}&max_hops=${maxHops}`),
  getAlertDetails: (alertId: string) =>
    apiGet<AlertDetailResponse>(`/api/alerts/${encodeURIComponent(alertId)}`),
  getWalletInvestigation: (walletId: string, txLimit: number = 50, netLimit: number = 50) =>
    apiGet<WalletInvestigationResponse>(`/api/investigations/${encodeURIComponent(walletId)}?tx_limit=${txLimit}&net_limit=${netLimit}`),

  // Phase 9 Behavioral Clustering API
  getClusters: () =>
    apiGet<ClusterProfilesResponse>('/api/clusters'),
  getClusterDetail: (clusterId: number, limit: number = 50, offset: number = 0, sortBy: string = 'distance') =>
    apiGet<ClusterDetailResponse>(`/api/clusters/${clusterId}?limit=${limit}&offset=${offset}&sort_by=${encodeURIComponent(sortBy)}`),
  getWalletCluster: (walletId: string) =>
    apiGet<WalletClusterDetailResponse>(`/api/clusters/wallet/${encodeURIComponent(walletId)}`),
  getSimilarWallets: (walletId: string, topN: number = 5) =>
    apiGet<SimilarWalletsResponse>(`/api/clusters/similar/${encodeURIComponent(walletId)}?top_n=${topN}`),

  // Dataset Lifecycle & Pipeline API (Hackathon Demo Mode)
  uploadDataset: (file: File) =>
    apiUpload<DatasetUploadResponse>('/api/datasets/upload', file),
  loadBenchmarkDataset: () =>
    apiPost<DatasetUploadResponse>('/api/datasets/load-benchmark', {}),
  getActiveDataset: () =>
    apiGet<ActiveDatasetStatus>('/api/datasets/active'),
  getDatasetStats: () =>
    apiGet<DatasetStatsResponse>('/api/stats'),
  getAnalysisStatus: () =>
    apiGet<AnalysisStatusResponse>('/api/analysis/status'),
};

export interface StorageInfo {
  normalized: boolean;
  storage_dir: string;
  transactions_file: string;
  wallets_file: string;
  network_observations_file: string;
  table_counts: Record<string, number>;
}

export interface DatasetUploadResponse {
  filename: string;
  detected_format: string;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  validation_status: string;
  pipeline_status: string;
  stage_timings_ms: Record<string, number>;
  analysis_summary?: {
    wallets_analyzed: number;
    anomalies_detected: number;
    critical_risk_leads: number;
    high_risk_leads: number;
    cluster_count: number;
    duration_seconds: number;
  } | null;
  graph_summary?: {
    total_nodes: number;
    total_edges: number;
    wallet_nodes: number;
    transaction_nodes: number;
  } | null;
  storage?: StorageInfo | null;
}

export interface ActiveDatasetStatus {
  has_dataset: boolean;
  filename?: string | null;
  detected_format?: string | null;
  total_transactions: number;
  total_wallets: number;
  anomalies_detected: number;
  high_risk_leads: number;
  critical_risk_leads: number;
  cluster_count: number;
  graph_nodes: number;
  graph_edges: number;
  stage_timings_ms: Record<string, number>;
  analyzed_at?: string | null;
}

export interface DatasetStatsResponse {
  transactions: number;
  wallets: number;
  network_observations: number;
  storage_format: string;
  files: Record<string, string>;
}

export interface AnalysisStatusResponse {
  has_analysis: boolean;
  analyzed_at?: string | null;
  wallets_analyzed?: number;
  anomalies_detected?: number;
  high_risk_leads?: number;
  critical_risk_leads?: number;
  model_type?: string;
  cluster_count?: number;
}

export interface WalletSummary {
  address: string;
  first_seen?: string | null;
  last_seen?: string | null;
  transaction_count: number;
  input_transaction_count: number;
  output_transaction_count: number;
  total_input_amount: number;
  total_output_amount: number;
}

export interface RiskDossier {
  score: number;
  level: string;
  anomaly_score: number;
  anomaly_percentile: number;
  is_outlier?: boolean;
  subscores: {
    anomaly?: number;
    activity?: number;
    network?: number;
    behavior?: number;
    [key: string]: number | undefined;
  };
}

export interface EvidenceItem {
  category: string;
  message: string;
  severity: string;
  metric?: unknown;
  baseline?: unknown;
  feature?: string;
}

export interface BitcoinInvestigationTransaction {
  txid: string;
  timestamp: string;
  input_addresses: string[];
  output_addresses: string[];
  input_amounts: number[];
  output_amounts: number[];
  fee: number;
  script_type: string;
  total_input_amount?: number | null;
  total_output_amount?: number | null;
  is_input: boolean;
  is_output: boolean;
}

export interface BitcoinInvestigationNetworkObservation {
  txid: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  geo_country: string;
  asn: string;
}

export interface BitcoinInvestigationGraphSummary {
  direct_neighbor_count: number;
  transaction_count: number;
  ip_count: number;
  asn_count: number;
  country_count: number;
}

export interface WalletInvestigationResponse {
  wallet: WalletSummary;
  risk?: RiskDossier | null;
  evidence: EvidenceItem[];
  transactions: BitcoinInvestigationTransaction[];
  network_observations: BitcoinInvestigationNetworkObservation[];
  graph_summary: BitcoinInvestigationGraphSummary;
  total_transactions: number;
  total_network_observations: number;
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
  wallet_address?: string;
  transaction_id?: string;
  timestamp?: string;
  severity?: string;
  risk_level?: string;
  classification?: string;
  risk_score?: number;
  mule_probability?: number;
  alert_type?: string;
  reason?: string;
  primary_reason?: string;
  status?: string;
}

// ==========================================
// Phase 5 & 6 Bitcoin Investigation Graph Types
// ==========================================

export interface GraphNode {
  id: string;
  type: string; // 'wallet' | 'transaction' | 'ip' | 'asn' | 'country' | 'entity'
  label: string;
  risk_score?: number | null;
  risk_level?: string | null;
  anomaly_score?: number | null;
  anomaly_percentile?: number | null;
  is_outlier?: boolean | null;
  alert_id?: string | null;
  metadata?: Record<string, unknown>;
  // ForceGraph runtime properties
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  val?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'input' | 'output' | 'counterparty' | 'network_observation' | string;
  metadata?: Record<string, unknown>;
  // ForceGraph runtime properties
  is_flagged?: boolean;
}

export interface GraphMeta {
  center?: string | null;
  hops?: number | null;
  node_count: number;
  edge_count: number;
  truncated: boolean;
  query_time_ms?: number | null;
  filter_applied?: Record<string, unknown> | null;
}

export interface GraphSubgraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  meta: GraphMeta;
}

export interface GraphStatsResponse {
  status: string;
  total_nodes: number;
  total_edges: number;
  wallet_nodes: number;
  transaction_nodes: number;
  ip_nodes: number;
  asn_nodes: number;
  country_nodes: number;
  entity_nodes: number;
  input_edges: number;
  output_edges: number;
  counterparty_edges: number;
  network_observation_edges: number;
  density: number;
  is_deterministic?: boolean;
  built_at?: string | null;
  source_dataset_records?: number | null;
}

// Alias for requested name
export type GraphStats = GraphStatsResponse;

export interface SearchResultItem {
  id: string;
  type: string;
  label: string;
  match_field: string;
  risk_score?: number | null;
  risk_level?: string | null;
  metadata?: Record<string, unknown>;
}

// Alias for requested name
export type GraphSearchResult = SearchResultItem;

export interface GraphSearchResponse {
  query: string;
  total_matches: number;
  results: SearchResultItem[];
}

export interface GraphEntityDetails {
  id: string;
  type: string;
  label: string;
  risk_score?: number | null;
  risk_level?: string | null;
  anomaly_score?: number | null;
  anomaly_percentile?: number | null;
  is_outlier?: boolean | null;
  alert_id?: string | null;
  in_degree: number;
  out_degree: number;
  total_degree: number;
  attributes: Record<string, unknown>;
}

export interface PathStep {
  step_index: number;
  from_node: string;
  to_node: string;
  edge_type: string;
  direction_reversed: boolean;
  metadata: Record<string, unknown>;
  explanation: string;
}

export interface GraphPathResponse {
  found: boolean;
  source: string;
  target: string;
  path_length?: number | null;
  nodes: GraphNode[];
  links: GraphLink[];
  path_sequence: string[];
  traversal_mode?: 'directed' | 'undirected' | null;
  steps: PathStep[];
  disclaimer: string;
}

export interface EvidenceReason {
  category: string;
  feature: string;
  value: unknown;
  baseline: unknown;
  explanation: string;
}

export interface AlertDetailResponse {
  alert_id: string;
  rank?: number;
  wallet_address: string;
  risk_score: number;
  risk_level: string;
  anomaly_score: number;
  anomaly_percentile?: number;
  subscores?: {
    anomaly?: number;
    activity?: number;
    network?: number;
    behavior?: number;
  };
  reasons: EvidenceReason[];
  feature_metrics?: Record<string, unknown>;
  transaction_summary?: {
    total_transactions?: number;
    total_input_btc?: number;
    total_output_btc?: number;
    first_seen?: string;
    last_seen?: string;
  };
  network_summary?: {
    unique_ip_count?: number;
    unique_country_count?: number;
    unique_asn_count?: number;
  };
}

// ==========================================
// Phase 9 Behavioral Wallet Clustering Types
// ==========================================

export interface ClusterProfile {
  cluster_id: number;
  label: string;
  description: string;
  wallet_count: number;
  average_risk_score: number;
  anomaly_rate: number;
  centroid_distance_mean: number;
  centroid_distance_median: number;
  top_differentiating_features: string[];
  centroid_summary: Record<string, number>;
}

export interface ClusteringDiagnostics {
  k_values: number[];
  inertias: Record<string, number>;
  silhouette_scores: Record<string, number>;
  selected_k: number;
  selected_k_silhouette: number;
}

export interface ClusterProfilesResponse {
  total_clusters: number;
  total_wallets: number;
  clustering_algorithm: string;
  diagnostics: ClusteringDiagnostics;
  clusters: ClusterProfile[];
}

export interface WalletClusterAssignment {
  wallet_address: string;
  cluster_id: number;
  cluster_label: string;
  distance_to_centroid: number;
  pca_x: number;
  pca_y: number;
}

export interface ClusterDetailResponse {
  cluster: ClusterProfile;
  total_wallets: number;
  returned_count: number;
  offset: number;
  limit: number;
  wallets: WalletClusterAssignment[];
}

export interface WalletClusterDetailResponse {
  wallet_address: string;
  cluster_id: number;
  cluster_label: string;
  distance_to_centroid: number;
  pca_x: number;
  pca_y: number;
  cluster_profile: ClusterProfile;
}

export interface SimilarWallet {
  wallet_address: string;
  similarity_score: number;
  similarity_percent: number;
  cluster_id: number;
  cluster_label: string;
  distance_to_centroid: number;
  shared_behavioral_traits: string[];
}

export interface SimilarWalletsResponse {
  target_wallet: string;
  target_cluster_id: number;
  target_cluster_label: string;
  total_candidates: number;
  returned_count: number;
  similar_wallets: SimilarWallet[];
}
