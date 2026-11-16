import type { IconProps } from "./types";

export function Bookmark({
  size = 24,
  variant = "outline",
  className = "",
  ...props
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {variant === "outline" ? (
        <path
          d="M6 4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5v16.5l-6-3.75L6 21V4.5z"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M7.5 3A1.5 1.5 0 006 4.5v16.5a.75.75 0 001.15.64L12 18.2l4.85 3.44A.75.75 0 0018 21V4.5A1.5 1.5 0 0016.5 3h-9z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

