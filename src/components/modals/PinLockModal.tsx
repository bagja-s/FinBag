import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { Lock, Delete } from 'lucide-react';
import { motion } from 'motion/react';
import { modalSpringVariants, backdropVariants } from '../../utils/motionVariants';

export const PinLockModal: React.FC = () => {
  const { appPin, isAppUnlocked, unlockApp, language } = useFinance();
  const t = getTranslation(language);

  const [enteredDigits, setEnteredDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!appPin || isAppUnlocked) return null;

  const handleDigitPress = (digit: string) => {
    if (enteredDigits.length < 4) {
      const next = enteredDigits + digit;
      setEnteredDigits(next);
      setErrorMsg('');

      if (next.length === 4) {
        const success = unlockApp(next);
        if (!success) {
          setErrorMsg(language === 'id' ? 'PIN salah. Coba lagi.' : 'Incorrect PIN. Try again.');
          setTimeout(() => setEnteredDigits(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredDigits(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div 
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4"
    >
      <motion.div 
        variants={modalSpringVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-xs text-center space-y-6"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-500 shadow-lg shadow-blue-500/20">
          <Lock className="h-7 w-7" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">{t.enterPin}</h2>
          <p className="mt-1 text-xs text-slate-400">FinBag Privacy Protection</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full transition-all ${
                idx < enteredDigits.length
                  ? 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/50'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-rose-400 animate-shake">{errorMsg}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-4 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigitPress(digit)}
              className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white active:bg-blue-600 transition-colors shadow-sm"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigitPress('0')}
            className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white active:bg-blue-600 transition-colors shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            aria-label={language === 'id' ? 'Hapus Digit' : 'Delete Digit'}
            className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-slate-800/60 text-slate-400 active:bg-slate-700 transition-colors"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
