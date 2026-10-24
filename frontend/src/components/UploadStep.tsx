import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileUp, Shield, UploadCloud, X, FileText } from 'lucide-react';
import { ErrorBanner } from './ErrorBanner';

interface UploadStepProps {
  onAnalyze: (file: File) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
  error: Error | null;
  onDismissError: () => void;
  onLoadMockPrescription: () => void;
  onLoadMockLabReport: () => void;
  onOpenMap?: () => void;
}

const ROTATING_MESSAGES = [
  'Validating document layout...',
  'Deciphering handwriting & symbols...',
  'Extracting medications, strengths & instructions...',
  'Computing daily dosing schedule & timings...',
  'Running clinical cross-checks...',
  'Finalizing structured clinical data...',
];

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_PDF_BYTES = 14 * 1024 * 1024;   // 14 MB

export const UploadStep: React.FC<UploadStepProps> = ({
  onAnalyze,
  isLoading,
  onCancel,
  error,
  onDismissError,
  onLoadMockPrescription,
  onLoadMockLabReport,
  onOpenMap,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Rotating progress messages during analysis
  useEffect(() => {
    if (!isLoading) {
      setMessageIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [isLoading]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateAndSetFile = (file: File | undefined) => {
    setValidationError(null);
    onDismissError();
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(lowerName);

    if (!isPdf && !isImage) {
      setValidationError('Unsupported file format. Please upload a PDF, JPG, PNG, WEBP, GIF, or HEIC file.');
      return;
    }

    if (isPdf && file.size > MAX_PDF_BYTES) {
      setValidationError(`PDF exceeds size limit of 14 MB (selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setValidationError(`Image exceeds size limit of 25 MB (selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    setSelectedFile(file);

    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!selectedFile || isLoading) return;
    await onAnalyze(selectedFile);
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 px-4">
      {/* Privacy disclaimer note */}
      <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3.5 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5 shadow-sm">
        <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Privacy note:</strong> Use sample documents only while testing. AI can make mistakes. This app gives information, not medical advice.
        </p>
      </div>

      {/* Emergency Hospital & 24/7 Pharmacy Quick Access */}
      {onOpenMap && (
        <div className="mb-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 dark:from-rose-950/40 dark:via-red-950/30 dark:to-amber-950/30 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md shadow-rose-600/30">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Live Emergency HUD
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">&bull; Zero API Key</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                Need Immediate Care or 24/7 Pharmacy?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Satellite navigation to nearest ICU beds, emergency trauma care &amp; 24x7 chemists.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenMap}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all flex-shrink-0 cursor-pointer"
          >
            <span>🗺️</span>
            <span>Open Medical Map</span>
          </button>
        </div>
      )}

      <ErrorBanner error={validationError || error} onDismiss={() => { setValidationError(null); onDismissError(); }} />

      {/* Main Upload Area */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 bg-slate-50/50 dark:bg-slate-950/30'
          }`}
          onClick={() => {
            if (!selectedFile && fileInputRef.current) fileInputRef.current.click();
          }}
        >
          {previewUrl ? (
            <div className="relative inline-block max-w-full">
              <img
                src={previewUrl}
                alt="Document Preview"
                className="max-h-72 mx-auto rounded-xl object-contain shadow-md border border-slate-200 dark:border-slate-800"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClearSelection(); }}
                className="absolute -top-3 -right-3 p-1.5 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none"
                title="Remove selected file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                <FileText className="h-10 w-10" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to read
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClearSelection(); }}
                className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
              >
                <X className="h-3.5 w-3.5" />
                <span>Choose another file</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shadow-inner">
                <UploadCloud className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Drop your prescription or lab report here
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Supports PDF (up to 14 MB) &bull; JPG, PNG, WEBP, GIF, HEIC (up to 25 MB)
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                >
                  <FileUp className="h-4 w-4" />
                  <span>Choose File</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[44px]"
                >
                  <Camera className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  <span>Take Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.heic,.heif"
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
            className="hidden"
          />
        </div>

        {/* Action Button & Loading Progress */}
        <div className="mt-6">
          {isLoading ? (
            <div className="rounded-2xl border border-brand-200 dark:border-brand-900 bg-brand-50/60 dark:bg-brand-950/30 p-5 text-center">
              <div className="inline-block relative w-8 h-8 mb-3">
                <div className="w-8 h-8 rounded-full border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 animate-spin" />
              </div>
              <p
                key={messageIndex}
                className="text-sm font-semibold text-brand-900 dark:text-brand-200 animate-pulse transition-opacity duration-300"
              >
                {ROTATING_MESSAGES[messageIndex]}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Reading document with vision AI. This may take up to ~45 seconds.
              </p>

              <button
                type="button"
                onClick={onCancel}
                className="mt-4 px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 min-h-[36px]"
              >
                Cancel Analysis
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!selectedFile}
              onClick={handleSubmit}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                selectedFile
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>⚡ Read Document</span>
            </button>
          )}
        </div>

        {/* Quick Demo Samples */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Want to test immediately without uploading a file?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onLoadMockPrescription}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 min-h-[36px]"
            >
              📄 Load Sample Prescription (Rx)
            </button>
            <button
              type="button"
              onClick={onLoadMockLabReport}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 min-h-[36px]"
            >
              🧪 Load Sample Blood Lab Report
            </button>
            {onOpenMap && (
              <button
                type="button"
                onClick={onOpenMap}
                className="px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 min-h-[36px] flex items-center gap-1.5 cursor-pointer"
              >
                <span>🏥</span>
                <span>Hospital &amp; ICU Map</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
