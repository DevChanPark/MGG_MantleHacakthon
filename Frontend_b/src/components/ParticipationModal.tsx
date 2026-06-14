import { useState } from 'react';
import type { FeedBattle } from '../mocks/battles';
import {
  CreditChargePanel,
  CreditPurchaseCompleteModal,
  creditPackages,
  type CreditPackage,
} from '../screens/ProfileScreen';

export const PARTICIPATION_COST = 3;

interface ParticipationModalProps {
  battle: FeedBattle | null;
  credits: number;
  walletAddress: string;
  isParticipated: boolean;
  selectedOption?: string;
  onClose: () => void;
  onOptionSelect?: (option: string) => void;
  onParticipate: () => void;
  onAddCredits: (amount: number) => void;
}

export function ParticipationModal({
  battle,
  credits,
  walletAddress,
  isParticipated,
  selectedOption,
  onClose,
  onOptionSelect,
  onParticipate,
  onAddCredits,
}: ParticipationModalProps) {
  const [isChargePanelOpen, setIsChargePanelOpen] = useState(false);
  const [isCreditInfoOpen, setIsCreditInfoOpen] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<CreditPackage | null>(null);
  const [completedCreditTotal, setCompletedCreditTotal] = useState<number | null>(null);

  if (!battle) {
    return null;
  }

  const hasEnoughCredits = credits >= PARTICIPATION_COST;
  const needsOption = battle.type === 'OPTION' && Boolean(battle.options?.length);
  const closeChargePanel = () => {
    setIsChargePanelOpen(false);
    setIsCreditInfoOpen(false);
    setSelectedCreditPackage(null);
  };
  const handleApproveCreditPurchase = (creditPackage: CreditPackage) => {
    onAddCredits(creditPackage.credits);
    closeChargePanel();
    setCompletedCreditTotal(credits + creditPackage.credits);
  };

  if (isChargePanelOpen || completedCreditTotal !== null) {
    return (
      <div className="modal-overlay participation-overlay credit-charge-modal-overlay" role="presentation">
        <CreditChargePanel
          isOpen={isChargePanelOpen}
          isInfoOpen={isCreditInfoOpen}
          currentCredits={credits}
          walletAddress={walletAddress}
          packages={creditPackages}
          selectedPackage={selectedCreditPackage}
          onClose={closeChargePanel}
          onToggleInfo={() => setIsCreditInfoOpen((isOpen) => !isOpen)}
          onCloseInfo={() => setIsCreditInfoOpen(false)}
          onSelectPackage={setSelectedCreditPackage}
          onClosePayment={() => setSelectedCreditPackage(null)}
          onApprovePayment={handleApproveCreditPurchase}
        />
        <CreditPurchaseCompleteModal
          creditTotal={completedCreditTotal}
          onClose={() => setCompletedCreditTotal(null)}
        />
      </div>
    );
  }

  return (
    <div className="modal-overlay participation-overlay" role="presentation">
      <section className="participation-modal" role="dialog" aria-modal="true" aria-labelledby="participation-title">
        <button className="modal-close-button" type="button" aria-label="참여 모달 닫기" onClick={onClose}>
          ×
        </button>

        <h2 id="participation-title">참여하기</h2>
        <p className="participation-credit-line">사용 가능 크레딧: {credits}개</p>

        <div className="participation-wallet-box">
          <span>연동 지갑</span>
          <strong>{walletAddress}</strong>
        </div>

        <div className="participation-cost-box">
          <span>참여 비용</span>
          <strong>크레딧 {PARTICIPATION_COST}개</strong>
        </div>

        {needsOption && (
          <div className="participation-option-list" aria-label="참여 진영 선택">
            {(battle.options ?? []).map((option) => (
              <button
                className={`participation-option-button${selectedOption === option ? ' is-selected' : ''}`}
                type="button"
                key={`${battle.id}-participation-${option}`}
                aria-pressed={selectedOption === option}
                onClick={() => onOptionSelect?.(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {!hasEnoughCredits && <p className="participation-error">크레딧이 부족합니다.</p>}
        {hasEnoughCredits && needsOption && !selectedOption && (
          <p className="participation-error">진영을 먼저 선택해주세요.</p>
        )}

        <p className="participation-helper">
          참여 시 크레딧 {PARTICIPATION_COST}개가 차감됩니다. 보상 지급은 mock 결과 흐름에서만 처리됩니다.
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
              <button
                className="participation-confirm-button"
                type="button"
                onClick={onParticipate}
              >
                참여하기
              </button>
            ) : (
              <button
                className="participation-confirm-button"
                type="button"
                onClick={() => setIsChargePanelOpen(true)}
              >
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
  message?: string;
  onClose: () => void;
}

export function SelectionRequiredModal({
  isOpen,
  message = '진영을 먼저 선택해주세요.',
  onClose,
}: SelectionRequiredModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay participation-overlay" role="presentation">
      <section className="selection-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="selection-warning-title">
        <button className="modal-close-button" type="button" aria-label="안내 닫기" onClick={onClose}>
          ×
        </button>
        <h2 id="selection-warning-title">{message}</h2>
        <button className="selection-warning-confirm" type="button" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}
