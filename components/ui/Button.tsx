import Link from "next/link";
import { type ReactNode } from "react";

type Variant = "gold" | "outline";

/** The site's pill button. Renders a next/link when `href` is set, else a <button>. */
export default function Button({
  children,
  href,
  variant = "gold",
  className = "",
  target,
  type,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  variant?: Variant;
  className?: string;
  target?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  const cls = `${variant === "gold" ? "btn-gold" : "btn-outline"} ${className}`;
  if (href) {
    const external = /^https?:|^mailto:|^tel:/.test(href);
    if (external) {
      return (
        <a href={href} target={target ?? "_blank"} rel="noreferrer noopener" className={cls}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
