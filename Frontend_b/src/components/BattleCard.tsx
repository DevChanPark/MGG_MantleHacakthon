import React from 'react';

type BattleType = 'OPTION' | 'TEXT_OPEN' | 'IMAGE_CAPTION';
type BattleStatus = 'OPEN' | 'CLOSED' | 'JUDGING' | 'SETTLED' | 'FAILED';

interface BattleCardProps {
  id: string;
  type: BattleType;
  title: string;
  entryCount: number;
  status: BattleStatus;
  imageUrl?: string;
}

export function BattleCard({
  id,
  type,
  title,
  entryCount,
  status,
  imageUrl,
}: BattleCardProps) {
  const getCta = (): string => {
    switch (status) {
      case 'OPEN':
        return 'Join';
      case 'JUDGING':
        return 'Judging';
      case 'SETTLED':
        return 'View Result';
      case 'CLOSED':
        return 'Closed';
      case 'FAILED':
        return 'Failed';
    }
  };

  const getTypeLabel = (): string => {
    switch (type) {
      case 'OPTION':
        return 'OPTION';
      case 'TEXT_OPEN':
        return 'ABSURD';
      case 'IMAGE_CAPTION':
        return 'IMAGE';
    }
  };

  const handleClick = () => {
    if (status === 'SETTLED') {
      window.location.hash = `battles/${id}/result`;
    } else {
      window.location.hash = `battles/${id}`;
    }
  };

  return (
    <div className="battle-card">
      {imageUrl && (
        <div className="battle-card-image">
          <img src={imageUrl} alt={title} />
        </div>
      )}

      {!imageUrl && (
        <div className="battle-card-type-badge">
          <span>{getTypeLabel()}</span>
        </div>
      )}

      <div className="battle-card-content">
        <h3 className="battle-card-title">{title}</h3>

        <div className="battle-card-meta">
          <span className="battle-card-entries">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            {entryCount}
          </span>
        </div>
      </div>

      <button className="battle-card-cta" onClick={handleClick}>
        {getCta()}
      </button>
    </div>
  );
}

export default BattleCard;
