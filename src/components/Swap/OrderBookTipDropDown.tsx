import React from 'react'
import styled from 'styled-components'
import { useLastTruthy } from '../../hooks/useLast'
import { OrderBookDetailsProps } from './OrderBookDetails'
import { Field } from '../../state/trade/actions'
import { Text } from 'rebass'
import { StyledInternalLink } from '../../theme'
import { AutoColumn } from '../Column'
import { Token } from '@hybridx-exchange/hybridx-sdk'
import { useExpertModeManager } from '../../state/user/hooks'

const OrderBookDetailsFooter = styled.div<{ show: boolean }>`
  padding: 1px 0;
  width: 100%;
  color: ${({ theme }) => theme.text2};
  display: ${({ show }) => (show ? 'block' : 'none')};
`

export default function OrderBookTipDropDown({ orderBook, currencies, ...rest }: OrderBookDetailsProps) {
  const lastOrderBook = useLastTruthy(orderBook)
  const [isExpertMode] = useExpertModeManager()
  const currencyAAddress =
    currencies[Field.CURRENCY_A] instanceof Token
      ? (currencies[Field.CURRENCY_A] as Token).address
      : currencies[Field.CURRENCY_A]?.symbol
  const currencyBAddress =
    currencies[Field.CURRENCY_B] instanceof Token
      ? (currencies[Field.CURRENCY_B] as Token).address
      : currencies[Field.CURRENCY_B]?.symbol
  const show =
    (isExpertMode || !lastOrderBook) &&
    currencies[Field.CURRENCY_A] !== undefined &&
    currencies[Field.CURRENCY_B] !== undefined &&
    currencyAAddress !== currencyBAddress
  return (
    <OrderBookDetailsFooter show={show}>
      <AutoColumn gap="md">
        {
          <>
            <div>
              <Text textAlign="right" fontSize={14} style={{ padding: '10px 12px 0' }}>
                <StyledInternalLink
                  id="create-order-book"
                  to={'/orderbook/' + currencyAAddress + '/' + currencyBAddress}
                >
                  {!lastOrderBook ? 'Create order book' : 'Edit order book'}
                </StyledInternalLink>
              </Text>
            </div>
          </>
        }
      </AutoColumn>
    </OrderBookDetailsFooter>
  )
}
