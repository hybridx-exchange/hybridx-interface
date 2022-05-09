import { createReducer } from '@reduxjs/toolkit'
import { Field, orderBookResetState, orderBookTypeInput } from './actions'

export interface OrderBookState {
  readonly independentField: Field
  readonly priceStepValue: string
  readonly minAmountValue: string
}

const initialState: OrderBookState = {
  independentField: Field.CURRENCY_BASE,
  priceStepValue: '',
  minAmountValue: ''
}

export default createReducer<OrderBookState>(initialState, builder =>
  builder
    .addCase(orderBookResetState, () => initialState)
    .addCase(orderBookTypeInput, (state, { payload: { field, typedValue, orderBookExist } }) => {
      // they're typing into the field they've last typed in
      if (field === Field.CURRENCY_BASE) {
        return {
          ...state,
          independentField: field,
          minAmountValue: typedValue
        }
      }
      // they're typing into a new field, store the other value
      else {
        return {
          ...state,
          independentField: field,
          priceStepValue: typedValue
        }
      }
    })
)
