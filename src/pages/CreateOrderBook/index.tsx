import { TransactionResponse } from '@ethersproject/providers'
import { Currency, Token } from '@hybridx-exchange/uniswap-sdk'
import React, { useCallback, useEffect, useState } from 'react'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import styled from 'styled-components'
import { ButtonError, ButtonLight } from '../../components/Button'
import { BlueCard, LightCard } from '../../components/Card'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import CurrencySelectPanel from '../../components/CurrencySelectPanel'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import { CreateEditTabs } from '../../components/NavigationTabs'
import Row, { RowFlat } from '../../components/Row'

import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/orderBook/actions'
import { useDerivedOrderBookInfo, useOrderBookActionHandlers, useOrderBookState } from '../../state/orderBook/hooks'

import { useTransactionAdder } from '../../state/transactions/hooks'
import { StyledInternalLink, TYPE } from '../../theme'
import { calculateGasMargin, getHybridRouterContract, getOrderBookFactoryContract } from '../../utils'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import AppBody from '../AppBody'
import { Wrapper } from '../Pool/styleds'
import { ConfirmCreateModalBottom } from './ConfirmCreateModalBottom'
import { currencyId } from '../../utils/currencyId'
import { PairState } from '../../data/Reserves'
import OrderBookDetailsDropdown from '../../components/Swap/OrderBookDetailsDropdown'
import { Field as TradeField } from '../../state/trade/actions'

const CurrencyInputDiv = styled.div`
  display: flex;
  justify-content: space-between;
`

