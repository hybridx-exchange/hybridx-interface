import { Contract } from '@ethersproject/contracts'
import { getAddress } from '@ethersproject/address'
import { AddressZero } from '@ethersproject/constants'
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { abi as IPairRouterABI } from '@hybridx-exchange/hybridx-protocol/build/IPairRouter.json'
import { abi as IOrderBookFactoryABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderBookFactory.json'
import { abi as IOrderBookRouterABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderBookRouter.json'
import { ORDER_BOOK_ROUTER_ADDRESS, PAIR_ROUTER_ADDRESS } from '../constants'
import { abi as IOrderBookABI } from '@hybridx-exchange/hybridx-protocol/build/IOrderBook.json'
import {
  ChainId,
  JSBI,
  Percent,
  Token,
  CurrencyAmount,
  Currency,
  ETHER,
  ORDER_BOOK_FACTORY_ADDRESS
} from '@hybridx-exchange/hybridx-sdk'
import { TokenAddressMap } from '../state/lists/hooks'

// returns the checksummed address if the address is valid, otherwise returns false
export function isAddress(value: any): string | false {
  try {
    return getAddress(value)
  } catch {
    return false
  }
}

const ETHERSCAN_PREFIXES: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: 'https://explorer.oasis.updev.si',
  [ChainId.TESTNET]: 'https://explorer.testnet.oasis.updev.si',
  [ChainId.OPTIMISM_TESTNET]: 'https://kovan-optimistic.etherscan.io',
  [ChainId.OPTIMISM_MAINNET]: 'https://optimistic.etherscan.io'
}

export function getEtherscanLink(chainId: ChainId, data: string, type: 'transaction' | 'token' | 'address'): string {
  const prefix = `${ETHERSCAN_PREFIXES[chainId] || ETHERSCAN_PREFIXES[ChainId.MAINNET]}`

  switch (type) {
    case 'transaction': {
      return `${prefix}/tx/${data}`
    }
    case 'token': {
      return `${prefix}/token/${data}`
    }
    case 'address':
    default: {
      return `${prefix}/address/${data}`
    }
  }
}

// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
  const parsed = isAddress(address)
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`
}

// add 10%
export function calculateGasMargin(value: BigNumber): BigNumber {
  return value.mul(BigNumber.from(10000).add(BigNumber.from(1000))).div(BigNumber.from(10000))
}

// converts a basis points value to a sdk percent
export function basisPointsToPercent(num: number): Percent {
  return new Percent(JSBI.BigInt(num), JSBI.BigInt(10000))
}

export function calculateSlippageAmount(value: CurrencyAmount, slippage: number): [JSBI, JSBI] {
  if (slippage < 0 || slippage > 10000) {
    throw Error(`Unexpected slippage value: ${slippage}`)
  }
  return [
    JSBI.divide(JSBI.multiply(value.raw, JSBI.BigInt(10000 - slippage)), JSBI.BigInt(10000)),
    JSBI.divide(JSBI.multiply(value.raw, JSBI.BigInt(10000 + slippage)), JSBI.BigInt(10000))
  ]
}

// account is not optional
export function getSigner(library: Web3Provider, account: string): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked()
}

// account is optional
export function getProviderOrSigner(library: Web3Provider, account?: string): Web3Provider | JsonRpcSigner {
  return account ? getSigner(library, account) : library
}

// account is optional
export function getContract(address: string, ABI: any, library: Web3Provider, account?: string): Contract {
  if (!isAddress(address) || address === AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new Contract(address, ABI, getProviderOrSigner(library, account) as any)
}

// account is optional
export function getPairRouterContract(library: Web3Provider, account?: string, chainId?: ChainId): Contract | null {
  return chainId ? getContract(PAIR_ROUTER_ADDRESS[chainId], IPairRouterABI, library, account) : null
}

// account is optional
export function getOrderBookFactoryContract(
  library: Web3Provider,
  account?: string,
  chainId?: ChainId
): Contract | null {
  return chainId ? getContract(ORDER_BOOK_FACTORY_ADDRESS[chainId], IOrderBookFactoryABI, library, account) : null
}

// account is optional
export function getOrderBookRouterContract(
  library: Web3Provider,
  account?: string,
  chainId?: ChainId
): Contract | null {
  return chainId ? getContract(ORDER_BOOK_ROUTER_ADDRESS[chainId], IOrderBookRouterABI, library, account) : null
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function isTokenOnList(defaultTokens: TokenAddressMap, currency?: Currency, chainId?: ChainId): boolean {
  if (chainId && currency === ETHER[chainId]) return true
  return Boolean(currency instanceof Token && defaultTokens[currency.chainId]?.[currency.address])
}

export function getOrderBook(orderBookAddress: string, library: Web3Provider, account?: string): Contract {
  return getContract(orderBookAddress, IOrderBookABI, library, account)
}

/*export function addChain(chainId: ChainId) {
  const method = 'wallet_addEthereumChain'
  const params = [
    {
      chainId: '0x' + chainId.toString(16),
      chainName: 'Emerald testnet',
      rpcUrls: ['https://testnet.emerald.oasis.dev'],
      nativeCurrency: ETHER[chainId],
      blockExplorerUrls: ['https://testnet.explorer.emerald.oasis.dev']
    }
  ]

  injected.getProvider().then(provider => {
    if (provider?.isMetaMask) {
      provider?.sendAsync(
        {
          method,
          params
        },
        function(err: any, result: any) {
          if (err) {
            return false
          }
          return true
        }
      )
    }
  })
}*/
