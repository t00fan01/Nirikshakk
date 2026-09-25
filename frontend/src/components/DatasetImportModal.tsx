import React, { useState, useRef } from 'react';
import {
  Upload, X, CheckCircle2, AlertTriangle, Loader2,
  Database, Clock, Zap, FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import { DatasetUploadResponse } from '../lib/api';
import { MASTER_GRAPH } from '../demo/demoGraphData';

interface DatasetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: DatasetUploadResponse) => void;
}

const PIPELINE_STEPS = [
  { id: 'ingestion', label: '1. INGESTION', detail: 'Reading record streams & headers' },
  { id: 'validation', label: '2. VALIDATION', detail: 'Deterministic Bitcoin UTXO & TX schema verification' },
  { id: 'normalization', label: '3. NORMALIZATION', detail: 'Standardizing addresses, scripts & decimal BTC values' },
  { id: 'feature_extraction', label: '4. FEATURE EXTRACTION', detail: 'Deriving behavioral velocity & graph centrality metrics' },
  { id: 'anomaly_analysis', label: '5. ANOMALY ANALYSIS', detail: 'Isolation Forest scoring & behavioral clustering' },
  { id: 'graph_construction', label: '6. GRAPH CONSTRUCTION', detail: 'Compiling multi-community 3D link-analysis topology' },
  { id: 'lead_generation', label: '7. INVESTIGATIVE LEAD GENERATION', detail: 'Synthesizing flagged wallets & priority investigative dossiers' },
];

