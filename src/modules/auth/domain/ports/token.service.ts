export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenService {
  signPair(payload: TokenPayload): Promise<TokenPair>;
  verifyAccess(token: string): Promise<TokenPayload>;
  verifyRefresh(token: string): Promise<TokenPayload>;
}
