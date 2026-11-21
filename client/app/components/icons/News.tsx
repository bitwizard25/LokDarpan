import type { IconProps } from "./types";

export function News({
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
        d="M4 19.5v-13A2.5 2.5 0 016.5 4H18a2 2 0 012 2v13.5a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 19.5zM4 18h14.5a1.5 1.5 0 001.5-1.5V17"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.5h4M8 12.5h8M8 15.5h6"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  );
}

