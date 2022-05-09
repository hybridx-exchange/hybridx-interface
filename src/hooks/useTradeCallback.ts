import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { TradeParameters, Trade, TradeType, Trader } from '@hybridx-exchange/uniswap-sdk'
import { useMemo } from 'react'
import { DEFAULT_DEADLINE_FROM_NOW } from '../constants'
import { useTransactionAdder } from '../state/transactions/hooks'
import { calculateGasMargin, getHybridRouterContract, isAddress, shortenAddress } from '../utils'
import isZero from '../utils/isZero'
import { useActiveWeb3React } from './index'
import useENS from './useENS'

export enum TradeCallbackState {
  INVALID,
  LOADING,
  VALID
}

interface TradeCall {
  contract: Contract
  parameters: TradeParameters
}

interface SuccessfulCall {
  call: TradeCall
  gasEstimate: BigNumber
}

interface FailedCall {
  call: TradeCall
  error: Error
}

type EstimatedTradeCall = SuccessfulCall | FailedCall

/**
 * Returns the swap calls that can be used to make the trade
 * @param trade trade to execute
 * @param allowedSlippage user allowed slippage
 * @param deadline the deadline for the trade
 * @param recipientAddressOrName
 */
function useTradeCallArguments(
  trade: Trade | undefined,
  deadline: number = DEFAULT_DEADLINE_FROM_NOW, // in seconds from now
  recipientAddressOrName: string | null // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
): TradeCall[] {
  const { account, chainId, library } = useActiveWeb3React()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  return useMemo(() => {
    if (!trade || !recipient || !library || !account || !chainId) return []

    const contract: Contract | null = getHybridRouterContract(chainId, library, account)
    if (!contract) {
      return []
    }

    const tradeMethods = []
    tradeMethods.push(
      Trader.tradeCallParameters(trade, {
        recipient,
        ttl: deadline
      })
    )
    return tradeMethods.map(parameters => ({ parameters, contract }))
  }, [trade, account, chainId, deadline, library, recipient])
}

// returns a function that will execute a swap, if the parameters are all valid
// and the user has approved the slippage adjusted input amount for the trade
export function useTradeCallback(
  trade: Trade | undefined, // trade to execute, required
  deadline: number = DEFAULT_DEADLINE_FROM_NOW, // in seconds from now
  recipientAddressOrName: string | null // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
): { state: TradeCallbackState; callback: null | (() => Promise<string>); error: string | null } {
  const { account, chainId, library } = useActiveWeb3React()

  const tradeCalls = useTradeCallArguments(trade, deadline, recipientAddressOrName)

  const addTransaction = useTransactionAdder()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  return useMemo(() => {
    if (!trade || !library || !account || !chainId) {
      return { state: TradeCallbackState.INVALID, callback: null, error: 'Missing dependencies' }
    }
    if (!recipient) {
      if (recipientAddressOrName !== null) {
        return { state: TradeCallbackState.INVALID, callback: null, error: 'Invalid recipient' }
      } else {
        return { state: TradeCallbackState.LOADING, callback: null, error: null }
      }
    }

    return {
      state: TradeCallbackState.VALID,
      callback: async function onTrade(): Promise<string> {
        const estimatedCalls: EstimatedTradeCall[] = await Promise.all(
          tradeCalls.map(call => {
            const {
              parameters: { methodName, args, value },
              contract
            } = call
            const options = !value || isZero(value) ? {} : { value }

            return contract.estimateGas[methodName](...args, options)
              .then(gasEstimate => {
                return {
                  call,
                  gasEstimate
                }
              })
              .catch(gasError => {
                console.debug('Gas estimate failed, trying eth_call to extract error', call)

                return contract.callStatic[methodName](...args, options)
                  .then(result => {
                    console.debug('Unexpected successful call after failed estimate gas', call, gasError, result)
                    return { call, error: new Error('Unexpected issue with estimating the gas. Please try again.') }
                  })
                  .catch(callError => {
                    console.debug('Call threw error', call, callError)
                    let errorMessage: string
                    switch (callError.reason) {
                      case 'HybridRouter: Invalid_Path':
                      case 'HybridRouter: Invalid_OrderBook':
                      default:
                        errorMessage = `The transaction cannot succeed due to error: ${callError.reason}. This is probably an issue with one of the tokens you are trading.`
                    }
                    return { call, error: new Error(errorMessage) }
                  })
              })
          })
        )

        // a successful estimation is a bignumber gas estimate and the next call is also a bignumber gas estimate
        const successfulEstimation = estimatedCalls.find(
          (el, ix, list): el is SuccessfulCall =>
            'gasEstimate' in el && (ix === list.length - 1 || 'gasEstimate' in list[ix + 1])
        )

        if (!successfulEstimation) {
          const errorCalls = estimatedCalls.filter((call): call is FailedCall => 'error' in call)
          if (errorCalls.length > 0) throw errorCalls[errorCalls.length - 1].error
          throw new Error('Unexpected error. Please contact support: none of the calls threw an error')
        }

        const {
          call: {
            contract,
            parameters: { methodName, args, value }
          },
          gasEstimate
        } = successfulEstimation

        return contract[methodName](...args, {
          gasLimit: calculateGasMargin(gasEstimate),
          ...(value && !isZero(value) ? { value, from: account } : { from: account })
        })
          .then((response: any) => {
            const baseSymbol = trade.baseToken.symbol
            const quoteSymbol = trade.quoteToken.symbol
            const inputAmount = trade.amount.toSignificant(3)
            const priceAmount = trade.price.toSignificant(3)

            const base =
              trade.tradeType === TradeType.LIMIT_BUY
                ? `Buy ${baseSymbol} with ${inputAmount} ${quoteSymbol} at price ${priceAmount} ${quoteSymbol}`
                : `Sell ${inputAmount} ${baseSymbol} to ${quoteSymbol} at price ${priceAmount} ${quoteSymbol}`
            const withRecipient =
              recipient === account
                ? base
                : `${base} to ${
                    recipientAddressOrName && isAddress(recipientAddressOrName)
                      ? shortenAddress(recipientAddressOrName)
                      : recipientAddressOrName
                  }`

            const withVersion = withRecipient

            addTransaction(response, {
              summary: withVersion
            })

            return response.hash
          })
          .catch((error: any) => {
            // if the user rejected the tx, pass this along
            if (error?.code === 4001) {
              throw new Error('Transaction rejected.')
            } else {
              // otherwise, the error was unexpected and we need to convey that
              console.error(`Trade failed`, error, methodName, args, value)
              throw new Error(`Trade failed: ${error.message}`)
            }
          })
      },
      error: null
    }
  }, [trade, library, account, chainId, recipient, recipientAddressOrName, tradeCalls, addTransaction])
}
