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
        <button className="modal-close-button" type="button" aria-label="Close participation modal" onClick={onClose}>
          X
        </button>

        <h2 id="participation-title">Enter the Arena</h2>
        <p className="participation-credit-line">Available demo credits: {credits}</p>

        <div className="participation-wallet-box">
          <span>Linked Wallet</span>
          <strong>{walletAddress}</strong>
        </div>

        <div className="participation-cost-box">
          <span>Entry Fee</span>
          <strong>{PARTICIPATION_COST} demo credits</strong>
        </div>

        {needsOption && (
          <div className="participation-option-list" aria-label="Pick a side">
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

        {!hasEnoughCredits && <p className="participation-error">Not enough pretend money.</p>}
        {hasEnoughCredits && needsOption && !selectedOption && (
          <p className="participation-error">Pick a side before the drama can continue.</p>
        )}

        <p className="participation-helper">
          Entering spends {PARTICIPATION_COST} demo credits. Rewards only exist inside this mock-powered circus.
        </p>

        {isParticipated ? (
          <button className="participation-done-button" type="button" onClick={onClose}>
            You're In
          </button>
        ) : (
          <div className="participation-actions">
            <button className="participation-cancel-button" type="button" onClick={onClose}>
              Cancel
            </button>
            {hasEnoughCredits ? (
              <button
                className="participation-confirm-button"
                type="button"
                onClick={onParticipate}
              >
                Enter
              </button>
            ) : (
              <button
                className="participation-confirm-button"
                type="button"
                onClick={() => setIsChargePanelOpen(true)}
              >
                Refill Demo Credits
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
  message = 'Pick a side before the drama can continue.',
  onClose,
}: SelectionRequiredModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay participation-overlay" role="presentation">
      <section className="selection-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="selection-warning-title">
        <button className="modal-close-button" type="button" aria-label="Close notice" onClick={onClose}>
          X
        </button>
        <h2 id="selection-warning-title">{message}</h2>
        <button className="selection-warning-confirm" type="button" onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  );
}
