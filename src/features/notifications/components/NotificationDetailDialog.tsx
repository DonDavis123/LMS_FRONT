"use client";

import { Bell } from "lucide-react";
import Modal from "@/shared/components/Modal";
import { notificationTime, type Notification } from "@/features/notifications/types/notification.types";
import { formatLocalDateTime } from "@/shared/utils/dateTime";

interface NotificationDetailDialogProps {
  notification: Notification | null;
  onClose: () => void;
}

/**
 * Compact detail box for custom notifications (ones that don't belong to a
 * task or meeting). Shows exactly what the notification payload contains.
 */
export default function NotificationDetailDialog({ notification, onClose }: NotificationDetailDialogProps) {
  return (
    <Modal
      isOpen={notification !== null}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      ariaLabelledBy="notification-detail-title"
    >
      {notification && (
        <div className="p-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-ink-soft">
              <Bell size={15} />
            </div>
            <div className="min-w-0">
              <h2 id="notification-detail-title" className="break-words font-serif text-lg leading-snug text-fg">
                {notification.title}
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">{formatLocalDateTime(notificationTime(notification))}</p>
            </div>
          </div>

          <p className="mt-4 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-fg">
            {notification.message}
          </p>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
