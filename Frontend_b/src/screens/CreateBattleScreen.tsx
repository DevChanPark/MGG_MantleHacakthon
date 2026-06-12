import React from 'react';
import type { CreateBattleType } from '../components/BoardSelectSheet';

const BATTLE_TYPE_LABELS: Record<CreateBattleType, string> = {
  TEXT_OPEN: '오픈 답변형',
  OPTION: '선택지형',
  IMAGE_CAPTION: '이미지형',
};

function getSelectedBattleType(): CreateBattleType {
  const savedType = window.sessionStorage.getItem('mgg:selectedBattleType');

  if (savedType === 'OPTION' || savedType === 'IMAGE_CAPTION' || savedType === 'TEXT_OPEN') {
    return savedType;
  }

  return 'TEXT_OPEN';
}

export function CreateBattleScreen() {
  const selectedBattleType = getSelectedBattleType();

  return (
    <main className="create-screen">
      <p className="create-screen-eyebrow">게시판</p>
      <h2>{BATTLE_TYPE_LABELS[selectedBattleType]}</h2>
      <p>작성 화면은 다음 단계에서 연결됩니다.</p>
    </main>
  );
}

export default CreateBattleScreen;
