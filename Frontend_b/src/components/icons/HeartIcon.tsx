interface HeartIconProps {
  className?: string;
}

export function HeartIcon({ className }: HeartIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 49 43"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="heart-action-shape"
        d="M24.5 40.7C17.2 34.5 10.8 28.5 6.6 23C2.6 17.8 1.3 12.5 3.3 8.3C5.1 4.5 8.8 2 13.2 2C18.3 2 21.9 4.9 24.5 8.8C27.1 4.9 30.7 2 35.8 2C40.2 2 43.9 4.5 45.7 8.3C47.7 12.5 46.4 17.8 42.4 23C38.2 28.5 31.8 34.5 24.5 40.7Z"
      />
    </svg>
  );
}
