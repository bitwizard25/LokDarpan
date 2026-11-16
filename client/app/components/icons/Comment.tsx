import type { IconProps } from "./types";

export function Comment({
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
      {variant === "outline" ? (
        <path
          d="M7.5 18l-3.5 2.5V5a2 2 0 012-2h12a2 2 0 012 2v11a2 2 0 01-2 2H7.5zM8 8.5h8M8 12.5h5"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6 3a3 3 0 00-3 3v15.25a.75.75 0 001.2.6L8 19h10a3 3 0 003-3V6a3 3 0 00-3-3H6zm2 5a.75.75 0 000 1.5h8a.75.75 0 000-1.5H8zm0 4a.75.75 0 000 1.5h5a.75.75 0 000-1.5H8z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

