import { type ReactNode } from "react";

/** Centered max-width wrapper matching the Wix 980px site width. */
export default function Container({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full px-5 sm:px-8 ${wide ? "max-w-[1200px]" : "max-w-site"} ${className}`}
    >
      {children}
    </div>
  );
}
