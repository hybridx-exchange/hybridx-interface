import { currencyEquals, Swap } from '@hybridx-exchange/uniswap-sdk'
import React, { useCallback, useMemo } from 'react'
import TransactionConfirmationModal, {
  ConfirmationModalContent,
  TransactionErrorContent
} from '../TransactionConfirmationModal'
import SwapModalFooter from './SwapModalFooter'
import SwapModalHeader from './SwapModalHeader'

/**
 * Returns true if the trade requires a confirmation of details before we can submit it
 * @param swapA trade A
 * @param swapB trade B
 */
function swapMeaningfullyDiffers(swapA: Swap, swapB: Swap): boolean {
  return (
    swapA.swapType !== swapB.swapType ||
    !currencyEquals(swapA.inputAmount.currency, swapB.inputAmount.currency) ||
    !swapA.inputAmount.equalTo(swapB.inputAmount) ||
    !currencyEquals(swapA.outputAmount.currency, swapB.outputAmount.currency) ||
    !swapA.outputAmount.equalTo(swapB.outputAmount)
  )
}

export default function ConfirmSwapModal({
  swap,
  originalSwap,
  onAcceptChanges,
  allowedSlippage,
  onConfirm,
  onDismiss,
  recipient,
  swapErrorMessage,
  isOpen,
  attemptingTxn,
  txHash
}: {
  isOpen: boolean
  swap: Swap | undefined
  originalSwap: Swap | undefined
  attemptingTxn: boolean
  txHash: string | undefined
  recipient: string | null
  allowedSlippage: number
  onAcceptChanges: () => void
  onConfirm: () => void
  swapErrorMessage: string | undefined
  onDismiss: () => void
}) {
  const showAcceptChanges = useMemo(
    () => Boolean(swap && originalSwap && swapMeaningfullyDiffers(swap, originalSwap)),
    [originalSwap, swap]
  )

  const modalHeader = useCallback(() => {
    return swap ? (
      <SwapModalHeader
        swap={swap}
        allowedSlippage={allowedSlippage}
        recipient={recipient}
        showAcceptChanges={showAcceptChanges}
        onAcceptChanges={onAcceptChanges}
      />
    ) : null
  }, [allowedSlippage, onAcceptChanges, recipient, showAcceptChanges, swap])

  const modalBottom = useCallback(() => {
    return swap ? (
      <SwapModalFooter
        onConfirm={onConfirm}
        swap={swap}
        disabledConfirm={showAcceptChanges}
        swapErrorMessage={swapErrorMessage}
        allowedSlippage={allowedSlippage}
      />
    ) : null
  }, [allowedSlippage, onConfirm, showAcceptChanges, swapErrorMessage, swap])

  // text to show while loading
  const pendingText = `Swapping ${swap?.inputAmount?.toSignificant(6)} ${
    swap?.inputAmount?.currency?.symbol
  } for ${swap?.outputAmount?.toSignificant(6)} ${swap?.outputAmount?.currency?.symbol}`

  const confirmationContent = useCallback(
    () =>
      swapErrorMessage ? (
        <TransactionErrorContent onDismiss={onDismiss} message={swapErrorMessage} />
      ) : (
        <ConfirmationModalContent
          title="Confirm Swap"
          onDismiss={onDismiss}
          topContent={modalHeader}
          bottomContent={modalBottom}
        />
      ),
    [onDismiss, modalBottom, modalHeader, swapErrorMessage]
  )

  return (
    <TransactionConfirmationModal
      isOpen={isOpen}
      onDismiss={onDismiss}
      attemptingTxn={attemptingTxn}
      hash={txHash}
      content={confirmationContent}
      pendingText={pendingText}
    />
  )
}
