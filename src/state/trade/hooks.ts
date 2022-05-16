import useENS from '../../hooks/useENS'
import { parseUnits } from '@ethersproject/units'
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
import { ParsedQs } from 'qs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useActiveWeb3React } from '../../hooks'
import { useOrderBook, useTradeRet } from '../../hooks/Trades'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { isAddress } from '../../utils'
import { AppDispatch, AppState } from '../index'
import { useCurrencyBalances } from '../wallet/hooks'
import { Field, Input, replaceTradeState, setRecipient, setSelectedType, tradeTypeInput } from './actions'
import { TradeState } from './reducer'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import { PairState, usePair } from '../../data/Reserves'
import { useTotalSupply } from '../../data/TotalSupply'

export function useTradeState(): AppState['trade'] {
  return useSelector<AppState, AppState['trade']>(state => state.trade)
}

export function useTradeActionHandlers(): {
  onUserInput: (input: Input, typedValue: string) => void
  onChangeRecipient: (recipient: string | null) => void
  onChangeSelectedType: (type: TradeType) => void
} {
  const dispatch = useDispatch<AppDispatch>()

  const onUserInput = useCallback(
    (input: Input, typedValue: string) => {
      dispatch(tradeTypeInput({ input, typedValue }))
    },
    [dispatch]
  )

  const onChangeRecipient = useCallback(
    (recipient: string | null) => {
      dispatch(setRecipient({ recipient }))
    },
    [dispatch]
  )

  const onChangeSelectedType = useCallback(
    (type: TradeType) => {
      dispatch(setSelectedType({ type }))
    },
    [dispatch]
  )

  return {
    onUserInput,
    onChangeRecipient,
    onChangeSelectedType
  }
}

// try to parse a user entered amount for a given token
export function tryParseAmount(value?: string, currency?: Currency): CurrencyAmount | undefined {
  if (!value || !currency) {
    return undefined
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString()
    if (typedValueParsed !== '0') {
      return currency instanceof Token
        ? new TokenAmount(currency, JSBI.BigInt(typedValueParsed))
        : CurrencyAmount.ether(JSBI.BigInt(typedValueParsed))
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.debug(`Failed to parse input amount: "${value}"`, error)
  }
  // necessary for all paths to return a value
  return undefined
}

const BAD_RECIPIENT_ADDRESSES: string[] = [
  '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // v2 factory
  '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a', // v2 router 01
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // v2 router 02
]

// from the current swap inputs, compute the best trade and return it.
export function useDerivedTradeInfo(
  currencyA: Currency | undefined,
  currencyB: Currency | undefined
): {
  currencies: { [field in Field]?: Currency }
  currencyBalances: { [field in Field]?: CurrencyAmount }
  parsedAmountAmount: CurrencyAmount | undefined
  parsedPriceAmount: CurrencyAmount | undefined
  trade: Trade | null
  inputError?: string
} {
  const { account, chainId } = useActiveWeb3React()

  // trade state
  const { typedAmountValue, typedPriceValue, recipient, selectedType } = useTradeState()

  // tokens
  const currencies: { [field in Field]?: Currency } = useMemo(
    () => ({
      [Field.CURRENCY_A]: currencyA ?? undefined,
      [Field.CURRENCY_B]: currencyB ?? undefined
    }),
    [currencyA, currencyB]
  )

  const recipientLookup = useENS(recipient ?? undefined)
  const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const relevantTokenBalances = useCurrencyBalances(account ?? undefined, [
    currencies[Field.CURRENCY_A] ?? undefined,
    currencies[Field.CURRENCY_B] ?? undefined
  ])

  const orderBook = useOrderBook(selectedType, currencyA ?? undefined, currencyB ?? undefined)
  const tokenIn = wrappedCurrency(currencyA, chainId)
  const baseToken = orderBook?.baseToken?.token
  const type = !orderBook?.exist
    ? selectedType
    : baseToken?.address === tokenIn?.address
    ? TradeType.LIMIT_SELL
    : TradeType.LIMIT_BUY
  const currencyBalances = {
    [Field.CURRENCY_A]: relevantTokenBalances[0],
    [Field.CURRENCY_B]: relevantTokenBalances[1]
  }

  const parsedAmountAmount = tryParseAmount(typedAmountValue, currencyA)
  const parsedPriceAmount = tryParseAmount(typedPriceValue, orderBook?.quoteToken.currency)
  const tradeRet = useTradeRet(orderBook, type, parsedAmountAmount, parsedPriceAmount)

  // pair
  const [pairState, pair] = usePair(currencies[Field.CURRENCY_A], currencies[Field.CURRENCY_B])
  const totalSupply = useTotalSupply(pair?.liquidityToken)
  const noLiquidity: boolean =
    pairState === PairState.NOT_EXISTS || Boolean(totalSupply && JSBI.equal(totalSupply.raw, ZERO))

  const trade = useMemo(() => {
    if (currencies[Field.CURRENCY_A] && currencies[Field.CURRENCY_B]) {
      return {
        orderBook: orderBook,
        baseToken: type === TradeType.LIMIT_SELL ? currencies[Field.CURRENCY_A] : currencies[Field.CURRENCY_B],
        quoteToken: type !== TradeType.LIMIT_SELL ? currencies[Field.CURRENCY_A] : currencies[Field.CURRENCY_B],
        tradeType: type,
        amount: parsedAmountAmount,
        price: parsedPriceAmount,
        tradeRet: tradeRet
      }
    }

    return null
  }, [orderBook, currencies, type, tradeRet, parsedPriceAmount, parsedAmountAmount])
  console.log(trade) //orderBook可能出现变化不及时而出现异常的情况
  let inputError: string | undefined
  if (!account) {
    inputError = 'Connect Wallet'
  }

  if (!currencies[Field.CURRENCY_A] || !currencies[Field.CURRENCY_B]) {
    inputError = inputError ?? 'Select a token'
  }

  if (noLiquidity) {
    inputError = inputError ?? 'Add liquidity first'
  }

  if (!parsedAmountAmount) {
    inputError = inputError ?? 'Enter ' + (type === TradeType.LIMIT_BUY ? 'buy' : 'sell') + ' amount'
  }

  if (orderBook?.minAmount) {
    if (
      type === TradeType.LIMIT_BUY &&
      parsedPriceAmount &&
      JSBI.LT(parsedAmountAmount, orderBook.getMinQuoteAmount(parsedPriceAmount.raw))
    ) {
      inputError = inputError ?? 'Invalid amount'
    } else if (
      type === TradeType.LIMIT_SELL &&
      JSBI.LT(parsedAmountAmount, parseBigintIsh(orderBook?.minAmount as BigintIsh))
    ) {
      inputError = inputError ?? 'Invalid amount'
    }
  }

  if (!parsedPriceAmount) {
    inputError = inputError ?? 'Enter ' + (type === TradeType.LIMIT_BUY ? 'buy' : 'sell') + ' price'
  }

  if (
    parsedPriceAmount &&
    orderBook?.getPriceStep(parsedPriceAmount?.raw) &&
    !JSBI.equal(
      JSBI.remainder(
        parsedPriceAmount?.raw as JSBI,
        parseBigintIsh(orderBook?.getPriceStep(parsedPriceAmount?.raw) as BigintIsh)
      ),
      ZERO
    )
  ) {
    inputError = inputError ?? 'Invalid price'
  }

  const formattedTo = isAddress(to)
  if (!to || !formattedTo) {
    inputError = inputError ?? 'Enter a recipient'
  } else {
    if (BAD_RECIPIENT_ADDRESSES.indexOf(formattedTo) !== -1) {
      inputError = inputError ?? 'Invalid recipient'
    }
  }

  // compare input balance to max input based on version
  const [balanceIn, amountIn] = [currencyBalances[Field.CURRENCY_A], parsedAmountAmount]

  if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
    inputError = 'Insufficient ' + amountIn.currency.symbol + ' balance'
  }

  return {
    currencies,
    currencyBalances,
    parsedAmountAmount,
    parsedPriceAmount,
    trade,
    inputError
  }
}

