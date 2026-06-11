import { type ChangeEvent, useRef, useState } from 'react';
import metamaskLogo from '../../assets/image13.png';
import mggLogo from '../../assets/brand/mgg-logo.png';

const mockDuplicateNicknames = new Set(['무기기', 'MGG', 'mgg', '관리자', 'admin']);

export function SignupProfileScreen() {
  const [nickname, setNickname] = useState('');
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const trimmedNickname = nickname.trim();
  const hasNickname = trimmedNickname.length > 0;
  const isDuplicateNickname = hasNickname && mockDuplicateNicknames.has(trimmedNickname);
  const nicknameHelperMessage = isDuplicateNickname
    ? '이미 존재하는 닉네임입니다.'
    : hasNickname
      ? '사용 가능한 닉네임입니다.'
      : '';
  const openImagePicker = (input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  };

  const handleProfilePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfilePhotoPreview(reader.result);
      }

      setIsPhotoSheetOpen(false);
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <main className="signup-feed" aria-label="MGG signup profile">
      <section className="signup-frame">
        <div className="signup-green-area" aria-hidden="true" />
        <div className="signup-profile-white-curve" aria-hidden="true" />
        <div className="signup-profile-white-panel" aria-hidden="true" />

        <img className="app-logo-small" src={mggLogo} alt="MGG" />
        <h1 className="signup-title">회원가입</h1>

        <div className="signup-profile-circle signup-profile-circle-large" aria-hidden="true">
          {profilePhotoPreview ? <img className="signup-profile-photo-preview" src={profilePhotoPreview} alt="" /> : null}
        </div>
        <button
          className="signup-camera-button"
          type="button"
          aria-label="프로필 사진 추가"
          onClick={() => setIsPhotoSheetOpen(true)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M8.3 6.8 9.7 5h4.6l1.4 1.8h2.1c1.3 0 2.4 1.1 2.4 2.4v7.1c0 1.4-1.1 2.4-2.4 2.4H6.2c-1.3 0-2.4-1.1-2.4-2.4V9.2c0-1.3 1.1-2.4 2.4-2.4h2.1Z" />
            <circle cx="12" cy="13" r="3.1" />
            <circle cx="17" cy="9.3" r="0.7" />
          </svg>
        </button>
        <input
          ref={cameraInputRef}
          className="profile-photo-input"
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleProfilePhotoChange}
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={galleryInputRef}
          className="profile-photo-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          onChange={handleProfilePhotoChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        <form className="signup-profile-form">
          <div className="signup-form-group">
            <label className="signup-form-label">
              지갑 연결 <span aria-hidden="true">*</span>
            </label>
            <div className="signup-connected-wallet" aria-label="MetaMask connected">
              <img className="wallet-icon metamask-logo" src={metamaskLogo} alt="" aria-hidden="true" />
              <span><strong>MetaMask</strong>로 연결 완료</span>
            </div>
          </div>

          <div className="signup-form-group">
            <label className="signup-form-label" htmlFor="signup-nickname">
              닉네임 <span aria-hidden="true">*</span>
            </label>
            <input
              id="signup-nickname"
              className="signup-text-field"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="닉네임을 작성해주세요."
              aria-describedby={nicknameHelperMessage ? 'signup-nickname-helper' : undefined}
              aria-invalid={isDuplicateNickname}
            />
            {nicknameHelperMessage ? (
              <p
                className={`signup-field-helper${isDuplicateNickname ? ' is-error' : ''}`}
                id="signup-nickname-helper"
              >
                {nicknameHelperMessage}
              </p>
            ) : null}
          </div>

          <div className="signup-form-group">
            <label className="signup-form-label" htmlFor="signup-intro">
              자기소개 <span aria-hidden="true">*</span>
            </label>
            <textarea id="signup-intro" className="signup-textarea-field" placeholder="자신을 소개해주세요." />
          </div>

          <label className="signup-age-check">
            <input type="checkbox" />
            <span>
              만 14세 이상이며, <a href="#terms">서비스 이용약관</a> 및 <a href="#age">연령 확인</a>에 동의합니다.
            </span>
          </label>

          <button className="signup-complete-button" type="button">회원가입 완료</button>
        </form>

        {isPhotoSheetOpen ? (
          <div className="profile-photo-sheet" role="dialog" aria-modal="false" aria-label="프로필 사진 설정">
            <div className="profile-photo-sheet-handle" aria-hidden="true" />
            <p className="profile-photo-sheet-title">프로필 사진 설정</p>
            <button className="profile-photo-sheet-option" type="button" onClick={() => openImagePicker(cameraInputRef.current)}>
              카메라로 촬영
            </button>
            <button className="profile-photo-sheet-option" type="button" onClick={() => openImagePicker(galleryInputRef.current)}>
              사진에서 선택
            </button>
            <button
              className="profile-photo-sheet-option"
              type="button"
              onClick={() => {
                setProfilePhotoPreview('');
                setIsPhotoSheetOpen(false);
              }}
            >
              기본 프로필 사용
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
