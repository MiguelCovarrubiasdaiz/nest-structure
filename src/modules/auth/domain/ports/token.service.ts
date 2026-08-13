export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenPayload {
  sub: string;
  email: string;
}

/** Refresh tokens additionally carry a unique id (`jti`) and a family id, used
 * for server-side rotation and reuse detection. */
export interface RefreshTokenPayload extends TokenPayload {
  jti: string;
  family: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenService {
  /** TTL of freshly signed access tokens, in seconds. */
  readonly accessTtlSeconds: number;
  /** TTL of freshly signed refresh tokens, in seconds. */
  readonly refreshTtlSeconds: number;

  signAccessToken(payload: TokenPayload): Promise<string>;
  signRefreshToken(payload: RefreshTokenPayload): Promise<string>;
  verifyAccess(token: string): Promise<TokenPayload>;
  verifyRefresh(token: string): Promise<RefreshTokenPayload>;
}
