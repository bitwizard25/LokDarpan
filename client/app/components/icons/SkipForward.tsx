import type { IconProps } from "./types";

export function SkipForward({
  size = 24,
  variant = "filled",
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
      <path
        d="M5.5 6.2a.75.75 0 011.16-.62l7 4.8a.75.75 0 010 1.24l-7 4.8A.75.75 0 015.5 15.8V6.2z"
        fill="currentColor"
      />
      <rect x="16" y="5.5" width="2.5" height="13" rx="1.25" fill="currentColor" />
    </svg>
  );
}

