import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    auth: {
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args) => mockSignInWithOAuth(...args),
      signUp: (...args) => mockSignUp(...args),
      signOut: (...args) => mockSignOut(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
    },
  },
}));

import {
  signInWithEmail,
  signInWithGoogle,
  signInWithKakao,
  signUp,
  signOut,
  resetPassword,
  getProfile,
  updateProfile,
} from '../auth';

beforeEach(() => {
  vi.clearAllMocks();
  // Set up window.location for getBaseUrl / getRedirectUrl
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://ahp-app.dreamitbiz.com', hostname: 'ahp-app.dreamitbiz.com' },
    writable: true,
    configurable: true,
  });
});

// ─── signInWithEmail ──────────────────────────────────────────────

describe('signInWithEmail', () => {
  it('returns data on successful login', async () => {
    const fakeData = { user: { id: 'u1' }, session: { access_token: 'tok' } };
    mockSignInWithPassword.mockResolvedValue({ data: fakeData, error: null });

    const result = await signInWithEmail('user@test.com', 'password123');
    expect(result).toEqual(fakeData);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    });
  });

  it('throws error on invalid credentials', async () => {
    const authError = new Error('Invalid login credentials');
    mockSignInWithPassword.mockResolvedValue({ data: null, error: authError });

    await expect(signInWithEmail('bad@test.com', 'wrong')).rejects.toThrow('Invalid login credentials');
  });

  it('passes email and password correctly to supabase', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });

    await signInWithEmail('a@b.com', 'pw');
    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    expect(mockSignInWithPassword.mock.calls[0][0]).toMatchObject({
      email: 'a@b.com',
      password: 'pw',
    });
  });
});

// ─── signInWithGoogle ─────────────────────────────────────────────

describe('signInWithGoogle', () => {
  it('returns data on successful Google OAuth', async () => {
    const fakeData = { provider: 'google', url: 'https://accounts.google.com/...' };
    mockSignInWithOAuth.mockResolvedValue({ data: fakeData, error: null });

    const result = await signInWithGoogle();
    expect(result).toEqual(fakeData);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://ahp-app.dreamitbiz.com' },
    });
  });

  it('throws error when Google OAuth fails', async () => {
    const oauthError = new Error('OAuth error');
    mockSignInWithOAuth.mockResolvedValue({ data: null, error: oauthError });

    await expect(signInWithGoogle()).rejects.toThrow('OAuth error');
  });

  it('uses window.location.origin as redirectTo', async () => {
    window.location.origin = 'http://localhost:5173';
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

    await signInWithGoogle();
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { redirectTo: 'http://localhost:5173' },
      })
    );
  });
});

// ─── signInWithKakao ──────────────────────────────────────────────

describe('signInWithKakao', () => {
  it('returns data on successful Kakao OAuth', async () => {
    const fakeData = { provider: 'kakao', url: 'https://kauth.kakao.com/...' };
    mockSignInWithOAuth.mockResolvedValue({ data: fakeData, error: null });

    const result = await signInWithKakao();
    expect(result).toEqual(fakeData);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: { redirectTo: 'https://ahp-app.dreamitbiz.com' },
    });
  });

  it('throws error when Kakao OAuth fails', async () => {
    const oauthError = new Error('Kakao OAuth failed');
    mockSignInWithOAuth.mockResolvedValue({ data: null, error: oauthError });

    await expect(signInWithKakao()).rejects.toThrow('Kakao OAuth failed');
  });
});

// ─── signUp ───────────────────────────────────────────────────────

