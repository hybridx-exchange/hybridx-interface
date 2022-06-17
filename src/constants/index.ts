import { ChainId, JSBI, Percent, Token, WETH } from '@hybridx-exchange/hybridx-sdk'
import { AbstractConnector } from '@web3-react/abstract-connector'

//import { fortmatic, injected, portis, walletconnect, walletlink } from '../connectors'
import { injected /*, walletconnect*/ } from '../connectors'

export const PAIR_ROUTER_ADDRESS = {
  [ChainId.TESTNET]: '0x4A9Ce1F28744baEffc1224c68edC47b627478d6C',
  [ChainId.MAINNET]: '',
  [ChainId.OPTIMISM_TESTNET]: '0xF78B7dd3A3c95a3fF7bcf89Cfb5be526cBd7E32c',
  [ChainId.OPTIMISM_MAINNET]: ''
}
export const PAIR_UTILS_ADDRESS = {
  [ChainId.TESTNET]: '0x88869bb9544d34b2630a770D3c680c534B00149A',
  [ChainId.MAINNET]: '',
  [ChainId.OPTIMISM_TESTNET]: '0xd813Ca47eE871F2603A074838f567A26Db226b34',
  [ChainId.OPTIMISM_MAINNET]: ''
}
export const ORDER_BOOK_ROUTER_ADDRESS = {
  [ChainId.TESTNET]: '0xdB553c2E5f2A4Fc4252791Ceac0DeA298C86f356',
  [ChainId.MAINNET]: '',
  [ChainId.OPTIMISM_TESTNET]: '0x5aD4dBcD96307A82b7C04b262916E4Fdf640e4D3',
  [ChainId.OPTIMISM_MAINNET]: ''
}

export const DEFAULT_LIMIT_SIZE = 8
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId in ChainId]: Token[]
}

export const OUSD = {
  [ChainId.TESTNET]: new Token(ChainId.TESTNET, '0x1a56ED83b3773f662Fe2C471F6a3952432a4CFCd', 6, 'OUSD', 'OUSD'),
  [ChainId.MAINNET]: new Token(ChainId.MAINNET, '0x1a56ED83b3773f662Fe2C471F6a3952432a4CFCd', 6, 'OUSD', 'OUSD'),
  [ChainId.OPTIMISM_TESTNET]: new Token(
    ChainId.OPTIMISM_TESTNET,
    '0x253E5C5F817770329E5e303902628F1F29a4C4CA',
    18,
    'OUSD',
    'OUSD'
  ),
  [ChainId.OPTIMISM_MAINNET]: new Token(
    ChainId.OPTIMISM_MAINNET,
    '0x253E5C5F817770329E5e303902628F1F29a4C4CA',
    18,
    'OUSD',
    'OUSD'
  )
}

const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.TESTNET]: [WETH[ChainId.TESTNET]],
  [ChainId.OPTIMISM_TESTNET]: [WETH[ChainId.OPTIMISM_TESTNET]],
  [ChainId.OPTIMISM_MAINNET]: [WETH[ChainId.OPTIMISM_MAINNET]]
}

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]],
  [ChainId.TESTNET]: [...WETH_ONLY[ChainId.TESTNET], OUSD[ChainId.TESTNET]],
  [ChainId.OPTIMISM_TESTNET]: [...WETH_ONLY[ChainId.OPTIMISM_TESTNET], OUSD[ChainId.OPTIMISM_TESTNET]],
  [ChainId.OPTIMISM_MAINNET]: [...WETH_ONLY[ChainId.OPTIMISM_MAINNET]]
}

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId in ChainId]?: { [tokenAddress: string]: Token[] } } = {}

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]]
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]]
}

export const PINNED_PAIRS: { readonly [chainId in ChainId]?: [Token, Token][] } = {}

export interface WalletInfo {
  connector?: AbstractConnector
  name: string
  iconName: string
  description: string
  href: string | null
  color: string
  primary?: true
  mobile?: true
  mobileOnly?: true
}

export const SUPPORTED_WALLETS: { [key: string]: WalletInfo } = {
  INJECTED: {
    connector: injected,
    name: 'Injected',
    iconName: 'arrow-right.svg',
    description: 'Injected web3 provider.',
    href: null,
    color: '#010101',
    primary: true
  },
  METAMASK: {
    connector: injected,
    name: 'MetaMask',
    iconName: 'metamask.png',
    description: 'Easy-to-use browser extension.',
    href: null,
    color: '#E8831D'
  } /*,
  WALLET_CONNECT: {
    connector: walletconnect,
    name: 'WalletConnect',
    iconName: 'walletConnectIcon.svg',
    description: 'Connect to Trust Wallet, Rainbow Wallet and more...',
    href: null,
    color: '#4196FC',
    mobile: true
  }*/
}

export const NetworkContextName = 'NETWORK'

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 50
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))
export const BIPS_BASE = JSBI.BigInt(10000)
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE) // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE) // 15%

// used to ensure the user doesn't send so much ETH so they end up with <.01
export const MIN_ETH: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)) // .01 ETH
export const BETTER_TRADE_LINK_THRESHOLD = new Percent(JSBI.BigInt(75), JSBI.BigInt(10000))
