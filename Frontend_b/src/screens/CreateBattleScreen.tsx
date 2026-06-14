import React, { useEffect, useRef, useState } from 'react';
import type { CreateBattleType } from '../components/BoardSelectSheet';
import { isValidBattleDeadline, type CreateBattleDraft } from '../mocks/battles';

const BATTLE_TYPE_LABELS: Record<CreateBattleType, string> = {
  TEXT_OPEN: '오픈 답변형',
  OPTION: '선택지형',
  IMAGE_CAPTION: '이미지형',
};

interface MockUploadImageResponse {
  imageUrl: string;
  fileName: string;
}

async function mockUploadImage(file: File): Promise<MockUploadImageResponse> {
  return {
    imageUrl: await readFileAsDataUrl(file),
    fileName: file.name,
  };
}

interface CreateBattleScreenProps {
  battleType: CreateBattleType;
  onCreateBattle: (draft: CreateBattleDraft) => void;
}

type SubmitState = 'idle' | 'saved' | 'uploaded' | 'deadlineError' | 'optionError' | 'imageError';

export function CreateBattleScreen({ battleType, onCreateBattle }: CreateBattleScreenProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('2026-');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle('');
    setContent('');
    setDeadline('2026-');
    setOptions(['', '']);
    setIsImageMenuOpen(false);
    setImagePreviewUrl('');
    setImageFileName('');
    setSubmitState('idle');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [battleType]);

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

  const handleDeadlineChange = (value: string) => {
    setDeadline(formatDeadlineInput(value));
    setSubmitState('idle');
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

    const uploadResult = await mockUploadImage(file);
    setImagePreviewUrl(uploadResult.imageUrl);
    setImageFileName(uploadResult.fileName);
    setSubmitState('idle');
  };

  const handleRemoveImage = () => {
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
    imageUrl: battleType === 'IMAGE_CAPTION' ? imagePreviewUrl : undefined,
    imageFileName: battleType === 'IMAGE_CAPTION' ? imageFileName : undefined,
  });

  const handleSaveDraft = () => {
    window.sessionStorage.setItem('mgg:createDraft', JSON.stringify(buildDraft()));
    setSubmitState('saved');
  };

  const handleMockSubmit = () => {
    if (!deadline || deadline === '2026-' || !isValidBattleDeadline(deadline)) {
      setSubmitState('deadlineError');
      return;
    }

    if (battleType === 'OPTION' && options.map((option) => option.trim()).filter(Boolean).length < 2) {
      setSubmitState('optionError');
      return;
    }

    if (battleType === 'IMAGE_CAPTION' && !imagePreviewUrl) {
      setSubmitState('imageError');
      return;
    }

    setSubmitState('uploaded');
    onCreateBattle(buildDraft());
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
              inputMode="numeric"
              onChange={(event) => handleDeadlineChange(event.target.value)}
              aria-label="마감 기한"
              placeholder="2026-"
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
                        카메라로 촬영
                      </button>
                      <button type="button" role="menuitem" onClick={handlePhotoSelect}>
                        사진 선택
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
          {submitState === 'uploaded' && 'mock 업로드가 완료되었습니다.'}
          {submitState === 'deadlineError' && '마감 기한을 입력해주세요.'}
          {submitState === 'optionError' && '선택지를 2개 이상 입력해주세요.'}
          {submitState === 'imageError' && '이미지를 선택해주세요.'}
        </p>
      </section>
    </main>
  );
}

function formatDeadlineInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12);

  if (!digits) {
    return '';
  }

  let nextValue = digits.slice(0, 4);

  if (digits.length > 4) {
    nextValue += `-${digits.slice(4, 6)}`;
  }

  if (digits.length > 6) {
    nextValue += `-${digits.slice(6, 8)}`;
  }

  if (digits.length > 8) {
    nextValue += ` ${digits.slice(8, 10)}`;
  }

  if (digits.length > 10) {
    nextValue += `:${digits.slice(10, 12)}`;
  }

  return nextValue;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default CreateBattleScreen;
