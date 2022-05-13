import { createReducer } from '@reduxjs/toolkit'
import { Input, replaceTradeState, setRecipient, setSelectedType, tradeTypeInput } from './actions'
import { TradeType } from '@hybridx-exchange/hybridx-sdk'

export interface TradeState {
  readonly typedAmountValue: string
  readonly typedPriceValue: string
  // the typed recipient address or ENS name, or null if swap should go to sender
  readonly recipient: string | null
  readonly selectedType: TradeType
}

const initialState: TradeState = {
  typedAmountValue: '',
  typedPriceValue: '',
  recipient: null,
  selectedType: TradeType.LIMIT_SELL
}

export default createReducer<TradeState>(initialState, builder =>
  builder
    .addCase(
      replaceTradeState,
      (state, { payload: { typedAmountValue, typedPriceValue, recipient, selectedType } }) => {
        return {
          typedAmountValue: typedAmountValue,
          typedPriceValue: typedPriceValue,
          recipient,
          selectedType
        }
      }
    )
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
    .addCase(setSelectedType, (state, { payload: { type } }) => {
      state.selectedType = type
    })
)
