interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = 'h-7 w-7' }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        className="fill-teal-700 dark:fill-teal-600"
      />
      <path
        d="M16 8.5C11.86 8.5 8.5 11.86 8.5 16C8.5 20.14 11.86 23.5 16 23.5C19.6 23.5 22.6 20.97 23.33 17.59H16.5V15H23.43C23.48 15.33 23.5 15.66 23.5 16"
        stroke="white"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="11" r="1.75" fill="white" />
    </svg>
  );
}
