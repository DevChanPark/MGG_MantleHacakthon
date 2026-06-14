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
  const title = isWinner ? '우승자로 선정되었습니다!' : `이번 우승자는 ${result.winnerName}입니다.`;

  return (
    <div className="modal-overlay result-overlay" role="presentation">
      <section className="winner-modal" role="dialog" aria-modal="true" aria-labelledby="winner-modal-title">
        <button className="modal-close-button" type="button" aria-label="우승자 확인 모달 닫기" onClick={onClose}>
          ×
        </button>

        <h2 id="winner-modal-title">{title}</h2>

        {isWinner ? (
          <>
            <div className="winner-summary-box">
              <div>
                <span>참여자</span>
                <strong>{result.winnerName || currentUserNickname}</strong>
              </div>
              <div>
                <span>지급 받을 크레딧</span>
                <strong>{result.rewardCredits}개</strong>
              </div>
            </div>

            <p className="winner-detail">
              {isRewarded ? '이미 지급 완료된 보상입니다.' : result.winnerDetail}
            </p>

            <button className="winner-claim-button" type="button" onClick={onClaimReward} disabled={isRewarded}>
              {isRewarded ? '지급 완료' : '크레딧 받기'}
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
              확인
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
