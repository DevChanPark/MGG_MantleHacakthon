import type { FeedBattle, MockBattleResult } from '../mocks/battles';

interface WinnerModalProps {
  battle: FeedBattle | null;
  result: MockBattleResult | null;
  isRewarded: boolean;
  onClose: () => void;
  onClaimReward: () => void;
}

export function WinnerModal({ battle, result, isRewarded, onClose, onClaimReward }: WinnerModalProps) {
  if (!battle || !result) {
    return null;
  }

  return (
    <div className="modal-overlay result-overlay" role="presentation">
      <section className="winner-modal" role="dialog" aria-modal="true" aria-labelledby="winner-modal-title">
        <button className="modal-close-button" type="button" aria-label="우승자 선정 모달 닫기" onClick={onClose}>
          ×
        </button>

        <h2 id="winner-modal-title">우승자로 선정되었습니다!</h2>

        <div className="winner-summary-box">
          <div>
            <span>참여자</span>
            <strong>{result.winnerName}</strong>
          </div>
          <div>
            <span>지급 받을 크레딧</span>
            <strong>{result.rewardCredits}개</strong>
          </div>
        </div>

        <p className="winner-detail">{result.winnerDetail}</p>

        <button className="winner-claim-button" type="button" onClick={onClaimReward} disabled={isRewarded}>
          {isRewarded ? '지급 완료' : '크레딧 받기'}
        </button>
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
        <button className="modal-close-button" type="button" aria-label="크레딧 지급 완료 닫기" onClick={onClose}>
          ×
        </button>
        <h2 id="reward-complete-title">크레딧이 지급되었습니다!</h2>
        <button className="reward-complete-confirm" type="button" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}
