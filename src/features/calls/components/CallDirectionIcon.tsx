import { PhoneIncoming, PhoneOutgoing } from "lucide-react";

/** Round icon showing whether a call was inbound or outbound. */
export default function CallDirectionIcon({ callType, size = 16, className = "" }: { callType: string; size?: number; className?: string }) {
  const inbound = callType === "Inbound";
  const Icon = inbound ? PhoneIncoming : PhoneOutgoing;
  return (
    <span
      title={`${inbound ? "Inbound" : "Outbound"} call`}
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-light text-slate ${className}`}
    >
      <Icon size={size} />
    </span>
  );
}
