import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

const makeService = () =>
  new AuthService({
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
  } as any);

describe('AuthService', () => {
  it('extracts the refresh token from a full cookie header', () => {
    const service = makeService();

    const cookieHeader =
      'session=abc123; refreshToken=jwt.refresh.token; theme=dark';

    expect(service.extractTokenFromCookie(cookieHeader)).toBe(
      'jwt.refresh.token',
    );
  });

  describe('verifyResetToken', () => {
    it('rejects when no reset token is stored', async () => {
      const service = makeService();
      const ok = await service.verifyResetToken('whatever', {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });
      expect(ok).toBe(false);
    });

    it('rejects an expired reset token without hashing', async () => {
      const service = makeService();
      const compareSpy = vi.spyOn(service, 'compare');
      const ok = await service.verifyResetToken('raw-token', {
        resetPasswordToken: 'some-hash',
        resetPasswordExpires: new Date(Date.now() - 1000),
      });
      expect(ok).toBe(false);
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it('accepts a fresh token that matches the stored argon2 hash', async () => {
      const service = makeService();
      const rawToken = 'a'.repeat(64);
      const hash = await service.hash(rawToken);

      const ok = await service.verifyResetToken(rawToken, {
        resetPasswordToken: hash,
        resetPasswordExpires: new Date(Date.now() + 60_000),
      });
      expect(ok).toBe(true);

      const bad = await service.verifyResetToken('wrong-token', {
        resetPasswordToken: hash,
        resetPasswordExpires: new Date(Date.now() + 60_000),
      });
      expect(bad).toBe(false);
    });
  });
});
