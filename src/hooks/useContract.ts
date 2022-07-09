import { Contract } from '@ethersproject/contracts'
import { ChainId, WETH } from '@hybridx-exchange/hybridx-sdk'
import { abi as IPairABI } from '@hybridx-exchange/hybridx-protocol/artifacts/contracts/core/pair/interfaces/IPair.sol/IPair.json'
import { abi as IOrderBookFactoryABI } from '@hybridx-exchange/hybridx-protocol/artifacts/contracts/core/orderbook/interfaces/IOrderBookFactory.sol/IOrderBookFactory.json'
import { abi as IPairRouterABI } from '@hybridx-exchange/hybridx-protocol/artifacts/contracts/periphery/pair/interfaces/IPairRouter.sol/IPairRouter.json'
import { abi as IOrderBookRouterABI } from '@hybridx-exchange/hybridx-protocol/artifacts/contracts/periphery/orderbook/interfaces/IOrderBookRouter.sol/IOrderBookRouter.json'
import { abi as IOrderBookABI } from '@hybridx-exchange/hybridx-protocol/artifacts/contracts/core/orderbook/interfaces/IOrderBook.sol/IOrderBook.json'
import { abi as IOrderNFTABI } from '@hybridx-exchange/hybridx-protocol/artifacts/contracts/core/orderbook/interfaces/IOrderNFT.sol/IOrderNFT.json'
import { useMemo } from 'react'
import ENS_ABI from '../constants/abis/ens-registrar.json'
import ENS_PUBLIC_RESOLVER_ABI from '../constants/abis/ens-public-resolver.json'
import { ERC20_BYTES32_ABI } from '../constants/abis/erc20'
import ERC20_ABI from '../constants/abis/erc20.json'
import UNISOCKS_ABI from '../constants/abis/unisocks.json'
import WETH_ABI from '../constants/abis/weth.json'
import { MULTICALL_ABI, MULTICALL_NETWORKS } from '../constants/multicall'
import { getContract } from '../utils'
import { useActiveWeb3React } from './index'
import { ORDER_BOOK_FACTORY_ADDRESS } from '@hybridx-exchange/hybridx-sdk'
import { ORDER_BOOK_ROUTER_ADDRESS } from '../constants'

// returns null on errors
function useContract(address: string | undefined, ABI: any, withSignerIfPossible = true): Contract | null {
  const { library, account } = useActiveWeb3React()

  return useMemo(() => {
    if (!address || !ABI || !library) return null
    try {
      return getContract(address, ABI, library, withSignerIfPossible && account ? account : undefined)
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [address, ABI, library, withSignerIfPossible, account])
}

export function useTokenContract(tokenAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(tokenAddress, ERC20_ABI, withSignerIfPossible)
}

export function useWETHContract(withSignerIfPossible?: boolean): Contract | null {
  const { chainId } = useActiveWeb3React()
  return useContract(chainId && WETH[chainId] ? WETH[chainId].address : undefined, WETH_ABI, withSignerIfPossible)
}

export function useENSRegistrarContract(withSignerIfPossible?: boolean): Contract | null {
  const { chainId } = useActiveWeb3React()
  let address: string | undefined
  if (chainId) {
    switch (chainId) {
      case ChainId.MAINNET:
        //case ChainId.TESTNET:
        address = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
        break
    }
  }
  return useContract(address, ENS_ABI, withSignerIfPossible)
}

export function useENSResolverContract(address: string | undefined, withSignerIfPossible?: boolean): Contract | null {
  return useContract(address, ENS_PUBLIC_RESOLVER_ABI, withSignerIfPossible)
}

export function useBytes32TokenContract(tokenAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(tokenAddress, ERC20_BYTES32_ABI, withSignerIfPossible)
}

export function usePairContract(pairAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(pairAddress, IPairABI, withSignerIfPossible)
}

export function usePairRouterContract(routerAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(routerAddress, IPairRouterABI, withSignerIfPossible)
}

export function useOrderBookContract(orderBookAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(orderBookAddress, IOrderBookABI, withSignerIfPossible)
}

export function useOrderNFTContract(orderNFTAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(orderNFTAddress, IOrderNFTABI, withSignerIfPossible)
}

export function useOrderBookFactoryContract(withSignerIfPossible?: boolean, chainId?: ChainId): Contract | null {
  return useContract(
    chainId ? ORDER_BOOK_FACTORY_ADDRESS[chainId] : undefined,
    IOrderBookFactoryABI,
    withSignerIfPossible
  )
}

export function useOrderBookRouterContract(withSignerIfPossible?: boolean, chainId?: ChainId): Contract | null {
  return useContract(
    chainId ? ORDER_BOOK_ROUTER_ADDRESS[chainId] : undefined,
    IOrderBookRouterABI,
    withSignerIfPossible
  )
}

export function useMulticallContract(): Contract | null {
  const { chainId } = useActiveWeb3React()
  return useContract(chainId && MULTICALL_NETWORKS[chainId], MULTICALL_ABI, false)
}

export function useSocksController(): Contract | null {
  const { chainId } = useActiveWeb3React()
  return useContract(
    chainId === ChainId.MAINNET ? '0x65770b5283117639760beA3F867b69b3697a91dd' : undefined,
    UNISOCKS_ABI,
    false
  )
}
