import { type ReactNode } from "react";

/** Centered max-width wrapper matching the 1200px site width used by the header and body. */
export default function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-site px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}
