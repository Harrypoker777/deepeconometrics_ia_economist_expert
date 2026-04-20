import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/92',
        outline: 'border border-border/80 bg-background/80 text-foreground hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-secondary/70',
        secondary: 'bg-secondary/85 text-secondary-foreground hover:bg-secondary',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button
    className={cn(buttonVariants({ variant, size, className }))}
    ref={ref}
    {...props}
  />
));

Button.displayName = 'Button';

export { Button, buttonVariants };
