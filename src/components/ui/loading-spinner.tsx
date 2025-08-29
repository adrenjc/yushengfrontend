"use client"

import { Spinner } from "@nextui-org/react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  label?: string
  className?: string
}

export function LoadingSpinner({ 
  size = "md", 
  label = "加载中...",
  className 
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <Spinner 
        size={size}
        label={label}
        color="primary"
      />
    </div>
  )
}
