import {
  Currency,
  CurrencyAmount,
  JSBI,
  Order,
  OrderBook,
  Pair,
  Route,
  Swap,
  SwapType,
  Token,
  TokenAmount,
  TradeRet,
  TradeType,
  UserOrder,
  ZERO
} from '@hybridx-exchange/hybridx-sdk'
import flatMap from 'lodash.flatmap'
import { useMemo } from 'react'

import {
  BASES_TO_CHECK_TRADES_AGAINST,
  CUSTOM_BASES,
  DEFAULT_LIMIT_SIZE,
  ORDER_BOOK_ROUTER_ADDRESS,
  PAIR_UTILS_ADDRESS,
  ZERO_ADDRESS
} from '../constants'
import { PairState, usePairs } from '../data/Reserves'
import { wrappedCurrency, wrappedCurrencyAmount } from '../utils/wrappedCurrency'

import { useActiveWeb3React } from './index'
import { useMultipleContractMultipleData, useMultipleContractSingleData } from '../state/multicall/hooks'
import { abi as IUniswapV2Router02ABI } from '@hybridx-exchange/hybridx-protocol/build/IPairRouter.json'
import { abi as IHybridRouterABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderBookRouter.json'
import { abi as IOrderBookABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderBook.json'
import { Interface } from '@ethersproject/abi'
import { useUserSingleHopOnly } from '../state/user/hooks'

function useAllCommonPairs(currencyA?: Currency, currencyB?: Currency): Pair[] {
  const { chainId } = useActiveWeb3React()

  const bases: Token[] = chainId ? BASES_TO_CHECK_TRADES_AGAINST[chainId] : []

  const [tokenA, tokenB] = chainId
    ? [wrappedCurrency(currencyA, chainId), wrappedCurrency(currencyB, chainId)]
    : [undefined, undefined]

  const basePairs: [Token, Token][] = useMemo(
    () =>
      flatMap(bases, (base): [Token, Token][] => bases.map(otherBase => [base, otherBase])).filter(
        ([t0, t1]) => t0.address !== t1.address
      ),
    [bases]
  )

  const allPairCombinations: [Token, Token][] = useMemo(
    () =>
      tokenA && tokenB
        ? [
            // the direct pair
            [tokenA, tokenB],
            // token A against all bases
            ...bases.map((base): [Token, Token] => [tokenA, base]),
            // token B against all bases
            ...bases.map((base): [Token, Token] => [tokenB, base]),
            // each base against all bases
            ...basePairs
          ]
            .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
            .filter(([t0, t1]) => t0.address !== t1.address)
            .filter(([tokenA, tokenB]) => {
              if (!chainId) return true
              const customBases = CUSTOM_BASES[chainId]
              if (!customBases) return true

              const customBasesA: Token[] | undefined = customBases[tokenA.address]
              const customBasesB: Token[] | undefined = customBases[tokenB.address]

              if (!customBasesA && !customBasesB) return true

              if (customBasesA && !customBasesA.find(base => tokenB.equals(base))) return false
              if (customBasesB && !customBasesB.find(base => tokenA.equals(base))) return false

              return true
            })
        : [],
    [tokenA, tokenB, bases, basePairs, chainId]
  )

  const allPairs = usePairs(allPairCombinations)

  // only pass along valid pairs, non-duplicated pairs
  return useMemo(
    () =>
      Object.values(
        allPairs
          // filter out invalid pairs
          .filter((result): result is [PairState.EXISTS, Pair] => Boolean(result[0] === PairState.EXISTS && result[1]))
          // filter out duplicated pairs
          .reduce<{ [pairAddress: string]: Pair }>((memo, [, curr]) => {
            memo[curr.liquidityToken.address] = memo[curr.liquidityToken.address] ?? curr
            return memo
          }, {})
      ),
    [allPairs]
  )
}

/**
 * Returns the amount out for the exact amount of tokens in to the given token out
 */
export function useGetBestOutputAmount(
  currencyAmountIn?: CurrencyAmount,
  currencyOut?: Currency,
  allPairs?: Pair[],
  allSwaps?: Swap[] | null
): { loading: boolean; bestSwap: Swap | null } {
  const paths = allSwaps?.map(trade => {
    return trade.route.path.map(token => {
      return token.address
    })
  })

  const lens = allSwaps?.map(trade => {
    return trade.route.path.length
  })

  const paths2 = paths ? Array.prototype.concat.apply([], paths) : undefined
  const results = useMultipleContractSingleData(
    [PAIR_UTILS_ADDRESS],
    new Interface(IUniswapV2Router02ABI),
    'getBestAmountsOut',
    [currencyAmountIn?.raw.toString(), paths2, lens]
  )

  return useMemo(() => {
    const returns = results?.map(result => {
      if (!result || !result.result || result.loading) return { data: null, loading: result.loading }
      const {
        result: [path, amounts, nextReserves],
        loading
      } = result
      return { data: { path, amounts, nextReserves }, loading: loading }
    })

    if (!returns || returns.length === 0 || returns[0].loading) {
      return { loading: true, bestSwap: null }
    }

    const data = returns[0].data
    const path = data && data.path ? data.path : []
    const amounts = data && data.amounts ? data.amounts : []
    const nextReserves = data && data.nextReserves ? data.nextReserves : []
    const pairs: Pair[] = []
    for (let i = 1; i < path?.length; i++) {
      if (allPairs) {
        const pair = allPairs.find(
          e =>
            (e.token0.address === path[i - 1] && e.token1.address === path[i]) ||
            (e.token1.address === path[i - 1] && e.token0.address === path[i])
        )
        if (pair) pairs.push(pair)
      }
    }

    if (!currencyAmountIn || !currencyOut || !allPairs || !allSwaps || !pairs.length) {
      return { loading: true, bestSwap: null }
    } else {
      return {
        loading: false,
        bestSwap: new Swap(
          new Route(pairs, amounts, nextReserves, currencyAmountIn.currency, currencyOut),
          currencyAmountIn,
          SwapType.EXACT_INPUT
        )
      }
    }
  }, [allPairs, allSwaps, currencyAmountIn, currencyOut, results])
}

/**
 * Returns the amount in for the exact amount of tokens out to the given token in
 */
export function useGetBestInputAmount(
  currencyIn?: Currency,
  currencyAmountOut?: CurrencyAmount,
  allPairs?: Pair[],
  allSwaps?: Swap[] | null
): { loading: boolean; bestSwap: Swap | null } {
  const paths = allSwaps?.map(trade => {
    return trade.route.path.map(token => {
      return token.address
    })
  })

  const lens = allSwaps?.map(trade => {
    return trade.route.path.length
  })

  const paths2 = paths ? Array.prototype.concat.apply([], paths) : undefined
  const results = useMultipleContractSingleData(
    [PAIR_UTILS_ADDRESS],
    new Interface(IUniswapV2Router02ABI),
    'getBestAmountsIn',
    [currencyAmountOut?.raw.toString(), paths2, lens]
  )

  return useMemo(() => {
    const returns = results?.map(result => {
      if (!result || !result.result || result.loading || !result.result) return { data: null, loading: result.loading }
      const {
        result: [path, amounts, nextReserves],
        loading
      } = result
      return { data: { path, amounts, nextReserves }, loading: loading }
    })

    if (!returns || returns.length === 0 || returns[0].loading) {
      return { loading: true, bestSwap: null }
    }

    const data = returns[0].data
    const path = data && data.path ? data.path : []
    const amounts = data && data.amounts ? data.amounts : []
    const nextReserves = data && data.nextReserves ? data.nextReserves : []
    const pairs: Pair[] = []
    for (let i = 1; i < path?.length; i++) {
      if (allPairs) {
        const pair = allPairs.find(
          e =>
            (e.token0.address === path[i - 1] && e.token1.address === path[i]) ||
            (e.token1.address === path[i - 1] && e.token0.address === path[i])
        )
        if (pair) pairs.push(pair)
      }
    }

    if (!currencyAmountOut || !currencyIn || !allPairs || !allSwaps || !pairs.length) {
      return { loading: true, bestSwap: null }
    } else {
      return {
        loading: false,
        bestSwap: new Swap(
          new Route(pairs, amounts, nextReserves, currencyIn, currencyAmountOut.currency),
          currencyAmountOut,
          SwapType.EXACT_OUTPUT
        )
      }
    }
  }, [allPairs, allSwaps, currencyAmountOut, currencyIn, results])
}

/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */
export function useSwapExactIn(currencyAmountIn?: CurrencyAmount, currencyOut?: Currency): Swap | null {
  const allowedPairs = useAllCommonPairs(currencyAmountIn?.currency, currencyOut)
  const [singleHopOnly] = useUserSingleHopOnly()
  const allSwap = useMemo(() => {
    if (currencyAmountIn && currencyOut && allowedPairs.length > 0) {
      if (singleHopOnly)
        return Swap.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, { maxHops: 1, maxNumResults: 1 })
      return Swap.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, { maxHops: 3, maxNumResults: 1 })
    }
    return null
  }, [allowedPairs, singleHopOnly, currencyAmountIn, currencyOut])

  return useGetBestOutputAmount(currencyAmountIn, currencyOut, allowedPairs, allSwap).bestSwap
}

