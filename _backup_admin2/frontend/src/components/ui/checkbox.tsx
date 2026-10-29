"use client"

import * as React from "react"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={`
          peer h-4 w-4 shrink-0 rounded-[4px] border border-gray-300 
          appearance-none checked:bg-blue-600 checked:border-blue-600
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:cursor-not-allowed disabled:opacity-50
          transition-all cursor-pointer
          relative
          after:content-[''] after:absolute after:hidden after:checked:block
          after:left-[6px] after:top-[2px] after:w-[6px] after:h-[10px]
          after:border-white after:border-r-2 after:border-b-2 after:rotate-45
          ${className}
        `}
        {...props}
      />
    )
  }
)

Checkbox.displayName = "Checkbox"