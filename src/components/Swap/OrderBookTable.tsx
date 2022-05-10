import {Currency, OrderBook, Token, TradeType} from '@hybridx-exchange/hybridx-sdk'
import React, { useContext } from 'react'
import styled, { ThemeContext } from 'styled-components'
import { RowBetween, RowFixed } from '../Row'
import { StyledInternalLink, TYPE } from '../../theme'
import QuestionHelper from '../QuestionHelper'
import { wrappedCurrency } from '../../utils/wrappedCurrency'

const Wrapper = styled.div<{ show: boolean }>`
  margin-top: 10px;
  position: relative;
  background-color: #ffffff;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  box-shadow: 10px 10px 1px rgba(0, 0, 0, 0.2), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 30px;
  padding: 1rem;
  display: ${({ show }) => (show ? 'block' : 'none')};
`

const Title = styled.div`
  display: flex;
  font-size: 14px;
  justify-content: space-between;
  margin-top: 20px;
  color: #000;
  font-weight: 500;
`

const Left = styled.div`
  width: 33.3%;
  padding-bottom: 5px;
  padding-left: 5px;
`

const Center = styled.div`
  width: 33.3%;
  text-align: center;
  padding-bottom: 5px;
  padding-left: 5px;
`

const Right = styled.div`
  width: 33.3%;
  text-align: right;
  padding-bottom: 5px;
  padding-right: 5px;
`

const Table = styled.table`
  font-size: 14px;
  width: 100%;
`

const Tr = styled.tr`
  display: flex;
`

const Td = styled.td`
  flex: 1;
  text-align: center;
  padding: 4px 0;
`

interface OrderBookTableProps {
  orderBook?: OrderBook
  currencyA?: Currency
  currencyB?: Currency
}

export function OrderBookTable({ orderBook, currencyA, currencyB }: OrderBookTableProps) {
  const show = Boolean(orderBook)
  const buyData = orderBook?.buyOrders ?? []
  const sellData = orderBook?.sellOrders ?? []
  const buyOrdersLength = buyData.length
  const sellOrdersLength = sellData.length
  const quoteSymbol = orderBook?.quoteToken.currency.symbol ?? ''
  const baseSymbol = orderBook?.baseToken.currency.symbol ?? ''
  const aIsBase = orderBook?.baseToken.token === wrappedCurrency(currencyA, orderBook?.baseToken.token.chainId)
  const baseAddress = aIsBase
    ? currencyA instanceof Token
      ? (currencyA as Token).address
      : currencyA?.symbol
    : currencyB instanceof Token
    ? (currencyB as Token).address
    : currencyB?.symbol
  const quoteAddress = aIsBase
    ? currencyB instanceof Token
      ? (currencyB as Token).address
      : currencyB?.symbol
    : currencyA instanceof Token
    ? (currencyA as Token).address
    : currencyA?.symbol
  const minLen = buyOrdersLength > sellOrdersLength ? sellOrdersLength : buyOrdersLength
  const maxLen = buyOrdersLength > sellOrdersLength ? buyOrdersLength : sellOrdersLength
  const priceDecimal = orderBook?.getPriceStepDecimal()
  const buyAmountDecimal = orderBook?.getMinAmountDecimal(TradeType.LIMIT_BUY)
  const sellAmountDecimal = orderBook?.getMinAmountDecimal(TradeType.LIMIT_SELL)

  const buyRoute = '/trade/' + baseAddress + '/' + quoteAddress + '/'
  const sellRoute = '/trade/' + quoteAddress + '/' + baseAddress + '/'

  const tb: any[] = []
  let row: string[]
  let i
  for (i = 0; i < minLen; i++) {
    row = []
    row[0] = buyData[i]?.amount ? buyData[i].amount.toFixedWithoutExtraZero(buyAmountDecimal) : ''
    row[1] = buyData[i]?.price ? buyData[i].price.toFixedWithoutExtraZero(priceDecimal) : ''
    row[2] = sellData[i]?.price ? sellData[i].price.toFixedWithoutExtraZero(priceDecimal) : ''
    row[3] = sellData[i]?.amount ? sellData[i].amount.toFixedWithoutExtraZero(sellAmountDecimal) : ''
    tb[i] = row
  }

  for (; i < maxLen; i++) {
    row = ['', '', '', '']
    if (maxLen === buyOrdersLength) {
      row[0] = buyData[i]?.amount ? buyData[i].amount.toFixedWithoutExtraZero(buyAmountDecimal) : ''
      row[1] = buyData[i]?.price ? buyData[i].price.toFixedWithoutExtraZero(priceDecimal) : ''
    } else {
      row[2] = sellData[i]?.price ? sellData[i].price.toFixedWithoutExtraZero(priceDecimal) : ''
      row[3] = sellData[i]?.amount ? sellData[i].amount.toFixedWithoutExtraZero(sellAmountDecimal) : ''
    }

    tb[i] = row
  }

  const theme = useContext(ThemeContext)
  return (
    <Wrapper show={show}>
      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
            {'Price'}
          </TYPE.black>
          <QuestionHelper text="The price calculated based on the liquidity pool" />
        </RowFixed>
        <RowFixed>
          <TYPE.black color={theme.text1} fontSize={14}>
            {'1 ' + baseSymbol + ' = ' + orderBook?.curPrice.toExact() + ' ' + quoteSymbol}
          </TYPE.black>
        </RowFixed>
      </RowBetween>
      <RowBetween style={{ paddingBottom: '10px', borderBottom: '1px solid #888d9b' }}>
        <RowFixed>
          <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
            Reserves
          </TYPE.black>
          <QuestionHelper text="Amount of base token and quote token reserved in the liquidity pool" />
        </RowFixed>
        <RowFixed>
          <TYPE.black fontSize={14} color={theme.text1}>
            {orderBook?.baseToken.toSignificant(4) + ' '}
            {baseSymbol} + {orderBook?.quoteToken.toSignificant(4) + ' '}
            {quoteSymbol}
          </TYPE.black>
        </RowFixed>
      </RowBetween>
      <Title>
        <Left>{'Amount(' + quoteSymbol + ')'}</Left>
        <Center>{'Price(' + quoteSymbol + ')'}</Center>
        <Right>{'Amount(' + baseSymbol + ')'}</Right>
      </Title>
      {tb.length > 0 && (
        <Table>
          <tbody>
            {tb.map((v: React.ReactNode[], i: string | number | undefined) => {
              return (
                <Tr key={i}>
                  {v.map((y: React.ReactNode, j: string | number) => {
                    return (
                      <Td
                        style={
                          j === 0
                            ? { color: '#2ab66a', textAlign: 'left', paddingLeft: '5px' }
                            : {} && j === 1
                            ? {
                                borderRight: '1px solid #565a69',
                                color: '#2ab66a',
                                textAlign: 'right',
                                paddingRight: '5px'
                              }
                            : {} && j === 2
                            ? { color: '#ed5577', textAlign: 'left', paddingLeft: '5px' }
                            : {} && j === 3
                            ? { color: '#ed5577', textAlign: 'right', paddingRight: '5px' }
                            : {}
                        }
                        key={j}
                      >
                        {j === 1 ? (
                          <StyledInternalLink id="order-book-trade" to={buyRoute + y} linkcolor="#2ab66a">
                            {y}
                          </StyledInternalLink>
                        ) : y && j === 2 ? (
                          <StyledInternalLink id="order-book-trade" to={sellRoute + y} linkcolor="#ed5577">
                            {y}
                          </StyledInternalLink>
                        ) : (
                          y
                        )}
                      </Td>
                    )
                  })}
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </Wrapper>
  )
}
