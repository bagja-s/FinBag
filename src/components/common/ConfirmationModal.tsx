import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { modalSpringVariants, backdropVariants } from '../../utils/motionVariants';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  details?: { label: string; value: string }[];
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  details,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const { language } = useFinance();
  const t = getTranslation(language);
  const resolvedConfirmText = confirmText || (language === 'id' ? 'Konfirmasi' : 'Confirm');
  const resolvedCancelText = cancelText || t.cancel;
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
          Icon: Trash2,
          confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
          Icon: AlertTriangle,
          confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
          Icon: CheckCircle2,
          confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20',
        };
    }
  };

  const { iconBg, Icon, confirmBtn } = getVariantStyles();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="confirm-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          {/* Click outside backdrop to cancel */}
          <div 
            className="fixed inset-0" 
            onClick={() => { if (!isLoading) onCancel(); }}
            aria-hidden="true" 
          />

          <motion.div 
            key="confirm-modal-dialog"
            variants={modalSpringVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ willChange: 'transform, opacity' }}
            className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex items-start gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-sm transition-transform duration-200 scale-100`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 id="confirm-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              <button
                onClick={onCancel}
                disabled={isLoading}
                aria-label={language === 'id' ? 'Tutup' : 'Close'}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Optional details box */}
        {details && details.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-800/40 space-y-1.5 text-xs">
            {details.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{item.label}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-all cursor-pointer"
          >
            {resolvedCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${confirmBtn}`}
          >
            {isLoading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <span>{resolvedConfirmText}</span>
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
