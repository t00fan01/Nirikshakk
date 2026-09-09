import WalletInvestigation from './WalletInvestigation';

interface AccountInvestigationProps {
    accountId: string;
    onBack: () => void;
    onExploreInGraph?: (walletAddress: string) => void;
}

/**
 * Backward-compatible adapter for WalletInvestigation console.
 * Preserves existing component interfaces while redirecting to the Bitcoin-native investigation dossier.
 */
export default function AccountInvestigation({ accountId, onBack, onExploreInGraph }: AccountInvestigationProps) {
    return <WalletInvestigation walletId={accountId} onBack={onBack} onExploreInGraph={onExploreInGraph} />;
}
