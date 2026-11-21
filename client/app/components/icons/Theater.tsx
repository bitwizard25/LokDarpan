import type { IconProps } from "./types";

export function Theater({
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
        <>
          <path
            d="M8.5 3.5l3.5 3.5m3.5-3.5L12 7"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="3"
            stroke="currentColor"
            strokeWidth={1.75}
          />
          <circle cx="17.5" cy="11" r="0.8" fill="currentColor" />
          <circle cx="17.5" cy="15" r="0.8" fill="currentColor" />
          <path
            d="M6 10.5h8.5v6H6z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M8.5 3.5l3.5 3.5m3.5-3.5L12 7"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6 7h12a3 3 0 013 3v7a3 3 0 01-3 3H6a3 3 0 01-3-3v-7a3 3 0 013-3zm0 3.5a1 1 0 011-1h7a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6zm11.5.5a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z"
            fill="currentColor"
          />
        </>
      )}
    </svg>
  );
}

