import { BLOCKED_PRICE_IMPACT_NON_EXPERT } from '../constants'
import { CurrencyAmount, Fraction, JSBI, Percent, TokenAmount, Swap } from '@hybridx-exchange/hybridx-sdk'
import { ALLOWED_PRICE_IMPACT_HIGH, ALLOWED_PRICE_IMPACT_LOW, ALLOWED_PRICE_IMPACT_MEDIUM } from '../constants'
import { Field } from '../state/swap/actions'
import { basisPointsToPercent } from './index'

const BASE_FEE = new Percent(JSBI.BigInt(30), JSBI.BigInt(10000))
const ONE_HUNDRED_PERCENT = new Percent(JSBI.BigInt(10000), JSBI.BigInt(10000))
//const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE)

// computes price breakdown for the trade
export function computeTradePriceBreakdown(
  swap?: Swap
): { priceImpactWithoutFee?: Percent; realizedLPFee?: CurrencyAmount } {
  // for each hop in our trade, take away the x*y=k price impact from 0.3% fees
  // e.g. for 3 tokens/2 hops: 1 - ((1 - .03) * (1-.03))
  // 1 - (1 - percent of amm amount in trade * .03) * (1 - percent of amm amount in trade * .03)
  const extra = swap?.route?.extra ?? []
  const path = swap?.route?.path ?? []
  let realizedLPFee: undefined | Fraction = ONE_HUNDRED_PERCENT
  for (let i = 0; i < path?.length - 1; i++) {
    const ammAmount = new TokenAmount(path[i], extra[i * 6 + 2])
    const orderAmount = new TokenAmount(path[i], extra[i * 6 + 4])
    const percent = ammAmount.divide(ammAmount.add(orderAmount))
    realizedLPFee = realizedLPFee.multiply(ONE_HUNDRED_PERCENT.subtract(percent.multiply(BASE_FEE)))
  }

  realizedLPFee = realizedLPFee === ONE_HUNDRED_PERCENT ? undefined : ONE_HUNDRED_PERCENT.subtract(realizedLPFee)

  /*const realizedLPFee = !swap
    ? undefined
    : ONE_HUNDRED_PERCENT.subtract(
        swap.route.pairs.reduce<Fraction>(
          (currentFee: Fraction): Fraction => currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
          ONE_HUNDRED_PERCENT
        )
      )*/

  // remove lp fees from price impact
  const priceImpactWithoutFeeFraction = swap && realizedLPFee ? swap.priceImpact.subtract(realizedLPFee) : undefined

  // the x*y=k impact
  const priceImpactWithoutFeePercent = priceImpactWithoutFeeFraction
    ? new Percent(priceImpactWithoutFeeFraction?.numerator, priceImpactWithoutFeeFraction?.denominator)
    : undefined

  // the amount of the input that accrues to LPs
  const realizedLPFeeAmount =
    realizedLPFee &&
    swap &&
    (swap.inputAmount instanceof TokenAmount
      ? new TokenAmount(swap.inputAmount.token, realizedLPFee.multiply(swap.inputAmount.raw).quotient)
      : CurrencyAmount.ether(realizedLPFee.multiply(swap.inputAmount.raw).quotient))
  //console.log(realizedLPFee?.toSignificant(6), realizedLPFeeAmount?.toSignificant())
  return { priceImpactWithoutFee: priceImpactWithoutFeePercent, realizedLPFee: realizedLPFeeAmount }
}

// computes the minimum amount out and maximum amount in for a trade given a user specified allowed slippage in bips
export function computeSlippageAdjustedAmounts(
  swap: Swap | undefined,
  allowedSlippage: number
): { [field in Field]?: CurrencyAmount } {
  const pct = basisPointsToPercent(allowedSlippage)
  return {
    [Field.INPUT]: swap?.maximumAmountIn(pct),
    [Field.OUTPUT]: swap?.minimumAmountOut(pct)
  }
}

export function warningSeverity(priceImpact: Percent | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!priceImpact?.lessThan(BLOCKED_PRICE_IMPACT_NON_EXPERT)) return 4
  if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_HIGH)) return 3
  if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_MEDIUM)) return 2
  if (!priceImpact?.lessThan(ALLOWED_PRICE_IMPACT_LOW)) return 1
  return 0
}

export function formatExecutionPrice(swap?: Swap, inverted?: boolean): string {
  if (!swap) {
    return ''
  }
  return inverted
    ? `${swap.executionPrice.invert().toSignificant(6)} ${swap.inputAmount.currency.symbol} / ${
        swap.outputAmount.currency.symbol
      }`
    : `${swap.executionPrice.toSignificant(6)} ${swap.outputAmount.currency.symbol} / ${
        swap.inputAmount.currency.symbol
      }`
}
