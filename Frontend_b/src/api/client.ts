const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const USER_ID_STORAGE_KEY = 'mgg:userId';

export type ApiUser = {
  id: string;
  displayName: string;
  nickname: string | null;
  intro: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  walletProvider: string | null;
  creditBalance: number;
};

export type CreditPackageDto = {
  credits: number;
  priceMnt: string;
  priceWei: string;
};

export type CreditPackagesResponse = {
  enabled: boolean;
  tokenSymbol: string;
  chainId: number;
  receiverAddress: string | null;
  packages: CreditPackageDto[];
};

export type WalletChallengeResponse = {
  challenge: {
    id: string;
    walletAddress: string;
    walletProvider: string | null;
    message: string;
    nonce: string;
    issuedAt: string;
    expiresAt: string;
  };
};

export type WalletVerifyResponse = {
  user: ApiUser;
  wallet: {
    walletAddress: string;
    walletProvider: string | null;
  };
};

export type CreditsResponse = {
  balance: number;
  transactions: Array<{
    id: string;
    amount: number;
    reason: string;
    balanceAfter: number;
    metadataJson?: unknown;
    createdAt: string;
  }>;
};

export type CreditQuoteResponse = {
  quote: {
    id: string;
    credits: number;
    priceMnt: string;
    priceWei: string;
    tokenSymbol: string;
    chainId: number;
    receiverAddress: string;
    receiverAddressNormalized: string;
    walletAddress: string | null;
    walletAddressNormalized: string | null;
    expiresAt: string;
  };
};

export type CreditExchangeResponse = {
  balance: number;
  transaction: {
    id: string;
    amount: number;
    reason: string;
    balanceAfter: number;
    metadata: {
      quoteId: string;
      chainId: number;
      txHash: string;
      txHashNormalized: string;
      from: string;
      fromNormalized: string;
      to: string;
      toNormalized: string;
      valueWei: string;
      confirmations: number | null;
    };
  };
};

export class ApiClientError extends Error {
  code: string;
  status: number;
  details: string[];

  constructor(message: string, code: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getClientUserId() {
  const savedUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (savedUserId) {
    return savedUserId;
  }

  const nextUserId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `web-${crypto.randomUUID()}`
      : `web-${Date.now()}`;
  window.localStorage.setItem(USER_ID_STORAGE_KEY, nextUserId);
  return nextUserId;
}

export function getSavedClientUserId() {
  return window.localStorage.getItem(USER_ID_STORAGE_KEY);
}

export function setClientUserId(userId: string) {
  window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
}

export function getMe() {
  return apiFetch<ApiUser>('/api/users/me');
}

export function getCredits() {
  return apiFetch<CreditsResponse>('/api/users/me/credits');
}

export function getCreditPackages() {
  return apiFetch<CreditPackagesResponse>('/api/credits/packages', {
    includeUserId: false,
  });
}

export function createWalletChallenge(walletAddress: string, walletProvider: string) {
  return apiFetch<WalletChallengeResponse>('/api/auth/wallet/challenge', {
    method: 'POST',
    body: {
      walletAddress,
      walletProvider,
    },
  });
}

export function verifyWallet(input: {
  challengeId: string;
  walletAddress: string;
  walletProvider: string;
  signature: string;
}) {
  return apiFetch<WalletVerifyResponse>('/api/auth/wallet/verify', {
    method: 'POST',
    body: input,
  });
}

export function createCreditQuote(credits: number) {
  return apiFetch<CreditQuoteResponse>('/api/credits/quote', {
    method: 'POST',
    body: { credits },
  });
}

export function exchangeCredits(input: { quoteId: string; txHash: string }) {
  return apiFetch<CreditExchangeResponse>('/api/credits/exchange', {
    method: 'POST',
    body: input,
  });
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; includeUserId?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.includeUserId !== false) {
    headers['x-user-id'] = getClientUserId();
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body?.error;
    throw new ApiClientError(
      error?.message || 'API request failed',
      error?.code || 'API_ERROR',
      response.status,
      Array.isArray(error?.details) ? error.details : [],
    );
  }

  return body as T;
}
