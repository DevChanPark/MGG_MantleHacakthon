import type { FeedBattle } from '../mocks/battles';

export const PARTICIPATION_COST = 3;

interface ParticipationModalProps {
  battle: FeedBattle | null;
  credits: number;
  isParticipated: boolean;
  onClose: () => void;
  onParticipate: () => void;
  onAddCredits: () => void;
}

export function ParticipationModal({
  battle,
  credits,
  isParticipated,
  onClose,
  onParticipate,
  onAddCredits,
}: ParticipationModalProps) {
  if (!battle) {
    return null;
  }

  const hasEnoughCredits = credits >= PARTICIPATION_COST;

  return (
    <div className="modal-overlay participation-overlay" role="presentation">
      <section className="participation-modal" role="dialog" aria-modal="true" aria-labelledby="participation-title">
        <button className="modal-close-button" type="button" aria-label="참여 모달 닫기" onClick={onClose}>
          ×
        </button>

        <h2 id="participation-title">참여하기</h2>
        <p className="participation-credit-line">사용 가능 크레딧: {credits}개</p>

        <div className="participation-cost-box">
          <span>참여하기</span>
          <strong>크레딧 {PARTICIPATION_COST}개</strong>
        </div>

        {!hasEnoughCredits && <p className="participation-error">크레딧이 부족합니다!</p>}

        <p className="participation-helper">
          참가비 크레딧 {PARTICIPATION_COST}개가 요구되며, 참가비는 우승 시 상금에 분배됩니다.
        </p>

        {isParticipated ? (
          <button className="participation-done-button" type="button" onClick={onClose}>
            참여 완료
          </button>
        ) : (
          <div className="participation-actions">
            <button className="participation-cancel-button" type="button" onClick={onClose}>
              취소
            </button>
            {hasEnoughCredits ? (
              <button className="participation-confirm-button" type="button" onClick={onParticipate}>
                참여하기
              </button>
            ) : (
              <button className="participation-confirm-button" type="button" onClick={onAddCredits}>
                충전하기
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

interface SelectionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SelectionRequiredModal({ isOpen, onClose }: SelectionRequiredModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay participation-overlay" role="presentation">
      <section className="selection-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="selection-warning-title">
        <button className="modal-close-button" type="button" aria-label="경고 닫기" onClick={onClose}>
          ×
        </button>
        <h2 id="selection-warning-title">진영을 먼저 선택해주세요.</h2>
        <button className="selection-warning-confirm" type="button" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}
