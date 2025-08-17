
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
const buttonVariants = cva("inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",{variants:{variant:{default:"bg-primary text-primary-foreground hover:opacity-90",secondary:"bg-secondary text-secondary-foreground hover:opacity-90",outline:"border border-input bg-background hover:bg-secondary/50",ghost:"hover:bg-secondary/70"},size:{default:"h-10 px-4 py-2",sm:"h-9 px-3",lg:"h-11 px-6"}},defaultVariants:{variant:"default",size:"default"}})
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = "Button"
export { Button, buttonVariants }
