import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('extracts the refresh token from a full cookie header', () => {
    const service = new AuthService({
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    } as any);

    const cookieHeader =
      'session=abc123; refreshToken=jwt.refresh.token; theme=dark';

    expect(service.extractTokenFromCookie(cookieHeader)).toBe(
      'jwt.refresh.token',
    );
  });
});
