import React, { useMemo, useState } from 'react';
import commentIcon from '../../assets/action-icons/comment-icon.png';
import shareIcon from '../../assets/action-icons/share-icon.png';
import { HeartIcon } from './icons/HeartIcon';
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
  const canViewComments = true;
  const cardClassName = `battle-card battle-card-${battle.type.toLowerCase().replace('_', '-')}`;
  const hasManyComments = battle.comments.length > 2;
  const safeOptions = battle.type === 'OPTION' ? (battle.options ?? []).filter(Boolean) : [];
  const optionStats = result.optionStats ?? result.optionResults;
  const shouldShowOptionRatio = battle.type === 'OPTION' && Boolean(selectedOption || isCompleted) && optionStats;

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canWriteComments) {
      onRequireParticipation();
      return;
    }

    onCommentAdd(commentInput);
    setCommentInput('');
    setIsCommentComposerOpen(false);
  };

  const handleReplySubmit = (event: React.FormEvent<HTMLFormElement>, commentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canWriteComments) {
      onRequireParticipation();
      return;
    }

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
              {isWinningComment && <span className="winner-crown" aria-label="Champion">WIN</span>}
              {comment.author}
            </strong>
            <p>{comment.text}</p>
            {canWriteComments && (
              <button className="comment-reply-button" type="button" onClick={() => handleReplyClick(comment.id)}>
                Reply
              </button>
            )}
          </div>
          <button
            className={`comment-like-button${isCommentLiked ? ' is-liked' : ''}`}
            type="button"
            aria-pressed={isCommentLiked}
          aria-label={`${comment.author} comment like`}
          onClick={() => onCommentLike(comment.id)}
        >
            <HeartIcon className="comment-heart-img heart-action-icon" />
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
                    aria-label={`${reply.author} reply like`}
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
          <form className="reply-composer" onSubmit={(event) => handleReplySubmit(event, comment.id)}>
            <input
              value={replyInput}
              onChange={(event) => setReplyInput(event.target.value)}
              placeholder="Write a reply"
              aria-label="Reply input"
            />
            <button type="submit">Send</button>
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
            <span className="battle-status-chip">AI Thinking</span>
            <span className="battle-status-chip is-deadline">Closed</span>
            <button className="battle-complete-button is-dev-action" type="button" onClick={(event) => stopAndRun(event, onCompleteEvaluation)}>
              Verdict
            </button>
          </>
        )}
        {isCompleted && (
          <>
            <span className="battle-status-chip is-complete">AI Verdict Ready</span>
            <span className="battle-status-chip is-deadline">Closed</span>
            <button className="battle-winner-button" type="button" onClick={(event) => stopAndRun(event, onOpenWinnerModal)}>
              Champion
            </button>
          </>
        )}
        {isClosed && <span className="battle-status-chip is-closed">Closed</span>}
      </div>

      <div className="battle-card-main">
        <div className="battle-card-avatar" aria-hidden="true" />
        <div className="battle-card-body">
          <p className="battle-card-author">{battle.author}</p>
          <h2 className="battle-card-title">{battle.title}</h2>
          <p className="battle-card-deadline">Ends {battle.deadline}</p>
          <p className="battle-card-description">{battle.description}</p>

          {battle.type === 'OPTION' && !shouldShowOptionRatio && safeOptions.length > 0 && (
            <div className="battle-option-list" aria-label="Choices">
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
            <div className="battle-result-options" aria-label="Choice results">
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
                  aria-label="Zoom image"
                >
                  <img className="battle-card-thumbnail" src={battle.imageUrl} alt="" />
                </button>
              ) : (
                <div className="battle-image-placeholder">Image still warming up</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="battle-card-actions" aria-label="Battle reactions">
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
          Replies {commentCount}
        </button>
        <button
          className={`battle-card-action like-action${isBattleLiked ? ' is-liked' : ''}`}
          type="button"
          aria-pressed={isBattleLiked}
          onClick={(event) => stopAndRun(event, onBattleLike)}
        >
          <HeartIcon className="action-icon-img heart-icon-img heart-action-icon" />
          Applause {battle.likeCount}
        </button>
        <button className="battle-card-share" type="button" onClick={(event) => stopAndRun(event, onShare)}>
          <img className="action-icon-img share-action-icon" src={shareIcon} alt="" aria-hidden="true" />
          Share
        </button>
      </div>

      {isOpen && (
        <button
          className={`battle-participate-button${isParticipated ? ' is-complete' : ''}`}
          type="button"
          disabled={isParticipated}
          onClick={(event) => stopAndRun(event, onParticipationRequest)}
        >
          {isParticipated ? "You're In" : 'Enter the Arena'}
        </button>
      )}

      {canViewComments ? (
        <div className="comment-preview" onClick={(event) => event.stopPropagation()}>
          <p className="comment-preview-title">Replies {commentCount}</p>

          <div className={`comment-preview-list${hasManyComments ? ' is-scrollable' : ''}`}>
            {battle.comments.length > 0 ? (
              battle.comments.slice(0, 2).map(renderComment)
            ) : (
              <p className="comment-empty">No replies yet. Be the first bad influence.</p>
            )}
          </div>

          {battle.comments.length > 2 && (
            <button className="comment-view-all-button" type="button" onClick={onOpenDetail}>
              View all replies
            </button>
          )}

          {!canWriteComments && (
            <p className="comment-write-locked">Enter the arena before dropping a comment.</p>
          )}

          {canWriteComments && isCommentComposerOpen && (
            <form className="comment-composer" onSubmit={handleCommentSubmit}>
              <input
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="Write a comment"
                aria-label="Comment input"
              />
              <button type="submit">Send</button>
            </form>
          )}
        </div>
      ) : (
        <div className="comment-locked-message" onClick={(event) => event.stopPropagation()}>
          Enter the arena before dropping a comment.
        </div>
      )}

      {isEvaluating && (
        <div className="ai-evaluating-box" role="status">
          <strong>AI Thinking</strong>
          <p>Scoring reaction heat, nonsense density, and meme radiation in mock mode.</p>
        </div>
      )}

      {isCompleted && (
        <div className="ai-result-box">
          <strong>AI Verdict</strong>
          <div className="ai-result-summary">
            <span>Players {result.participantCount}</span>
            <span>Champion: {result.winnerName}</span>
            <span>Credits to grab: {result.rewardCredits}</span>
          </div>
          {battle.type !== 'OPTION' && (
            <p className="ai-winner-line">
              Champion {result.winnerName} - {result.winnerDetail}
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
          <div className="image-zoom-modal" role="dialog" aria-modal="true" aria-label="Zoom image" onClick={(event) => event.stopPropagation()}>
            <button className="image-zoom-close" type="button" onClick={() => setPreviewImageUrl(null)} aria-label="Close image">
              X
            </button>
            <img src={previewImageUrl} alt="" />
          </div>
        </div>
      )}
    </article>
  );
}

export default BattleCard;
