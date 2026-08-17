/**
 * SectionHeading - tiêu đề section dùng chung, eyebrow dạng mono/uppercase
 * gợi phong cách "label thuộc tính" của Phantoma.
 */

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: SectionHeadingProps) {
  const alignClasses = align === 'center' ? 'text-center items-center mx-auto' : 'text-left items-start';

  return (
    <div className={`flex flex-col gap-4 max-w-2xl ${alignClasses}`}>
      <span className="font-mono text-xs tracking-[0.2em] uppercase text-cyan-600 dark:text-cyan-400">
        {`// ${eyebrow}`}
      </span>
      <h2 className="font-[Space_Grotesk] text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white text-balance">
        {title}
      </h2>
      {description && (
        <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
