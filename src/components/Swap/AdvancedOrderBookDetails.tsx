import { Trade } from '@hybridx-exchange/uniswap-sdk'
import React, { useContext } from 'react'
import { ThemeContext } from 'styled-components'
import { TYPE } from '../../theme'
import { AutoColumn } from '../Column'
import QuestionHelper from '../QuestionHelper'
import { RowBetween, RowFixed } from '../Row'

function TradeSummary({ trade }: { trade: Trade }) {
  const theme = useContext(ThemeContext)
  const tradeRet = trade?.tradeRet
  const inDecimal = trade?.orderBook.getMinAmountDecimal(trade?.tradeType)
  const outDecimal = trade?.orderBook.getMinOutputAmountDecimal(trade?.tradeType)
  return (
    <>
      <AutoColumn style={{ padding: '0 20px' }}>
        <RowBetween>
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              {'Amm amount in/out'}
            </TYPE.black>
            <QuestionHelper text="Input/Output amount from liquidity pool." />
          </RowFixed>
          <RowFixed>
            <TYPE.black color={theme.text1} fontSize={14}>
              {tradeRet?.ammAmountIn.toFixedWithoutExtraZero(inDecimal) +
                ' ' +
                tradeRet?.ammAmountIn.currency.symbol +
                '/' +
                tradeRet?.ammAmountOut.toFixedWithoutExtraZero(outDecimal) +
                ' ' +
                tradeRet?.ammAmountOut.currency.symbol}
            </TYPE.black>
          </RowFixed>
        </RowBetween>

        <RowBetween>
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              {'Order amount in/out'}
            </TYPE.black>
            <QuestionHelper text="Input/Output amount from order book." />
          </RowFixed>
          <RowFixed>
            <TYPE.black color={theme.text1} fontSize={14}>
              {tradeRet?.orderAmountIn.toFixedWithoutExtraZero(inDecimal) +
                ' ' +
                tradeRet?.orderAmountIn.currency.symbol +
                '/' +
                tradeRet?.orderAmountOut.toFixedWithoutExtraZero(outDecimal) +
                ' ' +
                tradeRet?.orderAmountOut.currency.symbol}
            </TYPE.black>
          </RowFixed>
        </RowBetween>

        <RowBetween>
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              {'Amount left/expert'}
            </TYPE.black>
            <QuestionHelper text="Left/Expected amount in limit order." />
          </RowFixed>
          <TYPE.black fontSize={14} color={theme.text1}>
            <TYPE.black color={theme.text1} fontSize={14}>
              {tradeRet?.amountLeft.toFixedWithoutExtraZero(inDecimal) +
                ' ' +
                tradeRet?.amountLeft.currency.symbol +
                '/' +
                tradeRet?.amountExpect.toFixedWithoutExtraZero(outDecimal) +
                ' ' +
                tradeRet?.amountExpect.currency.symbol}
            </TYPE.black>
          </TYPE.black>
        </RowBetween>

        <RowBetween>
          <RowFixed>
            <TYPE.black color={theme.text2} fontSize={14} fontWeight={400}>
              {'Price changed'}
            </TYPE.black>
            <QuestionHelper text="Price changes before and after the trade." />
          </RowFixed>
          <RowFixed>
            <TYPE.black fontSize={14}>
              {trade?.orderBook?.curPrice?.toFixedWithoutExtraZero(trade?.orderBook.getPriceStepDecimal()) +
                ' ' +
                trade?.orderBook?.curPrice.currency.symbol +
                ' -> ' +
                tradeRet?.priceTo?.toFixedWithoutExtraZero(trade?.orderBook.getPriceStepDecimal()) +
                ' ' +
                tradeRet?.priceTo.currency.symbol}
            </TYPE.black>
          </RowFixed>
        </RowBetween>
      </AutoColumn>
    </>
  )
}

export interface AdvancedOrderBookDetailsProps {
  trade?: Trade
}

export function AdvancedOrderBookDetails({ trade }: AdvancedOrderBookDetailsProps) {
  return (
    <AutoColumn gap="md">
      {trade?.tradeRet && (
        <>
          <TradeSummary trade={trade} />
        </>
      )}
    </AutoColumn>
  )
}
