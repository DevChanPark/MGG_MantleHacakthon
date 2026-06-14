import React, { useMemo, useState } from 'react';
import commentIcon from '../../assets/action-icons/댓글아이콘3.png';
import shareIcon from '../../assets/action-icons/공유하기 아이콘3.png';
import { HeartIcon } from '../components/icons/HeartIcon';
import { getMockBattleResult, type FeedBattle, type PreviewComment } from '../mocks/battles';

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
  onCommentReplyAdd: (commentId: string, text: string) => void;
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
  onCommentReplyAdd,
  onShareBattle,
  onRequireParticipation,
  onParticipationRequest,
  onCompleteEvaluation,
  onOpenWinnerModal,
}: BattleDetailScreenProps) {
  const [commentInput, setCommentInput] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const result = useMemo(() => getMockBattleResult(battle), [battle]);
  const isOpen = battle.status === 'OPEN';
  const isEvaluating = battle.status === 'EVALUATING';
  const isCompleted = battle.status === 'COMPLETED';
  const isClosed = !isOpen && !isEvaluating && !isCompleted;
  const canWriteComments = isOpen && isParticipated;
  const canViewComments = isParticipated || !isOpen;
  const safeOptions = battle.options ?? [];
  const optionStats = result.optionStats ?? result.optionResults;
  const shouldShowOptionRatio = battle.type === 'OPTION' && Boolean(selectedOption || isCompleted) && optionStats;

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canWriteComments) {
      onRequireParticipation();
      return;
    }

    onCommentAdd(commentInput);
    setCommentInput('');
  };

  const handleReplySubmit = (event: React.FormEvent<HTMLFormElement>, commentId: string) => {
    event.preventDefault();

    onCommentReplyAdd(commentId, replyInput);
    setReplyInput('');
    setReplyingCommentId(null);
  };

  const handleReplyClick = (commentId: string) => {
    if (!canWriteComments) {
      onRequireParticipation();
      return;
    }

    setReplyInput('');
    setReplyingCommentId((currentId) => (currentId === commentId ? null : commentId));
  };

  const renderTopbarAction = () => {
    if (isOpen) {
      return (
        <button
          className={`detail-participate-button${isParticipated ? ' is-complete' : ''}`}
          type="button"
          disabled={isParticipated}
          onClick={onParticipationRequest}
        >
          {isParticipated ? '참여 완료' : '참여하기'}
        </button>
      );
    }

    if (isEvaluating) {
      return (
        <div className="detail-state-actions">
          <span className="battle-status-chip">AI 평가 중</span>
          <span className="battle-status-chip is-deadline">마감</span>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="detail-state-actions">
          <span className="battle-status-chip is-complete">AI 평가 완료</span>
          <span className="battle-status-chip is-deadline">마감</span>
        </div>
      );
    }

    return <span className="battle-status-chip is-closed">마감</span>;
  };

  const renderComment = (comment: PreviewComment) => {
    const isCommentLiked = likedCommentIds.includes(comment.id);
    const isWinningComment = isCompleted && result.winnerCommentId === comment.id;

    return (
      <article className="detail-comment-thread" key={comment.id}>
        <div className="detail-comment-item">
          <div className="detail-comment-avatar" aria-hidden="true" />
          <div className="detail-comment-copy">
            <strong>
              {isWinningComment && <span className="winner-crown" aria-label="우승자">👑</span>}
              {comment.author}
            </strong>
            <p>{comment.text}</p>
            {canWriteComments && (
              <button type="button" onClick={() => handleReplyClick(comment.id)}>
                답글달기
              </button>
            )}
          </div>
          <button
            className={`comment-like-button${isCommentLiked ? ' is-liked' : ''}`}
            type="button"
            aria-pressed={isCommentLiked}
            aria-label={`${comment.author} 댓글 좋아요`}
            onClick={() => onCommentLike(comment.id)}
          >
            <HeartIcon className="comment-heart-img heart-action-icon" />
            <small>{comment.likeCount}</small>
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="detail-replies">
            {comment.replies.map((reply) => {
              const isReplyLiked = likedCommentIds.includes(reply.id);

              return (
                <div className="detail-reply-item" key={reply.id}>
                  <div className="detail-comment-avatar is-reply" aria-hidden="true" />
                  <div className="detail-comment-copy">
                    <strong>{reply.author}</strong>
                    <p>{reply.text}</p>
                  </div>
                  <button
                    className={`comment-like-button${isReplyLiked ? ' is-liked' : ''}`}
                    type="button"
                    aria-pressed={isReplyLiked}
                    aria-label={`${reply.author} 대댓글 좋아요`}
                    onClick={() => onCommentLike(reply.id)}
                  >
                    <HeartIcon className="comment-heart-img heart-action-icon" />
                    <small>{reply.likeCount}</small>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {canWriteComments && replyingCommentId === comment.id && (
          <form className="reply-composer detail-reply-composer" onSubmit={(event) => handleReplySubmit(event, comment.id)}>
            <input
              value={replyInput}
              onChange={(event) => setReplyInput(event.target.value)}
              placeholder="답글을 입력하세요"
              aria-label="대댓글 입력"
            />
            <button type="submit">등록</button>
          </form>
        )}
      </article>
    );
  };

  return (
    <main className="battle-detail-screen">
      <section className="battle-detail-topbar" aria-label="상세 상단">
        <button className="detail-back-button" type="button" aria-label="뒤로가기" onClick={onBack}>
          ‹
        </button>
        <span className="detail-deadline">마감 기한&nbsp;&nbsp;{battle.deadline}</span>
        {renderTopbarAction()}
      </section>

      <section className="battle-detail-hero">
        <div className="battle-detail-avatar" aria-hidden="true" />
        <div className="battle-detail-copy">
          <p className="battle-detail-author">{battle.author}</p>
          <h1>{battle.title}</h1>
          <p>{battle.description}</p>

          {battle.type === 'OPTION' && !shouldShowOptionRatio && safeOptions.length > 0 && (
            <div className="battle-option-list detail-option-list" aria-label="상세 선택지">
              {safeOptions.map((option) => (
                <button
                  className={`battle-option-pill${selectedOption === option ? ' is-selected' : ''}`}
                  type="button"
                  key={`${battle.id}-detail-${option}`}
                  aria-pressed={selectedOption === option}
                  disabled={!isOpen || !isParticipated}
                  onClick={() => onOptionSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {battle.type === 'OPTION' && shouldShowOptionRatio && optionStats && (
            <div className="battle-result-options detail-result-options" aria-label="상세 선택지 결과">
              {optionStats.map((option) => (
                <div
                  className={`battle-result-option${
                    option.label === selectedOption || ('optionId' in option && option.optionId === result.winningOptionId) ? ' is-winner' : ''
                  }`}
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
                <button className="battle-image-button" type="button" onClick={() => setPreviewImageUrl(battle.imageUrl ?? null)} aria-label="이미지 확대">
                  <img className="battle-card-thumbnail" src={battle.imageUrl} alt="" />
                </button>
              ) : (
                <div className="battle-image-placeholder">이미지 준비중</div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="battle-detail-controls" aria-label="게시글 상태">
        {isEvaluating && (
          <button className="battle-complete-button is-dev-action" type="button" onClick={onCompleteEvaluation}>
            AI 평가 완료 처리
          </button>
        )}
        {isCompleted && (
          <button className="battle-winner-button" type="button" onClick={onOpenWinnerModal}>
            우승자 확인
          </button>
        )}
        {isClosed && <span className="battle-status-chip is-closed">마감</span>}
      </section>

      <section className="battle-card-actions detail-actions" aria-label="상세 반응">
        <button className="battle-card-action" type="button" onClick={isOpen ? onRequireParticipation : onParticipationRequest}>
          <img className="action-icon-img comment-icon-img" src={commentIcon} alt="" aria-hidden="true" />
          댓글 {battle.comments.length}
        </button>
        <button
          className={`battle-card-action like-action${isBattleLiked ? ' is-liked' : ''}`}
          type="button"
          aria-pressed={isBattleLiked}
          onClick={onBattleLike}
        >
          <HeartIcon className="action-icon-img heart-icon-img heart-action-icon" />
          좋아요 {battle.likeCount}
        </button>
        <button className="battle-card-share" type="button" onClick={onShareBattle}>
          <img className="action-icon-img share-action-icon" src={shareIcon} alt="" aria-hidden="true" />
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
          <div className="ai-result-summary">
            <span>참여자 {result.participantCount}명</span>
            <span>우승자: {result.winnerName}</span>
            <span>지급 받을 크레딧: {result.rewardCredits}개</span>
          </div>
          {battle.type !== 'OPTION' && (
            <p className="ai-winner-line">
              우승자 {result.winnerName} · {result.winnerDetail}
            </p>
          )}
          <div className="ai-summary-lines">
            <p>{result.aiSummary}</p>
          </div>
          {result.verdictLines.slice(0, 3).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      )}

      {canViewComments ? (
        <>
          <section className="battle-detail-comments" aria-label="댓글 목록">
            {battle.comments.map(renderComment)}
          </section>

          {canWriteComments && (
            <form className="detail-comment-form" onSubmit={handleCommentSubmit}>
              <input
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="댓글을 입력하세요"
                aria-label="상세 댓글 입력"
              />
              <button type="submit">등록</button>
            </form>
          )}
        </>
      ) : (
        <section className="detail-comment-locked" aria-label="댓글 잠김">
          참여 후 댓글을 확인할 수 있습니다.
        </section>
      )}

      {previewImageUrl && (
        <div className="image-zoom-overlay" role="presentation" onClick={() => setPreviewImageUrl(null)}>
          <div className="image-zoom-modal" role="dialog" aria-modal="true" aria-label="이미지 확대" onClick={(event) => event.stopPropagation()}>
            <button className="image-zoom-close" type="button" onClick={() => setPreviewImageUrl(null)} aria-label="이미지 닫기">
              ×
            </button>
            <img src={previewImageUrl} alt="" />
          </div>
        </div>
      )}
    </main>
  );
}

export default BattleDetailScreen;
