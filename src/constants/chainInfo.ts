import optimismLogoUrl from '../assets/svg/optimistic_ethereum.svg'
import emeraldLogoUrl from '../assets/svg/emerald_logo.svg'

import { ChainId } from '@hybridx-exchange/hybridx-sdk'
import { OPTIMISM_LIST, EMERALD_LIST } from './lists'

interface BaseChainInfo {
  readonly docs: string
  readonly bridge?: string
  readonly explorer: string
  readonly logoUrl: string
  readonly name: string
  readonly label: string
  readonly nativeCurrency: {
    name: string // e.g. 'Goerli ETH',
    symbol: string // e.g. 'gorETH',
    decimals: number // e.g. 18,
  }
}

export interface ChainInfo extends BaseChainInfo {
  readonly bridge: string
  readonly defaultListUrl: string
}

export type ChainInfoMap = { readonly [chainId: number]: ChainInfo } & {
  readonly [chainId in ChainId]: ChainInfo
}

export const CHAIN_INFO: ChainInfoMap = {
  [ChainId.MAINNET]: {
    bridge: 'https://oasisprotocol.org/b-ridges',
    defaultListUrl: EMERALD_LIST,
    docs: 'https://oasisprotocol.org/',
    explorer: 'https://explorer.emerald.oasis.dev',
    name: 'emerald',
    label: 'Emerald',
    logoUrl: emeraldLogoUrl,
    nativeCurrency: { name: 'ROSE', symbol: 'ROSE', decimals: 18 }
  },
  [ChainId.TESTNET]: {
    bridge: 'https://oasisprotocol.org/b-ridges',
    defaultListUrl: EMERALD_LIST,
    docs: 'https://oasisprotocol.org/',
    explorer: 'https://testnet.explorer.emerald.oasis.dev',
    name: 'emerald_testnet',
    label: 'Emerald Testnet',
    logoUrl: emeraldLogoUrl,
    nativeCurrency: { name: 'ROSE', symbol: 'ROSE', decimals: 18 }
  },
  [ChainId.OPTIMISM_MAINNET]: {
    bridge: 'https://app.optimism.io/bridge',
    defaultListUrl: OPTIMISM_LIST,
    docs: 'https://optimism.io/',
    explorer: 'https://optimistic.etherscan.io/',
    name: 'optimism',
    label: 'Optimistic',
    logoUrl: optimismLogoUrl,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  [ChainId.OPTIMISM_TESTNET]: {
    bridge: 'https://app.optimism.io/bridge',
    defaultListUrl: OPTIMISM_LIST,
    docs: 'https://optimism.io',
    explorer: 'https://kovan-optimistic.etherscan.io',
    name: 'optimism_kovan',
    label: 'Optimistic Kovan',
    logoUrl: optimismLogoUrl,
    nativeCurrency: { name: 'Optimistic Kovan Ether', symbol: 'kovOpETH', decimals: 18 }
  }
}
