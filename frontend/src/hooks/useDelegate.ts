import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { zeroAddress } from "viem";
import { TOKEN_ADDRESS, tokenAbi } from "../config/contracts";

export function useDelegate() {
  const { address } = useAccount();

  const { data: balance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: delegatee, refetch: refetchDelegatee } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "delegates",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const isDelegated = delegatee !== undefined && delegatee !== zeroAddress;
  const needsDelegation =
    Boolean(address) && (balance ?? 0n) > 0n && !isDelegated;

  const delegateToSelf = () => {
    if (!address) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: "delegate",
      args: [address],
    });
  };

  return {
    balance,
    delegatee,
    needsDelegation,
    delegateToSelf,
    isPending,
    isConfirming,
    isSuccess,
    error,
    refetchDelegatee,
  };
}
