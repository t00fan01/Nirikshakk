import React, { useState, useRef } from 'react';
import {
  Upload, X, CheckCircle2, AlertTriangle, Loader2,
  Database, Clock, Zap
} from 'lucide-react';
import { api, DatasetUploadResponse } from '../lib/api';

interface DatasetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: DatasetUploadResponse) => void;
}

export const DatasetImportModal: React.FC<DatasetImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      setErrorMessage('Unsupported file format. Please select a .csv or .json Bitcoin dataset.');
      setSelectedFile(null);
      return;
    }
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

  const handleProcessUpload = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProcessingMode('upload');
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await api.uploadDataset(selectedFile);
      setResult(res);
      onSuccess(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dataset processing failed.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  const handleLoadBenchmark = async () => {
    setIsProcessing(true);
    setProcessingMode('benchmark');
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await api.loadBenchmarkDataset();
      setResult(res);
      onSuccess(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load benchmark dataset.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]"
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
              <p className="text-[11px] font-mono text-emerald-400">SIH26146 End-to-End Processing Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-40"
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
                  <p className="font-black uppercase tracking-wider text-emerald-800">Dataset Processed Successfully</p>
                  <p className="mt-0.5 text-emerald-700">
                    File <strong className="font-mono">{result.filename}</strong> was normalized, analyzed with ML models, and compiled into the investigation graph.
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
                    {result.analysis_summary?.wallets_analyzed?.toLocaleString() ?? '—'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anomalies Detected</span>
                  <p className="text-xl font-black text-[#FF4F00] mt-0.5">
                    {result.analysis_summary?.anomalies_detected?.toLocaleString() ?? '0'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graph Entities</span>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">
                    {result.graph_summary?.total_nodes?.toLocaleString() ?? '—'} <span className="text-xs font-normal text-slate-500">nodes</span>
                  </p>
                </div>
              </div>

              {/* Real Measured Stage Latencies */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Stage Latencies (Measured)</span>
                  <span className="font-mono text-white">
                    Total: {result.stage_timings_ms?.total_ms ?? result.stage_timings_ms?.total ?? '—'}ms
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1 border-t border-slate-800">
                  <div>Validation: <span className="text-emerald-400">{result.stage_timings_ms?.validation_ms ?? result.stage_timings_ms?.validation ?? 0}ms</span></div>
                  <div>Normalization: <span className="text-emerald-400">{result.stage_timings_ms?.normalization_ms ?? result.stage_timings_ms?.normalization ?? 0}ms</span></div>
                  <div>ML & Clustering: <span className="text-emerald-400">{result.stage_timings_ms?.analysis_ms ?? result.stage_timings_ms?.analysis ?? 0}ms</span></div>
                  <div>Graph Compilation: <span className="text-emerald-400">{result.stage_timings_ms?.graph_build_ms ?? result.stage_timings_ms?.graph_compilation ?? 0}ms</span></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Import Another
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#002A24] text-white text-xs font-black uppercase tracking-wider hover:bg-[#003830] transition-colors shadow-lg"
                >
                  Explore Dashboard
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING VIEW */}
          {isProcessing && (
            <div className="py-8 text-center space-y-5 animate-in fade-in">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FF4F00]/10 border border-[#FF4F00]/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#FF4F00] animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-black uppercase tracking-wider text-[#002A24]">
                  {processingMode === 'benchmark' ? 'Loading SIH Benchmark Dataset...' : 'Processing Dataset...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Executing real pipeline synchronously: validation, Parquet storage, Isolation Forest, K-Means clustering, and NetworkX graph rebuild.
                </p>
              </div>

              {/* Step indicator */}
              <div className="max-w-xs mx-auto text-left space-y-2.5 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="font-mono font-bold">1. VALIDATING</span>
                  <span className="text-slate-400 text-[10px]">Schema & records</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="font-mono font-bold">2. NORMALIZING</span>
                  <span className="text-slate-400 text-[10px]">DuckDB & Parquet</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-[#FF4F00] animate-pulse"></div>
                  <span className="font-mono font-bold text-[#FF4F00]">3. ANALYZING</span>
                  <span className="text-slate-400 text-[10px]">Isolation Forest & KMeans</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                  <span className="font-mono font-bold">4. BUILDING GRAPH</span>
                  <span className="text-slate-400 text-[10px]">NetworkX multi-layer</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <span className="font-mono font-bold text-slate-400">5. REFRESHING CACHE</span>
                </div>
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
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-mono font-bold text-[#002A24] break-all">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-700 underline">
                      Click to change file
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm">
                      <Upload className="w-6 h-6 text-[#FF4F00]" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                        Select CSV or JSON Dataset
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Drag and drop file here, or click to browse
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/70 text-[10px] font-mono text-slate-600">
                      Supported: .csv, .json (offline)
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleProcessUpload}
                  disabled={!selectedFile || isProcessing}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center transition-all shadow-lg ${
                    !selectedFile || isProcessing
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#FF4F00] text-white hover:bg-[#E04500] hover:shadow-[0_10px_25px_rgba(255,79,0,0.3)]'
                  }`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Process Dataset
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">OR</span>
                  <div className="border-t border-slate-200 w-full"></div>
                </div>

                <button
                  onClick={handleLoadBenchmark}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl border-2 border-[#002A24]/15 bg-white text-[#002A24] font-black uppercase tracking-wider text-xs flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
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
