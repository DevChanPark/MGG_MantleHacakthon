import React, { useMemo, useState } from 'react';
import commentIcon from '../../assets/action-icons/comment.svg';
import heartIcon from '../../assets/action-icons/heart.svg';
import { ShareIcon } from './icons/ShareIcon';
import { getMockBattleResult, type FeedBattle, type PreviewComment } from '../mocks/battles';

interface BattleCardProps {
  battle: FeedBattle;
  selectedOption: string | null;
  isParticipated: boolean;
  isBattleLiked: boolean;
  likedCommentIds: string[];
  onOptionSelect: (option: string) => void;
  onBattleLike: () => void;
  onCommentLike: (commentId: string) => void;
  onCommentAdd: (text: string) => void;
  onCommentReplyAdd: (commentId: string, text: string) => void;
  onShare: () => void;
  onRequireParticipation: () => void;
  onParticipationRequest: () => void;
  onCloseBattle: () => void;
  onCompleteEvaluation: () => void;
  onOpenWinnerModal: () => void;
  onOpenDetail: () => void;
}

export function BattleCard({
  battle,
  selectedOption,
  isParticipated,
  isBattleLiked,
  likedCommentIds,
  onOptionSelect,
  onBattleLike,
  onCommentLike,
  onCommentAdd,
  onCommentReplyAdd,
  onShare,
  onRequireParticipation,
  onParticipationRequest,
  onCompleteEvaluation,
  onOpenWinnerModal,
  onOpenDetail,
}: BattleCardProps) {
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const result = useMemo(() => getMockBattleResult(battle), [battle]);
  const commentCount = battle.comments.length;
  const isOpen = battle.status === 'OPEN';
  const isEvaluating = battle.status === 'EVALUATING';
  const isCompleted = battle.status === 'COMPLETED';
  const isClosed = !isOpen && !isEvaluating && !isCompleted;
  const canWriteComments = isOpen && isParticipated;
  const canViewComments = isParticipated || !isOpen;
  const cardClassName = `battle-card battle-card-${battle.type.toLowerCase().replace('_', '-')}`;
  const hasManyComments = battle.comments.length > 2;
  const safeOptions = battle.type === 'OPTION' ? (battle.options ?? []).filter(Boolean) : [];
  const optionStats = result.optionStats ?? result.optionResults;
  const shouldShowOptionRatio = battle.type === 'OPTION' && Boolean(selectedOption || isCompleted) && optionStats;

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onCommentAdd(commentInput);
    setCommentInput('');
    setIsCommentComposerOpen(false);
  };

  const handleReplySubmit = (event: React.FormEvent<HTMLFormElement>, commentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    onCommentReplyAdd(commentId, replyInput);
    setReplyInput('');
    setReplyingCommentId(null);
  };

  const stopAndRun = (event: React.MouseEvent, callback: () => void) => {
    event.stopPropagation();
    callback();
  };

  const handleReplyClick = (commentId: string) => {
    if (!canWriteComments) {
      onRequireParticipation();
      return;
    }

    setReplyInput('');
    setReplyingCommentId((currentId) => (currentId === commentId ? null : commentId));
  };

  const renderComment = (comment: PreviewComment) => {
    const isCommentLiked = likedCommentIds.includes(comment.id);
    const isWinningComment = isCompleted && result.winnerCommentId === comment.id;

    return (
      <div className="comment-thread" key={comment.id}>
        <div className="comment-preview-item">
          <div className="comment-avatar" aria-hidden="true" />
          <div className="comment-copy">
            <strong>
              {isWinningComment && <span className="winner-crown" aria-label="우승자">👑</span>}
              {comment.author}
            </strong>
            <p>{comment.text}</p>
            {canWriteComments && (
              <button className="comment-reply-button" type="button" onClick={() => handleReplyClick(comment.id)}>
                답글
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
            <img className="comment-heart-img" src={heartIcon} alt="" aria-hidden="true" />
            <small>{comment.likeCount}</small>
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map((reply) => {
              const isReplyLiked = likedCommentIds.includes(reply.id);

              return (
                <div className="comment-reply-item" key={reply.id}>
                  <div className="comment-avatar is-reply" aria-hidden="true" />
                  <div className="comment-copy">
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
                    <img className="comment-heart-img" src={heartIcon} alt="" aria-hidden="true" />
                    <small>{reply.likeCount}</small>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {canWriteComments && replyingCommentId === comment.id && (
          <form className="reply-composer" onSubmit={(event) => handleReplySubmit(event, comment.id)}>
            <input
              value={replyInput}
              onChange={(event) => setReplyInput(event.target.value)}
              placeholder="답글을 입력하세요"
              aria-label="답글 입력"
            />
            <button type="submit">등록</button>
          </form>
        )}
      </div>
    );
  };

  return (
    <article
      className={`${cardClassName} is-clickable`}
      tabIndex={0}
      role="button"
      onClick={onOpenDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onOpenDetail();
        }
      }}
    >
      <div className="battle-status-row">
        {isEvaluating && (
          <>
            <span className="battle-status-chip">AI 평가 중</span>
            <span className="battle-status-chip is-deadline">마감</span>
            <button className="battle-complete-button is-dev-action" type="button" onClick={(event) => stopAndRun(event, onCompleteEvaluation)}>
              AI 평가 완료 처리
            </button>
          </>
        )}
        {isCompleted && (
          <>
            <span className="battle-status-chip is-complete">AI 평가 완료</span>
            <span className="battle-status-chip is-deadline">마감</span>
            <button className="battle-winner-button" type="button" onClick={(event) => stopAndRun(event, onOpenWinnerModal)}>
              우승자 확인
            </button>
          </>
        )}
        {isClosed && <span className="battle-status-chip is-closed">마감</span>}
      </div>

      <div className="battle-card-main">
        <div className="battle-card-avatar" aria-hidden="true" />
        <div className="battle-card-body">
          <p className="battle-card-author">{battle.author}</p>
          <h2 className="battle-card-title">{battle.title}</h2>
          <p className="battle-card-deadline">마감 기한 {battle.deadline}</p>
          <p className="battle-card-description">{battle.description}</p>

          {battle.type === 'OPTION' && !shouldShowOptionRatio && safeOptions.length > 0 && (
            <div className="battle-option-list" aria-label="선택지">
              {safeOptions.map((option) => (
                <button
                  className={`battle-option-pill${selectedOption === option ? ' is-selected' : ''}`}
                  type="button"
                  key={`${battle.id}-${option}`}
                  aria-pressed={selectedOption === option}
                  disabled={!isOpen || !isParticipated}
                  onClick={(event) => stopAndRun(event, () => onOptionSelect(option))}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {battle.type === 'OPTION' && shouldShowOptionRatio && optionStats && (
            <div className="battle-result-options" aria-label="선택지별 비율">
              {optionStats.map((option) => (
                <div
                  className={`battle-result-option${
                    option.label === selectedOption || ('optionId' in option && option.optionId === result.winningOptionId) ? ' is-winner' : ''
                  }`}
                  key={`${battle.id}-${option.label}`}
                >
                  <span>{option.label}</span>
                  <strong>{option.percentage}%</strong>
                </div>
              ))}
            </div>
          )}

          {battle.type === 'IMAGE_CAPTION' && (
            <div className="battle-image-frame">
              {battle.imageUrl ? (
                <button
                  className="battle-image-button"
                  type="button"
                  onClick={(event) => stopAndRun(event, () => setPreviewImageUrl(battle.imageUrl ?? null))}
                  aria-label="이미지 확대"
                >
                  <img className="battle-card-thumbnail" src={battle.imageUrl} alt="" />
                </button>
              ) : (
                <div className="battle-image-placeholder">이미지 준비중</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="battle-card-actions" aria-label="게시글 반응">
        <button
          className="battle-card-action"
          type="button"
          aria-expanded={isCommentComposerOpen}
          onClick={(event) =>
            stopAndRun(event, () => {
              if (!canWriteComments) {
                if (!isOpen) {
                  onParticipationRequest();
                  return;
                }

                onRequireParticipation();
                return;
              }

              setIsCommentComposerOpen((isOpenValue) => !isOpenValue);
            })
          }
        >
          <img className="action-icon-img comment-icon-img" src={commentIcon} alt="" aria-hidden="true" />
          댓글 {commentCount}
        </button>
        <button
          className={`battle-card-action like-action${isBattleLiked ? ' is-liked' : ''}`}
          type="button"
          aria-pressed={isBattleLiked}
          onClick={(event) => stopAndRun(event, onBattleLike)}
        >
          <img className="action-icon-img heart-icon-img" src={heartIcon} alt="" aria-hidden="true" />
          좋아요 {battle.likeCount}
        </button>
        <button className="battle-card-share" type="button" onClick={(event) => stopAndRun(event, onShare)}>
          <ShareIcon className="action-icon-img share-action-icon" />
          공유하기
        </button>
      </div>

      {isOpen && (
        <button
          className={`battle-participate-button${isParticipated ? ' is-complete' : ''}`}
          type="button"
          disabled={isParticipated}
          onClick={(event) => stopAndRun(event, onParticipationRequest)}
        >
          {isParticipated ? '참여 완료' : '참여하기'}
        </button>
      )}

      {canViewComments ? (
        <div className="comment-preview" onClick={(event) => event.stopPropagation()}>
          <p className="comment-preview-title">댓글 {commentCount}</p>

          <div className={`comment-preview-list${hasManyComments ? ' is-scrollable' : ''}`}>
            {battle.comments.length > 0 ? (
              battle.comments.slice(0, 2).map(renderComment)
            ) : (
              <p className="comment-empty">아직 댓글이 없습니다. 참여 후 첫 댓글을 남겨보세요.</p>
            )}
          </div>

          {battle.comments.length > 2 && (
            <button className="comment-view-all-button" type="button" onClick={onOpenDetail}>
              댓글 전체보기
            </button>
          )}

          {canWriteComments && isCommentComposerOpen && (
            <form className="comment-composer" onSubmit={handleCommentSubmit}>
              <input
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="댓글을 입력하세요"
                aria-label="댓글 입력"
              />
              <button type="submit">등록</button>
            </form>
          )}
        </div>
      ) : (
        <div className="comment-locked-message" onClick={(event) => event.stopPropagation()}>
          참여 후 댓글을 확인할 수 있습니다.
        </div>
      )}

      {isEvaluating && (
        <div className="ai-evaluating-box" role="status">
          <strong>AI 평가 중</strong>
          <p>AI가 댓글의 반응, 우기기 강도, 밈 잠재력을 mock 기준으로 채점하고 있습니다.</p>
        </div>
      )}

      {isCompleted && (
        <div className="ai-result-box">
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
        </div>
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
    </article>
  );
}

export default BattleCard;
