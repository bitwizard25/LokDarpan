import type { IconProps } from "./types";

export function Notifications({
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
            d="M6 17h12l-1.5-6a4.5 4.5 0 10-9 0L6 17zm3.5 0a2.5 2.5 0 005 0"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 4V3"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2a1 1 0 011 1v1.12a6 6 0 015 5.88v4.62l1.6 3.2a1 1 0 01-.89 1.43H5.29a1 1 0 01-.89-1.44L6 14.62V10a6 6 0 015-5.88V3a1 1 0 011-1zm-2.5 17a2.5 2.5 0 005 0h-5z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

