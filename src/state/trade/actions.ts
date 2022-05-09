import { createAction } from '@reduxjs/toolkit'

export enum Field {
  CURRENCY_A = 'CURRENCY_A',
  CURRENCY_B = 'CURRENCY_B'
}

export enum Input {
  AMOUNT = 'AMOUNT',
  PRICE = 'PRICE'
}

export const tradeTypeInput = createAction<{ input: Input; typedValue: string }>('trade/typeInput')
export const replaceTradeState = createAction<{
  typedAmountValue: string
  typedPriceValue: string
  recipient: string | null
}>('trade/replaceTradeState')
export const setRecipient = createAction<{ recipient: string | null }>('trade/setRecipient')
