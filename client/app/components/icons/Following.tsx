import type { IconProps } from "./types";

export function Following({
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
          {/* Main User */}
          <circle
            cx="9"
            cy="7.5"
            r="3.5"
            stroke="currentColor"
            strokeWidth={1.75}
          />
          <path
            d="M3 19.5c0-3.3 2.7-6 6-6s6 2.7 6 6"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
          {/* Secondary User */}
          <path
            d="M15.5 4.5a3.5 3.5 0 010 6M18 14c2.2.6 3.5 2.5 3.5 5.5"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="9" cy="7.5" r="3.75" fill="currentColor" />
          <path
            d="M2.5 19.5a6.5 6.5 0 0113 0c0 .4-.3.75-.75.75H3.25c-.4 0-.75-.35-.75-.75z"
            fill="currentColor"
          />
          <path
            d="M15.5 4.5a3.5 3.5 0 010 6 .75.75 0 00.75.75c1.8 0 3.25-1.45 3.25-3.25S18.05 4.75 16.25 4.75a.75.75 0 00-.75-.25zM17.5 13.5a6.5 6.5 0 014 6c0 .4-.3.75-.75.75h-3.5a.75.75 0 01-.75-.75c0-2.3-1.1-4.3-2.8-5.5a.75.75 0 01.3-1.3c1.2.2 2.4.5 3.5.8z"
            fill="currentColor"
          />
        </>
      )}
    </svg>
  );
}