/**
 * Returns the best trade for the token in to the exact amount of token out
 */
export function useSwapExactOut(currencyIn?: Currency, currencyAmountOut?: CurrencyAmount): Swap | null {
  const allowedPairs = useAllCommonPairs(currencyIn, currencyAmountOut?.currency)
  const [singleHopOnly] = useUserSingleHopOnly()
  const allSwap = useMemo(() => {
    if (currencyIn && currencyAmountOut && allowedPairs.length > 0) {
      if (singleHopOnly)
        return Swap.bestTradeExactOut(allowedPairs, currencyIn, currencyAmountOut, { maxHops: 1, maxNumResults: 1 })
      return Swap.bestTradeExactOut(allowedPairs, currencyIn, currencyAmountOut, { maxHops: 3, maxNumResults: 1 })
    }
    return null
  }, [allowedPairs, singleHopOnly, currencyIn, currencyAmountOut])
  return useGetBestInputAmount(currencyIn, currencyAmountOut, allowedPairs, allSwap).bestSwap
}

/**
 * Returns the best trade for the token in to the exact amount of token out
 */
export function useOrderBook(currencyIn?: Currency | undefined, currencyOut?: Currency | undefined): OrderBook | null {
  const { chainId } = useActiveWeb3React()
  const tokenIn = wrappedCurrency(currencyIn, chainId)
  const tokenOut = wrappedCurrency(currencyOut, chainId)
  const orderBookAddress =
    tokenIn && tokenOut && tokenIn.address !== tokenOut.address ? OrderBook.getAddress(tokenIn, tokenOut) : ''
  const orderBookInterface = new Interface(IOrderBookABI)
  const results = useMultipleContractMultipleData(
    [
      tokenIn && tokenOut && tokenIn.address !== tokenOut.address ? ORDER_BOOK_ROUTER_ADDRESS : '',
      orderBookAddress,
      orderBookAddress,
      orderBookAddress,
      orderBookAddress,
      orderBookAddress,
      orderBookAddress
    ],
    [
      new Interface(IHybridRouterABI),
      orderBookInterface,
      orderBookInterface,
      orderBookInterface,
      orderBookInterface,
      orderBookInterface,
      orderBookInterface
    ],
    ['getOrderBook', 'getReserves', 'baseToken', 'protocolFeeRate', 'subsidyFeeRate', 'minAmount', 'priceStep'],
    [
      tokenIn && tokenOut
        ? [tokenIn.address, tokenOut.address, DEFAULT_LIMIT_SIZE]
        : [ZERO_ADDRESS, ZERO_ADDRESS, DEFAULT_LIMIT_SIZE],
      [],
      [],
      [],
      [],
      [],
      []
    ]
  )

  return useMemo(() => {
    const returns = results?.map(result => {
      if (!result || result.loading) return { data: null, loading: result.loading }
      const { result: data, loading } = result
      return { data, loading }
    })

    if (
      !returns ||
      returns.length === 0 ||
      returns[0].loading ||
      returns.length !== 7 ||
      !returns[0].data ||
      !returns[1].data ||
      !returns[2].data ||
      !returns[3].data ||
      !returns[4].data ||
      !returns[5].data ||
      !returns[6].data
    ) {
      return null
    }

    const {
      data: [price, buyPrices, buyAmounts, sellPrices, sellAmounts]
    } = returns[0]
    const {
      data: [baseReserve, quoteReserve]
    } = returns[1] ?? [undefined, undefined]
    const {
      data: [baseTokenAddress]
    } = returns[2]
    const {
      data: [protocolFeeRate]
    } = returns[3]
    const {
      data: [subsidyFeeRate]
    } = returns[4]
    const {
      data: [minAmount]
    } = returns[5]
    const {
      data: [priceStep]
    } = returns[6]
    const baseToken = baseTokenAddress.toLowerCase() === tokenIn?.address.toLowerCase() ? tokenIn : tokenOut
    const quoteToken = baseTokenAddress.toLowerCase() === tokenIn?.address.toLowerCase() ? tokenOut : tokenIn
    if (baseToken && quoteToken && buyPrices && buyAmounts && sellPrices && sellAmounts && minAmount && priceStep) {
      const baseAmount = wrappedCurrencyAmount(new TokenAmount(baseToken, baseReserve), baseToken.chainId)
      const quoteAmount = wrappedCurrencyAmount(new TokenAmount(quoteToken, quoteReserve), quoteToken.chainId)
      const curPrice = wrappedCurrencyAmount(new TokenAmount(quoteToken, price), quoteToken.chainId)
      const buyOrders: Order[] = []
      for (let i = 0; i < buyPrices.length; i++) {
        const buyPrice = wrappedCurrencyAmount(new TokenAmount(quoteToken, buyPrices[i]), quoteToken.chainId)
        const buyAmount = wrappedCurrencyAmount(new TokenAmount(quoteToken, buyAmounts[i]), quoteToken.chainId)
        if (buyPrice && buyAmount) buyOrders.push(new Order(buyPrice, buyAmount))
      }

      const sellOrders: Order[] = []
      for (let i = 0; i < sellPrices.length; i++) {
        const sellPrice = wrappedCurrencyAmount(new TokenAmount(quoteToken, sellPrices[i]), quoteToken.chainId)
        const sellAmount = wrappedCurrencyAmount(new TokenAmount(baseToken, sellAmounts[i]), baseToken.chainId)
        if (sellPrice && sellAmount) sellOrders.push(new Order(sellPrice, sellAmount))
      }

      return baseAmount && quoteAmount && curPrice
        ? new OrderBook(
            baseAmount,
            quoteAmount,
            minAmount,
            priceStep,
            protocolFeeRate,
            subsidyFeeRate,
            curPrice,
            buyOrders,
            sellOrders
          )
        : null
    }

    return null
  }, [tokenIn, tokenOut, results])
}

