import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPinSync,
  isHashedPin,
  verifyPin,
  evaluatePinAttempt,
  sanitizeCsvCell,
  computeBackupChecksum,
  validateAndSanitizeBackupJSON,
  calculateSecurityHealthScore,
  uint8ArrayToBase64Url,
  base64UrlToUint8Array,
  detectMobilePlatform,
  shouldRequireBiometricAfterPin,
  buildWebAuthnRegistrationOptions,
  buildWebAuthnAssertionOptions,
  BiometricConfig,
} from './securityUtils';

test('hashPinSync produces deterministic 72-char salted hash and verifyPin validates both hashed and legacy PINs', () => {
  const hash1 = hashPinSync('1234', 'user_abc');
  const hash2 = hashPinSync('1234', 'user_abc');
  const diffUserHash = hashPinSync('1234', 'user_xyz');

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, diffUserHash);
  assert.equal(isHashedPin(hash1), true);
  assert.equal(isHashedPin('1234'), false);

  assert.equal(verifyPin('1234', hash1, 'user_abc'), true);
  assert.equal(verifyPin('9999', hash1, 'user_abc'), false);
  assert.equal(verifyPin('1234', hash1, 'user_xyz'), false);

  // Legacy plaintext compatibility before automatic migration
  assert.equal(verifyPin('1234', '1234', 'user_abc'), true);
  assert.equal(verifyPin('0000', '1234', 'user_abc'), false);
});

test('evaluatePinAttempt enforces 5-attempt brute-force lockout and resets after cooldown', () => {
  const storedHash = hashPinSync('2580', 'u1');
  let state = { failedAttempts: 0, lockoutUntilMs: null as number | null };
  const t0 = 1_700_000_000_000;

  for (let i = 1; i <= 4; i++) {
    const res = evaluatePinAttempt('0000', storedHash, 'u1', state, t0 + i * 1000);
    assert.equal(res.success, false);
    assert.equal(res.isLockedOut, false);
    assert.equal(res.remainingAttempts, 5 - i);
    state = res.nextState;
  }

  // 5th failed attempt triggers 30s lockout
  const fifth = evaluatePinAttempt('0000', storedHash, 'u1', state, t0 + 5000);
  assert.equal(fifth.success, false);
  assert.equal(fifth.isLockedOut, true);
  assert.equal(fifth.remainingSeconds, 30);
  state = fifth.nextState;

  // Even a correct PIN during lockout is rejected
  const duringLockout = evaluatePinAttempt('2580', storedHash, 'u1', state, t0 + 15000);
  assert.equal(duringLockout.success, false);
  assert.equal(duringLockout.isLockedOut, true);

  // After 30s cooldown expires, correct PIN succeeds and resets state
  const afterCooldown = evaluatePinAttempt('2580', storedHash, 'u1', state, t0 + 36000);
  assert.equal(afterCooldown.success, true);
  assert.equal(afterCooldown.isLockedOut, false);
  assert.equal(afterCooldown.nextState.failedAttempts, 0);
});

test('sanitizeCsvCell neutralizes formula injection characters (=, +, -, @)', () => {
  assert.equal(sanitizeCsvCell('=CMD|\' /C calc\'!A0'), '"\'=CMD|\' /C calc\'!A0"');
  assert.equal(sanitizeCsvCell('+SUM(A1:A10)'), '"\'+SUM(A1:A10)"');
  assert.equal(sanitizeCsvCell('@IMPORTXML()'), '"\'@IMPORTXML()"');
  assert.equal(sanitizeCsvCell('Makan "Siang" Normal'), '"Makan ""Siang"" Normal"');
});

test('validateAndSanitizeBackupJSON verifies checksums and rejects tampered or malformed payloads', () => {
  const rawPayload = {
    version: '1.2',
    wallets: [
      { id: 'w_1', name: 'BCA Utama', type: 'bank', balance: 5000000, currency: 'IDR', color: '#3B82F6' },
    ],
    transactions: [
      { id: 'tx_1', date: '2026-11-09', amount: 150000, currency: 'IDR', type: 'expense', sourceWalletId: 'w_1', description: 'Makan Siang' },
    ],
    recurringTransactions: [],
    goals: [],
    debts: [],
  };

  const checksum = computeBackupChecksum(rawPayload);
  const signedBackup = JSON.stringify({ ...rawPayload, integrityChecksum: checksum });

  const validResult = validateAndSanitizeBackupJSON(signedBackup);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.checksumVerified, true);
  assert.equal(validResult.data?.wallets.length, 1);
  assert.equal(validResult.data?.transactions.length, 1);

  // Tamper with wallet balance without updating checksum
  const tamperedPayload = {
    ...rawPayload,
    wallets: [{ ...rawPayload.wallets[0], balance: 999999999 }],
    integrityChecksum: checksum,
  };
  const tamperedResult = validateAndSanitizeBackupJSON(JSON.stringify(tamperedPayload));
  assert.equal(tamperedResult.valid, false);
  assert.ok(tamperedResult.error?.includes('Checksum'));
});

