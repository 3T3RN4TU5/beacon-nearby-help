import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'danger' | 'outline' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[inset_0_-2px_0_rgb(0_0_0/0.18),0_8px_24px_-10px_var(--accent)] hover:brightness-105',
  danger:
    'bg-danger text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.2),0_10px_30px_-12px_var(--danger)] hover:brightness-110',
  outline: 'border border-line-strong bg-surface/60 text-fg hover:bg-raised hover:border-subtle/60',
  ghost: 'text-muted hover:bg-raised hover:text-fg',
  subtle: 'bg-raised text-fg hover:bg-line-strong/60',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2.5 rounded-xl px-5 text-[15px]',
  xl: 'h-14 gap-3 rounded-2xl px-7 text-base',
};

function buttonClass({ variant = 'outline', size = 'md' }: { variant?: Variant; size?: Size } = {}) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center font-semibold tracking-tight whitespace-nowrap',
    'transition-[background-color,border-color,filter,transform,color] duration-150 active:scale-[0.97]',
    'disabled:opacity-45 disabled:active:scale-100',
    VARIANTS[variant],
    SIZES[size],
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonClass({ variant, size }), className)} {...props} />
  );
});

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  external?: boolean;
}

export function ButtonLink({ variant, size, className, external, ...props }: ButtonLinkProps) {
  return (
    <a
      className={cn(buttonClass({ variant, size }), className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

const ICON_SIZES = { sm: 'size-8 rounded-lg', md: 'size-10 rounded-xl', lg: 'size-12 rounded-xl' };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(buttonClass({ variant }), 'px-0', ICON_SIZES[size], className)}
      {...props}
    />
  );
});
