import {
  CONFIG_ADDRESS,
  Currency,
  CurrencyAmount,
  JSBI,
  Order,
  OrderBook,
  Pair,
  parseBigintIsh,
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
import { abi as IPairUtilsABI } from '@hybridx-exchange/hybridx-protocol/build/IPairUtils.json'
import { abi as IConfigABI } from '@hybridx-exchange/hybridx-protocol/build/IConfig.json'
import { abi as IOrderBookRouterABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderBookRouter.json'
import { abi as IOrderBookABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderBook.json'
import { abi as IOrderNFTABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderNFT.json'
import { Interface } from '@ethersproject/abi'
import { useUserSingleHopOnly } from '../state/user/hooks'
import { BigNumber } from 'ethers'

function useAllCommonPairs(currencyA?: Currency, currencyB?: Currency): Pair[] {
  const { chainId } = useActiveWeb3React()

  const bases: Token[] = chainId ? BASES_TO_CHECK_TRADES_AGAINST[chainId] : []
  //console.log('bases', bases)
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
  //console.log('base pair', basePairs)
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
    new Interface(IPairUtilsABI),
    'getBestAmountsOut',
    [currencyAmountIn?.raw.toString(), paths2, lens]
  )

  return useMemo(() => {
    const returns = results?.map(result => {
      if (!result || !result.result || result.loading) return { data: null, loading: result.loading }
      const {
        result: [path, amounts, extra],
        loading
      } = result
      return { data: { path, amounts, extra }, loading: loading }
    })

    //console.log(returns)

    if (!returns || returns.length === 0 || returns[0].loading) {
      return { loading: true, bestSwap: null }
    }

    const data = returns[0].data
    const path = data && data.path ? data.path : []
    const amounts = data && data.amounts ? data.amounts : []
    const extra = data && data.extra ? data.extra : []
    /*extra.length > 0 &&
      console.log(
        extra[0].toString(),
        extra[1].toString(),
        extra[2].toString(),
        extra[3].toString(),
        extra[4].toString(),
        extra[5].toString()
      )*/
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
          new Route(pairs, amounts, extra, currencyAmountIn.currency, currencyOut),
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
    new Interface(IPairUtilsABI),
    'getBestAmountsIn',
    [currencyAmountOut?.raw.toString(), paths2, lens]
  )

  return useMemo(() => {
    const returns = results?.map(result => {
      if (!result || !result.result || result.loading || !result.result) return { data: null, loading: result.loading }
      const {
        result: [path, amounts, extra],
        loading
      } = result
      return { data: { path, amounts, extra }, loading: loading }
    })

    if (!returns || returns.length === 0 || returns[0].loading) {
      return { loading: true, bestSwap: null }
    }

    const data = returns[0].data
    const path = data && data.path ? data.path : []
    const amounts = data && data.amounts ? data.amounts : []
    const extra = data && data.extra ? data.extra : []
    /*extra.length > 0 &&
      console.log(
        extra[0].toString(),
        extra[1].toString(),
        extra[2].toString(),
        extra[3].toString(),
        extra[4].toString(),
        extra[5].toString()
      )*/
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
          new Route(pairs, amounts, extra, currencyIn, currencyAmountOut.currency),
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
export function useOrderBook(
  selectedType: TradeType,
  currencyIn?: Currency | undefined,
  currencyOut?: Currency | undefined
): OrderBook | null {
  const { chainId } = useActiveWeb3React()
  const tokenIn = wrappedCurrency(currencyIn, chainId)
  const tokenOut = wrappedCurrency(currencyOut, chainId)
  const orderBookAddress =
    tokenIn && tokenOut && tokenIn.address !== tokenOut.address ? OrderBook.getAddress(tokenIn, tokenOut) : ''
  const orderBookInterface = new Interface(IOrderBookABI)
  const pairUtilsInterface = new Interface(IPairUtilsABI)
  const configInterface = new Interface(IConfigABI)
  const results = useMultipleContractMultipleData(
    [
      tokenIn && tokenOut && tokenIn.address !== tokenOut.address ? ORDER_BOOK_ROUTER_ADDRESS : '',
      tokenIn && tokenOut && tokenIn.address !== tokenOut.address ? PAIR_UTILS_ADDRESS : '',
      orderBookAddress,
      CONFIG_ADDRESS,
      CONFIG_ADDRESS,
      CONFIG_ADDRESS,
      CONFIG_ADDRESS
    ],
    [
      new Interface(IOrderBookRouterABI),
      pairUtilsInterface,
      orderBookInterface,
      configInterface,
      configInterface,
      configInterface,
      configInterface
    ],
    [
      'getOrderBook',
      'getReserves',
      'baseToken',
      'protocolFeeRate',
      'subsidyFeeRate',
      'priceStepFactor',
      'priceStepMap'
    ],
    [
      tokenIn && tokenOut
        ? [tokenIn.address, tokenOut.address, DEFAULT_LIMIT_SIZE]
        : [ZERO_ADDRESS, ZERO_ADDRESS, DEFAULT_LIMIT_SIZE],
      tokenIn && tokenOut ? [tokenIn.address, tokenOut.address] : [ZERO_ADDRESS, ZERO_ADDRESS],
      [],
      [orderBookAddress === '' ? ZERO_ADDRESS : orderBookAddress],
      [orderBookAddress === '' ? ZERO_ADDRESS : orderBookAddress],
      [],
      [orderBookAddress === '' ? ZERO_ADDRESS : orderBookAddress]
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
      !returns[1].data ||
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
      data: [reserveIn, reserveOut]
    } = returns[1]
    const {
      data: [baseTokenAddress]
    } = returns[2].data ? returns[2] : { data: [ZERO_ADDRESS] }
    const {
      data: [protocolFeeRate]
    } = returns[3]
    const {
      data: [subsidyFeeRate]
    } = returns[4]
    const {
      data: [priceStepFactor]
    } = returns[5]
    const {
      data: [priceStep]
    } = returns[6]
    const exist = !price || price.eq(BigNumber.from(0)) ? false : true
    const baseToken = exist
      ? baseTokenAddress.toLowerCase() === tokenIn?.address.toLowerCase()
        ? tokenIn
        : tokenOut
      : selectedType === TradeType.LIMIT_SELL
      ? tokenIn
      : tokenOut
    const quoteToken = exist
      ? baseTokenAddress.toLowerCase() === tokenIn?.address.toLowerCase()
        ? tokenOut
        : tokenIn
      : selectedType === TradeType.LIMIT_SELL
      ? tokenOut
      : tokenIn
    if (baseToken && quoteToken && priceStepFactor && priceStep) {
      const baseReserve = exist
        ? baseTokenAddress.toLowerCase() === tokenIn?.address.toLowerCase()
          ? reserveIn
          : reserveOut
        : selectedType === TradeType.LIMIT_SELL
        ? reserveIn
        : reserveOut
      const quoteReserve = exist
        ? baseTokenAddress.toLowerCase() === tokenIn?.address.toLowerCase()
          ? reserveOut
          : reserveIn
        : selectedType === TradeType.LIMIT_SELL
        ? reserveOut
        : reserveIn
      const baseAmount = wrappedCurrencyAmount(new TokenAmount(baseToken, baseReserve), baseToken.chainId)
      const quoteAmount = wrappedCurrencyAmount(new TokenAmount(quoteToken, quoteReserve), quoteToken.chainId)
      const curPrice = exist
        ? wrappedCurrencyAmount(new TokenAmount(quoteToken, price), quoteToken.chainId)
        : JSBI.GT(baseReserve, parseBigintIsh('0'))
        ? OrderBook.culPrice(baseAmount, quoteAmount)
        : undefined
      const buyOrders: Order[] = []
      for (let i = 0; i < buyPrices?.length; i++) {
        const buyPrice = wrappedCurrencyAmount(new TokenAmount(quoteToken, buyPrices[i]), quoteToken.chainId)
        const buyAmount = wrappedCurrencyAmount(new TokenAmount(quoteToken, buyAmounts[i]), quoteToken.chainId)
        if (buyPrice && buyAmount) buyOrders.push(new Order(buyPrice, buyAmount))
      }

      const sellOrders: Order[] = []
      for (let i = 0; i < sellPrices?.length; i++) {
        const sellPrice = wrappedCurrencyAmount(new TokenAmount(quoteToken, sellPrices[i]), quoteToken.chainId)
        const sellAmount = wrappedCurrencyAmount(new TokenAmount(baseToken, sellAmounts[i]), baseToken.chainId)
        if (sellPrice && sellAmount) sellOrders.push(new Order(sellPrice, sellAmount))
      }

      return baseAmount && quoteAmount && curPrice
        ? new OrderBook(
            exist,
            baseAmount,
            quoteAmount,
            priceStep,
            priceStepFactor,
            protocolFeeRate,
            subsidyFeeRate,
            curPrice,
            buyOrders,
            sellOrders
          )
        : null
    }

    return null
  }, [selectedType, tokenIn, tokenOut, results])
}

export function useTradeRet(
  type: TradeType | undefined,
  tokenIn: Token | undefined,
  tokenOut: Token | undefined,
  amount: CurrencyAmount | undefined,
  price: CurrencyAmount | undefined
): TradeRet | null {
  const tokenBase = type === TradeType.LIMIT_BUY ? tokenOut : tokenIn
  const tokenQuote = type === TradeType.LIMIT_BUY ? tokenIn : tokenOut

  const results = useMultipleContractMultipleData(
    [tokenIn && tokenOut && amount && price && type ? ORDER_BOOK_ROUTER_ADDRESS : ''],
    [new Interface(IOrderBookRouterABI)],
    [type === TradeType.LIMIT_BUY ? 'getAmountsForBuy' : 'getAmountsForSell'],
    [
      amount && price
        ? [amount.raw.toString(), price.raw.toString(), tokenBase?.address, tokenQuote?.address]
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
    console.log(
      ammAmountInRaw.toString(),
      ammAmountOutRaw.toString(),
      orderAmountInRaw.toString(),
      orderAmountOutRaw.toString(),
      orderFeeRaw.toString(),
      amountLeftRaw.toString(),
      amountExpectRaw.toString(),
      priceToRaw.toString()
    )
    const ammAmountIn = tokenIn
      ? wrappedCurrencyAmount(new TokenAmount(tokenIn, ammAmountInRaw), tokenIn?.chainId)
      : undefined
    const ammAmountOut = tokenOut
      ? wrappedCurrencyAmount(new TokenAmount(tokenOut, ammAmountOutRaw), tokenOut?.chainId)
      : undefined
    const orderAmountIn = tokenIn
      ? wrappedCurrencyAmount(new TokenAmount(tokenIn, orderAmountInRaw), tokenIn?.chainId)
      : undefined
    const orderAmountOut = tokenOut
      ? wrappedCurrencyAmount(new TokenAmount(tokenOut, orderAmountOutRaw), tokenOut?.chainId)
      : undefined
    const orderFee = tokenOut
      ? wrappedCurrencyAmount(new TokenAmount(tokenOut, orderFeeRaw), tokenOut?.chainId)
      : undefined
    const amountLeft = tokenIn
      ? wrappedCurrencyAmount(new TokenAmount(tokenIn, amountLeftRaw), tokenIn?.chainId)
      : undefined
    const amountExpect = tokenOut
      ? wrappedCurrencyAmount(new TokenAmount(tokenOut, amountExpectRaw), tokenOut?.chainId)
      : undefined
    const priceTo = tokenQuote
      ? wrappedCurrencyAmount(new TokenAmount(tokenQuote, priceToRaw), tokenQuote?.chainId)
      : undefined
    if (
      tokenIn &&
      tokenOut &&
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
  }, [tokenQuote, results, tokenIn, tokenOut])
}

export function useUserOrders(selectPairAndAddress: (Token | string)[][], account: string | undefined): UserOrder[] {
  const orderBookInterface = new Interface(IOrderBookABI)
  const orderNFTInterface = new Interface(IOrderNFTABI)
  const orderNFTAddresses = selectPairAndAddress.map(e => e[3].toString())
  let results = useMultipleContractSingleData(orderNFTAddresses, orderNFTInterface, 'getUserOrders', [
    account ?? ZERO_ADDRESS
  ])

  const [hitPairAndAddress, hitOrderBookAddress, ids, orders] = useMemo(() => {
    const returns = results?.map(result => {
      if (!result || result.loading) return { data: null, loading: result.loading }
      const { result: data, loading } = result
      return { data, loading }
    })

    if (!returns || returns.length === 0 || returns[0].loading) {
      return [[], [], [], []]
    }

    const addresses: (Token | string)[][] = []
    const ids: any[] = []
    const orders: any[] = []
    for (let i = 0; i < returns.length; i++) {
      const retData = returns[i].data ?? [[], []]
      const id = retData[0]
      const data = retData[1]
      if (id.length > 0 && data.length > 0) {
        addresses.push(selectPairAndAddress[i])
        ids.push(id)
        orders.push(data)
      }
    }
    const hitOrderBookAddress = addresses.map(e => e[2].toString())
    return [addresses, hitOrderBookAddress, ids, orders]
  }, [results, selectPairAndAddress])

  //console.log(hitOrderBookAddress, ids, orders)
  results = useMultipleContractSingleData(hitOrderBookAddress, orderBookInterface, 'quoteToken', [])
  return useMemo(() => {
    const returns = results?.map(res => {
      if (!res || res.loading) return { result: null, loading: res.loading }
      //console.log(res)
      return res
    })

    if (!returns || returns.length === 0 || returns[0].loading || returns.length !== hitPairAndAddress.length) {
      return []
    }

    const userOrders: UserOrder[] = []
    for (let n = 0; n < ids.length; n++) {
      for (let i = 0; i < ids[n].length; i++) {
        const orderId = ids[n][i].toString()
        const [price, amountOffer, amountRemain, orderType] = orders[n][i]
        const orderIndex = i + ''
        const owner = account ?? ZERO_ADDRESS
        //console.log('order:', owner, orderId, price, amountOffer, amountRemain, orderType, orderIndex)
        const quoteAddress = returns[n].result?.toString()
        const quoteToken =
          quoteAddress?.toLowerCase() === (hitPairAndAddress[n][0] as Token).address.toLowerCase()
            ? (hitPairAndAddress[n][0] as Token)
            : (hitPairAndAddress[n][1] as Token)
        const baseToken =
          quoteToken === (hitPairAndAddress[n][0] as Token)
            ? (hitPairAndAddress[n][1] as Token)
            : (hitPairAndAddress[n][0] as Token)
        const type =
          orderType.toString() === TradeType.LIMIT_BUY.toString() ? TradeType.LIMIT_BUY : TradeType.LIMIT_SELL
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
          owner: owner,
          price: priceAmount,
          orderBook: hitPairAndAddress[n][2] as string,
          baseToken: baseToken,
          quoteToken: quoteToken
        })
      }
    }

    return userOrders
  }, [account, hitPairAndAddress, ids, orders, results])
}

export function useUserOrder(
  tokenA: Token | undefined,
  tokenB: Token | undefined,
  account: string | undefined,
  orderId: string
): UserOrder | null {
  const orderBookAddress = tokenA && tokenB ? OrderBook.getAddress(tokenA as Token, tokenB as Token) : ''
  const orderNFTAddress = tokenA && tokenB ? OrderBook.getNFTAddress(tokenA as Token, tokenB as Token) : ''
  const userOrders = useUserOrders([[tokenA as Token, tokenB as Token, orderBookAddress, orderNFTAddress]], account)
  const userOrder = userOrders.filter(order => order.orderId === orderId)
  return userOrder.length > 0 ? userOrder[0] : null
}
