"use client"

import { useEffect } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  useDisclosure,
} from "@nextui-org/react"
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import { useAppStore } from "@/stores/app"
import { ANIMATION } from "@/constants"

interface NotificationItemProps {
  id: string
  type: "success" | "warning" | "error" | "info"
  title: string
  message: string
  onClose: () => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  onClose,
}) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-success" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-danger" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case "info":
        return <Info className="h-5 w-5 text-primary" />
      default:
        return <Info className="h-5 w-5 text-default-500" />
    }
  }

  const getColorClass = () => {
    switch (type) {
      case "success":
        return "border-success/20 bg-success/10"
      case "error":
        return "border-danger/20 bg-danger/10"
      case "warning":
        return "border-warning/20 bg-warning/10"
      case "info":
        return "border-primary/20 bg-primary/10"
      default:
        return "border-default/20 bg-default/10"
    }
  }

  return (
    <div
      className={`relative flex transform items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out ${getColorClass()} `}
    >
      <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>

      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="mt-1 break-words text-sm text-default-600">{message}</p>
      </div>

      <Button
        isIconOnly
        variant="light"
        size="sm"
        className="-mr-1 -mt-1 h-6 w-6 min-w-0 flex-shrink-0"
        onPress={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * 通知容器组件 - 显示toast风格的通知
 */
export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useAppStore()

  // 只显示未读的通知，限制最多显示5个
  const visibleNotifications = notifications.filter(n => !n.read).slice(0, 5)

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className="fixed right-4 top-4 z-50 w-full max-w-sm space-y-3">
      {visibleNotifications.map(notification => (
        <NotificationItem
          key={notification.id}
          id={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

/**
 * 模态框风格的通知组件 - 用于重要错误
 */
export const NotificationModal: React.FC = () => {
  const { notifications, removeNotification, markNotificationAsRead } =
    useAppStore()
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  // 查找第一个错误类型的未读通知
  const errorNotification = notifications.find(
    n => n.type === "error" && !n.read
  )

  useEffect(() => {
    if (errorNotification) {
      onOpen()
    }
  }, [errorNotification, onOpen])

  const handleClose = () => {
    if (errorNotification) {
      markNotificationAsRead(errorNotification.id)
      // 延迟移除，让模态框关闭动画完成
      setTimeout(() => {
        removeNotification(errorNotification.id)
      }, ANIMATION.DURATION.MEDIUM)
    }
  }

  if (!errorNotification) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={handleClose}
      size="md"
      backdrop="blur"
      placement="center"
      hideCloseButton={false}
      isDismissable={true}
      isKeyboardDismissDisabled={false}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
    >
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                <span className="font-semibold text-danger">
                  {errorNotification.title}
                </span>
              </div>
            </ModalHeader>

            <ModalBody className="pb-6">
              <p className="text-default-700">{errorNotification.message}</p>

              <div className="mt-4 flex justify-end">
                <Button
                  color="primary"
                  variant="solid"
                  onPress={() => {
                    onClose()
                    handleClose()
                  }}
                >
                  确定
                </Button>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

/**
 * 通知提供者组件 - 同时提供toast和模态框通知
 */
export const NotificationProvider: React.FC = () => {
  return (
    <>
      <NotificationContainer />
      <NotificationModal />
    </>
  )
}
