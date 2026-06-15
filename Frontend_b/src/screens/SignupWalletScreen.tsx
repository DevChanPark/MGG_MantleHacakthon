import metamaskLogo from '../../assets/image13.png';
import mggLogo from '../../assets/brand/mgg-logo.png';
import okxLogo from '../../assets/image14.png';
import walletConnectLogo from '../../assets/image15.png';

const walletOptions = [
  {
    iconSrc: metamaskLogo,
    iconClassName: 'metamask-logo',
    label: 'Connect MetaMask',
    provider: 'MetaMask',
  },
  {
    iconSrc: okxLogo,
    iconClassName: 'okx-logo',
    label: 'Connect OKX Wallet',
    provider: 'OKX Wallet',
  },
  {
    iconSrc: walletConnectLogo,
    iconClassName: 'walletconnect-logo',
    label: 'Connect another wallet with WalletConnect',
    provider: 'WalletConnect',
  },
];

type SignupWalletScreenProps = {
  isConnecting?: boolean;
  walletError?: string;
  onWalletConnect?: (walletProvider: string) => Promise<void>;
};

export function SignupWalletScreen({ isConnecting = false, walletError = '', onWalletConnect }: SignupWalletScreenProps) {
  const connectWallet = async (walletProvider: string) => {
    if (!onWalletConnect) {
      window.location.hash = 'signup-profile';
      return;
    }

    await onWalletConnect(walletProvider);
    window.location.hash = 'signup-profile';
  };

  return (
    <main className="signup-feed" aria-label="MGG signup wallet connection">
      <section className="signup-frame">
        <div className="signup-green-area" aria-hidden="true" />
        <div className="signup-white-curve" aria-hidden="true" />
        <div className="signup-white-panel" aria-hidden="true" />

        <img className="app-logo-small" src={mggLogo} alt="MGG" />
        <h1 className="signup-title">Sign Up</h1>
        <div className="signup-profile-circle" aria-hidden="true" />

        <div className="signup-wallet-section">
          <p className="signup-wallet-label">
            Wallet Connection <span aria-hidden="true">*</span>
          </p>

          <div className="signup-wallet-options">
            {walletOptions.map((option) => (
              <button
                className="signup-wallet-button"
                type="button"
                key={option.label}
                disabled={isConnecting}
                onClick={() => {
                  void connectWallet(option.provider).catch(() => undefined);
                }}
              >
                <img
                  className={`wallet-icon ${option.iconClassName}`}
                  src={option.iconSrc}
                  alt=""
                  aria-hidden="true"
                />
                <span>{isConnecting ? '지갑 연결 중' : option.label}</span>
              </button>
            ))}
          </div>
          {walletError ? <p className="signup-wallet-error">{walletError}</p> : null}
        </div>
      </section>
    </main>
  );
}
