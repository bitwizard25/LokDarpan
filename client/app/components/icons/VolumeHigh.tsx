import type { IconProps } from "./types";

export function VolumeHigh({
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
        d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

