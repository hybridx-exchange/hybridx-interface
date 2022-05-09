import { createReducer } from '@reduxjs/toolkit'
import { Input, replaceTradeState, setRecipient, tradeTypeInput } from './actions'

export interface TradeState {
  readonly typedAmountValue: string
  readonly typedPriceValue: string
  // the typed recipient address or ENS name, or null if swap should go to sender
  readonly recipient: string | null
}

const initialState: TradeState = {
  typedAmountValue: '',
  typedPriceValue: '',
  recipient: null
}

export default createReducer<TradeState>(initialState, builder =>
  builder
    .addCase(replaceTradeState, (state, { payload: { typedAmountValue, typedPriceValue, recipient } }) => {
      return {
        typedAmountValue: typedAmountValue,
        typedPriceValue: typedPriceValue,
        recipient
      }
    })
    .addCase(tradeTypeInput, (state, { payload: { input, typedValue } }) => {
      if (input === Input.AMOUNT) {
        return {
          ...state,
          input,
          typedAmountValue: typedValue
        }
      } else {
        return {
          ...state,
          input,
          typedPriceValue: typedValue
        }
      }
    })
    .addCase(setRecipient, (state, { payload: { recipient } }) => {
      state.recipient = recipient
    })
)
