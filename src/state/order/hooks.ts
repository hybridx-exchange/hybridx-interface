import { Currency, UserOrder } from '@hybridx-exchange/uniswap-sdk'

import { useActiveWeb3React } from '../../hooks'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import { useUserOrder } from '../../hooks/Trades'

export function useDerivedCancelOrderInfo(
  currencyA: Currency | undefined,
  currencyB: Currency | undefined,
  orderId: string | undefined
): {
  userOrder?: UserOrder | null
  error?: string
} {
  const { account, chainId } = useActiveWeb3React()

  const [tokenA, tokenB] = [wrappedCurrency(currencyA, chainId), wrappedCurrency(currencyB, chainId)]

  const userOrder = useUserOrder(tokenA, tokenB, orderId)

  let error: string | undefined
  if (!account) {
    error = 'Connect Wallet'
  }

  if (!userOrder) {
    error = error ?? 'Invalid Order'
  }

  if (userOrder?.orderId.toString() === '0') {
    error = error ?? 'Order not exist'
  }

  if (userOrder?.owner.toLowerCase() !== account?.toLowerCase()) {
    error = error ?? 'Change Wallet'
  }

  return { userOrder, error }
}
