import React, { useMemo, useState } from 'react';
import commentIcon from '../../assets/action-icons/comment.svg';
import heartIcon from '../../assets/action-icons/heart.svg';
import shareIcon from '../../assets/action-icons/share.svg';
import { getMockBattleResult, type FeedBattle } from '../mocks/battles';

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
  onParticipationRequest,
  onCloseBattle,
  onCompleteEvaluation,
  onOpenWinnerModal,
  onOpenDetail,
}: BattleCardProps) {
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const result = useMemo(() => getMockBattleResult(battle), [battle]);
  const commentCount = battle.comments.length;
  const isOpen = battle.status === 'OPEN';
  const isEvaluating = battle.status === 'EVALUATING';
  const isCompleted = battle.status === 'COMPLETED';
  const isClosed = !isOpen && !isEvaluating && !isCompleted;
  const cardClassName = `battle-card battle-card-${battle.type.toLowerCase().replace('_', '-')}`;
  const hasManyComments = battle.comments.length > 2;
  const safeOptions = battle.type === 'OPTION' ? (battle.options ?? []).filter(Boolean) : [];

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    onCommentAdd(commentInput);
    setCommentInput('');
    setIsCommentComposerOpen(false);
  };

  const stopAndRun = (event: React.MouseEvent, callback: () => void) => {
    event.stopPropagation();
    callback();
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
        {isOpen && (
          <button className="battle-close-button" type="button" onClick={(event) => stopAndRun(event, onCloseBattle)}>
            마감
          </button>
        )}
        {isEvaluating && (
          <>
            <span className="battle-status-chip">AI 평가 중</span>
            <button
              className="battle-complete-button"
              type="button"
              onClick={(event) => stopAndRun(event, onCompleteEvaluation)}
            >
              AI 평가 완료
            </button>
          </>
        )}
        {isCompleted && (
          <>
            <span className="battle-status-chip is-complete">AI 평가 완료</span>
            <button
              className="battle-winner-button"
              type="button"
              onClick={(event) => stopAndRun(event, onOpenWinnerModal)}
            >
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

          {battle.type === 'OPTION' && !isCompleted && safeOptions.length > 0 && (
            <div className="battle-option-list" aria-label="선택지">
              {safeOptions.map((option) => (
                <button
                  className={`battle-option-pill${selectedOption === option ? ' is-selected' : ''}`}
                  type="button"
                  key={`${battle.id}-${option}`}
                  aria-pressed={selectedOption === option}
                  disabled={!isOpen}
                  onClick={(event) => stopAndRun(event, () => onOptionSelect(option))}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {battle.type === 'OPTION' && isCompleted && result.optionResults && (
            <div className="battle-result-options" aria-label="선택지별 결과">
              {result.optionResults.map((option) => (
                <div
                  className={`battle-result-option${option.label === result.winnerName ? ' is-winner' : ''}`}
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
                <img className="battle-card-thumbnail" src={battle.imageUrl} alt="" />
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
            stopAndRun(event, () => setIsCommentComposerOpen((isOpenValue) => !isOpenValue))
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
        <button className="battle-card-share" type="button" onClick={(event) => event.stopPropagation()}>
          <img className="action-icon-img share-icon-img" src={shareIcon} alt="" aria-hidden="true" />
          공유하기
        </button>
      </div>

      <button
        className={`battle-participate-button${isParticipated ? ' is-complete' : ''}${!isOpen && !isParticipated ? ' is-closed' : ''}`}
        type="button"
        disabled={isParticipated}
        onClick={(event) => stopAndRun(event, onParticipationRequest)}
      >
        {isParticipated ? '참여 완료' : isOpen ? '참여하기' : '마감된 게시글'}
      </button>

      <div className="comment-preview" onClick={(event) => event.stopPropagation()}>
        <p className="comment-preview-title">댓글 {commentCount}</p>

        <div className={`comment-preview-list${hasManyComments ? ' is-scrollable' : ''}`}>
          {battle.comments.length > 0 ? (
            battle.comments.map((comment) => {
              const isCommentLiked = likedCommentIds.includes(comment.id);

              return (
                <div className="comment-preview-item" key={comment.id}>
                  <div className="comment-avatar" aria-hidden="true" />
                  <div className="comment-copy">
                    <strong>{comment.author}</strong>
                    <p>{comment.text}</p>
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
              );
            })
          ) : (
            <p className="comment-empty">아직 댓글이 없습니다. 참여 후 첫 댓글을 남겨보세요.</p>
          )}
        </div>

        {isCommentComposerOpen && (
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

      {isEvaluating && (
        <div className="ai-evaluating-box" role="status">
          <strong>AI 평가 중</strong>
          <p>AI가 댓글의 반응, 우기기 강도, 밈 잠재력을 mock 기준으로 채점하고 있습니다.</p>
        </div>
      )}

      {isCompleted && (
        <div className="ai-result-box">
          <strong>AI 판결문</strong>
          {battle.type !== 'OPTION' && (
            <p className="ai-winner-line">
              우승자 {result.winnerName} · {result.winnerDetail}
            </p>
          )}
          {result.verdictLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </article>
  );
}

export default BattleCard;
