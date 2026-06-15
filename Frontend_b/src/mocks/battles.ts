export type BattleType = 'OPTION' | 'TEXT_OPEN' | 'IMAGE_CAPTION';
export type BattleStatus = 'OPEN' | 'CLOSED' | 'EVALUATING' | 'COMPLETED' | 'EXPIRED';

export interface PreviewComment {
  id: string;
  author: string;
  text: string;
  likeCount: number;
  replies?: PreviewComment[];
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
  deadline: string;
  isLocalDraft?: boolean;
  createdByMe?: boolean;
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
  winnerUserId: string;
  winnerCommentId?: string;
  winnerName: string;
  winnerDetail: string;
  participantCount: number;
  rewardCredits: number;
  aiSummary: string;
  winningOptionId?: string;
  optionStats?: Array<{
    optionId: string;
    label: string;
    percentage: number;
  }>;
  verdictLines: string[];
  optionResults?: Array<{
    label: string;
    percentage: number;
  }>;
  mantleVerification: MantleVerification;
}

export interface MantleVerification {
  battleId: string;
  battleType: BattleType;
  contentHash: string;
  entriesRoot: string;
  rulesHash: string;
  winnerHash: string;
  aiVerdictHash: string;
  mantleTx: string;
  explorerUrl: string;
}

export const MOCK_CURRENT_USER = {
  id: 'user-current',
  nickname: 'Me',
  credits: 30,
};

export const MOCK_WALLET_ADDRESS = '0x12ab...89ef';

export const REWARD_CREDITS = 30;

