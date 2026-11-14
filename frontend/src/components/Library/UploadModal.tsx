import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.epub')) {
      setErrorMessage('Please select a valid .epub book file');
      return;
    }
    setSelectedFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage(null);
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload book');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/50 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface dark:bg-[#1E1B18] text-espresso dark:text-[#E8E2D9] rounded-3xl border border-sandBorder dark:border-white/10 p-6 shadow-warm-popover transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sandBorder/70 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-espresso dark:text-[#E8E2D9]">Add EPUB to Library</h2>
            <p className="text-xs text-espresso-muted dark:text-[#9E968F]">Upload an .epub book to start reading</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-parchment-deep dark:hover:bg-white/10 text-espresso-muted dark:text-[#9E968F] hover:text-espresso dark:hover:text-[#E8E2D9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-5 p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-terracotta bg-terracotta-light/40 dark:bg-terracotta/20 scale-[1.01]'
              : selectedFile
              ? 'border-tealAccent bg-tealAccent-light/30 dark:bg-tealAccent/15'
              : 'border-sandBorder dark:border-white/15 hover:border-terracotta/70 bg-parchment/50 dark:bg-white/5 hover:bg-parchment dark:hover:bg-white/10'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".epub"
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-tealAccent/20 flex items-center justify-center text-tealAccent">
                <FileText className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-espresso dark:text-[#E8E2D9] mt-1">{selectedFile.name}</p>
              <p className="text-xs text-espresso-muted dark:text-[#9E968F]">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <span className="text-xs text-terracotta font-medium hover:underline mt-1">
                Click to choose another
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-terracotta/15 dark:bg-terracotta/20 flex items-center justify-center text-terracotta">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-espresso dark:text-[#E8E2D9]">
                Drag & Drop your EPUB here, or <span className="text-terracotta">browse</span>
              </p>
              <p className="text-xs text-espresso-muted dark:text-[#9E968F]">Supports all standard EPUB files</p>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-sandBorder/70 dark:border-white/10">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-espresso-muted dark:text-[#9E968F] hover:text-espresso dark:hover:text-[#E8E2D9] hover:bg-parchment dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmUpload}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-terracotta hover:bg-terracotta-hover text-white shadow-warm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing EPUB...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Import Book</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
