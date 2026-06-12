import { useEffect } from 'react';

export type CreateBattleType = 'TEXT_OPEN' | 'OPTION' | 'IMAGE_CAPTION';

interface BoardSelectOption {
  label: string;
  value: CreateBattleType;
}

interface BoardSelectSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (battleType: CreateBattleType) => void;
}

const BOARD_OPTIONS: BoardSelectOption[] = [
  { label: '오픈 답변형', value: 'TEXT_OPEN' },
  { label: '선택지형', value: 'OPTION' },
  { label: '이미지형', value: 'IMAGE_CAPTION' },
];

export function BoardSelectSheet({ isOpen, onClose, onSelect }: BoardSelectSheetProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="board-sheet-layer" role="presentation">
      <button className="board-sheet-backdrop" type="button" aria-label="게시판 선택 닫기" onClick={onClose} />
      <section className="board-select-sheet" role="dialog" aria-modal="true" aria-labelledby="board-sheet-title">
        <div className="board-sheet-handle" aria-hidden="true" />
        <h2 id="board-sheet-title" className="board-sheet-title">
          게시판 선택
        </h2>
        <div className="board-sheet-options">
          {BOARD_OPTIONS.map((option) => (
            <button
              key={option.value}
              className="board-sheet-option"
              type="button"
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default BoardSelectSheet;
