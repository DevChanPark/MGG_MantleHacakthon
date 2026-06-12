export type BattleType = 'OPTION' | 'TEXT_OPEN' | 'IMAGE_CAPTION';
export type BattleStatus = 'OPEN' | 'EVALUATING' | 'COMPLETED';

export interface PreviewComment {
  id: string;
  author: string;
  text: string;
  likeCount: number;
}

export interface FeedBattle {
  id: string;
  type: BattleType;
  author: string;
  title: string;
  description: string;
  likeCount: number;
  status: BattleStatus;
  recommendedScore: number;
  createdAt: string;
  isLocalDraft?: boolean;
  imageUrl?: string;
  options?: string[];
  comments: PreviewComment[];
}

export interface CreateBattleDraft {
  battleType: BattleType;
  title: string;
  content: string;
  deadline: string;
  isAnonymous: boolean;
  options?: string[];
  imageUrl?: string;
  imageFileName?: string;
}

export interface MockBattleResult {
  winnerName: string;
  winnerDetail: string;
  rewardCredits: number;
  verdictLines: string[];
  optionResults?: Array<{
    label: string;
    percentage: number;
  }>;
}

export const REWARD_CREDITS = 30;

export const initialMockBattles: FeedBattle[] = [
  {
    id: 'battle-open-flat-earth',
    type: 'TEXT_OPEN',
    author: '우김장인',
    title: '지구가 평평한 이유',
    description:
      '반박은 받습니다. 근데 어차피 제가 이김. AI도 제편임. 한 줄이면 충분한데 길게 쓰는 이유는 길게 쓰면 더 맞는 말 같아서',
    likeCount: 24,
    status: 'OPEN',
    recommendedScore: 96,
    createdAt: '2026-06-12T10:00:00+09:00',
    comments: [
      {
        id: 'comment-flat-1',
        author: '둥근말이 김밥',
        text: '지구가 둥글면 제 통장은 왜 평평한가요?',
        likeCount: 4,
      },
      {
        id: 'comment-flat-2',
        author: '평평주의자',
        text: '바다가 안 쏟아지는 건 지구가 거대한 쟁반이라 그럼',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-open-dawn',
    type: 'TEXT_OPEN',
    author: '새벽감성러',
    title: '과제 마감이 새벽에만 존재하는 이유',
    description: '해 뜨면 과제가 증발함. 과학적임. 새벽엔 글이 더 잘 써짐. 착각임.',
    likeCount: 19,
    status: 'OPEN',
    recommendedScore: 83,
    createdAt: '2026-06-11T23:10:00+09:00',
    comments: [
      {
        id: 'comment-dawn-1',
        author: '마감요정',
        text: '해 뜨면 과제가 증발함. 과학적임.',
        likeCount: 4,
      },
      {
        id: 'comment-dawn-2',
        author: '눈물의제출자',
        text: '새벽엔 글이 더 잘 써짐. 착각임.',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-option-sauce',
    type: 'OPTION',
    author: '부먹수호자',
    title: '탕수육은 부먹인가 찍먹인가',
    description: '먹파 분들 마음은 이해함. 근데 틀렸음. 소스는 부어야 소스고, 안 부으면 그냥 옆에 있는 액체임.',
    likeCount: 27,
    status: 'OPEN',
    recommendedScore: 98,
    createdAt: '2026-06-12T09:10:00+09:00',
    options: ['부먹', '찍먹'],
    comments: [
      {
        id: 'comment-sauce-1',
        author: '소스폭포',
        text: '안 부으면 그게 탕수육이냐 튀김이지',
        likeCount: 4,
      },
      {
        id: 'comment-sauce-2',
        author: '바삭교신자',
        text: '눅눅해진 튀김 먹는 사람들 진심 걱정됨',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-option-food',
    type: 'OPTION',
    author: '평생 한입',
    title: '평생 하나만 먹어야한다면?',
    description: '고민할 필요 없는 문제인데 굳이 투표 올려봅니다. 정답 이미 정해져 있고 나머지는 그냥 틀러리임.',
    likeCount: 18,
    status: 'OPEN',
    recommendedScore: 76,
    createdAt: '2026-06-10T18:00:00+09:00',
    options: ['라면', '치킨', '떡볶이'],
    comments: [
      {
        id: 'comment-food-1',
        author: '면치기장인',
        text: '라면은 물만 있으면 문명 유지 가능',
        likeCount: 5,
      },
      {
        id: 'comment-food-2',
        author: '닭다리파',
        text: '치킨은 이미 완성형 단백질입니다',
        likeCount: 3,
      },
    ],
  },
  {
    id: 'battle-image-cat',
    type: 'IMAGE_CAPTION',
    author: '핑계장인',
    title: '제목 짓기',
    description: '업무 의지는 있었습니다. 근데 고양이가 승인하지 않았습니다. 이 정도면 재택근무가 아니라 재택재난입니다.',
    likeCount: 24,
    status: 'OPEN',
    recommendedScore: 94,
    createdAt: '2026-06-12T08:30:00+09:00',
    imageUrl: 'https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?auto=format&fit=crop&w=720&q=80',
    comments: [
      {
        id: 'comment-cat-1',
        author: '월급 루팡',
        text: '오늘의 업무: 고양이 결재 대기',
        likeCount: 4,
      },
      {
        id: 'comment-cat-2',
        author: '퇴근요정',
        text: '사장님이 키보드를 점거하셨습니다',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-image-dog',
    type: 'IMAGE_CAPTION',
    author: '눈빛수집가',
    title: '강아지 이름 추천좀',
    description: '강아지 너무 귀엽지 않아? 이름이 세상을 바꿀 수 있다고 믿는 편입니다.',
    likeCount: 16,
    status: 'OPEN',
    recommendedScore: 81,
    createdAt: '2026-06-09T12:20:00+09:00',
    imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=720&q=80',
    comments: [
      {
        id: 'comment-dog-1',
        author: '작명소장',
        text: '이 눈빛이면 이름은 이미 왕자님입니다',
        likeCount: 3,
      },
      {
        id: 'comment-dog-2',
        author: '간식판사',
        text: '이름보다 간식이 먼저입니다',
        likeCount: 2,
      },
    ],
  },
];

export function createMockBattle(draft: CreateBattleDraft): FeedBattle {
  const id = `mock-${draft.battleType.toLowerCase()}-${Date.now()}`;
  const fallbackTitle = draft.battleType === 'IMAGE_CAPTION' ? '이미지 제목 짓기' : '새로운 우기기';

  return {
    id,
    type: draft.battleType,
    author: draft.isAnonymous ? '익명 우기미' : '나',
    title: draft.title.trim() || fallbackTitle,
    description: draft.content.trim() || '내용을 입력하지 않았지만 일단 우겨봅니다.',
    likeCount: 0,
    status: 'OPEN',
    recommendedScore: 50,
    createdAt: new Date().toISOString(),
    isLocalDraft: true,
    imageUrl: draft.battleType === 'IMAGE_CAPTION' ? draft.imageUrl : undefined,
    options:
      draft.battleType === 'OPTION'
        ? (draft.options ?? []).map((option) => option.trim()).filter(Boolean).slice(0, 4)
        : undefined,
    comments: [],
  };
}

export function getMockBattleResult(battle: FeedBattle): MockBattleResult {
  if (battle.type === 'OPTION') {
    const optionLabels = battle.options && battle.options.length >= 2 ? battle.options : ['집주인', '세입자'];
    const winnerName = optionLabels[0];

    return {
      winnerName,
      winnerDetail: `${winnerName} 진영`,
      rewardCredits: REWARD_CREDITS,
      optionResults: [
        { label: optionLabels[0], percentage: 72 },
        { label: optionLabels[1], percentage: 28 },
        ...optionLabels.slice(2).map((label) => ({ label, percentage: 0 })),
      ],
      verdictLines: [
        'AI 판결문: 댓글의 논리적 뻔뻔함과 밈 확산성을 기준으로 판단했습니다.',
        `${winnerName} 쪽 주장이 더 단호하고 공유하기 좋은 결론을 만들었습니다.`,
        '최종 판단: 웃기는 설득력에서 우세했습니다.',
      ],
    };
  }

  if (battle.type === 'IMAGE_CAPTION') {
    const winningComment = battle.comments[0];

    return {
      winnerName: winningComment?.author ?? '월세냥이',
      winnerDetail: winningComment?.text ?? '오늘의 업무: 고양이 결재 대기',
      rewardCredits: REWARD_CREDITS,
      verdictLines: [
        'AI 판결문: 이미지 맥락과 한 줄 임팩트가 가장 잘 맞았습니다.',
        '캡션이 상황을 바로 이해시키면서도 공유하기 쉬운 형태였습니다.',
        '최종 판단: 밈 잠재력이 가장 높았습니다.',
      ],
    };
  }

  const winningComment = battle.comments[0];

  return {
    winnerName: winningComment?.author ?? '우김장인',
    winnerDetail: winningComment?.text ?? '반박 불가한 한 줄 우기기',
    rewardCredits: REWARD_CREDITS,
    verdictLines: [
      'AI 판결문: 황당함, 설득력, 댓글 반응 가능성을 기준으로 평가했습니다.',
      '가장 짧은 문장 안에 제일 강한 억지를 담은 답변이 우세했습니다.',
      '최종 판단: 밈으로 퍼질 가능성이 가장 큽니다.',
    ],
  };
}
