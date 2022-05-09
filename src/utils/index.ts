import { Contract } from '@ethersproject/contracts'
import { getAddress } from '@ethersproject/address'
import { AddressZero } from '@ethersproject/constants'
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { abi as IUniswapV2Router02ABI } from '@hybridx-exchange/v2-periphery/build/IUniswapV2Router02.json'
import { abi as IOrderBookFactoryABI } from '@hybridx-exchange/orderbook-core/build/IOrderBookFactory.json'
import { abi as IHybridRouterABI } from '@hybridx-exchange/orderbook-periphery/build/IHybridRouter.json'
import { HYBRIDX_ROUTER_ADDRESS, ROUTER_ADDRESS } from '../constants'
import { abi as IOrderBookABI } from '@hybridx-exchange/orderbook-core/build/IOrderBook.json'
import {
  ChainId,
  JSBI,
  Percent,
  Token,
  CurrencyAmount,
  Currency,
  ETHER,
  ORDER_BOOK_FACTORY_ADDRESS
} from '@hybridx-exchange/uniswap-sdk'
import { TokenAddressMap } from '../state/lists/hooks'
import { injected } from '../connectors'

// returns the checksummed address if the address is valid, otherwise returns false
export function isAddress(value: any): string | false {
  try {
    return getAddress(value)
  } catch {
    return false
  }
}

const ETHERSCAN_PREFIXES: { [chainId in ChainId]: string } = {
  42262: '',
  42261: '.testnet'
}

export function getEtherscanLink(chainId: ChainId, data: string, type: 'transaction' | 'token' | 'address'): string {
  const prefix = `https://explorer${ETHERSCAN_PREFIXES[chainId] || ETHERSCAN_PREFIXES[42262]}.oasis.updev.si`

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
export function getRouterContract(_: number, library: Web3Provider, account?: string): Contract {
  return getContract(ROUTER_ADDRESS, IUniswapV2Router02ABI, library, account)
}

// account is optional
export function getOrderBookFactoryContract(_: number, library: Web3Provider, account?: string): Contract {
  return getContract(ORDER_BOOK_FACTORY_ADDRESS, IOrderBookFactoryABI, library, account)
}

// account is optional
export function getHybridRouterContract(_: number, library: Web3Provider, account?: string): Contract {
  return getContract(HYBRIDX_ROUTER_ADDRESS, IHybridRouterABI, library, account)
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function isTokenOnList(defaultTokens: TokenAddressMap, currency?: Currency): boolean {
  if (currency === ETHER) return true
  return Boolean(currency instanceof Token && defaultTokens[currency.chainId]?.[currency.address])
}

export function getOrderBook(orderBookAddress: string, library: Web3Provider, account?: string): Contract {
  return getContract(orderBookAddress, IOrderBookABI, library, account)
}

export function addChain() {
  const method = 'wallet_addEthereumChain'
  const params = [
    {
      chainId: '0x' + ChainId.TESTNET.toString(16),
      chainName: 'Emerald testnet',
      rpcUrls: ['https://testnet.emerald.oasis.dev'],
      nativeCurrency: {
        name: 'ROSE',
        symbol: 'ROSE',
        decimals: 18
      },
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
}
