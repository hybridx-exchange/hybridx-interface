import { Web3Provider } from '@ethersproject/providers'
import ms from 'ms.macro'

import { ChainId } from '@hybridx-exchange/hybridx-sdk'

const NETWORK_POLLING_INTERVALS: { [chainId: number]: number } = {
  [ChainId.MAINNET]: ms`1s`,
  [ChainId.TESTNET]: ms`1s`,
  [ChainId.OPTIMISM_MAINNET]: ms`1s`,
  [ChainId.OPTIMISM_TESTNET]: ms`1s`
}

export default function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(
    provider,
    typeof provider.chainId === 'number'
      ? provider.chainId
      : typeof provider.chainId === 'string'
      ? parseInt(provider.chainId)
      : 'any'
  )
  library.pollingInterval = 15_000
  library.detectNetwork().then(network => {
    const networkPollingInterval = NETWORK_POLLING_INTERVALS[network.chainId]
    if (networkPollingInterval) {
      console.debug('Setting polling interval', networkPollingInterval)
      library.pollingInterval = networkPollingInterval
    }
  })
  return library
}
