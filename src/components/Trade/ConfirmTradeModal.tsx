import { currencyEquals, Trade, TradeType } from '@hybridx-exchange/hybridx-sdk'
import React, { useCallback, useMemo } from 'react'
import TransactionConfirmationModal, {
  ConfirmationModalContent,
  TransactionErrorContent
} from '../TransactionConfirmationModal'
import TradeModalFooter from './TradeModalFooter'
import TradeModalHeader from './TradeModalHeader'

/**
 * Returns true if the trade requires a confirmation of details before we can submit it
 * @param tradeA trade A
 * @param tradeB trade B
 */
function tradeMeaningfullyDiffers(tradeA: Trade, tradeB: Trade): boolean {
  if (tradeA?.tradeRet === undefined && tradeB?.tradeRet === undefined) return false
  return (
    tradeA?.tradeType !== tradeB?.tradeType ||
    !currencyEquals(tradeA?.amount?.currency, tradeB?.amount?.currency) ||
    !tradeA?.amount?.equalTo(tradeB?.amount) ||
    !currencyEquals(tradeA?.price?.currency, tradeB?.price?.currency) ||
    !tradeA?.price?.equalTo(tradeB?.price) ||
    !(tradeA?.tradeRet && tradeB?.tradeRet) ||
    !tradeA?.tradeRet?.equalTo(tradeB?.tradeRet)
  )
}

export default function ConfirmTradeModal({
  trade,
  originalTrade,
  onAcceptChanges,
  onConfirm,
  onDismiss,
  recipient,
  tradeErrorMessage,
  isOpen,
  attemptingTxn,
  txHash
}: {
  isOpen: boolean
  trade: Trade | undefined
  originalTrade: Trade | undefined
  attemptingTxn: boolean
  txHash: string | undefined
  recipient: string | null
  onAcceptChanges: () => void
  onConfirm: () => void
  tradeErrorMessage: string | undefined
  onDismiss: () => void
}) {
  const showAcceptChanges = useMemo(
    () => Boolean(trade && originalTrade && tradeMeaningfullyDiffers(trade, originalTrade)),
    [originalTrade, trade]
  )

  const modalHeader = useCallback(() => {
    return trade ? (
      <TradeModalHeader
        trade={trade}
        recipient={recipient}
        showAcceptChanges={showAcceptChanges}
        onAcceptChanges={onAcceptChanges}
      />
    ) : null
  }, [onAcceptChanges, recipient, showAcceptChanges, trade])

  const modalBottom = useCallback(() => {
    return trade ? (
      <TradeModalFooter
        onConfirm={onConfirm}
        trade={trade}
        disabledConfirm={showAcceptChanges}
        tradeErrorMessage={tradeErrorMessage}
      />
    ) : null
  }, [onConfirm, showAcceptChanges, tradeErrorMessage, trade])

  // text to show while loading
  const pendingText = `${
    trade?.tradeType === TradeType.LIMIT_BUY ? 'Buy ' + trade?.baseToken?.symbol + ' with amount ' : 'Sell amount '
  } ${trade?.amount?.toFixedWithoutExtraZero(trade?.orderBook?.getMinAmountDecimal(trade?.tradeType))} ${' ' +
    trade?.amount?.currency?.symbol} at price ${' ' +
    trade?.price?.toFixedWithoutExtraZero(trade?.orderBook?.getPriceStepDecimal())} ${' ' +
    trade?.price?.currency?.symbol}`

  const confirmationContent = useCallback(
    () =>
      tradeErrorMessage ? (
        <TransactionErrorContent onDismiss={onDismiss} message={tradeErrorMessage} />
      ) : (
        <ConfirmationModalContent
          title="Confirm trade"
          onDismiss={onDismiss}
          topContent={modalHeader}
          bottomContent={modalBottom}
        />
      ),
    [onDismiss, modalBottom, modalHeader, tradeErrorMessage]
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
