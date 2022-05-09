import { TradeType, UserOrder } from '@hybridx-exchange/uniswap-sdk'
import { darken } from 'polished'
import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'react-feather'
import { Link } from 'react-router-dom'
import { Text } from 'rebass'
import styled from 'styled-components'
import { currencyId } from '../../utils/currencyId'
import { ButtonSecondary } from '../Button'

import Card, { GreyCard } from '../Card'
import { AutoColumn } from '../Column'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { RowBetween, RowFixed } from '../Row'
import { Dots } from '../Swap/styleds'

export const FixedHeightRow = styled(RowBetween)`
  height: 24px;
`

export const HoverCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.bg2};
  :hover {
    border: 1px solid ${({ theme }) => darken(0.06, theme.bg2)};
  }
`

interface OrderCardProps {
  order: UserOrder
  border?: string
}

export function MinimalOrderCard({ order, border }: OrderCardProps) {
  const currencyBase = order.baseToken
  const currencyQuote = order.quoteToken

  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {
        <GreyCard border={border}>
          <AutoColumn gap="12px">
            <FixedHeightRow>
              <RowFixed>
                <Text fontWeight={500} fontSize={16}>
                  Order Details
                </Text>
              </RowFixed>
            </FixedHeightRow>
            <FixedHeightRow onClick={() => setShowMore(!showMore)}>
              <RowFixed>
                <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin={true} size={20} />
                <Text fontWeight={500} fontSize={20}>
                  {currencyBase.symbol}/{currencyQuote.symbol}
                </Text>
              </RowFixed>
            </FixedHeightRow>
            <AutoColumn gap="4px">
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  Order Type
                </Text>
                {
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {order?.orderType === TradeType.LIMIT_BUY ? 'buy' : 'sell'}
                    </Text>
                  </RowFixed>
                }
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  Amount offer
                </Text>
                {
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {order?.amountOffer.toExact() + ' ' + order?.amountOffer.currency.symbol}
                    </Text>
                  </RowFixed>
                }
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  Amount left
                </Text>
                {
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {order?.amountLeft.toExact() + ' ' + order?.amountLeft.currency.symbol}
                    </Text>
                  </RowFixed>
                }
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  Price
                </Text>
                {
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {order?.price.toExact() + ' ' + order?.price.currency.symbol}
                    </Text>
                  </RowFixed>
                }
              </FixedHeightRow>
            </AutoColumn>
          </AutoColumn>
        </GreyCard>
      }
    </>
  )
}

export default function FullOrderCard({ order, border }: OrderCardProps) {
  const currencyBase = order.baseToken
  const currencyQuote = order.quoteToken
  const currencyAmount = order.orderType === TradeType.LIMIT_BUY ? currencyQuote : currencyBase
  const [showMore, setShowMore] = useState(false)

  return (
    <HoverCard border={border}>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }}>
          <RowFixed>
            <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} margin={true} size={20} />
            <Text fontWeight={500} fontSize={20} minWidth={170}>
              {!currencyBase || !currencyQuote ? (
                <Dots>Loading</Dots>
              ) : (
                `${currencyBase.symbol}/${currencyQuote.symbol}`
              )}
            </Text>
          </RowFixed>
          <RowFixed>
            <Text fontWeight={500} fontSize={20}>
              {order.orderType === TradeType.LIMIT_BUY ? <Text>buy</Text> : <Text>sell</Text>}
            </Text>
          </RowFixed>
          <RowFixed>
            {showMore ? (
              <ChevronUp size="20" style={{ marginLeft: '10px' }} />
            ) : (
              <ChevronDown size="20" style={{ marginLeft: '10px' }} />
            )}
          </RowFixed>
        </FixedHeightRow>
        {showMore && (
          <AutoColumn gap="8px">
            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Amount Offer
                </Text>
              </RowFixed>
              {
                <RowFixed>
                  <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {order.amountOffer?.toExact()} {currencyAmount.symbol}:
                  </Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currencyAmount} />
                </RowFixed>
              }
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Amount Left
                </Text>
              </RowFixed>
              {
                <RowFixed>
                  <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {order.amountLeft?.toExact()} {currencyAmount.symbol}:
                  </Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currencyAmount} />
                </RowFixed>
              }
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Price
                </Text>
              </RowFixed>
              {
                <RowFixed>
                  <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {order.price?.toExact()} {currencyQuote.symbol}:
                  </Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currencyQuote} />
                </RowFixed>
              }
            </FixedHeightRow>
            <RowBetween marginTop="10px">
              <ButtonSecondary
                as={Link}
                to={`/trade/${currencyId(currencyQuote)}/${currencyId(currencyBase)}`}
                width="30%"
              >
                Buy
              </ButtonSecondary>
              <ButtonSecondary
                as={Link}
                to={`/trade/${currencyId(currencyBase)}/${currencyId(currencyQuote)}`}
                width="30%"
              >
                Sell
              </ButtonSecondary>
              <ButtonSecondary
                as={Link}
                width="30%"
                to={`/remove/${currencyId(currencyBase)}/${currencyId(currencyQuote)}/${order.orderId}`}
              >
                Remove
              </ButtonSecondary>
            </RowBetween>
          </AutoColumn>
        )}
      </AutoColumn>
    </HoverCard>
  )
}
