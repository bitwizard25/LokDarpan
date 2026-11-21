import type { IconProps } from "./types";

export function Music({
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
      <circle
        cx="7.5"
        cy="17.5"
        r="3.5"
        stroke="currentColor"
        strokeWidth={1.75}
        fill={variant === "filled" ? "currentColor" : "none"}
      />
      <circle
        cx="17.5"
        cy="14.5"
        r="3.5"
        stroke="currentColor"
        strokeWidth={1.75}
        fill={variant === "filled" ? "currentColor" : "none"}
      />
      <path
        d="M11 17.5V6l10-3v11.5"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 9.5l10-3"
        stroke="currentColor"
        strokeWidth={1.75}
      />
    </svg>
  );
}

