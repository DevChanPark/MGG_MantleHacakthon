import React from 'react';

type BattleType = 'OPTION' | 'TEXT_OPEN' | 'IMAGE_CAPTION';
type BattleStatus = 'OPEN' | 'CLOSED' | 'JUDGING' | 'SETTLED' | 'FAILED';

interface PreviewComment {
  author: string;
  text: string;
  likeCount: number;
}

export interface FeedBattle {
  id: string;
  type: BattleType;
  author: string;
  title: string;
  description: string;
  entryCount: number;
  likeCount: number;
  status: BattleStatus;
  imageUrl?: string;
  comments: PreviewComment[];
}

interface BattleCardProps {
  battle: FeedBattle;
}

export function BattleCard({ battle }: BattleCardProps) {
  const handleClick = () => {
    window.location.hash =
      battle.status === 'SETTLED' ? `battles/${battle.id}/result` : `battles/${battle.id}`;
  };

  return (
    <article className="battle-card">
      <button className="battle-card-main" type="button" onClick={handleClick}>
        <div className="battle-card-avatar" aria-hidden="true" />
        <div className="battle-card-body">
          <p className="battle-card-author">{battle.author}</p>
          <h2 className="battle-card-title">{battle.title}</h2>
          <p className="battle-card-description">{battle.description}</p>
          {battle.imageUrl && (
            <img className="battle-card-thumbnail" src={battle.imageUrl} alt="" />
          )}
        </div>
      </button>

      <div className="battle-card-actions" aria-label="배틀 활동">
        <span className="battle-card-action">
          <span className="comment-icon" aria-hidden="true" />
          댓글 {battle.entryCount}
        </span>
        <span className="battle-card-action">
          <span className="heart-icon" aria-hidden="true" />
          좋아요 {battle.likeCount}
        </span>
        <button className="battle-card-share" type="button">
          <span className="share-icon" aria-hidden="true" />
          공유하기
        </button>
      </div>

      <div className="comment-preview">
        <p className="comment-preview-title">댓글 {battle.entryCount}</p>
        {battle.comments.map((comment) => (
          <div className="comment-preview-item" key={`${battle.id}-${comment.author}`}>
            <div className="comment-avatar" aria-hidden="true" />
            <div className="comment-copy">
              <strong>{comment.author}</strong>
              <p>{comment.text}</p>
            </div>
            <span className="comment-like" aria-label={`좋아요 ${comment.likeCount}개`}>
              ♡
              <small>{comment.likeCount}</small>
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default BattleCard;
