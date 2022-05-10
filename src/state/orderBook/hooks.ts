import { Currency, CurrencyAmount, JSBI, OrderBook, Pair } from '@hybridx-exchange/hybridx-sdk'
import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { PairState, usePair } from '../../data/Reserves'
import { useTotalSupply } from '../../data/TotalSupply'

import { useActiveWeb3React } from '../../hooks'
import { AppDispatch, AppState } from '../index'
import { tryParseAmount } from '../swap/hooks'
import { Field, orderBookTypeInput } from './actions'
import { useOrderBook } from '../../hooks/Trades'
import { useCurrencyBalances } from '../wallet/hooks'

const ZERO = JSBI.BigInt(0)

export function useOrderBookState(): AppState['orderBook'] {
  return useSelector<AppState, AppState['orderBook']>(state => state.orderBook)
}

export function useDerivedOrderBookInfo(
  currencyBase: Currency | undefined,
  currencyQuote: Currency | undefined
): {
  currencies: { [field in Field]?: Currency }
  currencyBalances: { [field in Field]?: CurrencyAmount }
  pair?: Pair | null
  pairState: PairState
  orderBook?: OrderBook | null
  priceStepAmount: CurrencyAmount | undefined
  minAmountAmount: CurrencyAmount | undefined
  noLiquidity?: boolean
  error?: string
} {
  const { account } = useActiveWeb3React()

  const { priceStepValue, minAmountValue } = useOrderBookState()

  const orderBook = useOrderBook(currencyBase ?? undefined, currencyQuote ?? undefined)

  // tokens
  const currencies: { [field in Field]?: Currency } = useMemo(
    () => ({
      [Field.CURRENCY_BASE]: orderBook?.baseToken.currency ?? currencyBase,
      [Field.CURRENCY_QUOTE]: orderBook?.quoteToken.currency ?? currencyQuote
    }),
    [orderBook, currencyBase, currencyQuote]
  )

  // pair
  const [pairState, pair] = usePair(currencies[Field.CURRENCY_BASE], currencies[Field.CURRENCY_QUOTE])
  const totalSupply = useTotalSupply(pair?.liquidityToken)

  const noLiquidity: boolean =
    pairState === PairState.NOT_EXISTS || Boolean(totalSupply && JSBI.equal(totalSupply.raw, ZERO))

  const balances = useCurrencyBalances(account ?? undefined, [
    currencies[Field.CURRENCY_BASE],
    currencies[Field.CURRENCY_QUOTE]
  ])

  const currencyBalances: { [field in Field]?: CurrencyAmount } = {
    [Field.CURRENCY_BASE]: balances[0],
    [Field.CURRENCY_QUOTE]: balances[1]
  }

  // amounts
  const priceStepAmount: CurrencyAmount | undefined = tryParseAmount(priceStepValue, currencies[Field.CURRENCY_QUOTE])
  const minAmountAmount: CurrencyAmount | undefined = tryParseAmount(minAmountValue, currencies[Field.CURRENCY_BASE])

  let error: string | undefined
  if (!account) {
    error = 'Connect Wallet'
  }

  if (pairState === PairState.INVALID) {
    error = error ?? 'Invalid pair'
  }

  if (pairState === PairState.NOT_EXISTS) {
    error = error ?? 'Create pair first'
  }

  if (!orderBook && !minAmountAmount) {
    error = error ?? 'Enter minimum amount'
  }

  if (!orderBook && !priceStepAmount) {
    error = error ?? 'Enter price step'
  }

  if (orderBook && (orderBook.sellOrders.length > 0 || orderBook.buyOrders.length > 0)) {
    error = error ?? 'Wait orders to be filled'
  }

  if (orderBook && !(priceStepAmount || minAmountAmount)) {
    error = error ?? 'Enter the parameter value'
  }

  return {
    currencies,
    currencyBalances,
    pair,
    pairState,
    orderBook,
    priceStepAmount,
    minAmountAmount,
    noLiquidity,
    error
  }
}

export function useOrderBookActionHandlers(
  noLiquidity: boolean | undefined,
  orderBookExist: boolean | undefined
): {
  onFieldBaseInput: (typedValue: string) => void
  onFieldQuoteInput: (typedValue: string) => void
} {
  const dispatch = useDispatch<AppDispatch>()

  const onFieldBaseInput = useCallback(
    (typedValue: string) => {
      dispatch(
        orderBookTypeInput({
          field: Field.CURRENCY_BASE,
          typedValue,
          noLiquidity: noLiquidity === true,
          orderBookExist: orderBookExist === false
        })
      )
    },
    [dispatch, noLiquidity, orderBookExist]
  )
  const onFieldQuoteInput = useCallback(
    (typedValue: string) => {
      dispatch(
        orderBookTypeInput({
          field: Field.CURRENCY_QUOTE,
          typedValue,
          noLiquidity: noLiquidity === true,
          orderBookExist: orderBookExist === false
        })
      )
    },
    [dispatch, noLiquidity, orderBookExist]
  )

  return {
    onFieldBaseInput,
    onFieldQuoteInput
  }
}