export const initialMockBattles: FeedBattle[] = [
  {
    id: 'battle-open-flat-earth',
    type: 'TEXT_OPEN',
    author: 'Bad-Take Baron',
    title: 'Why Earth Is Obviously a Pancake',
    description: 'Counterarguments accepted, emotionally ignored. One sentence would do, but paragraphs look legally binding.',
    likeCount: 24,
    status: 'OPEN',
    recommendedScore: 96,
    createdAt: '2026-06-12T10:00:00+09:00',
    deadline: '2026-06-14 23:59',
    comments: [
      {
        id: 'comment-flat-1',
        author: 'Wallet Flatliner',
        text: 'If Earth is round, explain my flat bank account.',
        likeCount: 4,
      },
      {
        id: 'comment-flat-2',
        author: 'Tray Truther',
        text: 'The oceans stay put because Earth is a giant serving tray.',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-open-dawn',
    type: 'TEXT_OPEN',
    author: '2AM Scholar',
    title: 'Why Deadlines Only Exist After Midnight',
    description: 'During the day they are shy. At 2:13 AM they arrive with a final-boss health bar.',
    likeCount: 19,
    status: 'OPEN',
    recommendedScore: 83,
    createdAt: '2026-06-11T23:10:00+09:00',
    deadline: '2026-06-14 23:59',
    comments: [
      {
        id: 'comment-dawn-1',
        author: 'Deadline Intern',
        text: 'Sunlight makes assignments evaporate. Peer-reviewed by my panic.',
        likeCount: 4,
      },
      {
        id: 'comment-dawn-2',
        author: 'Sleep-Deprived Submitter',
        text: 'Writing is better at night because standards are asleep.',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-option-sauce',
    type: 'OPTION',
    author: 'Cereal Courtroom',
    title: 'Milk First or Cereal First?',
    description: 'Cereal first is just breakfast. Milk first is a personality test with a spoon.',
    likeCount: 27,
    status: 'OPEN',
    recommendedScore: 98,
    createdAt: '2026-06-12T09:10:00+09:00',
    deadline: '2026-06-14 23:59',
    options: ['Milk First', 'Cereal First'],
    comments: [
      {
        id: 'comment-sauce-1',
        author: 'Bowl Theorist',
        text: 'Milk first creates a swimming pool. Cereal deserves infrastructure.',
        likeCount: 4,
      },
      {
        id: 'comment-sauce-2',
        author: 'Crunch Counsel',
        text: 'Cereal first protects crunch, which is basically breakfast law.',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-option-food',
    type: 'OPTION',
    author: 'Forever Bite',
    title: 'One Food Forever: Choose Your Delicious Prison',
    description: 'This is not a hard question. I simply posted it so everyone else can be wrong publicly.',
    likeCount: 18,
    status: 'OPEN',
    recommendedScore: 76,
    createdAt: '2026-06-10T18:00:00+09:00',
    deadline: '2026-06-14 23:59',
    options: ['Ramen', 'Chicken', 'Tacos'],
    comments: [
      {
        id: 'comment-food-1',
        author: 'Noodle Strategist',
        text: 'Ramen plus water equals civilization with steam.',
        likeCount: 5,
      },
      {
        id: 'comment-food-2',
        author: 'Drumstick Diplomat',
        text: 'Chicken is the loop you never need to patch.',
        likeCount: 3,
      },
    ],
  },
  {
    id: 'battle-image-cat',
    type: 'IMAGE_CAPTION',
    author: 'Excuse Architect',
    title: 'Caption This Workplace Incident',
    description: 'The will to work existed. The keyboard approval committee did not.',
    likeCount: 24,
    status: 'OPEN',
    recommendedScore: 94,
    createdAt: '2026-06-12T08:30:00+09:00',
    deadline: '2026-06-14 23:59',
    imageUrl: 'https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?auto=format&fit=crop&w=720&q=80',
    comments: [
      {
        id: 'comment-cat-1',
        author: 'Payroll Acrobat',
        text: "Today's task: waiting for keyboard clearance.",
        likeCount: 4,
      },
      {
        id: 'comment-cat-2',
        author: 'Clock-Out Advocate',
        text: 'Management has occupied the keyboard.',
        likeCount: 2,
      },
    ],
  },
  {
    id: 'battle-image-dog',
    type: 'IMAGE_CAPTION',
    author: 'Name Consultant',
    title: 'Name This Tiny CEO',
    description: 'The stare says board meeting. The outfit says snack budget scandal.',
    likeCount: 16,
    status: 'OPEN',
    recommendedScore: 81,
    createdAt: '2026-06-09T12:20:00+09:00',
    deadline: '2026-06-14 23:59',
    imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=720&q=80',
    comments: [
      {
        id: 'comment-dog-1',
        author: 'Brand Director',
        text: 'That face already owns a premium subscription.',
        likeCount: 3,
      },
      {
        id: 'comment-dog-2',
        author: 'Snack Judge',
        text: 'Name later. Snacks now. Governance matters.',
        likeCount: 2,
      },
    ],
  },
];

export function createMockBattle(draft: CreateBattleDraft): FeedBattle {
  const id = `mock-${draft.battleType.toLowerCase()}-${Date.now()}`;
  const fallbackTitle = draft.battleType === 'IMAGE_CAPTION' ? 'Caption Lab' : 'Fresh Argument';

  return {
    id,
    type: draft.battleType,
    author: draft.isAnonymous ? 'Anonymous Chaos Lawyer' : 'Me',
    title: draft.title.trim() || fallbackTitle,
    description: draft.content.trim() || 'Short post, long confidence.',
    likeCount: 0,
    status: 'OPEN',
    recommendedScore: 50,
    createdAt: new Date().toISOString(),
    deadline: draft.deadline,
    isLocalDraft: true,
    createdByMe: true,
    imageUrl: draft.battleType === 'IMAGE_CAPTION' ? draft.imageUrl : undefined,
    options:
      draft.battleType === 'OPTION'
        ? (draft.options ?? []).map((option) => option.trim()).filter(Boolean).slice(0, 4)
        : undefined,
    comments: [],
  };
}

export function isCurrentUserWinner(result: MockBattleResult, currentUserId: string) {
  return result.winnerUserId === currentUserId;
}

function getMockWinnerUserId(battle: FeedBattle) {
  if (battle.createdByMe || battle.id === 'battle-option-sauce' || battle.id === 'battle-open-dawn') {
    return MOCK_CURRENT_USER.id;
  }

  return 'user-2';
}

export function parseBattleDeadline(deadline: string): Date | null {
  const trimmedDeadline = deadline.trim();
  const match = trimmedDeadline.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour = '23', minute = '59'] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

  if (
    parsedDate.getFullYear() !== Number(year) ||
    parsedDate.getMonth() !== Number(month) - 1 ||
    parsedDate.getDate() !== Number(day) ||
    parsedDate.getHours() !== Number(hour) ||
    parsedDate.getMinutes() !== Number(minute)
  ) {
    return null;
  }

  return parsedDate;
}

export function isValidBattleDeadline(deadline: string) {
  return parseBattleDeadline(deadline) !== null;
}

export function getBattleEffectiveStatus(battle: FeedBattle, now = new Date()): BattleStatus {
  if (battle.status === 'OPEN' && isBattleExpired(battle, now)) {
    return 'EVALUATING';
  }

  return battle.status;
}

export function canParticipateInBattle(battle: FeedBattle, now = new Date()) {
  return getBattleEffectiveStatus(battle, now) === 'OPEN';
}

export function isBattleExpired(battle: FeedBattle, now = new Date()) {
  const deadlineDate = parseBattleDeadline(battle.deadline);

  return Boolean(deadlineDate && deadlineDate.getTime() <= now.getTime());
}

export function getMockBattleResult(battle: FeedBattle): MockBattleResult {
  const winnerUserId = getMockWinnerUserId(battle);
  const participantCount = battle.type === 'OPTION' ? 67 : Math.max(12, battle.comments.length * 9 + 11);
  const mantleVerification = buildMockMantleVerification(battle);

  if (battle.type === 'OPTION') {
    const optionLabels = battle.options && battle.options.length >= 2 ? battle.options : ['Landlord', 'Tenant'];
    const winningComment = battle.comments[0];
    const winningOptionLabel = optionLabels[0];
    const winnerName = winningComment?.author ?? 'Rent Lawyer';
    const optionStats = [
      { optionId: `${battle.id}-option-0`, label: optionLabels[0], percentage: 72 },
      { optionId: `${battle.id}-option-1`, label: optionLabels[1], percentage: 28 },
      ...optionLabels.slice(2).map((label, index) => ({
        optionId: `${battle.id}-option-${index + 2}`,
        label,
        percentage: 0,
      })),
    ];

    return {
      winnerUserId,
      winnerCommentId: winningComment?.id,
      winnerName,
      winnerDetail: winningComment?.text ?? `${winningOptionLabel} side brought the louder paperwork.`,
      participantCount,
      rewardCredits: REWARD_CREDITS,
      aiSummary: `${winningOptionLabel} made the cleaner, share-friendlier mess.`,
      winningOptionId: optionStats[0]?.optionId,
      optionStats,
      optionResults: optionStats.map(({ label, percentage }) => ({ label, percentage })),
      mantleVerification,
      verdictLines: [
        'AI verdict: judged by logic swagger, reply heat, and meme portability.',
        `${winningOptionLabel} made the cleaner, share-friendlier mess.`,
        'Final ruling: maximum confidence per syllable.',
      ],
    };
  }

  if (battle.type === 'IMAGE_CAPTION') {
    const winningComment = battle.comments[0];

    return {
      winnerUserId,
      winnerCommentId: winningComment?.id,
      winnerName: winningComment?.author ?? 'Caption Criminal',
      winnerDetail: winningComment?.text ?? 'The caption hit the image right in the context.',
      participantCount,
      rewardCredits: REWARD_CREDITS,
      aiSummary: 'Best fit between image context and one-line impact.',
      mantleVerification,
      verdictLines: [
        'AI verdict: best fit between image context and one-line impact.',
        'The caption explains the scene before the brain can file a complaint.',
        'Final ruling: strongest meme potential.',
      ],
    };
  }

  const winningComment = battle.comments[0];

  return {
    winnerUserId,
    winnerCommentId: winningComment?.id,
    winnerName: winningComment?.author ?? 'Bad-Take Baron',
    winnerDetail: winningComment?.text ?? 'An indefensible one-liner with courtroom posture.',
    participantCount,
    rewardCredits: REWARD_CREDITS,
    aiSummary: 'The shortest answer packed the highest nonsense pressure.',
    mantleVerification,
    verdictLines: [
      'AI verdict: scored by absurdity, stubbornness, and reply-bait potential.',
      'The shortest answer packed the highest nonsense pressure.',
      'Final ruling: most likely to survive as a meme.',
    ],
  };
}

export function getWonBattlesForCurrentUser(battles: FeedBattle[], currentUserId = MOCK_CURRENT_USER.id) {
  return battles
    .filter((battle) => battle.status === 'COMPLETED')
    .map((battle) => ({ battle, result: getMockBattleResult(battle) }))
    .filter(({ result }) => isCurrentUserWinner(result, currentUserId));
}

function buildMockMantleVerification(battle: FeedBattle): MantleVerification {
  const seed = stableHashSeed(battle.id);
  const battleNumber = String((seed % 90000) + 42).padStart(5, '0');

  return {
    battleId: `MGG-${battleNumber}`,
    battleType: battle.type,
    contentHash: mockHash(seed, 'content'),
    entriesRoot: mockHash(seed, 'entries'),
    rulesHash: mockHash(seed, 'rules'),
    winnerHash: mockHash(seed, 'winner'),
    aiVerdictHash: mockHash(seed, 'verdict'),
    mantleTx: mockHash(seed, 'mantle-tx'),
    explorerUrl: `https://explorer.testnet.mantle.xyz/tx/${mockHash(seed, 'mantle-tx')}`,
  };
}

function stableHashSeed(value: string) {
  return value.split('').reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) >>> 0, 2166136261);
}

function mockHash(seed: number, label: string) {
  const prefix = `${seed.toString(16).padStart(8, '0')}${label.replace(/[^a-z0-9]/g, '')}`;
  return `0x${prefix.padEnd(64, '0').slice(0, 64)}`;
}
