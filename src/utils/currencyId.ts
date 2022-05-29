import { ChainId, Currency, ETHER, Token } from '@hybridx-exchange/hybridx-sdk'

export function currencyId(currency: Currency, chainId: ChainId | undefined): string {
  if (chainId && currency === ETHER[chainId]) return ETHER[chainId].symbol ?? ''
  if (currency instanceof Token) return currency.address
  throw new Error('invalid currency')
}
