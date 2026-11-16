import type { IconProps } from "./types";

export function Gaming({
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
        d="M6 11H3.5a1.5 1.5 0 00-1.5 1.5v3a4.5 4.5 0 004.5 4.5h.5l3-2.5h4l3 2.5h.5a4.5 4.5 0 004.5-4.5v-3a1.5 1.5 0 00-1.5-1.5H18M6 8a4 4 0 014-4h4a4 4 0 014 4v3H6V8z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={variant === "filled" ? "currentColor" : "none"}
      />
      <path
        d="M7 13.5v3m-1.5-1.5h3m8-1a1 1 0 100-2 1 1 0 000 2zm2 2a1 1 0 100-2 1 1 0 000 2z"
        stroke={variant === "filled" ? "#09090B" : "currentColor"}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

