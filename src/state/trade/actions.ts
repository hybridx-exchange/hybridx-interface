import { createAction } from '@reduxjs/toolkit'
import { TradeType } from '@hybridx-exchange/hybridx-sdk'

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
  selectedType: TradeType
}>('trade/replaceTradeState')
export const setRecipient = createAction<{ recipient: string | null }>('trade/setRecipient')
export const setSelectedType = createAction<{ type: TradeType }>('trade/setSelectedType')