export function useTradeRet(
  orderBook: OrderBook | null,
  type: TradeType | undefined,
  amount: CurrencyAmount | undefined,
  price: CurrencyAmount | undefined
): TradeRet | null {
  const tokenIn = type === TradeType.LIMIT_BUY ? orderBook?.quoteToken : orderBook?.baseToken
  const tokenOut = type === TradeType.LIMIT_BUY ? orderBook?.baseToken : orderBook?.quoteToken
  const results = useMultipleContractMultipleData(
    [orderBook && amount && price && type ? ORDER_BOOK_ROUTER_ADDRESS : ''],
    [new Interface(IHybridRouterABI)],
    [type === TradeType.LIMIT_BUY ? 'getAmountsForBuy' : 'getAmountsForSell'],
    [
      amount && price
        ? [
            amount.raw.toString(),
            price.raw.toString(),
            orderBook?.baseToken.token?.address,
            orderBook?.quoteToken.token?.address
          ]
        : [ZERO.toString(), ZERO.toString(), ZERO_ADDRESS, ZERO_ADDRESS]
    ]
  )

  return useMemo(() => {
    const returns = results?.map(result => {
      if (!result || result.loading) return { data: null, loading: result.loading }
      const { result: data, loading } = result
      return { data, loading }
    })

    if (!returns || returns.length === 0 || returns[0].loading || returns.length !== 1 || !returns[0].data) {
      return null
    }

    const {
      amounts: [
        ammAmountInRaw,
        ammAmountOutRaw,
        orderAmountInRaw,
        orderAmountOutRaw,
        orderFeeRaw,
        amountLeftRaw,
        amountExpectRaw,
        priceToRaw
      ]
    } = returns[0].data

    const ammAmountIn = tokenIn
      ? wrappedCurrencyAmount(new TokenAmount(tokenIn?.token, ammAmountInRaw), tokenIn?.token.chainId)
      : undefined
    const ammAmountOut = tokenOut
      ? wrappedCurrencyAmount(new TokenAmount(tokenOut?.token, ammAmountOutRaw), tokenOut?.token.chainId)
      : undefined
    const orderAmountIn = tokenIn
      ? wrappedCurrencyAmount(new TokenAmount(tokenIn?.token, orderAmountInRaw), tokenIn?.token.chainId)
      : undefined
    const orderAmountOut = tokenOut
      ? wrappedCurrencyAmount(new TokenAmount(tokenOut?.token, orderAmountOutRaw), tokenOut?.token.chainId)
      : undefined
    const orderFee = tokenIn
      ? wrappedCurrencyAmount(new TokenAmount(tokenIn?.token, orderFeeRaw), tokenIn?.token.chainId)
      : undefined
    const amountLeft = tokenIn
      ? wrappedCurrencyAmount(new TokenAmount(tokenIn?.token, amountLeftRaw), tokenIn?.token.chainId)
      : undefined
    const amountExpect = tokenOut
      ? wrappedCurrencyAmount(new TokenAmount(tokenOut?.token, amountExpectRaw), tokenOut?.token.chainId)
      : undefined
    const priceTo = orderBook?.quoteToken
      ? wrappedCurrencyAmount(new TokenAmount(orderBook?.quoteToken.token, priceToRaw), tokenOut?.token.chainId)
      : undefined
    if (
      orderBook &&
      ammAmountIn &&
      ammAmountOut &&
      orderAmountIn &&
      orderAmountOut &&
      orderFee &&
      amountLeft &&
      amountExpect &&
      priceTo
    ) {
      return new TradeRet(
        orderBook,
        ammAmountIn,
        ammAmountOut,
        orderAmountIn,
        orderAmountOut,
        orderFee,
        amountLeft,
        amountExpect,
        priceTo
      )
    }

    return null
  }, [orderBook, results, tokenIn, tokenOut])
}

