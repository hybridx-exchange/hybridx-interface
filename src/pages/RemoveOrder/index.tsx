import { Contract } from '@ethersproject/contracts'
import { TransactionResponse } from '@ethersproject/providers'
import React, { useCallback, useContext, useState } from 'react'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import { ButtonError, ButtonLight, ButtonPrimary } from '../../components/Button'
import { LightCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import { RemoveOrderTabs } from '../../components/NavigationTabs'
import { RowBetween, RowFixed } from '../../components/Row'

import CurrencyLogo from '../../components/CurrencyLogo'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { useOrderBookContract } from '../../hooks/useContract'

import { useTransactionAdder } from '../../state/transactions/hooks'
import { calculateGasMargin } from '../../utils'
import AppBody from '../AppBody'
import { Wrapper } from '../Pool/styleds'
import { useWalletModalToggle } from '../../state/application/hooks'
import { BigNumber } from '@ethersproject/bignumber'
import { useDerivedCancelOrderInfo } from '../../state/order/hooks'
import { MinimalOrderCard } from '../../components/OrderCard'

export default function RemoveOrder({
  match: {
    params: { currencyIdA, currencyIdB, orderId }
  }
}: RouteComponentProps<{ currencyIdA: string; currencyIdB: string; orderId: string }>) {
  const { account, chainId, library } = useActiveWeb3React()
  const [currencyA, currencyB] = [
    useCurrency(currencyIdA, chainId) ?? undefined,
    useCurrency(currencyIdB, chainId) ?? undefined
  ]

  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  const { userOrder, error } = useDerivedCancelOrderInfo(currencyA ?? undefined, currencyB ?? undefined, orderId ?? '0')
  const isValid = !error

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState(false) // clicked confirm

  // txn values
  const [txHash, setTxHash] = useState<string>('')

  // pair contract
  const orderBookContract: Contract | null = useOrderBookContract(userOrder?.orderBook)

  // tx sending
  const addTransaction = useTransactionAdder()
  async function onRemove() {
    if (!chainId || !library || !account) throw new Error('missing dependencies')
    if (!currencyA || !currencyB || currencyA === currencyB) {
      throw new Error('missing tokens')
    }

    if (!orderId) {
      throw new Error('missing order id')
    }

    if (!orderBookContract) {
      throw new Error('invalid order book')
    }

    const methodNames = ['cancelLimitOrder']
    const args = [account, orderId]
    const safeGasEstimates: (BigNumber | undefined)[] = await Promise.all(
      methodNames.map(methodName =>
        orderBookContract?.estimateGas[methodName](...args)
          .then(calculateGasMargin)
          .catch(error => {
            console.error(`estimateGas failed`, methodName, args, error)
            return undefined
          })
      )
    )

    const indexOfSuccessfulEstimation = safeGasEstimates.findIndex(safeGasEstimate =>
      BigNumber.isBigNumber(safeGasEstimate)
    )

    // all estimations failed...
    if (indexOfSuccessfulEstimation === -1) {
      console.error('This transaction would fail. Please contact support.')
    } else {
      const methodName = methodNames[indexOfSuccessfulEstimation]
      const safeGasEstimate = safeGasEstimates[indexOfSuccessfulEstimation]

      setAttemptingTxn(true)
      await orderBookContract[methodName](...args, {
        gasLimit: safeGasEstimate
      })
        .then((response: TransactionResponse) => {
          setAttemptingTxn(false)

          addTransaction(response, {
            summary:
              'Remove order id=' +
              orderId +
              ' amount=' +
              userOrder?.amountLeft.toExact() +
              ' ' +
              userOrder?.amountLeft.token.symbol +
              ' price=' +
              userOrder?.price.toExact() +
              ' ' +
              userOrder?.price.token.symbol
          })

          setTxHash(response.hash)

          ReactGA.event({
            category: 'Order',
            action: 'Remove',
            label: [currencyA?.symbol, currencyB?.symbol, orderId].join('/')
          })
        })
        .catch((error: Error) => {
          setAttemptingTxn(false)
          // we only care if the error is something _other_ than the user rejected the tx
          console.error(error)
        })
    }
  }

  function modalHeader() {
    return (
      <AutoColumn gap={'md'} style={{ marginTop: '20px' }}>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={500}>
            Order Book
          </Text>
          <RowFixed gap="4px">
            <CurrencyLogo currency={currencyA} size={'24px'} />
            <CurrencyLogo currency={currencyB} size={'24px'} />
          </RowFixed>
        </RowBetween>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={500}>
            Order Id
          </Text>
          <RowFixed gap="4px">
            <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
              {userOrder?.orderId.toString()}
            </Text>
          </RowFixed>
        </RowBetween>
      </AutoColumn>
    )
  }

  function modalBottom() {
    return (
      <>
        {userOrder && (
          <>
            <RowBetween>
              <Text color={theme.text2} fontWeight={500} fontSize={16}>
                Return
              </Text>
              <RowFixed>
                <Text fontWeight={500} fontSize={16}>
                  {userOrder?.amountLeft.toExact()} {userOrder?.amountLeft.currency.symbol ?? '-'}
                </Text>
              </RowFixed>
            </RowBetween>
            <RowBetween>
              <Text color={theme.text2} fontWeight={500} fontSize={16}>
                To
              </Text>
              <RowFixed>
                <Text fontWeight={500} fontSize={12}>
                  {userOrder?.owner}
                </Text>
              </RowFixed>
            </RowBetween>
          </>
        )}
        <ButtonPrimary disabled={!isValid} onClick={onRemove}>
          <Text fontWeight={500} fontSize={20}>
            Confirm
          </Text>
        </ButtonPrimary>
      </>
    )
  }

  const pendingText = `Removing order ${userOrder?.orderId}, and ${userOrder?.amountLeft.toSignificant(6)} ${
    userOrder?.amountLeft.token.symbol
  } will send to ${userOrder?.owner} immediately`

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    setTxHash('')
  }, [])

  return (
    <>
      <AppBody>
        <RemoveOrderTabs />
        <Wrapper>
          <TransactionConfirmationModal
            isOpen={showConfirm}
            onDismiss={handleDismissConfirmation}
            attemptingTxn={attemptingTxn}
            hash={txHash ? txHash : ''}
            content={() => (
              <ConfirmationModalContent
                title={'You are removing'}
                onDismiss={handleDismissConfirmation}
                topContent={modalHeader}
                bottomContent={modalBottom}
              />
            )}
            pendingText={pendingText}
          />
          <AutoColumn gap="md">
            {
              <>
                <LightCard>
                  <AutoColumn gap="10px">
                    <RowBetween>
                      <Text fontSize={14} fontWeight={500}>
                        ID
                      </Text>
                      <Text fontSize={12} fontWeight={500}>
                        {userOrder?.orderId.toString()}
                      </Text>
                    </RowBetween>
                    <RowBetween>
                      <Text fontSize={14} fontWeight={500}>
                        Owner
                      </Text>
                      <Text fontSize={12} fontWeight={500}>
                        {userOrder?.owner}
                      </Text>
                    </RowBetween>
                  </AutoColumn>
                </LightCard>
              </>
            }

            <div style={{ position: 'relative' }}>
              {!account ? (
                <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
              ) : (
                <RowBetween>
                  <ButtonError
                    onClick={() => {
                      setShowConfirm(true)
                    }}
                    disabled={!isValid}
                    error={!isValid}
                  >
                    <Text fontSize={16} fontWeight={500}>
                      {error || 'Remove'}
                    </Text>
                  </ButtonError>
                </RowBetween>
              )}
            </div>
          </AutoColumn>
        </Wrapper>
      </AppBody>

      {userOrder ? (
        <AutoColumn style={{ minWidth: '20rem', marginTop: '1rem' }}>
          <MinimalOrderCard order={userOrder} />
        </AutoColumn>
      ) : null}
    </>
  )
}
