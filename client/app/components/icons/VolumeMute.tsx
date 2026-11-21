import type { IconProps } from "./types";

export function VolumeMute({
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
      <path
        d="M4 14.5h3.5l4.5 4.5V5L7.5 9.5H4a1 1 0 00-1 1v3a1 1 0 001 1z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={variant === "filled" ? "currentColor" : "none"}
      />
      <path
        d="M16 10l5 5M21 10l-5 5"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

