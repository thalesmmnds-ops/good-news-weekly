import { CATEGORY_LABELS, type Category } from "@/lib/schema";

export function CategoryKicker({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return (
    <span
      className={`u-caps${className ? ` ${className}` : ""}`}
      style={{ color: `var(--${category})` }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
