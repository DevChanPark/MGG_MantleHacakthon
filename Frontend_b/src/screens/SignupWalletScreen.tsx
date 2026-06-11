import metamaskLogo from '../../assets/image13.png';
import mggLogo from '../../assets/brand/mgg-logo.png';
import okxLogo from '../../assets/image14.png';
import walletConnectLogo from '../../assets/image15.png';

const walletOptions = [
  {
    iconSrc: metamaskLogo,
    iconClassName: 'metamask-logo',
    label: 'MetaMask로 연결하기',
  },
  {
    iconSrc: okxLogo,
    iconClassName: 'okx-logo',
    label: 'OKX Wallet으로 연결하기',
  },
  {
    iconSrc: walletConnectLogo,
    iconClassName: 'walletconnect-logo',
    label: 'WalletConnect로 다른 지갑 연결하기',
  },
];

export function SignupWalletScreen() {
  const moveToProfileStep = () => {
    window.location.hash = 'signup-profile';
  };

  return (
    <main className="signup-feed" aria-label="MGG signup wallet connection">
      <section className="signup-frame">
        <div className="signup-green-area" aria-hidden="true" />
        <div className="signup-white-curve" aria-hidden="true" />
        <div className="signup-white-panel" aria-hidden="true" />

        <img className="app-logo-small" src={mggLogo} alt="MGG" />
        <h1 className="signup-title">회원가입</h1>
        <div className="signup-profile-circle" aria-hidden="true" />

        <div className="signup-wallet-section">
          <p className="signup-wallet-label">
            지갑 연결 <span aria-hidden="true">*</span>
          </p>

          <div className="signup-wallet-options">
            {walletOptions.map((option) => (
              <button
                className="signup-wallet-button"
                type="button"
                key={option.label}
                onClick={moveToProfileStep}
              >
                <img
                  className={`wallet-icon ${option.iconClassName}`}
                  src={option.iconSrc}
                  alt=""
                  aria-hidden="true"
                />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
