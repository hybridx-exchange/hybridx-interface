import {
  BigintIsh,
  Currency,
  CurrencyAmount,
  JSBI,
  parseBigintIsh,
  Token,
  TokenAmount,
  Trade,
  TradeType,
  ZERO
} from '@hybridx-exchange/hybridx-sdk'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonConfirmed, ButtonError, ButtonLight } from '../../components/Button'
import { GreyCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import ConfirmTradeModal from '../../components/Trade/ConfirmTradeModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import { AutoRow, RowBetween } from '../../components/Row'
import { ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper } from '../../components/Swap/styleds'
import ProgressSteps from '../../components/ProgressSteps'

import { ORDER_BOOK_ROUTER_ADDRESS } from '../../constants'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field, Input } from '../../state/trade/actions'
import { tryParseAmount, useDerivedTradeInfo, useTradeActionHandlers, useTradeState } from '../../state/trade/hooks'
import { useExpertModeManager, useUserDeadline } from '../../state/user/hooks'
import { LinkStyledButton, StyledInternalLink, TYPE } from '../../theme'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import AppBody from '../AppBody'
import Loader from '../../components/Loader'
import { OrderBookTable } from '../../components/Swap/OrderBookTable'
import { useTradeCallback } from '../../hooks/useTradeCallback'
import { RouteComponentProps } from 'react-router'
import { currencyId } from '../../utils/currencyId'
import CurrencySelectPanel from '../../components/CurrencySelectPanel'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import { formatUnits, parseUnits } from '@ethersproject/units'
import AdvancedOrderBookDetailsDropdown from '../../components/Swap/AdvancedOrderBookDetailsDropdown'
import OrderBookTipDropDown from '../../components/Swap/OrderBookTipDropDown'

const CurrencyInputDiv = styled.div`
  display: flex;
  justify-content: space-between;
`

