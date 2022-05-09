import { createAction } from '@reduxjs/toolkit'

export enum Field {
  CURRENCY_BASE = 'CURRENCY_BASE',
  CURRENCY_QUOTE = 'CURRENCY_QUOTE'
}

export const orderBookTypeInput = createAction<{
  field: Field
  typedValue: string
  noLiquidity: boolean
  orderBookExist: boolean
}>('orderBook/typeInput')
export const orderBookResetState = createAction<void>('orderBook/resetState')
