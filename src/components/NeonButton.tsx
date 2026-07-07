import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'cyan' | 'magenta' | 'lime'
}

export function NeonButton({ variant = 'cyan', className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      className={`neon-btn neon-btn--${variant} ${className}`.trim()}
      {...rest}
    />
  )
}
