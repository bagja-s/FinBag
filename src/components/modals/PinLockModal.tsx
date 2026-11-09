import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import {
  Lock,
  Delete,
  ShieldAlert,
  LogOut,
  Fingerprint,
  ScanFace,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { modalSpringVariants, backdropVariants } from '../../utils/motionVariants';
import { MAX_PIN_ATTEMPTS, detectMobilePlatform } from '../../utils/securityUtils';

export const PinLockModal: React.FC = () => {
  const {
    appPin,
    isAppUnlocked,
    isPinVerifiedForSession,
    isBiometricStepRequired,
    biometricConfig,
    pinAttemptState,
    unlockApp,
    verifyBiometricUnlock,
    logout,
    language,
  } = useFinance();
  const t = getTranslation(language);

  const [enteredDigits, setEnteredDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [isScanningBiometric, setIsScanningBiometric] = useState<boolean>(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  const platformInfo = detectMobilePlatform();

  // Live countdown timer when locked out due to brute-force attempts
  useEffect(() => {
    if (!pinAttemptState.lockoutUntilMs) {
      setLockoutSeconds(0);
      return;
    }

    const updateTimer = () => {
      const rem = Math.ceil((pinAttemptState.lockoutUntilMs! - Date.now()) / 1000);
      if (rem <= 0) {
        setLockoutSeconds(0);
        setErrorMsg('');
      } else {
        setLockoutSeconds(rem);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [pinAttemptState.lockoutUntilMs]);

  const isLockedOut = lockoutSeconds > 0;

  const triggerBiometricScan = useCallback(async () => {
    if (isScanningBiometric) return;
    setIsScanningBiometric(true);
    setBiometricError(null);
    try {
      const res = await verifyBiometricUnlock();
      if (!res.success) {
        setBiometricError(
          res.error ||
            (language === 'id'
              ? 'Verifikasi biometrik gagal. Ketuk tombol di bawah untuk memindai ulang.'
              : 'Biometric verification failed. Tap below to scan again.')
        );
      }
    } finally {
      setIsScanningBiometric(false);
    }
  }, [isScanningBiometric, language, verifyBiometricUnlock]);

  // Automatically trigger WebAuthn FaceID / Fingerprint scan when Step 1 (PIN) completes
  useEffect(() => {
    if (appPin && !isAppUnlocked && isPinVerifiedForSession && isBiometricStepRequired) {
      triggerBiometricScan();
    }
  }, [appPin, isAppUnlocked, isPinVerifiedForSession, isBiometricStepRequired]);

  const handleDigitPress = useCallback(
    (digit: string) => {
      if (isLockedOut || isPinVerifiedForSession) return;
      if (enteredDigits.length < 4) {
        const next = enteredDigits + digit;
        setEnteredDigits(next);
        setErrorMsg('');

        if (next.length === 4) {
          const success = unlockApp(next);
          if (!success) {
            const remAttempts = Math.max(
              0,
              MAX_PIN_ATTEMPTS - (pinAttemptState.failedAttempts + 1)
            );
            if (remAttempts === 0) {
              setErrorMsg(
                language === 'id'
                  ? 'Terlalu banyak percobaan gagal. Tunggu 30 detik.'
                  : 'Too many failed attempts. Please wait 30 seconds.'
              );
            } else {
              setErrorMsg(
                language === 'id'
                  ? `PIN salah. Sisa ${remAttempts} percobaan sebelum dikunci sementara.`
                  : `Incorrect PIN. ${remAttempts} attempts left before temporary lockout.`
              );
            }
            setTimeout(() => setEnteredDigits(''), 400);
          } else {
            setEnteredDigits('');
          }
        }
      }
    },
    [
      enteredDigits,
      isLockedOut,
      isPinVerifiedForSession,
      language,
      pinAttemptState.failedAttempts,
      unlockApp,
    ]
  );

  const handleDelete = useCallback(() => {
    if (isLockedOut || isPinVerifiedForSession) return;
    setEnteredDigits((prev) => prev.slice(0, -1));
    setErrorMsg('');
  }, [isLockedOut, isPinVerifiedForSession]);

  // Support physical keyboard input for Step 1 (PIN)
  useEffect(() => {
    if (!appPin || isAppUnlocked || isPinVerifiedForSession) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appPin, isAppUnlocked, isPinVerifiedForSession, handleDigitPress, handleDelete]);

  if (!appPin || isAppUnlocked) return null;
  if (typeof document === 'undefined') return null;

  const showBiometricStep = isPinVerifiedForSession && isBiometricStepRequired;

  return createPortal(
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4"
    >
      <motion.div
        variants={modalSpringVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-xs text-center space-y-5"
      >
        {/* 2-Layer Security Step Indicator when Biometrics is enabled */}
        {isBiometricStepRequired && (
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-[11px] font-semibold text-slate-300">
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              {showBiometricStep
                ? language === 'id'
                  ? 'Lapis 2/2: Biometrik Mobile'
                  : 'Layer 2/2: Mobile Biometrics'
                : language === 'id'
                ? 'Lapis 1/2: Kode PIN'
                : 'Layer 1/2: PIN Code'}
            </span>
          </div>
        )}

        {showBiometricStep ? (
          /* ================= STEP 2: WEBAUTHN BIOMETRIC (FACEID / FINGERPRINT) LAYER ================= */
          <div className="space-y-5 pt-2">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              {isScanningBiometric && (
                <span className="absolute inset-0 rounded-3xl bg-emerald-500/25 animate-ping" />
              )}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-xl shadow-emerald-500/10">
                {platformInfo.os === 'ios' ? (
                  <ScanFace className="h-10 w-10" />
                ) : (
                  <Fingerprint className="h-10 w-10" />
                )}
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{language === 'id' ? 'PIN Terverifikasi' : 'PIN Verified'}</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                {language === 'id'
                  ? 'Verifikasi FaceID / Sidik Jari'
                  : 'Verify FaceID / Fingerprint'}
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {language === 'id'
                  ? `Gunakan sensor ${biometricConfig?.authenticatorLabel || platformInfo.biometricLabelId} pada perangkat Anda untuk membuka FinBag.`
                  : `Use your device's ${biometricConfig?.authenticatorLabel || platformInfo.biometricLabelEn} sensor to unlock FinBag.`}
              </p>
            </div>

            {biometricError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/50 px-3.5 py-2.5 text-xs font-semibold text-rose-300">
                {biometricError}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isScanningBiometric}
                onClick={triggerBiometricScan}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] py-3.5 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60 cursor-pointer"
              >
                <Fingerprint className="h-4 w-4" />
                <span>
                  {isScanningBiometric
                    ? language === 'id'
                      ? 'Memindai Sensor Biometrik...'
                      : 'Scanning Biometric Sensor...'
                    : language === 'id'
                    ? 'Pindai FaceID / Sidik Jari Sekarang'
                    : 'Scan FaceID / Fingerprint Now'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= STEP 1: 4-DIGIT SALTED HASH PIN LAYER ================= */
          <>
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${
                isLockedOut
                  ? 'bg-rose-500/20 text-rose-500 shadow-rose-500/20'
                  : 'bg-blue-600/20 text-blue-500 shadow-blue-500/20'
              }`}
            >
              {isLockedOut ? <ShieldAlert className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">{t.enterPin}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {isBiometricStepRequired
                  ? language === 'id'
                    ? 'Masukkan PIN sebelum verifikasi FaceID / Sidik Jari'
                    : 'Enter PIN before FaceID / Fingerprint verification'
                  : language === 'id'
                  ? 'Proteksi Enkripsi PIN FinBag (Salted SHA-256)'
                  : 'FinBag Encrypted PIN Protection (Salted SHA-256)'}
              </p>
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

            {isLockedOut ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/50 px-3 py-2.5 text-xs font-semibold text-rose-300">
                {language === 'id'
                  ? `Keamanan Aktif: Terkunci sementara (${lockoutSeconds} detik)`
                  : `Security Lockout: Temporarily locked (${lockoutSeconds}s)`}
              </div>
            ) : (
              errorMsg && <p className="text-xs font-semibold text-rose-400">{errorMsg}</p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-[240px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isLockedOut}
                  onClick={() => handleDigitPress(digit)}
                  className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white hover:bg-slate-700 active:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                disabled={isLockedOut}
                onClick={() => handleDigitPress('0')}
                className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white hover:bg-slate-700 active:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                disabled={isLockedOut}
                onClick={handleDelete}
                aria-label={language === 'id' ? 'Hapus Digit' : 'Delete Digit'}
                className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:bg-slate-700 active:bg-slate-600 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          </>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>
              {language === 'id' ? 'Keluar & Masuk Ulang Akun' : 'Sign Out & Re-authenticate'}
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
