import React, { useState } from 'react';
import { BattleCard } from '../components/BattleCard';

type BattleType = 'OPTION' | 'TEXT_OPEN' | 'IMAGE_CAPTION';
type BattleStatus = 'OPEN' | 'CLOSED' | 'JUDGING' | 'SETTLED' | 'FAILED';

interface Battle {
  id: string;
  type: BattleType;
  title: string;
  entryCount: number;
  status: BattleStatus;
  imageUrl?: string;
}

const MOCK_BATTLES: Battle[] = [
  {
    id: 'b1',
    type: 'OPTION',
    title: '어떤 영화가 더 좋아?',
    entryCount: 12,
    status: 'OPEN',
  },
  {
    id: 'b2',
    type: 'TEXT_OPEN',
    title: '가장 재미있는 밈은?',
    entryCount: 5,
    status: 'JUDGING',
  },
  {
    id: 'b3',
    type: 'IMAGE_CAPTION',
    title: '이 사진의 최고의 캡션은?',
    entryCount: 20,
    status: 'SETTLED',
    imageUrl: 'https://via.placeholder.com/300x200?text=Meme',
  },
];

type FilterType = 'ALL' | 'OPTION' | 'ABSURD' | 'IMAGE' | 'COMPLETED';

export function HomeFeed() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const filteredBattles = MOCK_BATTLES.filter((battle) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'OPTION') return battle.type === 'OPTION';
    if (activeFilter === 'ABSURD') return battle.type === 'TEXT_OPEN';
    if (activeFilter === 'IMAGE') return battle.type === 'IMAGE_CAPTION';
    if (activeFilter === 'COMPLETED') return battle.status === 'SETTLED';
    return true;
  });

  return (
    <div className="home-feed">
      <div className="home-filters">
        <button
          className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          전체
        </button>
        <button
          className={`filter-btn ${activeFilter === 'OPTION' ? 'active' : ''}`}
          onClick={() => setActiveFilter('OPTION')}
        >
          선택지형
        </button>
        <button
          className={`filter-btn ${activeFilter === 'ABSURD' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ABSURD')}
        >
          황당형
        </button>
        <button
          className={`filter-btn ${activeFilter === 'IMAGE' ? 'active' : ''}`}
          onClick={() => setActiveFilter('IMAGE')}
        >
          이미지형
        </button>
        <button
          className={`filter-btn ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('COMPLETED')}
        >
          완료된 배틀
        </button>
      </div>

      <div className="home-battles">
        {filteredBattles.map((battle) => (
          <BattleCard
            key={battle.id}
            id={battle.id}
            type={battle.type}
            title={battle.title}
            entryCount={battle.entryCount}
            status={battle.status}
            imageUrl={battle.imageUrl}
          />
        ))}
      </div>
    </div>
  );
}

export default HomeFeed;
