import React, { useMemo, useState } from 'react';
import { getMockBattleResult, type FeedBattle, type PreviewComment } from '../mocks/battles';

interface BattleCardProps {
  battle: FeedBattle;
  selectedOption: string | null;
  isParticipated: boolean;
  onOptionSelect: (option: string) => void;
  onParticipationRequest: () => void;
  onCloseBattle: () => void;
  onCompleteEvaluation: () => void;
  onOpenWinnerModal: () => void;
}

export function BattleCard({
  battle,
  selectedOption,
  isParticipated,
  onOptionSelect,
  onParticipationRequest,
  onCloseBattle,
  onCompleteEvaluation,
  onOpenWinnerModal,
}: BattleCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(battle.likeCount);
  const [comments, setComments] = useState<PreviewComment[]>(battle.comments);
  const [likedCommentIds, setLikedCommentIds] = useState<Record<string, boolean>>({});
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const result = useMemo(() => getMockBattleResult(battle), [battle]);
  const commentCount = comments.length;
  const isOpen = battle.status === 'OPEN';
  const isEvaluating = battle.status === 'EVALUATING';
  const isCompleted = battle.status === 'COMPLETED';
  const cardClassName = `battle-card battle-card-${battle.type.toLowerCase().replace('_', '-')}`;
  const hasManyComments = comments.length > 2;

  const safeOptions = useMemo(() => {
    if (battle.type !== 'OPTION') {
      return [];
    }

    return (battle.options ?? []).filter(Boolean);
  }, [battle.options, battle.type]);

  const handleLikeClick = () => {
    setLikeCount((count) => count + (isLiked ? -1 : 1));
    setIsLiked((liked) => !liked);
  };

  const handleCommentLikeClick = (commentId: string) => {
    const wasLiked = Boolean(likedCommentIds[commentId]);

    setComments((currentComments) =>
      currentComments.map((comment) =>
        comment.id === commentId
          ? { ...comment, likeCount: comment.likeCount + (wasLiked ? -1 : 1) }
          : comment,
      ),
    );

    setLikedCommentIds((currentLikedIds) => ({
      ...currentLikedIds,
      [commentId]: !wasLiked,
    }));
  };

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextComment = commentInput.trim();
    if (!nextComment) {
      return;
    }

    setComments((currentComments) => [
      ...currentComments,
      {
        id: `${battle.id}-local-comment-${Date.now()}`,
        author: '나',
        text: nextComment,
        likeCount: 0,
      },
    ]);
    setCommentInput('');
    setIsCommentComposerOpen(false);
  };

  return (
    <article className={cardClassName}>
      <div className="battle-status-row">
        {isOpen && (
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
      </div>

      <div className="battle-card-main">
        <div className="battle-card-avatar" aria-hidden="true" />
        <div className="battle-card-body">
          <p className="battle-card-author">{battle.author}</p>
          <h2 className="battle-card-title">{battle.title}</h2>
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
                  onClick={() => onOptionSelect(option)}
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
          onClick={() => setIsCommentComposerOpen((isOpenValue) => !isOpenValue)}
        >
          <span className="comment-icon" aria-hidden="true" />
          댓글 {commentCount}
        </button>
        <button
          className={`battle-card-action like-action${isLiked ? ' is-liked' : ''}`}
          type="button"
          aria-pressed={isLiked}
          onClick={handleLikeClick}
        >
          <span className="heart-icon" aria-hidden="true" />
          좋아요 {likeCount}
        </button>
        <button className="battle-card-share" type="button">
          <span className="share-icon" aria-hidden="true" />
          공유하기
        </button>
      </div>

      <button
        className={`battle-participate-button${isParticipated ? ' is-complete' : ''}`}
        type="button"
        disabled={!isOpen || isParticipated}
        onClick={onParticipationRequest}
      >
        {isParticipated ? '참여 완료' : isOpen ? '참여하기' : '참여 마감'}
      </button>

      <div className="comment-preview">
        <p className="comment-preview-title">댓글 {commentCount}</p>

        <div className={`comment-preview-list${hasManyComments ? ' is-scrollable' : ''}`}>
          {comments.length > 0 ? (
            comments.map((comment) => {
              const isCommentLiked = Boolean(likedCommentIds[comment.id]);

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
                    onClick={() => handleCommentLikeClick(comment.id)}
                  >
                    <span className="comment-heart" aria-hidden="true" />
                    <small>{comment.likeCount}</small>
                  </button>
                </div>
              );
            })
          ) : (
            <p className="comment-empty">아직 댓글이 없습니다. 첫 우기기를 남겨보세요.</p>
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
          <p>AI가 댓글의 밈력, 설득력, 억지력을 mock 기준으로 채점하고 있습니다.</p>
        </div>
      )}

      {isCompleted && (
        <div className="ai-result-box">
          <strong>AI 판결문</strong>
          {battle.type !== 'OPTION' && (
            <p className="ai-winner-line">
              우승자: {result.winnerName} · {result.winnerDetail}
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