export function useUserOrderIds(
  account: string | undefined,
  trackedTokensAndOrderBookAddresses: (Token | string)[][]
): { selectOrderBooks: (Token | string)[][]; userOrderIds: string[] } {
  const orderBookInterface = new Interface(IOrderBookABI)
  const orderBookAddresses = trackedTokensAndOrderBookAddresses.map(e => e[2].toString())
  const results = useMultipleContractSingleData(orderBookAddresses, orderBookInterface, 'getUserOrders', [account])
  return useMemo(() => {
    const allOrderIds: string[] = []
    const selectOrderBooks: (Token | string)[][] = []
    for (let i = 0; i < results.length; i++) {
      const { result, loading } = results[i]
      if (loading || !result || result.length === 0) continue
      const orderIds = result[0]
      const length = orderIds ? orderIds.length : 0
      for (let j = 0; j < length; j++) {
        const orderId = orderIds ? orderIds[j].toString() : undefined
        if (orderId) {
          allOrderIds.push(orderId)
          selectOrderBooks.push(trackedTokensAndOrderBookAddresses[i])
        }
      }
    }
    return { selectOrderBooks: selectOrderBooks, userOrderIds: allOrderIds }
  }, [results, trackedTokensAndOrderBookAddresses])
}

export function useUserOrders(selectOrderBooks: (Token | string)[][], userOrderIds: string[]): UserOrder[] {
  const orderBookInterface = new Interface(IOrderBookABI)
  const orderBookAddresses = selectOrderBooks
    .map(e => e[2].toString())
    .concat(selectOrderBooks.map(e => e[2].toString()))
  //console.log('address:', orderBookAddresses)
  const orderBookInterfaces = userOrderIds
    .map(e => orderBookInterface)
    .concat(userOrderIds.map(e => orderBookInterface))
  //console.log('interfaces:', orderBookInterfaces)
  const methodNames = userOrderIds.map(e => 'marketOrder').concat(userOrderIds.map(e => 'quoteToken'))
  //console.log('methods:', methodNames)
  const callInputs = userOrderIds.map(e => [e]).concat(userOrderIds.map(e => []))
  //console.log('inputs:', callInputs)
  const results = useMultipleContractMultipleData(orderBookAddresses, orderBookInterfaces, methodNames, callInputs)
  return useMemo(() => {
    const returns = results?.map(result => {
      if (!result || result.loading) return { data: null, loading: result.loading }
      const { result: data, loading } = result
      return { data, loading }
    })

    //console.log('returns:', returns)
    if (!returns || returns.length === 0 || returns[0].loading || returns.length !== userOrderIds.length * 2) {
      return []
    }

    const userOrders: UserOrder[] = []
    for (let i = 0; i < userOrderIds.length; i++) {
      const order = returns[i].data ?? []
      if (order.length === 0) continue
      const [owner, orderId, price, amountOffer, amountRemain, orderType, orderIndex] = order[0]
      //console.log('order:', owner, to, orderId, price, amountOffer, amountRemain, orderType, orderIndex)
      const quoteAddress = returns[userOrderIds.length + i].data?.toString()
      //console.log('quote:', quoteAddress)
      const quoteToken =
        quoteAddress?.toLowerCase() === (selectOrderBooks[i][0] as Token).address.toLowerCase()
          ? (selectOrderBooks[i][0] as Token)
          : (selectOrderBooks[i][1] as Token)
      const baseToken =
        quoteToken === (selectOrderBooks[i][0] as Token)
          ? (selectOrderBooks[i][1] as Token)
          : (selectOrderBooks[i][0] as Token)
      const type = orderType.toString() === TradeType.LIMIT_BUY.toString() ? TradeType.LIMIT_BUY : TradeType.LIMIT_SELL
      const amountRemainAmount =
        type === TradeType.LIMIT_BUY
          ? new TokenAmount(quoteToken, amountRemain)
          : new TokenAmount(baseToken, amountRemain)
      const amountOfferAmount =
        type === TradeType.LIMIT_BUY
          ? new TokenAmount(quoteToken, amountOffer)
          : new TokenAmount(baseToken, amountOffer)
      const priceAmount = new TokenAmount(quoteToken, price)
      userOrders.push({
        amountLeft: amountRemainAmount,
        amountOffer: amountOfferAmount,
        orderId: orderId,
        orderIndex: orderIndex,
        orderType: type,
        owner: '0x' + JSBI.BigInt(owner).toString(16),
        price: priceAmount,
        orderBook: orderBookAddresses[i],
        baseToken: baseToken,
        quoteToken: quoteToken
      })
    }

    return userOrders
  }, [selectOrderBooks, orderBookAddresses, userOrderIds, results])
}

export function useUserOrder(
  tokenA: Token | undefined,
  tokenB: Token | undefined,
  orderId: string | undefined
): UserOrder | null {
  const orderBookAddress = tokenA && tokenB ? OrderBook.getAddress(tokenA as Token, tokenB as Token) : ''
  const userOrders = useUserOrders([[tokenA as Token, tokenB as Token, orderBookAddress]], [orderId ?? ''])
  return userOrders.length > 0 ? userOrders[0] : null
}
