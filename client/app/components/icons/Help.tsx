import type { IconProps } from "./types";

export function Help({
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
        cx="12"
        cy="12"
        r="9.25"
        stroke="currentColor"
        strokeWidth={1.75}
      />
      <path
        d="M9.5 9.25a2.5 2.5 0 014.8 1c0 1.25-1.8 1.75-1.8 3.25m-.5 3.5h.01"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

