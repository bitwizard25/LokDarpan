import type { IconProps } from "./types";

export function SkipBack({
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
      <rect x="5.5" y="5.5" width="2.5" height="13" rx="1.25" fill="currentColor" />
      <path
        d="M18.5 6.2a.75.75 0 00-1.16-.62l-7 4.8a.75.75 0 000 1.24l7 4.8a.75.75 0 001.16-.62V6.2z"
        fill="currentColor"
      />
    </svg>
  );
}

