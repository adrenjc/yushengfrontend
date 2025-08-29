"use client"

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@nextui-org/react"
import { AlertTriangle, Trash2, Info, HelpCircle } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  message: string
  type?: "warning" | "danger" | "info" | "question"
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  message,
  type = "warning",
  confirmText = "确认",
  cancelText = "取消",
  isLoading = false,
}: ConfirmModalProps) {
  const getIcon = () => {
    switch (type) {
      case "danger":
        return <Trash2 className="h-8 w-8 text-danger" />
      case "warning":
        return <AlertTriangle className="h-8 w-8 text-warning" />
      case "info":
        return <Info className="h-8 w-8 text-primary" />
      case "question":
        return <HelpCircle className="h-8 w-8 text-primary" />
      default:
        return <AlertTriangle className="h-8 w-8 text-warning" />
    }
  }

  const getConfirmColor = () => {
    switch (type) {
      case "danger":
        return "danger"
      case "warning":
        return "warning"
      case "info":
        return "primary"
      case "question":
        return "primary"
      default:
        return "warning"
    }
  }

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      backdrop="blur"
      placement="center"
      size="sm"
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: "border-none shadow-2xl",
        header: "border-b border-divider",
        body: "py-6",
        footer: "border-t border-divider",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {getIcon()}
            <span className="text-xl font-semibold">{title}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="leading-relaxed text-default-600">{message}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            color={getConfirmColor() as any}
            onPress={handleConfirm}
            isLoading={isLoading}
            startContent={
              !isLoading && type === "danger" ? (
                <Trash2 className="h-4 w-4" />
              ) : undefined
            }
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
