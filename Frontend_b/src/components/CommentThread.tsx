import React, { useState } from 'react';
import heartIcon from '../../assets/action-icons/heart.svg';
import type { PreviewComment } from '../mocks/battles';

interface CommentThreadProps {
  comments: PreviewComment[];
  likedCommentIds: string[];
  onCommentLike: (commentId: string) => void;
  onReplyAdd: (parentCommentId: string, text: string) => void;
  maxDepth?: number;
  variant?: 'preview' | 'detail';
}

export function CommentThread({
  comments,
  likedCommentIds,
  onCommentLike,
  onReplyAdd,
  maxDepth = 2,
  variant = 'preview',
}: CommentThreadProps) {
  if (comments.length === 0) {
    return <p className="comment-empty">아직 댓글이 없습니다. 참여 후 첫 댓글을 남겨보세요.</p>;
  }

  return (
    <div className={`comment-thread comment-thread-${variant}`}>
      {comments.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          depth={0}
          maxDepth={maxDepth}
          likedCommentIds={likedCommentIds}
          onCommentLike={onCommentLike}
          onReplyAdd={onReplyAdd}
        />
      ))}
    </div>
  );
}

interface CommentNodeProps {
  comment: PreviewComment;
  depth: number;
  maxDepth: number;
  likedCommentIds: string[];
  onCommentLike: (commentId: string) => void;
  onReplyAdd: (parentCommentId: string, text: string) => void;
}

function CommentNode({
  comment,
  depth,
  maxDepth,
  likedCommentIds,
  onCommentLike,
  onReplyAdd,
}: CommentNodeProps) {
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const isCommentLiked = likedCommentIds.includes(comment.id);
  const canReply = depth < maxDepth;

  const handleReplySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextReply = replyInput.trim();

    if (!nextReply) {
      return;
    }

    onReplyAdd(comment.id, nextReply);
    setReplyInput('');
    setIsReplyOpen(false);
  };

  return (
    <div className={`comment-thread-item depth-${depth}`}>
      <div className="comment-thread-row">
        <div className="comment-avatar" aria-hidden="true" />
        <div className="comment-thread-copy">
          <strong>{comment.author}</strong>
          <p>{comment.text}</p>
          {canReply && (
            <button className="comment-reply-toggle" type="button" onClick={() => setIsReplyOpen((value) => !value)}>
              답글 달기
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

      {isReplyOpen && (
        <form className="comment-reply-form" onSubmit={handleReplySubmit}>
          <input
            value={replyInput}
            onChange={(event) => setReplyInput(event.target.value)}
            placeholder="답글을 입력하세요"
            aria-label={`${comment.author}에게 답글 입력`}
          />
          <button type="submit">등록</button>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              maxDepth={maxDepth}
              likedCommentIds={likedCommentIds}
              onCommentLike={onCommentLike}
              onReplyAdd={onReplyAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentThread;
