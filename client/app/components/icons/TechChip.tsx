import type { IconProps } from "./types";

export function TechChip({
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
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={1.75}
      />
      <rect
        x="9.5"
        y="9.5"
        width="5"
        height="5"
        rx="1"
        fill={variant === "filled" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.25}
      />
      <path
        d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