export const DatasetImportModal: React.FC<DatasetImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [processingMode, setProcessingMode] = useState<'upload' | 'benchmark' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DatasetUploadResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Accepts CSV, JSON, or any text file for the demo
    setErrorMessage(null);
    setSelectedFile(file);
    setResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Deterministic Frontend Pipeline Simulation
  const runSimulatedPipeline = async (filename: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setResult(null);
    setCurrentStepIndex(0);

    const stepDelays = [420, 480, 460, 520, 580, 500, 440];

    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setCurrentStepIndex(i);
      await new Promise((r) => setTimeout(r, stepDelays[i]));
    }

    const demoResponse: DatasetUploadResponse = {
      filename,
      detected_format: filename.endsWith('.json') ? 'json' : 'csv',
      total_rows: 5000,
      valid_rows: 4982,
      rejected_rows: 18,
      validation_status: 'VALIDATED',
      pipeline_status: 'ANALYSIS COMPLETE',
      stage_timings_ms: {
        ingestion_ms: 84,
        validation_ms: 112,
        normalization_ms: 168,
        analysis_ms: 310,
        graph_build_ms: 245,
        total_ms: 919,
      },
      analysis_summary: {
        wallets_analyzed: 110,
        anomalies_detected: 14,
        critical_risk_leads: 7,
        high_risk_leads: 16,
        cluster_count: 7,
        duration_seconds: 0.92,
      },
      graph_summary: {
        total_nodes: MASTER_GRAPH.nodes.length,
        total_edges: MASTER_GRAPH.links.length,
        wallet_nodes: 110,
        transaction_nodes: 29,
      },
      storage: {
        normalized: true,
        storage_dir: 'demo://simulated_parquet',
        transactions_file: 'transactions.parquet',
        wallets_file: 'wallets.parquet',
        network_observations_file: 'network_observations.parquet',
        table_counts: {
          transactions: 5000,
          wallets: 110,
          network_observations: 33,
        },
      },
    };

    setResult(demoResponse);
    setIsProcessing(false);
    setProcessingMode(null);
    onSuccess(demoResponse);
  };

  const handleProcessUpload = async () => {
    if (!selectedFile) return;
    setProcessingMode('upload');
    await runSimulatedPipeline(selectedFile.name);
  };

  const handleLoadBenchmark = async () => {
    setProcessingMode('benchmark');
    setSelectedFile(new File(['timestamp,txid,src,dst,amount'], 'sih_benchmark_bitcoin_5k.csv', { type: 'text/csv' }));
    await runSimulatedPipeline('sih_benchmark_bitcoin_5k.csv');
  };

  const handleReset = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setResult(null);
    setCurrentStepIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#002A24] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF4F00] flex items-center justify-center text-white shadow-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wider uppercase text-white">Import Dataset</h3>
              <p className="text-[11px] font-mono text-emerald-400">NIRIKSHAK V2 End-to-End Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Processing Error</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* SUCCESS VIEW */}
          {result && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <p className="font-black uppercase tracking-wider text-emerald-800">ANALYSIS COMPLETE</p>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-200/60 rounded-full text-emerald-800 font-bold">
                      DATASET ACCEPTED
                    </span>
                  </div>
                  <p className="mt-1 text-emerald-700 leading-relaxed">
                    File <strong className="font-mono text-emerald-950">{result.filename}</strong> normalized and compiled into the 7-community 3D investigation network.
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 italic">
                    (Frontend demonstration simulation)
                  </p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Records Processed</span>
                  <p className="text-xl font-black text-[#002A24] mt-0.5">
                    {result.valid_rows.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ {result.total_rows.toLocaleString()}</span>
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wallets Discovered</span>
                  <p className="text-xl font-black text-[#002A24] mt-0.5">
                    {result.analysis_summary?.wallets_analyzed?.toLocaleString() ?? '110'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anomalies Detected</span>
                  <p className="text-xl font-black text-[#FF4F00] mt-0.5">
                    {result.analysis_summary?.anomalies_detected?.toLocaleString() ?? '14'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graph Entities</span>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">
                    {result.graph_summary?.total_nodes?.toLocaleString() ?? '172'} <span className="text-xs font-normal text-slate-500">nodes</span>
                  </p>
                </div>
              </div>

              {/* Simulated Stage Timings */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Pipeline Execution Latencies</span>
                  <span className="font-mono text-white">
                    Total: {result.stage_timings_ms?.total_ms ?? 919}ms
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1 border-t border-slate-800">
                  <div>Ingestion: <span className="text-emerald-400">{result.stage_timings_ms?.ingestion_ms ?? 84}ms</span></div>
                  <div>Validation: <span className="text-emerald-400">{result.stage_timings_ms?.validation_ms ?? 112}ms</span></div>
                  <div>Normalization: <span className="text-emerald-400">{result.stage_timings_ms?.normalization_ms ?? 168}ms</span></div>
                  <div>ML & Graph: <span className="text-emerald-400">{(result.stage_timings_ms?.analysis_ms ?? 310) + (result.stage_timings_ms?.graph_build_ms ?? 245)}ms</span></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Import Another
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#002A24] text-white text-xs font-black uppercase tracking-wider hover:bg-[#003830] transition-colors shadow-lg cursor-pointer"
                >
                  Explore Investigation Graph
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING VIEW */}
          {isProcessing && (
            <div className="py-6 text-center space-y-5 animate-in fade-in">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FF4F00]/10 border border-[#FF4F00]/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#FF4F00] animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-black uppercase tracking-wider text-[#002A24]">
                  {processingMode === 'benchmark' ? 'Ingesting SIH Benchmark Dataset...' : 'Processing Uploaded Dataset...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-mono">
                  {PIPELINE_STEPS[currentStepIndex]?.detail}
                </p>
              </div>

              {/* Step indicator */}
              <div className="max-w-md mx-auto text-left space-y-2 pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {PIPELINE_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-[#FF4F00]/10 text-[#FF4F00] font-bold'
                          : isDone
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isCurrent
                              ? 'bg-[#FF4F00] animate-ping'
                              : isDone
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-mono text-[11px]">{step.label}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">
                        {isDone ? 'DONE' : isCurrent ? 'EXECUTING...' : 'QUEUED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* INPUT & SELECTION VIEW */}
          {!result && !isProcessing && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#FF4F00] bg-[#FF4F00]/5 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json,*/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      DATASET ACCEPTED
                    </div>
                    <div>
                      <p className="text-xs font-mono font-bold text-[#002A24] break-all">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-700 underline">
                      Click to choose another file
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm">
                      <Upload className="w-6 h-6 text-[#FF4F00]" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                        Select or Drag CSV / JSON Dataset
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Any Bitcoin transaction file will be ingested into the demo pipeline
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/70 text-[10px] font-mono text-slate-600">
                      <FileSpreadsheet className="w-3 h-3 text-[#FF4F00]" /> Drag & drop anywhere
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleProcessUpload}
                  disabled={!selectedFile || isProcessing}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                    !selectedFile || isProcessing
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#FF4F00] text-white hover:bg-[#E04500] hover:shadow-[0_10px_25px_rgba(255,79,0,0.3)]'
                  }`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Process Dataset & Compile Graph
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">OR</span>
                  <div className="border-t border-slate-200 w-full"></div>
                </div>

                <button
                  onClick={handleLoadBenchmark}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl border-2 border-[#002A24]/15 bg-white text-[#002A24] font-black uppercase tracking-wider text-xs flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                >
                  <Database className="w-4 h-4 mr-2 text-[#002A24]" />
                  Load SIH Benchmark Dataset (5,000 txs)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