export default function CreateOrderBook({
  match: {
    params: { currencyIdBase, currencyIdQuote }
  },
  history
}: RouteComponentProps<{ currencyIdBase?: string; currencyIdQuote?: string }>) {
  const { account, chainId, library } = useActiveWeb3React()

  const currencyBase = useCurrency(currencyIdBase)
  const currencyQuote = useCurrency(currencyIdQuote)

  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  // mint state
  const { priceStepValue, minAmountValue } = useOrderBookState()
  const {
    currencies,
    currencyBalances,
    pair,
    pairState,
    orderBook,
    priceStepAmount,
    minAmountAmount,
    noLiquidity,
    error
  } = useDerivedOrderBookInfo(currencyBase ?? undefined, currencyQuote ?? undefined)
  const orderBookExist = orderBook != null
  const { onFieldBaseInput, onFieldQuoteInput } = useOrderBookActionHandlers(noLiquidity, orderBookExist)

  const isValid = !error && pair && pairState === PairState.EXISTS

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // txn values
  const [txHash, setTxHash] = useState<string>('')

  const addTransaction = useTransactionAdder()
  const wrappedCurrencyBase = wrappedCurrency(currencies[Field.CURRENCY_BASE] ?? undefined, chainId)
  const wrappedCurrencyQuote = wrappedCurrency(currencies[Field.CURRENCY_QUOTE] ?? undefined, chainId)
  const wrappedCurrencies: { [field in TradeField]?: Token | undefined } = {
    [TradeField.CURRENCY_A]: wrappedCurrencyBase,
    [TradeField.CURRENCY_B]: wrappedCurrencyQuote
  }

  useEffect(() => {
    if (wrappedCurrencyBase?.address === wrappedCurrencyQuote?.address) {
      history.push(`/orderbook/${currencyIdBase}`)
    }
  }, [wrappedCurrencyBase, wrappedCurrencyQuote, currencyIdBase, history])

  async function onAdd() {
    if (!priceStepAmount || !minAmountAmount || !currencyBase || !currencyQuote) {
      return
    }
    if (!chainId || !library || !account) return

    const orderBookFactory = getOrderBookFactoryContract(chainId, library, account)

    let estimate, method: (...args: any) => Promise<TransactionResponse>, args: Array<string | string[] | number>
    {
      estimate = orderBookFactory.estimateGas.createOrderBook
      method = orderBookFactory.createOrderBook
      args = [
        wrappedCurrencyBase?.address ?? '',
        wrappedCurrencyQuote?.address ?? '',
        priceStepAmount?.raw.toString() ?? '0',
        minAmountAmount?.raw.toString() ?? '0'
      ]
    }

    setAttemptingTxn(true)
    await estimate(...args, {})
      .then(estimatedGasLimit =>
        method(...args, {
          gasLimit: calculateGasMargin(estimatedGasLimit)
        }).then(response => {
          setAttemptingTxn(false)

          addTransaction(response, {
            summary:
              'Create ' +
              currencies[Field.CURRENCY_BASE]?.symbol +
              '/' +
              currencies[Field.CURRENCY_QUOTE]?.symbol +
              ' order book with price step ' +
              priceStepAmount?.toExact() +
              ' and min mount ' +
              minAmountAmount?.toExact()
          })

          setTxHash(response.hash)

          ReactGA.event({
            category: 'OrderBook',
            action: 'Create',
            label: [currencies[Field.CURRENCY_BASE]?.symbol, currencies[Field.CURRENCY_QUOTE]?.symbol].join('/')
          })
        })
      )
      .catch(error => {
        setAttemptingTxn(false)
        // we only care if the error is something _other_ than the user rejected the tx
        if (error?.code !== 4001) {
          console.error(error)
        }
      })
  }

  async function onUpdate() {
    if (
      !(priceStepAmount || minAmountAmount) ||
      !currencies[Field.CURRENCY_BASE] ||
      !currencies[Field.CURRENCY_QUOTE] ||
      !orderBook
    ) {
      return
    }
    if (!chainId || !library || !account) return

    const hybridRouterContract = getHybridRouterContract(chainId, library, account)
    const priceStep = orderBook?.priceStep
    const minAmount = orderBook?.minAmount
    if (
      minAmountAmount?.raw.toString() !== minAmount?.toString() ||
      priceStepAmount?.raw.toString() !== priceStep?.toString()
    ) {
      let estimate, method: (...args: any) => Promise<TransactionResponse>, args: Array<string | string[] | number>
      {
        estimate = hybridRouterContract.estimateGas.setMinAmountAndPriceStep
        method = hybridRouterContract.setMinAmountAndPriceStep
        args = [
          orderBook.baseToken.token.address,
          orderBook.quoteToken.token.address,
          minAmountAmount?.raw.toString() === minAmount?.toString() ? '0' : minAmountAmount?.raw.toString() ?? '0',
          priceStepAmount?.raw.toString() === priceStep?.toString() ? '0' : priceStepAmount?.raw.toString() ?? '0'
        ]
      }

      setAttemptingTxn(true)
      await estimate(...args, {})
        .then(estimatedGasLimit =>
          method(...args, {
            gasLimit: calculateGasMargin(estimatedGasLimit)
          }).then(response => {
            setAttemptingTxn(false)
            addTransaction(response, {
              summary:
                'Update ' +
                currencies[Field.CURRENCY_BASE]?.symbol +
                '/' +
                currencies[Field.CURRENCY_QUOTE]?.symbol +
                ' order book, minimum amount = ' +
                minAmountAmount?.toExact() +
                ', price step = ' +
                priceStepAmount?.toExact()
            })
            setTxHash(response.hash)
            ReactGA.event({
              category: 'OrderBook',
              action: 'Update',
              label: [currencies[Field.CURRENCY_BASE]?.symbol, currencies[Field.CURRENCY_QUOTE]?.symbol].join('/')
            })
          })
        )
        .catch(error => {
          setAttemptingTxn(false)
          // we only care if the error is something _other_ than the user rejected the tx
          if (error?.code !== 4001) {
            console.error(error)
          }
        })
    }
  }

  const modalHeader = () => {
    return !orderBookExist ? (
      <AutoColumn gap="20px">
        <LightCard mt="20px" borderRadius="20px">
          <RowFlat>
            <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
              {currencies[Field.CURRENCY_BASE]?.symbol + '/' + currencies[Field.CURRENCY_QUOTE]?.symbol}
            </Text>
            <DoubleCurrencyLogo
              currency0={currencies[Field.CURRENCY_BASE]}
              currency1={currencies[Field.CURRENCY_QUOTE]}
              size={30}
            />
          </RowFlat>
        </LightCard>
      </AutoColumn>
    ) : (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {priceStepAmount?.toExact()}
          </Text>
          <DoubleCurrencyLogo
            currency0={currencies[Field.CURRENCY_BASE]}
            currency1={currencies[Field.CURRENCY_QUOTE]}
            size={30}
          />
        </RowFlat>
        <Row>
          <Text fontSize="24px">
            {currencies[Field.CURRENCY_BASE]?.symbol + '/' + currencies[Field.CURRENCY_QUOTE]?.symbol + ' Pool Tokens'}
          </Text>
        </Row>
        <TYPE.italic fontSize={12} textAlign="left" padding={'8px 0 0 0 '}>
          {`Output is estimated. If the price changes by more than ${minAmountAmount ??
            100}% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
      <ConfirmCreateModalBottom
        currencies={currencies}
        currencyBalances={currencyBalances}
        priceStepAmount={priceStepAmount}
        minAmountAmount={minAmountAmount}
        orderBookExist={orderBookExist}
        onAdd={!orderBookExist ? onAdd : onUpdate}
      />
    )
  }

  const pendingText =
    (!orderBookExist ? 'Create' : 'Update') +
    ` order book with minimum amount ${minAmountAmount?.toExact()} ${
      currencies[Field.CURRENCY_BASE]?.symbol
    } and price step ${priceStepAmount?.toExact()} ${currencies[Field.CURRENCY_QUOTE]?.symbol}`

  const handleCurrencyBaseSelect = useCallback(
    (currencyBase: Currency) => {
      const newCurrencyIdBase = currencyId(currencyBase)
      const newWrappedCurrencyBase = wrappedCurrency(currencyBase, chainId)
      if (newWrappedCurrencyBase?.address === wrappedCurrencyQuote?.address) {
        if (wrappedCurrencyBase?.address === newWrappedCurrencyBase?.address) {
          history.push(`/orderbook/${newCurrencyIdBase}`)
        } else {
          history.push(`/orderbook/${currencyIdQuote}/${newCurrencyIdBase}`)
        }
      } else {
        history.push(`/orderbook/${newCurrencyIdBase}/${currencyIdQuote}`)
      }
    },
    [currencyIdQuote, history, wrappedCurrencyBase, wrappedCurrencyQuote, chainId]
  )
  const handleCurrencyQuoteSelect = useCallback(
    (currencyQuote: Currency) => {
      const newCurrencyIdQuote = currencyId(currencyQuote)
      const newWrappedCurrencyQuote = wrappedCurrency(currencyQuote, chainId)
      if (wrappedCurrencyBase?.address === newWrappedCurrencyQuote?.address) {
        if (wrappedCurrencyQuote?.address === newWrappedCurrencyQuote?.address) {
          history.push(`/orderbook//${newCurrencyIdQuote}`)
        } else {
          history.push(`/orderbook/${currencyIdQuote}/${newCurrencyIdQuote}`)
        }
      } else {
        history.push(`/orderbook/${currencyIdBase ?? 'ROSE'}/${newCurrencyIdQuote}`)
      }
    },
    [currencyIdBase, history, currencyIdQuote, wrappedCurrencyBase, wrappedCurrencyQuote, chainId]
  )

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldBaseInput('')
      onFieldQuoteInput('')
    }
    setTxHash('')
  }, [onFieldBaseInput, onFieldQuoteInput, txHash])

  return (
    <>
      <AppBody>
        <CreateEditTabs creating={!orderBookExist} />
        <Wrapper>
          <TransactionConfirmationModal
            isOpen={showConfirm}
            onDismiss={handleDismissConfirmation}
            attemptingTxn={attemptingTxn}
            hash={txHash}
            content={() => (
              <ConfirmationModalContent
                title={!orderBookExist ? 'You are creating a order book' : 'You are editing a order book'}
                onDismiss={handleDismissConfirmation}
                topContent={modalHeader}
                bottomContent={modalBottom}
              />
            )}
            pendingText={pendingText}
          />
          <AutoColumn gap="20px">
            {noLiquidity && (
              <ColumnCenter>
                <BlueCard>
                  <AutoColumn gap="10px">
                    <TYPE.link fontWeight={600} color={'primaryText1'}>
                      You need to create the token pair before creating an order book.
                    </TYPE.link>
                    <StyledInternalLink
                      id="add-liquidity-before-create-order-book"
                      to={'/add/' + wrappedCurrencyBase?.address + '/' + wrappedCurrencyQuote?.address}
                    >
                      {'Add Liquidity'}
                    </StyledInternalLink>
                  </AutoColumn>
                </BlueCard>
              </ColumnCenter>
            )}
            {orderBook && orderBook.buyOrders.length > 0 && orderBook.sellOrders.length > 0 && (
              <ColumnCenter>
                <BlueCard>
                  <AutoColumn gap="10px">
                    <TYPE.link fontWeight={600} color={'primaryText1'}>
                      Order book parameters can only be modified if there is no order in the current order book.
                    </TYPE.link>
                  </AutoColumn>
                </BlueCard>
              </ColumnCenter>
            )}

            <CurrencyInputDiv>
              <CurrencySelectPanel
                label={'Choose base token'}
                onCurrencySelect={handleCurrencyBaseSelect}
                currency={currencies[Field.CURRENCY_BASE]}
                id="create-order-book-base-token"
                showCommonBases
              />
              <CurrencySelectPanel
                label={'Choose quote token'}
                onCurrencySelect={handleCurrencyQuoteSelect}
                currency={currencies[Field.CURRENCY_QUOTE]}
                id="create-order-book-quote-token"
                showCommonBases
              />
            </CurrencyInputDiv>

            <CurrencyInputPanel
              label={'Minimum amount'}
              value={minAmountValue}
              showMaxButton={false}
              hideBalance={true}
              onUserInput={onFieldBaseInput}
              onCurrencySelect={handleCurrencyBaseSelect}
              currency={currencies[Field.CURRENCY_BASE]}
              isOrderBook={true}
              id="create-order-book-minimum-amount"
              showCommonBases
            />

            <CurrencyInputPanel
              label={'Price step'}
              value={priceStepValue}
              showMaxButton={false}
              hideBalance={true}
              onUserInput={onFieldQuoteInput}
              onCurrencySelect={handleCurrencyQuoteSelect}
              currency={currencies[Field.CURRENCY_QUOTE]}
              isOrderBook={true}
              id="create-order-book-price-step"
              showCommonBases
            />
            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
            ) : (
              <AutoColumn gap={'md'}>
                <ButtonError
                  onClick={() => {
                    setShowConfirm(true)
                  }}
                  disabled={!isValid}
                  error={!isValid && !!priceStepAmount && !!minAmountAmount}
                >
                  <Text fontSize={20} fontWeight={500}>
                    {error ?? (!orderBookExist ? 'Create' : 'Update')}
                  </Text>
                </ButtonError>
              </AutoColumn>
            )}
          </AutoColumn>
        </Wrapper>
      </AppBody>
      {orderBook && <OrderBookDetailsDropdown orderBook={orderBook ?? undefined} currencies={wrappedCurrencies} />}
    </>
  )
}
