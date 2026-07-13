interface StateStyle {
  label: string;
  classes: string;
}

const STATE_STYLES: Record<number, StateStyle> = {
  0: { label: "Pending", classes: "bg-warn/10 text-warn border-warn/20" },
  1: { label: "Active", classes: "bg-accent/10 text-accent border-accent/20" },
  2: { label: "Canceled", classes: "bg-muted/10 text-muted border-muted/20" },
  3: {
    label: "Defeated",
    classes: "bg-danger/10 text-danger border-danger/20",
  },
  4: {
    label: "Succeeded",
    classes: "bg-success/10 text-success border-success/20",
  },
  5: { label: "Queued", classes: "bg-accent/10 text-accent border-accent/20" },
  6: { label: "Expired", classes: "bg-muted/10 text-muted border-muted/20" },
  7: {
    label: "Executed",
    classes: "bg-success/10 text-success border-success/20",
  },
};

export function ProposalStateBadge({ state }: { state: number | undefined }) {
  if (state === undefined) {
    return (
      <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-surface2 text-muted border border-border animate-pulse">
        Loading
      </span>
    );
  }

  const config = STATE_STYLES[state];

  return (
    <span
      className={`text-xs font-medium rounded-full px-2.5 py-0.5 border ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
