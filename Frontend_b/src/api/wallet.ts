import { createWalletChallenge, verifyWallet } from './client';

type EthereumRequest = {
  method: string;
  params?: unknown[];
};

type EthereumProvider = {
  request: (request: EthereumRequest) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export async function connectWalletWithSignature(walletProvider: string) {
  const provider = getEthereumProvider();
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const walletAddress = getFirstAccount(accounts);
  const challenge = await createWalletChallenge(walletAddress, walletProvider);
  const signature = await provider.request({
    method: 'personal_sign',
    params: [challenge.challenge.message, walletAddress],
  });

  if (typeof signature !== 'string') {
    throw new Error('지갑 서명 응답을 확인할 수 없습니다.');
  }

  return verifyWallet({
    challengeId: challenge.challenge.id,
    walletAddress,
    walletProvider,
    signature,
  });
}

export async function sendNativeMntTransfer(input: { to: string; valueWei: string; chainId: number }) {
  const provider = getEthereumProvider();
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const from = getFirstAccount(accounts);

  await switchChainIfPossible(provider, input.chainId);

  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: input.to,
        value: toHexWei(input.valueWei),
      },
    ],
  });

  if (typeof txHash !== 'string') {
    throw new Error('트랜잭션 해시를 확인할 수 없습니다.');
  }

  return txHash;
}

function getEthereumProvider() {
  if (!window.ethereum) {
    throw new Error('EVM 지갑을 찾을 수 없습니다. MetaMask 또는 호환 지갑을 설치해주세요.');
  }

  return window.ethereum;
}

function getFirstAccount(accounts: unknown) {
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
    throw new Error('지갑 계정을 가져오지 못했습니다.');
  }

  return accounts[0];
}

async function switchChainIfPossible(provider: EthereumProvider, chainId: number) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: numberToHex(chainId) }],
    });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? Number(error.code) : null;
    if (code === 4001) {
      throw new Error('네트워크 전환이 취소되었습니다.');
    }
    if (code !== 4902) {
      throw error;
    }
    throw new Error('Mantle 테스트넷을 지갑에 먼저 추가해주세요.');
  }
}

function toHexWei(valueWei: string) {
  return numberToHex(BigInt(valueWei));
}

function numberToHex(value: number | bigint) {
  return `0x${BigInt(value).toString(16)}`;
}
