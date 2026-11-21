import type { IconProps } from "./types";

export function LiveCamera({
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
        y="6"
        width="13"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth={1.75}
        fill={variant === "filled" ? "currentColor" : "none"}
      />
      <path
        d="M16 10l5-3v10l-5-3"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={variant === "filled" ? "currentColor" : "none"}
      />
      <circle cx="7" cy="10" r="1" fill={variant === "filled" ? "#09090B" : "currentColor"} />
    </svg>
  );
}

