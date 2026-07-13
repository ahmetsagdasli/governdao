import { useDelegate } from "../hooks/useDelegate";
import { TxButton } from "./TxButton";

export function DelegateBanner() {
  const {
    needsDelegation,
    delegateToSelf,
    isPending,
    isConfirming,
    isSuccess,
    error,
  } = useDelegate();

  if (!needsDelegation) return null;

  return (
    <div className="rounded-2xl border border-warn/30 bg-warn/5 p-4 flex items-center justify-between gap-4">
      <p className="text-sm text-warn">
        Your tokens aren&apos;t delegated — you have no voting power.
      </p>
      <TxButton
        onClick={delegateToSelf}
        label="Delegate to self"
        isPending={isPending}
        isConfirming={isConfirming}
        isSuccess={isSuccess}
        error={error}
        variant="secondary"
      />
    </div>
  );
}
