interface ShareIconProps {
  className?: string;
}

export function ShareIcon({ className }: ShareIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 20"
      aria-hidden="true"
      focusable="false"
    >
      <path className="share-action-line" d="M7.2 10.1 16 5.2M7.2 10.1 16 14.8" />
      <circle className="share-action-node" cx="5.2" cy="10.1" r="4" />
      <circle className="share-action-node" cx="18.8" cy="4.4" r="4" />
      <circle className="share-action-node" cx="18.8" cy="15.6" r="4" />
    </svg>
  );
}
