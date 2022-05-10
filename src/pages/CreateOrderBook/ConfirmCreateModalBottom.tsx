import { BigintIsh, Currency, CurrencyAmount, Price } from '@hybridx-exchange/hybridx-sdk'
import React from 'react'
import { Text } from 'rebass'
import { ButtonPrimary } from '../../components/Button'
import { RowBetween, RowFixed } from '../../components/Row'
import CurrencyLogo from '../../components/CurrencyLogo'
import { Field } from '../../state/orderBook/actions'
import { TYPE } from '../../theme'

export function ConfirmCreateModalBottom({
  currencies,
  currencyBalances,
  priceStepAmount,
  minAmountAmount,
  orderBookExist,
  onAdd
}: {
  currencies: { [field in Field]?: Currency }
  currencyBalances: { [field in Field]?: CurrencyAmount }
  priceStepAmount: CurrencyAmount | undefined
  minAmountAmount: CurrencyAmount | undefined
  orderBookExist: boolean
  onAdd: () => void
}) {
  const LPPrice =
    currencies[Field.CURRENCY_BASE] &&
    currencies[Field.CURRENCY_QUOTE] &&
    currencyBalances[Field.CURRENCY_BASE] &&
    currencyBalances[Field.CURRENCY_QUOTE]
      ? new Price(
          currencies[Field.CURRENCY_BASE] as Currency,
          currencies[Field.CURRENCY_QUOTE] as Currency,
          currencyBalances[Field.CURRENCY_BASE]?.raw as BigintIsh,
          currencyBalances[Field.CURRENCY_QUOTE]?.raw as BigintIsh
        )
      : undefined
  return (
    <>
      <RowBetween>
        <TYPE.body>Base token</TYPE.body>
        <RowFixed>
          <label>{currencies[Field.CURRENCY_BASE]?.symbol}</label>
          <CurrencyLogo currency={currencies[Field.CURRENCY_BASE]} style={{ marginRight: '8px' }} />
        </RowFixed>
      </RowBetween>
      <RowBetween>
        <TYPE.body>Quote token</TYPE.body>
        <RowFixed>
          <label>{currencies[Field.CURRENCY_QUOTE]?.symbol}</label>
          <CurrencyLogo currency={currencies[Field.CURRENCY_QUOTE]} style={{ marginRight: '8px' }} />
        </RowFixed>
      </RowBetween>
      <RowBetween>
        <TYPE.body>Price step</TYPE.body>
        <TYPE.body>
          {priceStepAmount?.toExact()} {currencies[Field.CURRENCY_QUOTE]?.symbol}
        </TYPE.body>
      </RowBetween>
      <RowBetween>
        <TYPE.body>Minimum amount</TYPE.body>
        <TYPE.body>
          {minAmountAmount?.toExact()} {currencies[Field.CURRENCY_BASE]?.symbol}
        </TYPE.body>
      </RowBetween>
      <RowBetween>
        <TYPE.body>Pool reserves</TYPE.body>
        <TYPE.body>
          {`${currencyBalances[Field.CURRENCY_BASE]?.toSignificant()} ${
            currencies[Field.CURRENCY_BASE]?.symbol
          } / ${currencyBalances[Field.CURRENCY_QUOTE]?.toSignificant()} ${currencies[Field.CURRENCY_QUOTE]?.symbol}`}
        </TYPE.body>
      </RowBetween>
      <RowBetween>
        <TYPE.body>Pool price</TYPE.body>
        <TYPE.body>
          {`1 ${currencies[Field.CURRENCY_QUOTE]?.symbol} = ${LPPrice?.toSignificant(4)} ${
            currencies[Field.CURRENCY_BASE]?.symbol
          }`}
        </TYPE.body>
      </RowBetween>
      <ButtonPrimary style={{ margin: '20px 0 0 0' }} onClick={onAdd}>
        <Text fontWeight={500} fontSize={20}>
          {!orderBookExist ? 'Confirm Create' : 'Confirm Update'}
        </Text>
      </ButtonPrimary>
    </>
  )
}
