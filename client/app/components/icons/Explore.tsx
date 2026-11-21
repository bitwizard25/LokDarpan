import type { IconProps } from "./types";

export function Explore({
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
          <circle
            cx="12"
            cy="12"
            r="9.25"
            stroke="currentColor"
            strokeWidth={1.75}
          />
          <path
            d="M15.5 8.5L10 10.5l-1.5 5 5.5-2 1.5-5z"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="1.25" fill="currentColor" />
        </>
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.72 6.28a.75.75 0 00-.8-.19l-5.5 2a.75.75 0 00-.45.45l-2 5.5a.75.75 0 00.99.99l5.5-2a.75.75 0 00.45-.45l2-5.5a.75.75 0 00-.19-.8zM12 13.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

