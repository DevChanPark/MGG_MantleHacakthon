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
  activeFilter: BattleType;
  selectedOptionByBattleId: Record<string, string>;
  participatedBattleIds: string[];
  likedBattleIds: string[];
  likedCommentIds: string[];
  onFilterChange: (battleType: BattleType) => void;
  onOptionSelect: (battleId: string, option: string) => void;
  onBattleLike: (battleId: string) => void;
  onCommentLike: (battleId: string, commentId: string) => void;
  onCommentAdd: (battleId: string, text: string) => void;
  onShareBattle: (battle: FeedBattle) => void;
  onRequireParticipation: () => void;
  onParticipationRequest: (battle: FeedBattle) => void;
  onCloseBattle: (battleId: string) => void;
  onCompleteEvaluation: (battleId: string) => void;
  onOpenWinnerModal: (battle: FeedBattle) => void;
  onOpenDetail: (battleId: string) => void;
}

export function HomeFeed({
  battles,
  activeFilter,
  selectedOptionByBattleId,
  participatedBattleIds,
  likedBattleIds,
  likedCommentIds,
  onFilterChange,
  onOptionSelect,
  onBattleLike,
  onCommentLike,
  onCommentAdd,
  onShareBattle,
  onRequireParticipation,
  onParticipationRequest,
  onCloseBattle,
  onCompleteEvaluation,
  onOpenWinnerModal,
  onOpenDetail,
}: HomeFeedProps) {
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
    onFilterChange(battleType);
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
          <BattleCard
            key={battle.id}
            battle={battle}
            selectedOption={selectedOptionByBattleId[battle.id] ?? null}
            isParticipated={participatedBattleIds.includes(battle.id)}
            isBattleLiked={likedBattleIds.includes(battle.id)}
            likedCommentIds={likedCommentIds}
            onOptionSelect={(option) => onOptionSelect(battle.id, option)}
            onBattleLike={() => onBattleLike(battle.id)}
            onCommentLike={(commentId) => onCommentLike(battle.id, commentId)}
            onCommentAdd={(text) => onCommentAdd(battle.id, text)}
            onShare={() => onShareBattle(battle)}
            onRequireParticipation={onRequireParticipation}
            onParticipationRequest={() => onParticipationRequest(battle)}
            onCloseBattle={() => onCloseBattle(battle.id)}
            onCompleteEvaluation={() => onCompleteEvaluation(battle.id)}
            onOpenWinnerModal={() => onOpenWinnerModal(battle)}
            onOpenDetail={() => onOpenDetail(battle.id)}
          />
        ))}
      </section>
    </main>
  );
}

export default HomeFeed;
