import { Trade, TradeType } from '@hybridx-exchange/hybridx-sdk'
import React, { useContext } from 'react'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { TYPE } from '../../theme'
import { ButtonError } from '../Button'
import { AutoColumn } from '../Column'
import QuestionHelper from '../QuestionHelper'
import { AutoRow, RowBetween, RowFixed } from '../Row'
import { SwapCallbackError } from './styleds'

export default function TradeModalFooter({
  trade,
  onConfirm,
  tradeErrorMessage,
  disabledConfirm
}: {
  trade: Trade
  onConfirm: () => void
  tradeErrorMessage: string | undefined
  disabledConfirm: boolean
}) {
  const theme = useContext(ThemeContext)
  const inDecimal = trade?.orderBook.getMinAmountDecimal(trade?.tradeType)
  const outDecimal = trade?.orderBook.getMinOutputAmountDecimal(trade?.tradeType)
  return (
    <>
      <AutoColumn gap="0px">
        <RowBetween align="center">
          <Text fontWeight={400} fontSize={14} color={theme.text2}>
            {'Amm amount in/out'}
            <QuestionHelper text="Input/Output amount from liquidity pool." />
          </Text>
          <Text
            fontWeight={500}
            fontSize={14}
            color={theme.text1}
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              display: 'flex',
              textAlign: 'right',
              paddingLeft: '10px'
            }}
          >
            {trade?.tradeRet?.ammAmountIn.toFixedWithoutExtraZero(inDecimal) +
              ' ' +
              trade?.tradeRet?.ammAmountIn.currency.symbol +
              '/' +
              trade?.tradeRet?.ammAmountOut.toFixedWithoutExtraZero(outDecimal) +
              ' ' +
              trade?.tradeRet?.ammAmountOut.currency.symbol}
          </Text>
        </RowBetween>

        <RowBetween>
          <RowFixed>
            <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
              {'Order amount in/out'}
            </TYPE.black>
            <QuestionHelper text="Input/Output amount from order book." />
          </RowFixed>
          <RowFixed>
            <TYPE.black fontSize={14}>
              {trade?.tradeRet?.orderAmountIn.toFixedWithoutExtraZero(inDecimal) +
                ' ' +
                trade?.tradeRet?.orderAmountIn.currency.symbol +
                '/' +
                trade?.tradeRet?.orderAmountOut.toFixedWithoutExtraZero(outDecimal) +
                ' ' +
                trade?.tradeRet?.orderAmountOut.currency.symbol}
            </TYPE.black>
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <RowFixed>
            <TYPE.black color={theme.text2} fontSize={14} fontWeight={400}>
              {'Amount left/expert'}
            </TYPE.black>
            <QuestionHelper text="Left/Expected amount in limit order." />
          </RowFixed>
          <RowFixed>
            <TYPE.black fontSize={14}>
              {trade?.tradeRet?.amountLeft.toFixedWithoutExtraZero(inDecimal) +
                ' ' +
                trade?.tradeRet?.amountLeft.currency.symbol +
                '/' +
                trade?.tradeRet?.amountExpect.toFixedWithoutExtraZero(outDecimal) +
                ' ' +
                trade?.tradeRet?.amountExpect.currency.symbol}
            </TYPE.black>
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <RowFixed>
            <TYPE.black color={theme.text2} fontSize={14} fontWeight={400}>
              {'Gas subsidy fee'}
            </TYPE.black>
            <QuestionHelper text="Subsidized gas fee when taking orders." />
          </RowFixed>
          <RowFixed>
            <TYPE.black fontSize={14}>
              {trade?.tradeRet?.orderFee.toFixedWithoutExtraZero(outDecimal) +
                ' ' +
                trade?.tradeRet?.orderFee.currency.symbol}
            </TYPE.black>
          </RowFixed>
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
                trade?.tradeRet?.priceTo?.toFixedWithoutExtraZero(trade?.orderBook.getPriceStepDecimal()) +
                ' ' +
                trade?.tradeRet?.priceTo.currency.symbol}
            </TYPE.black>
          </RowFixed>
        </RowBetween>
      </AutoColumn>

      <AutoRow>
        <ButtonError
          onClick={onConfirm}
          disabled={disabledConfirm}
          error={false}
          style={{ margin: '10px 0 0 0' }}
          id="confirm-trade-or-send"
        >
          <Text fontSize={20} fontWeight={500}>
            {trade?.tradeType === TradeType.LIMIT_BUY ? 'Buy' : 'Sell'}
          </Text>
        </ButtonError>

        {tradeErrorMessage ? <SwapCallbackError error={tradeErrorMessage} /> : null}
      </AutoRow>
    </>
  )
}
