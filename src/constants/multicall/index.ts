import { ChainId } from '@hybridx-exchange/hybridx-sdk'
import MULTICALL_ABI from './abi.json'

const MULTICALL_NETWORKS: { [chainId in ChainId]: string } = {
  [ChainId.MAINNET]: '0x32Dd62d967335aed1480Cd7Da6B017F1874Af95f',
  [ChainId.TESTNET]: '0x32Dd62d967335aed1480Cd7Da6B017F1874Af95f',
  [ChainId.OPTIMISM_TESTNET]: '0x1F98415757620B543A52E61c46B32eB19261F984',
  [ChainId.OPTIMISM_MAINNET]: '0x1F98415757620B543A52E61c46B32eB19261F984'
}

export { MULTICALL_ABI, MULTICALL_NETWORKS }
