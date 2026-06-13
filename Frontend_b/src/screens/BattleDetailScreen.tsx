import React, { useMemo, useState } from 'react';
import commentIcon from '../../assets/action-icons/comment.svg';
import heartIcon from '../../assets/action-icons/heart.svg';
import shareIcon from '../../assets/action-icons/share.svg';
import { getMockBattleResult, type FeedBattle } from '../mocks/battles';

interface BattleDetailScreenProps {
  battle: FeedBattle;
  selectedOption: string | null;
  isParticipated: boolean;
  isBattleLiked: boolean;
  likedCommentIds: string[];
  onBack: () => void;
  onOptionSelect: (option: string) => void;
  onBattleLike: () => void;
  onCommentLike: (commentId: string) => void;
  onCommentAdd: (text: string) => void;
  onShareBattle: () => void;
  onRequireParticipation: () => void;
  onParticipationRequest: () => void;
  onCloseBattle: () => void;
  onCompleteEvaluation: () => void;
  onOpenWinnerModal: () => void;
}

export function BattleDetailScreen({
  battle,
  selectedOption,
  isParticipated,
  isBattleLiked,
  likedCommentIds,
  onBack,
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
}: BattleDetailScreenProps) {
  const [commentInput, setCommentInput] = useState('');
  const result = useMemo(() => getMockBattleResult(battle), [battle]);
  const isOpen = battle.status === 'OPEN';
  const isEvaluating = battle.status === 'EVALUATING';
  const isCompleted = battle.status === 'COMPLETED';
  const isClosed = !isOpen && !isEvaluating && !isCompleted;
  const safeOptions = battle.options ?? [];

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isParticipated) {
      onRequireParticipation();
      return;
    }

    onCommentAdd(commentInput);
    setCommentInput('');
  };

  return (
    <main className="battle-detail-screen">
      <section className="battle-detail-topbar" aria-label="상세 상단">
        <button className="detail-back-button" type="button" aria-label="뒤로가기" onClick={onBack}>
          ‹
        </button>
        <span className="detail-deadline">마감 기한&nbsp;&nbsp;{battle.deadline}</span>
        <button
          className={`detail-participate-button${isParticipated ? ' is-complete' : ''}${!isOpen && !isParticipated ? ' is-closed' : ''}`}
          type="button"
          disabled={isParticipated}
          onClick={onParticipationRequest}
        >
          {isParticipated ? '참여 완료' : isOpen ? '참여하기' : '마감된 게시글'}
        </button>
      </section>

      <section className="battle-detail-hero">
        <div className="battle-detail-avatar" aria-hidden="true" />
        <div className="battle-detail-copy">
          <p className="battle-detail-author">{battle.author}</p>
          <h1>{battle.title}</h1>
          <p>{battle.description}</p>

          {battle.type === 'OPTION' && !isCompleted && safeOptions.length > 0 && (
            <div className="battle-option-list detail-option-list" aria-label="상세 선택지">
              {safeOptions.map((option) => (
                <button
                  className={`battle-option-pill${selectedOption === option ? ' is-selected' : ''}`}
                  type="button"
                  key={`${battle.id}-detail-${option}`}
                  aria-pressed={selectedOption === option}
                  disabled={!isOpen}
                  onClick={() => onOptionSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {battle.type === 'OPTION' && isCompleted && result.optionResults && (
            <div className="battle-result-options detail-result-options" aria-label="상세 선택지 결과">
              {result.optionResults.map((option) => (
                <div
                  className={`battle-result-option${option.label === result.winnerName ? ' is-winner' : ''}`}
                  key={`${battle.id}-detail-result-${option.label}`}
                >
                  <span>{option.label}</span>
                  <strong>{option.percentage}%</strong>
                </div>
              ))}
            </div>
          )}

          {battle.type === 'IMAGE_CAPTION' && (
            <div className="battle-image-frame detail-image-frame">
              {battle.imageUrl ? (
                <img className="battle-card-thumbnail" src={battle.imageUrl} alt="" />
              ) : (
                <div className="battle-image-placeholder">이미지 준비중</div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="battle-detail-controls" aria-label="게시글 상태">
        {false && isOpen && (
          <button className="battle-close-button" type="button" onClick={onCloseBattle}>
            마감
          </button>
        )}
        {isEvaluating && (
          <>
            <span className="battle-status-chip">AI 평가 중</span>
            <button className="battle-complete-button" type="button" onClick={onCompleteEvaluation}>
              AI 평가 완료
            </button>
          </>
        )}
        {isCompleted && (
          <>
            <span className="battle-status-chip is-complete">AI 평가 완료</span>
            <button className="battle-winner-button" type="button" onClick={onOpenWinnerModal}>
              우승자 확인
            </button>
          </>
        )}
        {isClosed && <span className="battle-status-chip is-closed">마감</span>}
      </section>

      <section className="battle-card-actions detail-actions" aria-label="상세 반응">
        <button className="battle-card-action" type="button">
          <img className="action-icon-img comment-icon-img" src={commentIcon} alt="" aria-hidden="true" />
          댓글 {battle.comments.length}
        </button>
        <button
          className={`battle-card-action like-action${isBattleLiked ? ' is-liked' : ''}`}
          type="button"
          aria-pressed={isBattleLiked}
          onClick={onBattleLike}
        >
          <img className="action-icon-img heart-icon-img" src={heartIcon} alt="" aria-hidden="true" />
          좋아요 {battle.likeCount}
        </button>
        <button className="battle-card-share" type="button" onClick={onShareBattle}>
          <img className="action-icon-img share-icon-img" src={shareIcon} alt="" aria-hidden="true" />
          공유하기
        </button>
      </section>

      {isEvaluating && (
        <section className="ai-evaluating-box detail-ai-box" role="status">
          <strong>AI 평가 중</strong>
          <p>AI가 댓글의 반응, 우기기 강도, 밈 잠재력을 mock 기준으로 채점하고 있습니다.</p>
        </section>
      )}

      {isCompleted && (
        <section className="ai-result-box detail-ai-box">
          <strong>AI 판결문</strong>
          {battle.type !== 'OPTION' && (
            <p className="ai-winner-line">
              우승자 {result.winnerName} · {result.winnerDetail}
            </p>
          )}
          {result.verdictLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      )}

      <section className="battle-detail-comments" aria-label="댓글 목록">
        {battle.comments.map((comment) => {
          const isCommentLiked = likedCommentIds.includes(comment.id);

          return (
            <article className="detail-comment-item" key={comment.id}>
              <div className="detail-comment-avatar" aria-hidden="true" />
              <div className="detail-comment-copy">
                <strong>{comment.author}</strong>
                <p>{comment.text}</p>
                <button type="button">답글달기</button>
              </div>
              <button
                className={`comment-like-button${isCommentLiked ? ' is-liked' : ''}`}
                type="button"
                aria-pressed={isCommentLiked}
                aria-label={`${comment.author} 댓글 좋아요`}
                onClick={() => onCommentLike(comment.id)}
              >
                <img className="comment-heart-img" src={heartIcon} alt="" aria-hidden="true" />
                <small>{comment.likeCount}</small>
              </button>
            </article>
          );
        })}
      </section>

      <form className="detail-comment-form" onSubmit={handleCommentSubmit}>
        <input
          value={commentInput}
          onChange={(event) => setCommentInput(event.target.value)}
          disabled={!isParticipated}
          placeholder="댓글을 입력하세요"
          aria-label="상세 댓글 입력"
        />
        <button type="submit" disabled={!isParticipated}>
          등록
        </button>
      </form>
    </main>
  );
}

export default BattleDetailScreen;
