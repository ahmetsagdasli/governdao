import { useEffect, useState } from "react";

interface TxButtonProps {
  onClick: () => void;
  label: string;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  hash?: `0x${string}`;
  error?: Error | null;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

function errorMessage(error: Error): string {
  if ("shortMessage" in error) {
    const shortMessage = (error as { shortMessage?: unknown }).shortMessage;
    if (typeof shortMessage === "string") return shortMessage;
  }
  return error.message;
}

export function TxButton({
  onClick,
  label,
  isPending,
  isConfirming,
  isSuccess,
  hash,
  error,
  disabled,
  variant = "primary",
}: TxButtonProps) {
  const [toast, setToast] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    if (!isSuccess) return;
    setToast({ type: "success", message: `${label} confirmed` });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [isSuccess, label]);

  useEffect(() => {
    if (!error) return;
    setToast({ type: "error", message: errorMessage(error) });
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  const busy = isPending || isConfirming;
  const buttonClasses =
    variant === "primary"
      ? "bg-accent hover:bg-accentHover text-white font-medium rounded-xl px-5 py-2.5 shadow-sm disabled:opacity-40"
      : "bg-surface2 border border-border text-ink hover:border-accent/40 font-medium rounded-xl px-5 py-2.5 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className={`${buttonClasses} inline-flex items-center justify-center gap-2 transition-colors`}
      >
        {busy && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        )}
        {isPending ? "Confirm in wallet" : isConfirming ? "Pending…" : label}
      </button>
      {isConfirming && hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted hover:text-accent"
        >
          {hash.slice(0, 10)}…{hash.slice(-8)}
        </a>
      )}
      {toast && (
        <span
          className={`text-xs ${
            toast.type === "success" ? "text-success" : "text-danger"
          }`}
        >
          {toast.message}
        </span>
      )}
    </div>
  );
}
