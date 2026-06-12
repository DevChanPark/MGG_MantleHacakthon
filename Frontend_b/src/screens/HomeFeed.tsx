import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleCard } from '../components/BattleCard';
import type { BattleType, FeedBattle } from '../mocks/battles';

type SortType = 'popular' | 'recommended' | 'latest';

const FILTERS: Array<{ label: string; value: BattleType }> = [
  { label: '오픈 답변형', value: 'TEXT_OPEN' },
  { label: '선택지형', value: 'OPTION' },
  { label: '이미지형', value: 'IMAGE_CAPTION' },
];

const SORT_OPTIONS: Array<{ label: string; value: SortType }> = [
  { label: '인기순', value: 'popular' },
  { label: 'MGG 추천순', value: 'recommended' },
  { label: '최신순', value: 'latest' },
];

interface HomeFeedProps {
  battles: FeedBattle[];
}

export function HomeFeed({ battles }: HomeFeedProps) {
  const [activeFilter, setActiveFilter] = useState<BattleType>(() => getSavedBattleType());
  const [selectedSort, setSelectedSort] = useState<SortType>('recommended');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!sortControlRef.current?.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const filteredBattles = useMemo(() => {
    const nextBattles = battles.filter((battle) => battle.type === activeFilter);

    return [...nextBattles].sort((a, b) => {
      if (a.isLocalDraft !== b.isLocalDraft) {
        return Number(Boolean(b.isLocalDraft)) - Number(Boolean(a.isLocalDraft));
      }

      if (selectedSort === 'popular') {
        return b.likeCount - a.likeCount;
      }

      if (selectedSort === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return b.recommendedScore - a.recommendedScore || b.likeCount - a.likeCount;
    });
  }, [activeFilter, battles, selectedSort]);

  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === selectedSort)?.label ?? '정렬 기준';

  const handleFilterClick = (battleType: BattleType) => {
    setActiveFilter(battleType);
    window.sessionStorage.setItem('mgg:homeFilter', battleType);
  };

  return (
    <main className="home-feed">
      <section className="home-filters" aria-label="배틀 유형 필터">
        <div className="filter-group">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`filter-btn ${activeFilter === filter.value ? 'active' : ''}`}
              onClick={() => handleFilterClick(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="sort-control" ref={sortControlRef}>
          <button
            className="sort-btn"
            type="button"
            aria-haspopup="menu"
            aria-expanded={isSortOpen}
            onClick={() => setIsSortOpen((isOpen) => !isOpen)}
          >
            {selectedSortLabel} ▼
          </button>
          {isSortOpen && (
            <div className="sort-menu" role="menu" aria-label="정렬 기준">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={selectedSort === option.value ? 'is-active' : ''}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSelectedSort(option.value);
                    setIsSortOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-battles" aria-label="배틀 피드">
        {filteredBattles.map((battle) => (
          <BattleCard key={battle.id} battle={battle} />
        ))}
      </section>
    </main>
  );
}

function getSavedBattleType(): BattleType {
  const savedType = window.sessionStorage.getItem('mgg:homeFilter');

  if (savedType === 'OPTION' || savedType === 'IMAGE_CAPTION' || savedType === 'TEXT_OPEN') {
    return savedType;
  }

  return 'TEXT_OPEN';
}

export default HomeFeed;
