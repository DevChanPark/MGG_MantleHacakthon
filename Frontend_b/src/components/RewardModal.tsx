import { isCurrentUserWinner, type FeedBattle, type MockBattleResult } from '../mocks/battles';

interface WinnerModalProps {
  battle: FeedBattle | null;
  result: MockBattleResult | null;
  currentUserId: string;
  currentUserNickname: string;
  isRewarded: boolean;
  onClose: () => void;
  onClaimReward: () => void;
}

export function WinnerModal({
  battle,
  result,
  currentUserId,
  currentUserNickname,
  isRewarded,
  onClose,
  onClaimReward,
}: WinnerModalProps) {
  if (!battle || !result) {
    return null;
  }

  const isWinner = isCurrentUserWinner(result, currentUserId);
  const title = isWinner ? 'You have been crowned champion.' : `Champion: ${result.winnerName}`;

  return (
    <div className="modal-overlay result-overlay" role="presentation">
      <section className="winner-modal" role="dialog" aria-modal="true" aria-labelledby="winner-modal-title">
        <button className="modal-close-button" type="button" aria-label="Close champion modal" onClick={onClose}>
          X
        </button>

        <h2 id="winner-modal-title">{title}</h2>

        {isWinner ? (
          <>
            <div className="winner-summary-box">
              <div>
                <span>Player</span>
                <strong>{result.winnerName || currentUserNickname}</strong>
              </div>
              <div>
                <span>Credits to Grab</span>
                <strong>{result.rewardCredits}</strong>
              </div>
            </div>

            <p className="winner-detail">
              {isRewarded ? 'Already claimed. The vault is dramatic, not infinite.' : result.winnerDetail}
            </p>

            <button className="winner-claim-button" type="button" onClick={onClaimReward} disabled={isRewarded}>
              {isRewarded ? 'Claimed' : 'Grab Credits'}
            </button>
          </>
        ) : (
          <>
            <div className="winner-verdict-box">
              <p className="winner-detail">{result.aiSummary}</p>
              <p className="winner-detail">{result.winnerDetail}</p>
              <ul>
                {result.verdictLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <button className="winner-claim-button" type="button" onClick={onClose}>
              Got it
            </button>
          </>
        )}
      </section>
    </div>
  );
}

interface RewardCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RewardCompleteModal({ isOpen, onClose }: RewardCompleteModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay result-overlay" role="presentation">
      <section className="reward-complete-modal" role="dialog" aria-modal="true" aria-labelledby="reward-complete-title">
        <button className="modal-close-button" type="button" aria-label="Close credit reward" onClick={onClose}>
          X
        </button>
        <h2 id="reward-complete-title">Credits landed!</h2>
        <button className="reward-complete-confirm" type="button" onClick={onClose}>
          Nice
        </button>
      </section>
    </div>
  );
}
