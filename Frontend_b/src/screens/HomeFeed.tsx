import React, { useState } from 'react';
import { BattleCard, type FeedBattle } from '../components/BattleCard';

type BattleType = FeedBattle['type'];

const MOCK_BATTLES: FeedBattle[] = [
  {
    id: 'b1',
    type: 'TEXT_OPEN',
    author: '우김장인',
    title: '지구가 평평한 이유',
    description:
      '반박은 받습니다. 근데 어차피 제가 이김. AI도 제편임. 한 줄이면 충분한데 길게 쓰는 이유는 길게 쓰면 더 맞는 말 같아서',
    entryCount: 3,
    likeCount: 24,
    status: 'OPEN',
    comments: [
      {
        author: '둥근말이 김밥',
        text: '지구가 둥글면 제 통장은 왜 평평한가요?',
        likeCount: 4,
      },
      {
        author: '평평주의자',
        text: '바다가 안 쏟아지는 건 지구가 거대한 쟁반이라 그럼',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'b2',
    type: 'TEXT_OPEN',
    author: '새벽강성러',
    title: '과제 마감이 새벽에만 존재하는 이유',
    description: '낮에는 과제가 관측되지 않다가 밤 11시부터 갑자기 현실이 됩니다.',
    entryCount: 3,
    likeCount: 24,
    status: 'OPEN',
    comments: [
      {
        author: '마감요정',
        text: '해 뜨면 과제가 증발함. 과학적임.',
        likeCount: 4,
      },
      {
        author: '눈물의제출자',
        text: '새벽엔 글이 더 잘 써짐. 착각임.',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'b3',
    type: 'OPTION',
    author: '집사대행',
    title: '고양이는 집주인인가?',
    description: '월세는 제가 냅니다. 근데 소파, 침대, 택배박스 전부 고양이가 먼저 씁니다.',
    entryCount: 8,
    likeCount: 31,
    status: 'OPEN',
    comments: [
      {
        author: '월세냥이',
        text: '집주인이 맞습니다. 사람은 월세 내는 자동문입니다.',
        likeCount: 7,
      },
      {
        author: '털세권자',
        text: '집주인이죠. 제가 침대 쓰려면 눈치부터 봅니다.',
        likeCount: 5,
      },
    ],
  },
  {
    id: 'b4',
    type: 'IMAGE_CAPTION',
    author: '짤수집가',
    title: '이 표정에 붙일 최고의 한 줄',
    description: '회의에서 “간단히만 볼게요”를 들은 직후의 표정입니다.',
    entryCount: 6,
    likeCount: 18,
    status: 'OPEN',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=360&q=80',
    comments: [
      {
        author: '퇴근희망자',
        text: '간단히가 2시간짜리 주문이라는 걸 깨달은 순간',
        likeCount: 6,
      },
      {
        author: '회의생존자',
        text: '제 영혼은 이미 로그아웃했습니다.',
        likeCount: 3,
      },
    ],
  },
];

const FILTERS: Array<{ label: string; value: BattleType }> = [
  { label: '오픈 답변형', value: 'TEXT_OPEN' },
  { label: '선택지형', value: 'OPTION' },
  { label: '이미지형', value: 'IMAGE_CAPTION' },
];

export function HomeFeed() {
  const [activeFilter, setActiveFilter] = useState<BattleType>('TEXT_OPEN');

  const filteredBattles = MOCK_BATTLES.filter((battle) => battle.type === activeFilter);

  return (
    <main className="home-feed">
      <section className="home-filters" aria-label="배틀 유형 필터">
        <div className="filter-group">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`filter-btn ${activeFilter === filter.value ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button className="sort-btn" type="button">
          정렬 기준 ▾
        </button>
      </section>

      <section className="home-battles" aria-label="배틀 피드">
        {filteredBattles.map((battle) => (
          <BattleCard key={battle.id} battle={battle} />
        ))}
      </section>
    </main>
  );
}

export default HomeFeed;