test('calculateSecurityHealthScore computes 0-100 score including WebAuthn Biometric 2FA layer', () => {
  const full = calculateSecurityHealthScore({
    isAuthenticated: true,
    isEmailVerified: true,
    hasPinEnabled: true,
    hasBiometricEnabled: true,
    autoLockMinutes: 5,
    lockOnTabHidden: true,
  });
  assert.equal(full.score, 100);
  assert.equal(full.level, 'strong');

  const pinOnlyWithTimers = calculateSecurityHealthScore({
    isAuthenticated: true,
    isEmailVerified: true,
    hasPinEnabled: true,
    hasBiometricEnabled: false,
    autoLockMinutes: 5,
    lockOnTabHidden: true,
  });
  assert.equal(pinOnlyWithTimers.score, 80);
  assert.equal(pinOnlyWithTimers.level, 'strong');

  const basic = calculateSecurityHealthScore({
    isAuthenticated: true,
    isEmailVerified: true,
    hasPinEnabled: false,
    hasBiometricEnabled: false,
    autoLockMinutes: 0,
    lockOnTabHidden: false,
  });
  assert.equal(basic.score, 25);
  assert.equal(basic.level, 'basic');
});

test('WebAuthn Base64URL encoding, mobile platform detection, and 2-step PIN+Biometric enforcement work accurately', () => {
  const sampleBytes = new Uint8Array([1, 2, 3, 250, 251, 252, 253, 254, 255]);
  const encoded = uint8ArrayToBase64Url(sampleBytes);
  assert.ok(!encoded.includes('+'));
  assert.ok(!encoded.includes('/'));
  assert.ok(!encoded.includes('='));
  const decoded = base64UrlToUint8Array(encoded);
  assert.deepEqual(Array.from(decoded), Array.from(sampleBytes));

  // Mobile detection for iOS (FaceID/TouchID) and Android (Fingerprint/Face Unlock)
  const ios = detectMobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5, 390);
  assert.equal(ios.isMobile, true);
  assert.equal(ios.os, 'ios');
  assert.ok(ios.biometricLabelId.includes('FaceID'));

  const android = detectMobilePlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5, 412);
  assert.equal(android.isMobile, true);
  assert.equal(android.os, 'android');
  assert.ok(android.biometricLabelId.includes('Sidik Jari'));

  const desktop = detectMobilePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0, 1440);
  assert.equal(desktop.isMobile, false);

  // 2-Step PIN + Biometric requirement check
  const mobileBioConfig: BiometricConfig = {
    enabled: true,
    credentialId: encoded,
    registeredAt: '2026-11-09T10:00:00Z',
    deviceType: 'mobile',
    mobileOnly: true,
    authenticatorLabel: 'FaceID / TouchID (iOS)',
  };

  assert.equal(shouldRequireBiometricAfterPin(true, mobileBioConfig, true), true);
  assert.equal(shouldRequireBiometricAfterPin(true, mobileBioConfig, false), false);
  assert.equal(shouldRequireBiometricAfterPin(false, mobileBioConfig, true), false);

  // Verify WebAuthn options structure
  const regOpts = buildWebAuthnRegistrationOptions({
    userId: 'uid_123',
    userEmail: 'sm.bagja@gmail.com',
    displayName: 'Bagja',
    challengeBytes: new Uint8Array(32),
  });
  assert.equal(regOpts.authenticatorSelection?.authenticatorAttachment, 'platform');
  assert.equal(regOpts.authenticatorSelection?.userVerification, 'required');

  const assertOpts = buildWebAuthnAssertionOptions({
    credentialId: encoded,
    challengeBytes: new Uint8Array(32),
  });
  assert.equal(assertOpts.userVerification, 'required');
  assert.equal(assertOpts.allowCredentials?.length, 1);
});

