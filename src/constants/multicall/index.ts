import { ChainId } from '@hybridx-exchange/hybridx-sdk'
import MULTICALL_ABI from './abi.json'

const MULTICALL_NETWORKS: { [chainId in ChainId]: string } = {
  [ChainId.TESTNET]: '0x32Dd62d967335aed1480Cd7Da6B017F1874Af95f',
  [ChainId.MAINNET]: '',
  [ChainId.OPTIMISM_TESTNET]: '0x466949b1df1f0a7121CD07f39aB2a921e2811283',
  [ChainId.OPTIMISM_MAINNET]: ''
}

export { MULTICALL_ABI, MULTICALL_NETWORKS }
