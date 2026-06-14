interface ShareIconProps {
  className?: string;
}

export function ShareIcon({ className }: ShareIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 13 13"
      aria-hidden="true"
      focusable="false"
    >
      <path className="share-action-rail" d="M3.65 6.9 8.95 3.8M3.65 6.9 8.95 9.2" />
      <path className="share-action-line" d="M3.65 6.9 8.95 3.8M3.65 6.9 8.95 9.2" />
      <circle className="share-action-node" cx="2.8" cy="7" r="2" />
      <circle className="share-action-node" cx="10.05" cy="3.15" r="2" />
      <circle className="share-action-node" cx="10.05" cy="9.85" r="2" />
    </svg>
  );
}