describe('signUp', () => {
  it('returns data on successful sign-up', async () => {
    const fakeData = { user: { id: 'new-user' }, session: null };
    mockSignUp.mockResolvedValue({ data: fakeData, error: null });
    // signUp 이후 user_profiles.upsert 호출됨
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await signUp('new@test.com', 'Pass1234', 'Test User');
    expect(result).toEqual(fakeData);
  });

  it('passes full_name and signup_domain in options.data', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null });

    await signUp('new@test.com', 'Pass1234', 'Test User');
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'Pass1234',
      options: {
        data: { full_name: 'Test User', signup_domain: 'ahp-app.dreamitbiz.com' },
        emailRedirectTo: 'https://ahp-app.dreamitbiz.com/#/login',
      },
    });
  });

  it('throws error when sign-up fails', async () => {
    const signupError = new Error('User already registered');
    mockSignUp.mockResolvedValue({ data: null, error: signupError });

    await expect(signUp('dup@test.com', 'Pass1234', 'Dup')).rejects.toThrow('User already registered');
  });
});

// ─── signOut ──────────────────────────────────────────────────────

describe('signOut', () => {
  it('resolves without error on successful sign-out', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await expect(signOut()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('throws error when sign-out fails', async () => {
    const logoutError = new Error('Session not found');
    mockSignOut.mockResolvedValue({ error: logoutError });

    await expect(signOut()).rejects.toThrow('Session not found');
  });
});

// ─── resetPassword ────────────────────────────────────────────────

describe('resetPassword', () => {
  it('returns data on successful reset email', async () => {
    const fakeData = {};
    mockResetPasswordForEmail.mockResolvedValue({ data: fakeData, error: null });

    const result = await resetPassword('user@test.com');
    expect(result).toEqual(fakeData);
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com', {
      redirectTo: 'https://ahp-app.dreamitbiz.com/#/login',
    });
  });

  it('throws error when reset fails', async () => {
    const resetError = new Error('Rate limit exceeded');
    mockResetPasswordForEmail.mockResolvedValue({ data: null, error: resetError });

    await expect(resetPassword('user@test.com')).rejects.toThrow('Rate limit exceeded');
  });
});

// ─── getProfile ───────────────────────────────────────────────────

describe('getProfile', () => {
  it('returns profile data on success', async () => {
    const profile = { id: 'u1', full_name: 'Test User', email: 'test@test.com' };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: profile, error: null }),
        }),
      }),
    });

    const result = await getProfile('u1');
    expect(result).toEqual(profile);
    expect(mockFrom).toHaveBeenCalledWith('ahp_user_profiles');
  });

  it('returns null when profile not found (PGRST116)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        }),
      }),
    });

    const result = await getProfile('nonexistent');
    expect(result).toBeNull();
  });

  it('throws error for non-PGRST116 errors', async () => {
    const dbError = { code: '42501', message: 'Permission denied' };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        }),
      }),
    });

    await expect(getProfile('u1')).rejects.toEqual(dbError);
  });
});

// ─── updateProfile ────────────────────────────────────────────────

describe('updateProfile', () => {
  it('returns updated profile data on success', async () => {
    const updatedProfile = { id: 'u1', full_name: 'Updated Name' };
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
          }),
        }),
      }),
    });

    const result = await updateProfile('u1', { full_name: 'Updated Name' });
    expect(result).toEqual(updatedProfile);
    expect(mockFrom).toHaveBeenCalledWith('ahp_user_profiles');
  });

  it('throws error when update fails', async () => {
    const updateError = new Error('Update failed');
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: updateError }),
          }),
        }),
      }),
    });

    await expect(updateProfile('u1', { full_name: 'X' })).rejects.toThrow('Update failed');
  });
});

// ─── getBaseUrl / getRedirectUrl (tested through exported functions) ─────────

describe('URL construction (via signUp and resetPassword)', () => {
  it('getRedirectUrl with hash produces origin/#hash', async () => {
    window.location.origin = 'https://example.com';
    mockSignUp.mockResolvedValue({ data: {}, error: null });

    await signUp('a@b.com', 'pw123456', 'Name');
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: 'https://example.com/#/login',
        }),
      })
    );
  });

  it('getBaseUrl uses origin without trailing slash', async () => {
    window.location.origin = 'http://localhost:5173';
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

    await signInWithGoogle();
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { redirectTo: 'http://localhost:5173' },
      })
    );
  });
});