export default function DoTrade({
  match: {
    params: { currencyIdA, currencyIdB, inputPrice }
  },
  history
}: RouteComponentProps<{ currencyIdA?: string; currencyIdB?: string; inputPrice?: string }>) {
  const { account, chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // for expert mode
  const [isExpertMode] = useExpertModeManager()
  const [deadline] = useUserDeadline()

  // trade state
  const { typedAmountValue, typedPriceValue, recipient } = useTradeState()
  const [loadedCurrencyA, loadedCurrencyB] = [useCurrency(currencyIdA ?? 'ROSE'), useCurrency(currencyIdB)]
  const {
    trade,
    currencyBalances,
    parsedAmountAmount,
    parsedPriceAmount,
    currencies,
    inputError: tradeInputError
  } = useDerivedTradeInfo(loadedCurrencyA ?? undefined, loadedCurrencyB ?? undefined)
  const { address: recipientAddress } = useENSAddress(recipient)

  const parsedAmounts = {
    [Input.AMOUNT]: parsedAmountAmount,
    [Input.PRICE]: parsedPriceAmount
  }

  const wrappedCurrencyA = wrappedCurrency(loadedCurrencyA ?? undefined, chainId)
  const wrappedCurrencyB = wrappedCurrency(loadedCurrencyB ?? undefined, chainId)

  const wrappedCurrencies: { [field in Field]?: Token | undefined } = {
    [Field.CURRENCY_A]: wrappedCurrencyA,
    [Field.CURRENCY_B]: wrappedCurrencyB
  }

  const { onUserInput, onChangeRecipient } = useTradeActionHandlers()
  const isValid = !tradeInputError && trade && trade.orderBook

  const handleInputAmount = useCallback(
    (value: string) => {
      const minAmount = trade?.orderBook?.minAmount
      const tradeType = trade?.tradeType
      if (tradeType && trade?.baseToken && trade?.quoteToken && minAmount) {
        if (tradeType === TradeType.LIMIT_BUY) {
          const amountAmount = tryParseAmount(value, trade?.quoteToken)
          const minQuoteAmount = parsedPriceAmount ? trade?.orderBook.getMinQuoteAmount(parsedPriceAmount?.raw) : ZERO
          if (amountAmount && JSBI.LT(amountAmount?.raw, minQuoteAmount)) {
            value = new TokenAmount(trade.quoteToken, minQuoteAmount).toSignificant()
          }
        } else if (tradeType === TradeType.LIMIT_SELL) {
          const amountAmount = tryParseAmount(value, trade?.baseToken)
          if (amountAmount && JSBI.LT(amountAmount?.raw, parseBigintIsh(minAmount as BigintIsh))) {
            value = new TokenAmount(trade.baseToken, minAmount).toSignificant()
          }
        }
      }
      onUserInput(Input.AMOUNT, value)
    },
    [onUserInput, parsedPriceAmount, trade]
  )
  const handleInputPrice = useCallback(
    (value: string) => {
      if (trade?.quoteToken && value) {
        const priceAmount = parseBigintIsh(parseUnits(value, trade.quoteToken.decimals).toString())
        const priceStep = parseBigintIsh(trade?.orderBook?.priceStep as BigintIsh)
        if (priceAmount && priceStep && !JSBI.equal(JSBI.remainder(priceAmount, priceStep), ZERO)) {
          value = formatUnits(
            JSBI.multiply(JSBI.divide(priceAmount, priceStep), priceStep).toString(),
            trade.quoteToken.decimals
          )
        }

        if (typedAmountValue) {
          handleInputAmount(typedAmountValue)
        }
      }

      onUserInput(Input.PRICE, value)
    },
    [onUserInput, trade, handleInputAmount, typedAmountValue]
  )

  // modal and loading
  const [{ showConfirm, tradeToConfirm, tradeErrorMessage, attemptingTxn, txHash }, setTradeState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    tradeErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    tradeErrorMessage: undefined,
    txHash: undefined
  })

  const userHasSpecifiedInputPrice = Boolean(
    currencies[Field.CURRENCY_A] &&
      currencies[Field.CURRENCY_B] &&
      parsedAmounts[Input.AMOUNT]?.greaterThan(JSBI.BigInt(0)) &&
      parsedAmounts[Input.PRICE]?.greaterThan(JSBI.BigInt(0))
  )

  // check whether the user has approved the router on the input token
  const [approval, approveCallback] = useApproveCallback(parsedAmountAmount, ORDER_BOOK_ROUTER_ADDRESS)

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])

  useEffect(() => {
    try {
      const typedValueParsed = parseUnits(inputPrice ?? '', 18)
      if (typedValueParsed.toString() !== '0') {
        onUserInput(Input.PRICE, formatUnits(typedValueParsed, 18))
      } else {
        onUserInput(Input.PRICE, '')
      }
    } catch (e) {
      onUserInput(Input.PRICE, '')
    }
  }, [onUserInput, inputPrice])

  useEffect(() => {
    if (wrappedCurrencyA?.address === wrappedCurrencyB?.address) {
      history.push(`/trade/${currencyIdA}`)
    }
  }, [wrappedCurrencyA, wrappedCurrencyB, currencyIdA, history])

  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.CURRENCY_A])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Input.AMOUNT]?.equalTo(maxAmountInput))

  // the callback to execute the trade
  const { callback: tradeCallback, error: tradeCallbackError } = useTradeCallback(
    isValid ? trade ?? undefined : undefined,
    deadline,
    recipient
  )

  const handleTrade = useCallback(() => {
    if (!tradeCallback) {
      return
    }
    setTradeState({
      attemptingTxn: true,
      tradeToConfirm,
      showConfirm,
      tradeErrorMessage: undefined,
      txHash: undefined
    })
    tradeCallback()
      .then(hash => {
        setTradeState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          tradeErrorMessage: undefined,
          txHash: hash
        })

        ReactGA.event({
          category: 'Trade',
          action:
            recipient === null
              ? 'Trade w/o Send'
              : (recipientAddress ?? recipient) === account
              ? 'Trade w/o Send + recipient'
              : 'Trade w/ Send',
          label:
            trade?.tradeType.toString() +
            ' ' +
            [trade?.amount?.currency?.symbol, trade?.price?.currency?.symbol].join('/')
        })
      })
      .catch(error => {
        setTradeState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          tradeErrorMessage: error.message,
          txHash: undefined
        })
      })
  }, [tradeToConfirm, account, recipient, recipientAddress, showConfirm, tradeCallback, trade])

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !tradeInputError &&
    (approval === ApprovalState.NOT_APPROVED ||
      approval === ApprovalState.PENDING ||
      (approvalSubmitted && approval === ApprovalState.APPROVED))

  const handleConfirmDismiss = useCallback(() => {
    setTradeState({ showConfirm: false, tradeToConfirm, attemptingTxn, tradeErrorMessage: tradeErrorMessage, txHash })
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Input.AMOUNT, '')
      onUserInput(Input.PRICE, '')
    }
  }, [attemptingTxn, onUserInput, tradeErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    setTradeState({
      tradeToConfirm: trade ?? undefined,
      tradeErrorMessage: tradeErrorMessage,
      txHash,
      attemptingTxn,
      showConfirm
    })
  }, [attemptingTxn, showConfirm, tradeErrorMessage, trade, txHash])

  const handleCurrencyASelect = useCallback(
    (currencyA: Currency) => {
      const newCurrencyIdA = currencyId(currencyA)
      const newWrappedCurrencyA = wrappedCurrency(currencyA, chainId)
      if (newWrappedCurrencyA?.address === wrappedCurrencyB?.address) {
        if (wrappedCurrencyA?.address === newWrappedCurrencyA?.address) {
          history.push(`/trade/${newCurrencyIdA}`)
        } else {
          history.push(`/trade/${currencyIdA}/${newCurrencyIdA}`)
        }
      } else {
        history.push(`/trade/${newCurrencyIdA}/${currencyIdB ?? ''}`)
      }
    },
    [currencyIdB, wrappedCurrencyA, wrappedCurrencyB, history, currencyIdA, chainId]
  )
  const handleCurrencyBSelect = useCallback(
    (currencyB: Currency) => {
      const newCurrencyIdB = currencyId(currencyB)
      const newWrappedCurrencyB = wrappedCurrency(currencyB, chainId)
      if (newWrappedCurrencyB?.address === wrappedCurrencyA?.address) {
        if (newWrappedCurrencyB?.address === wrappedCurrencyB?.address) {
          history.push(`/trade//${newCurrencyIdB}`)
        } else {
          history.push(`/trade/${newCurrencyIdB}/${currencyIdB}`)
        }
      } else {
        history.push(`/trade/${currencyIdA ?? 'ROSE'}/${newCurrencyIdB}`)
      }
    },
    [currencyIdA, wrappedCurrencyA, wrappedCurrencyB, history, currencyIdB, chainId]
  )

  const handleMaxInput = useCallback(() => {
    maxAmountInput && onUserInput(Input.AMOUNT, maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  return (
    <>
      <AppBody>
        <SwapPoolTabs active={'trade'} />
        <Wrapper id="trade-page">
          <ConfirmTradeModal
            isOpen={showConfirm}
            trade={trade ?? undefined}
            originalTrade={tradeToConfirm}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            onConfirm={handleTrade}
            tradeErrorMessage={tradeErrorMessage}
            onDismiss={handleConfirmDismiss}
          />

          <AutoColumn gap={'md'}>
            <CurrencyInputDiv>
              <CurrencySelectPanel
                label={'From'}
                onCurrencySelect={handleCurrencyASelect}
                currency={currencies[Field.CURRENCY_A]}
                otherCurrency={currencies[Field.CURRENCY_B]}
                id="create-order-book-from-token"
                showCommonBases
              />
              <AutoColumn justify="space-between">
                <AutoRow justify={isExpertMode ? 'space-between' : 'center'} style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable>
                    <StyledInternalLink id="change-create-order" to={'/trade/' + currencyIdB + '/' + currencyIdA}>
                      {'→'}
                    </StyledInternalLink>
                  </ArrowWrapper>
                </AutoRow>
              </AutoColumn>
              <CurrencySelectPanel
                label={'To'}
                onCurrencySelect={handleCurrencyBSelect}
                currency={currencies[Field.CURRENCY_B]}
                otherCurrency={currencies[Field.CURRENCY_A]}
                id="create-order-book-to-token"
                showCommonBases
              />
            </CurrencyInputDiv>

            <CurrencyInputPanel
              label={'Amount'}
              value={typedAmountValue}
              showMaxButton={!atMaxAmountInput}
              currency={currencies[Field.CURRENCY_A]}
              onUserInput={handleInputAmount}
              onMax={handleMaxInput}
              onCurrencySelect={handleCurrencyASelect}
              otherCurrency={currencies[Field.CURRENCY_B]}
              isOrderBook={true}
              inputDisable={!trade?.orderBook}
              id="trade-currency-amount"
            />
            <AutoColumn justify="space-between">
              <AutoRow justify={isExpertMode ? 'end' : 'center'} style={{ padding: '0 1rem' }}>
                {recipient === null && isExpertMode ? (
                  <LinkStyledButton id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                    + Add a send (optional)
                  </LinkStyledButton>
                ) : null}
              </AutoRow>
            </AutoColumn>
            <CurrencyInputPanel
              value={typedPriceValue}
              onUserInput={handleInputPrice}
              label={'Price'}
              showMaxButton={false}
              hideBalance={true}
              currency={trade?.quoteToken}
              onCurrencySelect={handleCurrencyBSelect}
              otherCurrency={currencies[Field.CURRENCY_A]}
              isOrderBook={true}
              inputDisable={!trade?.orderBook}
              id="trade-currency-price"
            />

            {recipient !== null ? (
              <>
                <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable={false}>
                    <ArrowDown size="16" color={theme.text2} />
                  </ArrowWrapper>
                  <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                    - Remove send
                  </LinkStyledButton>
                </AutoRow>
                <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
              </>
            ) : null}
          </AutoColumn>
          <BottomGrouping>
            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
            ) : !trade?.orderBook && userHasSpecifiedInputPrice ? (
              <GreyCard style={{ textAlign: 'center' }}>
                <TYPE.main mb="4px">Insufficient liquidity for this trade.</TYPE.main>
              </GreyCard>
            ) : showApproveFlow ? (
              <RowBetween>
                <ButtonConfirmed
                  onClick={approveCallback}
                  disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                  width="48%"
                  altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
                  confirmed={approval === ApprovalState.APPROVED}
                >
                  {approval === ApprovalState.PENDING ? (
                    <AutoRow gap="6px" justify="center">
                      Approving <Loader stroke="white" />
                    </AutoRow>
                  ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                    'Approved'
                  ) : (
                    'Approve ' + currencies[Field.CURRENCY_A]?.symbol
                  )}
                </ButtonConfirmed>
                <ButtonError
                  onClick={() => {
                    if (isExpertMode) {
                      handleTrade()
                    } else {
                      setTradeState({
                        tradeToConfirm: trade ?? undefined,
                        attemptingTxn: false,
                        tradeErrorMessage: undefined,
                        showConfirm: true,
                        txHash: undefined
                      })
                    }
                  }}
                  width="48%"
                  id="trade-button"
                  disabled={!isValid || approval !== ApprovalState.APPROVED}
                  error={!isValid}
                >
                  <Text fontSize={16} fontWeight={500}>
                    {trade?.tradeType === TradeType.LIMIT_BUY ? `Buy` : `Sell`}
                  </Text>
                </ButtonError>
              </RowBetween>
            ) : (
              <ButtonError
                onClick={() => {
                  if (isExpertMode) {
                    handleTrade()
                  } else {
                    setTradeState({
                      tradeToConfirm: trade ?? undefined,
                      attemptingTxn: false,
                      tradeErrorMessage: undefined,
                      showConfirm: true,
                      txHash: undefined
                    })
                  }
                }}
                id="trade-button"
                disabled={!isValid || !!tradeCallbackError}
                error={!isValid && !!typedAmountValue && !!typedPriceValue}
              >
                <Text fontSize={20} fontWeight={500}>
                  {tradeInputError ? tradeInputError : trade?.tradeType === TradeType.LIMIT_BUY ? `Buy` : `Sell`}
                </Text>
              </ButtonError>
            )}
            {showApproveFlow && <ProgressSteps steps={[approval === ApprovalState.APPROVED]} />}
            {isExpertMode && tradeErrorMessage ? <SwapCallbackError error={tradeErrorMessage} /> : null}
          </BottomGrouping>
          <OrderBookTipDropDown orderBook={trade?.orderBook} currencies={wrappedCurrencies} />
        </Wrapper>
      </AppBody>
      <AdvancedOrderBookDetailsDropdown trade={trade ?? undefined} />
      <OrderBookTable
        orderBook={trade?.orderBook}
        currencyA={currencies[Field.CURRENCY_A]}
        currencyB={currencies[Field.CURRENCY_B]}
      />
    </>
  )
}
