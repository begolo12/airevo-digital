import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const variants = {
  primary:
    "bg-emphasis text-on-emphasis hover:bg-emphasis-hover border-emphasis shadow-[0_2px_0_0_rgba(35,32,29,0.25)]",
  accent:
    "bg-tomato text-white hover:bg-tomato-deep border-tomato-deep shadow-[0_2px_0_0_rgba(194,64,42,0.35)]",
  soft: "bg-card text-ink hover:bg-paper-deep border-line-strong",
  ghost: "bg-transparent text-ink hover:bg-paper-deep border-transparent",
  danger: "bg-transparent text-danger hover:bg-tomato/10 border-transparent",
} as const;

const sizes = {
  sm: "h-8 px-3 text-base",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-md",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"a"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <a
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function Note({
  children,
  className,
  tilt,
  tape,
}: {
  children: ReactNode;
  className?: string;
  tilt?: "left" | "right";
  tape?: boolean;
}) {
  return (
    <div
      className={cx(
        "note relative",
        tape && "tape",
        tilt === "left" && "note-tilt-left",
        tilt === "right" && "note-tilt-right",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "mint" | "butter" | "tomato" | "sky" | "plum";
  className?: string;
}) {
  const tones = {
    neutral: "bg-paper-deep text-ink-soft border-line-strong",
    mint: "bg-mint/60 text-ink border-mint-deep",
    butter: "bg-butter/70 text-ink border-butter-deep",
    tomato: "bg-tomato/15 text-tomato-ink border-tomato/40",
    sky: "bg-sky/60 text-ink border-sky-deep",
    plum: "bg-plum/45 text-ink border-plum",
  } as const;

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-base font-semibold text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-[10px] border border-line-strong bg-card px-3 text-base text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none";

export const selectClass = inputClass;

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-line-strong bg-card/60 px-6 py-10 text-center">
      <span className="hand text-xl text-muted">belum ada apa-apa di sini</span>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="label-eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="text-2xl sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
