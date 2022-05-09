import { Token, OrderBook, Currency, parseBigintIsh } from '@hybridx-exchange/uniswap-sdk'
import React, { useContext } from 'react'
import { AutoColumn } from '../Column'
import { Field } from '../../state/trade/actions'
import { RowBetween } from '../Row'
import { ClickableText } from '../../pages/Pool/styleds'
import { ThemeContext } from 'styled-components'
import { formatUnits } from 'ethers/lib/utils'

export interface OrderBookDetailsProps {
  orderBook?: OrderBook
  currencies: { [field in Field]?: Currency }
}

export function OrderBookDetails({ orderBook, currencies }: OrderBookDetailsProps) {
  const theme = useContext(ThemeContext)

  const currencyAAddress =
    currencies[Field.CURRENCY_A] instanceof Token
      ? (currencies[Field.CURRENCY_A] as Token).address
      : currencies[Field.CURRENCY_A]?.symbol
  const currencyBAddress =
    currencies[Field.CURRENCY_B] instanceof Token
      ? (currencies[Field.CURRENCY_B] as Token).address
      : currencies[Field.CURRENCY_B]?.symbol
  const currencyBase = orderBook?.baseToken.currency
  const currencyQuote = orderBook?.quoteToken.currency
  return (
    <AutoColumn gap="md">
      {orderBook && currencyBase && currencyQuote && currencyAAddress !== currencyBAddress && (
        <div>
          <RowBetween align="center" style={{ padding: '10px 20px' }}>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              Minimum amount
            </ClickableText>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              {orderBook?.minAmount && currencyBase
                ? formatUnits(orderBook?.minAmount.toString(), currencyBase?.decimals) + ' ' + currencyBase.symbol
                : '-'}
            </ClickableText>
          </RowBetween>
          <RowBetween align="center" style={{ padding: '10px 20px' }}>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              Price step
            </ClickableText>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              {orderBook?.priceStep && currencyQuote
                ? formatUnits(orderBook?.priceStep.toString(), currencyQuote.decimals) + ' ' + currencyQuote.symbol
                : '-'}
            </ClickableText>
          </RowBetween>
          <RowBetween align="center" style={{ padding: '10px 20px' }}>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              Protocol fee rate
            </ClickableText>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              {orderBook?.protocolFeeRate ? parseBigintIsh(orderBook?.protocolFeeRate) + '/10000' : '-'}
            </ClickableText>
          </RowBetween>
          <RowBetween align="center" style={{ padding: '10px 20px' }}>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              Subsidy fee rate
            </ClickableText>
            <ClickableText fontWeight={500} fontSize={14} color={theme.text2}>
              {orderBook?.subsidyFeeRate ? parseBigintIsh(orderBook?.subsidyFeeRate) + '/100 of PFR' : '-'}
            </ClickableText>
          </RowBetween>
        </div>
      )}
    </AutoColumn>
  )
}
