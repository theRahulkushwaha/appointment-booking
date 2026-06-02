export type SlotCellStatus =
  | "available"
  | "booked"
  | "closed"
  | "holiday"
  | "past"
  | "non-working";

interface SlotCellProps {
  status: SlotCellStatus;
  timeLabel: string;
  holidayMessage?: string;
  onClick?: () => void;
  className?: string;
}

const statusStyles: Record<SlotCellStatus, string> = {
  available:
    "bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 cursor-pointer slot-available",
  booked: "bg-hover/80 border-border text-secondary line-through cursor-not-allowed",
  closed: "bg-hover/60 border-border text-secondary cursor-not-allowed",
  holiday: "bg-warning/15 border-warning/40 text-warning cursor-not-allowed",
  past: "bg-background/80 border-border text-secondary opacity-50 cursor-not-allowed",
  "non-working": "bg-hover/40 border-border text-secondary cursor-not-allowed",
};

export function SlotCell({
  status,
  timeLabel,
  holidayMessage,
  onClick,
  className = "",
}: SlotCellProps) {
  const isClickable = status === "available" && onClick;

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      title={status === "holiday" ? holidayMessage : undefined}
      className={`relative flex min-h-[2.75rem] md:min-h-[2.25rem] items-center justify-center rounded-lg border px-1 py-2 text-xs font-medium transition-all duration-200 ease-in-out ${statusStyles[status]} ${className}`}
    >
      {status === "booked" ? (
        <span className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] uppercase tracking-wide opacity-70">Booked</span>
          <span className="line-through">{timeLabel}</span>
        </span>
      ) : status === "holiday" && holidayMessage ? (
        <span className="truncate px-0.5" title={holidayMessage}>
          {timeLabel}
        </span>
      ) : (
        <span>{timeLabel}</span>
      )}
    </div>
  );
}
