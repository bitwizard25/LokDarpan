import type { IconProps } from "./types";

export function CaptionsCC({
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth={1.75}
        fill={variant === "filled" ? "currentColor" : "none"}
      />
      <path
        d="M10.25 10.25a2 2 0 00-3.5 1.5v.5a2 2 0 003.5 1.5m6.5-3.5a2 2 0 00-3.5 1.5v.5a2 2 0 003.5 1.5"
        stroke={variant === "filled" ? "#09090B" : "currentColor"}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

