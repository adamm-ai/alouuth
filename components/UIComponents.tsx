import React, { useRef, useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Upload, FileText, X, Download, Lock, Check, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const styles = {
    success: {
      bg: 'bg-green-500/20 border-green-500/50',
      icon: <CheckCircle size={20} className="text-green-400" />,
      titleColor: 'text-green-400'
    },
    error: {
      bg: 'bg-red-500/20 border-red-500/50',
      icon: <AlertCircle size={20} className="text-red-400" />,
      titleColor: 'text-red-400'
    },
    warning: {
      bg: 'bg-yellow-500/20 border-yellow-500/50',
      icon: <AlertTriangle size={20} className="text-yellow-400" />,
      titleColor: 'text-yellow-400'
    }
  };

  const style = styles[toast.type];

  return (
    <div
      className={`${style.bg} border backdrop-blur-xl rounded-xl p-4 shadow-lg shadow-black/20 animate-slide-in-right flex items-start gap-3 min-w-[320px] max-w-[420px]`}
    >
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${style.titleColor}`}>{toast.title}</p>
        <p className="text-sm text-zinc-300 mt-0.5">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container - Fixed position at top right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean }> = ({ children, className = '', onClick, disabled }) => (
  <div 
    onClick={!disabled ? onClick : undefined}
    className={`
      glass-panel rounded-3xl p-6 transition-all duration-500 relative overflow-hidden
      ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
      ${onClick && !disabled ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_0_50px_rgba(250,204,21,0.15)] hover:border-yellow-400/40' : ''} 
      ${className}
    `}
  >
    {/* Subtle gradient overlay for depth */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </div>
);

export const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }> = ({ children, onClick, className = '', disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative group overflow-hidden rounded-full px-8 py-3 font-bold text-black transition-all duration-300 
      ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] active:scale-95'}
      ${className}
    `}
  >
    <div className="absolute inset-0 bg-yellow-400 transition-all duration-500 group-hover:scale-110" />
    <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] transition-opacity" />
    <span className="relative z-10 flex items-center gap-2 justify-center drop-shadow-sm">{children}</span>
  </button>
);

export const SecondaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`
      rounded-full px-8 py-3 font-semibold text-zinc-300 border border-white/10 bg-white/5 
      hover:bg-white/10 hover:text-white hover:border-yellow-400/30 hover:shadow-[0_0_20px_rgba(250,204,21,0.1)]
      transition-all duration-300 active:scale-95 ${className}
    `}
  >
    {children}
  </button>
);

export const IconButton: React.FC<{ icon: React.ReactNode; onClick?: () => void; className?: string; title?: string }> = ({ icon, onClick, className = '', title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`
      p-3 rounded-full border border-white/10 bg-white/5 text-zinc-400
      hover:text-black hover:bg-yellow-400 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]
      transition-all duration-300 active:scale-90 flex items-center justify-center
      ${className}
    `}
  >
    {icon}
  </button>
);

export const ProgressBar: React.FC<{ progress: number; className?: string }> = ({ progress, className = '' }) => (
  <div className={`h-2 w-full bg-zinc-900/80 backdrop-blur-sm border border-white/10 rounded-full overflow-hidden ${className}`}>
    <div 
      className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] transition-all duration-1000 ease-out relative"
      style={{ width: `${progress}%` }}
    >
        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
    </div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; type?: 'default' | 'success' | 'warning' | 'purple' | 'locked' }> = ({ children, type = 'default' }) => {
  const styles = {
    default: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
    success: 'bg-yellow-400/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_15px_rgba(250,204,21,0.1)]',
    warning: 'bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]',
    purple: 'bg-zinc-700/50 text-zinc-200 border-zinc-600', // Muted for black theme
    locked: 'bg-zinc-900/50 text-zinc-600 border-zinc-800',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md flex items-center gap-1.5 ${styles[type]}`}>
      {type === 'locked' && <Lock size={10} />}
      {children}
    </span>
  );
};

export const FileDropZone: React.FC<{
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  currentFile?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}> = ({ label, accept, onFileSelect, currentFile, isUploading = false, uploadProgress = 0 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type against accept prop
      const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
      const fileType = file.type.toLowerCase();
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      const isAccepted = acceptedTypes.some(acceptType => {
        if (acceptType.startsWith('.')) {
          return fileExtension === acceptType;
        }
        if (acceptType.includes('*')) {
          const [mainType] = acceptType.split('/');
          return fileType.startsWith(mainType + '/');
        }
        return fileType === acceptType;
      });

      if (isAccepted) {
        onFileSelect(file);
      } else {
        console.warn('File type not accepted:', fileType, fileExtension);
      }
    }
  };

  return (
    <div
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`group relative h-40 w-full border-2 border-dashed rounded-3xl bg-zinc-900/30 transition-all flex flex-col items-center justify-center p-6 overflow-hidden ${
        isUploading
          ? 'border-yellow-400/50 cursor-wait'
          : isDragging
            ? 'border-yellow-400 bg-yellow-400/10 scale-[1.02]'
            : 'border-white/10 hover:bg-zinc-800/40 hover:border-yellow-400/50 cursor-pointer'
      }`}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept={accept}
        onChange={handleChange}
        disabled={isUploading}
      />

      {/* Animated background grid */}
      <div className={`absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(250,204,21,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] transition-opacity ${isDragging ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}`} />

      {isDragging ? (
        <div className="flex flex-col items-center relative z-10 animate-pulse">
          <div className="h-16 w-16 rounded-full bg-yellow-400/30 flex items-center justify-center text-yellow-400 mb-3 shadow-[0_0_30px_rgba(250,204,21,0.5)]">
            <Upload size={32} />
          </div>
          <p className="text-lg font-bold text-yellow-400">Drop file here</p>
          <p className="text-sm text-yellow-400/70 mt-1">Release to upload</p>
        </div>
      ) : isUploading ? (
        <div className="flex flex-col items-center relative z-10 w-full px-4">
          <div className="h-12 w-12 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 mb-3 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
            <Upload size={24} className="animate-bounce" />
          </div>
          <p className="text-sm font-medium text-yellow-400 mb-2">Uploading... {uploadProgress}%</p>
          <div className="w-full max-w-xs h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : currentFile ? (
        <div className="flex flex-col items-center animate-fade-in relative z-10">
          <div className="h-12 w-12 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 mb-2 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
            <Check size={24} />
          </div>
          <p className="text-sm font-medium text-yellow-400 text-center break-all max-w-full px-2" title={currentFile}>{currentFile}</p>
          <p className="text-xs text-zinc-500 mt-1">Click or drag to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center relative z-10">
          <div className="h-12 w-12 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400 mb-2 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all">
            <Upload size={24} />
          </div>
          <p className="text-sm font-medium text-zinc-300">{label}</p>
          <p className="text-xs text-zinc-500 mt-1">Drag & drop or click to upload</p>
        </div>
      )}
    </div>
  );
};