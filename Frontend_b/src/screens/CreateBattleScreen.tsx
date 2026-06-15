import React, { useEffect, useRef, useState } from 'react';
import type { CreateBattleType } from '../components/BoardSelectSheet';
import { isValidBattleDeadline, type CreateBattleDraft } from '../mocks/battles';

const BATTLE_TYPE_LABELS: Record<CreateBattleType, string> = {
  TEXT_OPEN: 'Open Mic',
  OPTION: 'Side Pick',
  IMAGE_CAPTION: 'Caption Lab',
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
        aria-label={`Create ${BATTLE_TYPE_LABELS[battleType]} battle`}
      >
        <div className="create-toolbar">
          <h2>Start a Battle</h2>
          <div className="create-toolbar-actions">
            <button className="create-temp-button" type="button" onClick={handleSaveDraft}>
              Save Excuse
            </button>
            <button className="create-upload-button" type="button" onClick={handleMockSubmit}>
              Launch Nonsense
            </button>
            <button className="create-close-button" type="button" aria-label="Close" onClick={handleClose}>
              X
            </button>
          </div>
        </div>

        <div className="create-settings-row">
          <label className="deadline-control">
            <span>Argument Expiry</span>
            <input
              value={deadline}
              inputMode="numeric"
              onChange={(event) => handleDeadlineChange(event.target.value)}
              aria-label="Argument expiry"
              placeholder="2026-"
            />
          </label>

          <label className="anonymous-toggle">
            <span>Post in Disguise</span>
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
          placeholder="Name your terrible take."
        />

        <div className="create-content-block">
          <textarea
            className="create-content-input"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Defend it like your group chat depends on it."
          />

          {battleType === 'OPTION' && (
            <div className="option-fields" aria-label="Choice inputs">
              {options.map((option, index) => (
                <input
                  key={`option-${index}`}
                  value={option}
                  onChange={(event) => handleOptionChange(index, event.target.value)}
                  placeholder={index === 0 ? 'Milk first' : index === 1 ? 'Cereal first' : `Option ${index + 1}`}
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
                  <img src={imagePreviewUrl} alt="Selected image preview" />
                  <div className="image-preview-actions">
                    <button type="button" onClick={handlePhotoSelect}>
                      Replace
                    </button>
                    <button type="button" onClick={handleRemoveImage}>
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="image-upload-box">
                  <button
                    className="image-upload-plus"
                    type="button"
                    aria-label="Add image"
                    onClick={() => setIsImageMenuOpen((isOpen) => !isOpen)}
                  >
                    +
                  </button>

                  {isImageMenuOpen && (
                    <div className="image-upload-menu" role="menu" aria-label="Image source menu">
                      <button type="button" role="menuitem" onClick={() => setIsImageMenuOpen(false)}>
                        Use Camera
                      </button>
                      <button type="button" role="menuitem" onClick={handlePhotoSelect}>
                        Pick Photo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="create-status-message" aria-live="polite">
          {submitState === 'saved' && 'Excuse saved for later.'}
          {submitState === 'uploaded' && 'Mock launch complete. The discourse trembles.'}
          {submitState === 'deadlineError' && 'Give this argument an expiry date.'}
          {submitState === 'optionError' && 'Add at least two sides to the chaos.'}
          {submitState === 'imageError' && 'Pick an image before asking for captions.'}
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
