import { Currency, ETHER, Token } from '@hybridx-exchange/hybridx-sdk'

export function currencyId(currency: Currency): string {
  if (currency === ETHER) return 'ROSE'
  if (currency instanceof Token) return currency.address
  throw new Error('invalid currency')
}
