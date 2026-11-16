import type { IconProps } from "./types";

export function Trending({
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
          d="M21 7.5L13.75 14.75 9.25 10.25 3 16.5m18-9H15.5m5.5 0V13"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M21.75 7.5a.75.75 0 00-.75-.75H15.5a.75.75 0 000 1.5h3.69l-5.97 5.97-4.5-4.5a.75.75 0 00-1.06 0l-7 7a.75.75 0 101.06 1.06l6.47-6.47 4.5 4.5a.75.75 0 001.06 0l6.5-6.5v3.69a.75.75 0 001.5 0V7.5z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

