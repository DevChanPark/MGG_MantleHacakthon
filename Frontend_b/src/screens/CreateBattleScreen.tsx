import React, { useEffect, useRef, useState } from 'react';
import type { CreateBattleType } from '../components/BoardSelectSheet';

const BATTLE_TYPE_LABELS: Record<CreateBattleType, string> = {
  TEXT_OPEN: '오픈 답변형',
  OPTION: '선택지형',
  IMAGE_CAPTION: '이미지형',
};

interface CreateBattleDraft {
  battleType: CreateBattleType;
  title: string;
  content: string;
  deadline: string;
  isAnonymous: boolean;
  options?: string[];
  imageFileName?: string;
}

interface MockCreateBattleResponse {
  battleId: string;
  draft: CreateBattleDraft;
}

interface MockUploadImageResponse {
  imageUrl: string;
  fileName: string;
}

function getSelectedBattleType(): CreateBattleType {
  const savedType = window.sessionStorage.getItem('mgg:selectedBattleType');

  if (savedType === 'OPTION' || savedType === 'IMAGE_CAPTION' || savedType === 'TEXT_OPEN') {
    return savedType;
  }

  return 'TEXT_OPEN';
}

async function mockCreateBattle(draft: CreateBattleDraft): Promise<MockCreateBattleResponse> {
  return {
    battleId: `mock-${draft.battleType.toLowerCase()}-${Date.now()}`,
    draft,
  };
}

async function mockUploadImage(file: File): Promise<MockUploadImageResponse> {
  return {
    imageUrl: URL.createObjectURL(file),
    fileName: file.name,
  };
}

export function CreateBattleScreen() {
  const [battleType] = useState<CreateBattleType>(() => getSelectedBattleType());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('2026-06-14 23:59');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'saved' | 'uploaded'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleAddOption = () => {
    setOptions((currentOptions) => {
      if (currentOptions.length >= 4) {
        return currentOptions;
      }

      return [...currentOptions, ''];
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((currentOptions) =>
      currentOptions.map((option, optionIndex) => (optionIndex === index ? value : option)),
    );
  };

  const handlePhotoSelect = () => {
    setIsImageMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const uploadResult = await mockUploadImage(file);
    setImagePreviewUrl(uploadResult.imageUrl);
    setImageFileName(uploadResult.fileName);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImagePreviewUrl('');
    setImageFileName('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const buildDraft = (): CreateBattleDraft => ({
    battleType,
    title,
    content,
    deadline,
    isAnonymous,
    options: battleType === 'OPTION' ? options : undefined,
    imageFileName: battleType === 'IMAGE_CAPTION' ? imageFileName : undefined,
  });

  const handleSaveDraft = () => {
    window.sessionStorage.setItem('mgg:createDraft', JSON.stringify(buildDraft()));
    setSubmitState('saved');
  };

  const handleMockSubmit = async () => {
    await mockCreateBattle(buildDraft());
    setSubmitState('uploaded');
  };

  const handleClose = () => {
    window.location.hash = 'home';
  };

  return (
    <main className="create-screen">
      <section
        className={`create-panel create-panel-${battleType.toLowerCase().replace('_', '-')}`}
        aria-label={`${BATTLE_TYPE_LABELS[battleType]} 게시글 작성`}
      >
        <div className="create-toolbar">
          <h2>게시글 작성</h2>
          <div className="create-toolbar-actions">
            <button className="create-temp-button" type="button" onClick={handleSaveDraft}>
              임시 저장
            </button>
            <button className="create-upload-button" type="button" onClick={handleMockSubmit}>
              업로드
            </button>
            <button className="create-close-button" type="button" aria-label="닫기" onClick={handleClose}>
              ×
            </button>
          </div>
        </div>

        <div className="create-settings-row">
          <label className="deadline-control">
            <span>마감 기한 설정</span>
            <input
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              aria-label="마감 기한"
            />
          </label>

          <label className="anonymous-toggle">
            <span>익명 여부</span>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
            />
            <span className="anonymous-toggle-track" aria-hidden="true" />
          </label>
        </div>

        <input
          className="create-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목을 입력하세요."
        />

        <div className="create-content-block">
          <textarea
            className="create-content-input"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="내용을 입력하세요."
          />

          {battleType === 'OPTION' && (
            <div className="option-fields" aria-label="선택지 입력">
              {options.map((option, index) => (
                <input
                  key={`option-${index}`}
                  value={option}
                  onChange={(event) => handleOptionChange(index, event.target.value)}
                  placeholder={index === 0 ? '부먹' : index === 1 ? '찍먹' : `선택지 ${index + 1}`}
                />
              ))}
              <button className="option-add-button" type="button" onClick={handleAddOption}>
                +
              </button>
            </div>
          )}

          {battleType === 'IMAGE_CAPTION' && (
            <div className="image-create-field">
              <input
                ref={fileInputRef}
                className="image-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
              />

              {imagePreviewUrl ? (
                <div className="image-preview-box">
                  <img src={imagePreviewUrl} alt="선택한 이미지 미리보기" />
                  <div className="image-preview-actions">
                    <button type="button" onClick={handlePhotoSelect}>
                      교체
                    </button>
                    <button type="button" onClick={handleRemoveImage}>
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <div className="image-upload-box">
                  <button
                    className="image-upload-plus"
                    type="button"
                    aria-label="이미지 추가"
                    onClick={() => setIsImageMenuOpen((isOpen) => !isOpen)}
                  >
                    +
                  </button>

                  {isImageMenuOpen && (
                    <div className="image-upload-menu" role="menu" aria-label="이미지 선택 메뉴">
                      <button type="button" role="menuitem" onClick={() => setIsImageMenuOpen(false)}>
                        ◎ 카메라로 촬영
                      </button>
                      <button type="button" role="menuitem" onClick={handlePhotoSelect}>
                        ◎ 사진 선택
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="create-status-message" aria-live="polite">
          {submitState === 'saved' && '임시 저장되었습니다.'}
          {submitState === 'uploaded' && 'mock 업로드가 준비되었습니다.'}
        </p>
      </section>
    </main>
  );
}

export default CreateBattleScreen;