function parseCurrencyFromURLParameter(urlParam: any): string {
  if (typeof urlParam === 'string') {
    const valid = isAddress(urlParam)
    if (valid) return valid
    if (urlParam.toUpperCase() === 'ROSE') return 'ROSE'
    if (valid === false) return 'ROSE'
  }
  return 'ROSE'
}

function parseTokenAmountURLParameter(urlParam: any): string {
  return typeof urlParam === 'string' && !isNaN(parseFloat(urlParam)) ? urlParam : ''
}

const ENS_NAME_REGEX = /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)?$/
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
function validatedRecipient(recipient: any): string | null {
  if (typeof recipient !== 'string') return null
  const address = isAddress(recipient)
  if (address) return address
  if (ENS_NAME_REGEX.test(recipient)) return recipient
  if (ADDRESS_REGEX.test(recipient)) return recipient
  return null
}

export function queryParametersToTradeState(
  parsedQs: ParsedQs
): { currencyIdA: string; currencyIdB: string; tradeState: TradeState } {
  let currencyA = parseCurrencyFromURLParameter(parsedQs.currencyA)
  let currencyB = parseCurrencyFromURLParameter(parsedQs.currencyB)
  if (currencyA === currencyB) {
    if (typeof parsedQs.currencyB === 'string') {
      currencyA = ''
    } else {
      currencyB = ''
    }
  }

  const recipient = validatedRecipient(parsedQs.recipient)

  return {
    currencyIdA: currencyA,
    currencyIdB: currencyB,
    tradeState: {
      typedAmountValue: parseTokenAmountURLParameter(parsedQs.exactAmountAmount),
      typedPriceValue: parseTokenAmountURLParameter(parsedQs.exactPriceAmount),
      recipient,
      selectedType: TradeType.LIMIT_SELL
    }
  }
}

// updates the swap state to use the defaults for a given network
export function useDefaultsFromURLSearch():
  | { currencyAId: string | undefined; currencyBId: string | undefined }
  | undefined {
  const { chainId } = useActiveWeb3React()
  const dispatch = useDispatch<AppDispatch>()
  const parsedQs = useParsedQueryString()
  const [result, setResult] = useState<
    { currencyAId: string | undefined; currencyBId: string | undefined } | undefined
  >()

  useEffect(() => {
    if (!chainId) return
    const parsed = queryParametersToTradeState(parsedQs)

    dispatch(
      replaceTradeState({
        typedAmountValue: parsed.tradeState.typedAmountValue,
        typedPriceValue: parsed.tradeState.typedPriceValue,
        recipient: parsed.tradeState.recipient,
        selectedType: TradeType.LIMIT_SELL
      })
    )

    setResult({ currencyAId: parsed.currencyIdA, currencyBId: parsed.currencyIdB })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, chainId])

  return result
}
