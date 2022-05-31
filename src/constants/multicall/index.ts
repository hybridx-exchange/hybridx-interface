import { ChainId } from '@hybridx-exchange/hybridx-sdk'
import MULTICALL_ABI from './abi.json'

const MULTICALL_NETWORKS: { [chainId in ChainId]: string } = {
  [ChainId.TESTNET]: '0xA0A9C353f250b7f26366a41083154B2c0B2854EE',
  [ChainId.MAINNET]: '',
  [ChainId.OPTIMISM_TESTNET]: '0xC6166de32636e851D960E4068707778fFb1C0389',
  [ChainId.OPTIMISM_MAINNET]: ''
}

export { MULTICALL_ABI, MULTICALL_NETWORKS }
