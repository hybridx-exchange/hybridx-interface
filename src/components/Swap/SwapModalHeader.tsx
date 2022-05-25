import { Swap, SwapType, TokenAmount } from '@hybridx-exchange/hybridx-sdk'
import React, { Fragment, useContext, useMemo } from 'react'
import { ArrowDown, AlertTriangle } from 'react-feather'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { Field } from '../../state/swap/actions'
import { TYPE } from '../../theme'
import { ButtonPrimary } from '../Button'
import { isAddress, shortenAddress } from '../../utils'
import { computeSlippageAdjustedAmounts, computeTradePriceBreakdown, warningSeverity } from '../../utils/prices'
import { AutoColumn } from '../Column'
import CurrencyLogo from '../CurrencyLogo'
import { RowBetween, RowFixed } from '../Row'
import { TruncatedText, SwapShowAcceptChanges } from './styleds'

export default function SwapModalHeader({
  swap,
  allowedSlippage,
  recipient,
  showAcceptChanges,
  onAcceptChanges
}: {
  swap: Swap
  allowedSlippage: number
  recipient: string | null
  showAcceptChanges: boolean
  onAcceptChanges: () => void
}) {
  const slippageAdjustedAmounts = useMemo(() => computeSlippageAdjustedAmounts(swap, allowedSlippage), [
    swap,
    allowedSlippage
  ])
  const { priceImpactWithoutFee } = useMemo(() => computeTradePriceBreakdown(swap), [swap])
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)

  const theme = useContext(ThemeContext)
  const extra = swap?.route?.extra
  const path = swap?.route?.path
  const flow = []
  for (let i = 0; i < path?.length - 1; i++) {
    flow.push([new TokenAmount(path[i], extra[i * 6 + 2]), new TokenAmount(path[i], extra[i * 6 + 4])])
    flow.push([new TokenAmount(path[i + 1], extra[i * 6 + 3]), new TokenAmount(path[i + 1], extra[i * 6 + 5])])
  }

  return (
    <AutoColumn gap={'md'} style={{ marginTop: '20px' }}>
      {flow.map((e, i, flow) => {
        const isLastItem: boolean = i === flow.length - 1
        return (
          <Fragment key={i}>
            {!isLastItem ? (
              <RowBetween align="flex-end" key={'RowBetween' + i}>
                <RowFixed gap={'0px'} key={'RowFix1' + i}>
                  <CurrencyLogo currency={e[0].currency} size={'24px'} style={{ marginRight: '12px' }} />
                  <TruncatedText
                    fontSize={24}
                    fontWeight={500}
                    color={showAcceptChanges && swap.swapType === SwapType.EXACT_OUTPUT ? theme.primary1 : ''}
                  >
                    {e[0].add(e[1]).toSignificant(6)}
                  </TruncatedText>
                </RowFixed>
                <RowFixed gap={'0px'} key={'RowFix2' + i}>
                  <Text fontSize={12} fontWeight={500} style={{ marginLeft: '10px' }}>
                    {'[' + e[0].toSignificant(6) + '|' + e[1].toSignificant(6) + ']'}
                  </Text>
                </RowFixed>
                <RowFixed gap={'0px'} key={'RowFix3' + i}>
                  <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
                    {e[0].currency.symbol}
                  </Text>
                </RowFixed>
              </RowBetween>
            ) : (
              <RowBetween align="flex-end" key={'RowBetween' + i}>
                <RowFixed gap={'0px'} key={'RowFix1' + i}>
                  <CurrencyLogo currency={e[0].currency} size={'24px'} style={{ marginRight: '12px' }} />
                  <TruncatedText
                    fontSize={24}
                    fontWeight={500}
                    color={
                      priceImpactSeverity > 2
                        ? theme.red1
                        : showAcceptChanges && swap.swapType === SwapType.EXACT_INPUT
                        ? theme.primary1
                        : ''
                    }
                  >
                    {e[0].add(e[1]).toSignificant(6)}
                  </TruncatedText>
                </RowFixed>
                <RowFixed gap={'0px'} key={'RowFix2' + i}>
                  <Text fontSize={12} fontWeight={500} style={{ marginLeft: '10px' }}>
                    {'[' + e[0].toSignificant(6) + '|' + e[1].toSignificant(6) + ']'}
                  </Text>
                </RowFixed>
                <RowFixed gap={'0px'} key={'RowFix3' + i}>
                  <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
                    {e[0].currency.symbol}
                  </Text>
                </RowFixed>
              </RowBetween>
            )}
            {isLastItem ? null : (
              <RowFixed key={'arrow' + i}>
                <ArrowDown size="16" color={theme.text2} style={{ marginLeft: '4px', minWidth: '16px' }} />
              </RowFixed>
            )}
          </Fragment>
        )
      })}
      {showAcceptChanges ? (
        <SwapShowAcceptChanges justify="flex-start" gap={'0px'}>
          <RowBetween>
            <RowFixed>
              <AlertTriangle size={20} style={{ marginRight: '8px', minWidth: 24 }} />
              <TYPE.main color={theme.primary1}> Price Updated</TYPE.main>
            </RowFixed>
            <ButtonPrimary
              style={{ padding: '.5rem', width: 'fit-content', fontSize: '0.825rem', borderRadius: '12px' }}
              onClick={onAcceptChanges}
            >
              Accept
            </ButtonPrimary>
          </RowBetween>
        </SwapShowAcceptChanges>
      ) : null}
      <AutoColumn justify="flex-start" gap="sm" style={{ padding: '12px 0 0 0px' }}>
        {swap.swapType === SwapType.EXACT_INPUT ? (
          <TYPE.italic textAlign="left" style={{ width: '100%' }}>
            {`Output is estimated. You will receive at least `}
            <b>
              {slippageAdjustedAmounts[Field.OUTPUT]?.toSignificant(6)} {swap.outputAmount.currency.symbol}
            </b>
            {' or the transaction will revert.'}
          </TYPE.italic>
        ) : (
          <TYPE.italic textAlign="left" style={{ width: '100%' }}>
            {`Input is estimated. You will sell at most `}
            <b>
              {slippageAdjustedAmounts[Field.INPUT]?.toSignificant(6)} {swap.inputAmount.currency.symbol}
            </b>
            {' or the transaction will revert.'}
          </TYPE.italic>
        )}
      </AutoColumn>
      {recipient !== null ? (
        <AutoColumn justify="flex-start" gap="sm" style={{ padding: '12px 0 0 0px' }}>
          <TYPE.main>
            Output will be sent to{' '}
            <b title={recipient}>{isAddress(recipient) ? shortenAddress(recipient) : recipient}</b>
          </TYPE.main>
        </AutoColumn>
      ) : null}
    </AutoColumn>
  )
}
