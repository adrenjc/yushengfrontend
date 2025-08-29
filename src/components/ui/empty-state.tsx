"use client"

import { Button } from "@nextui-org/react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-default-100 p-6 text-default-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-default-500">{description}</p>
      )}
      {action && (
        <Button
          color="primary"
          variant="flat"
          onPress={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
