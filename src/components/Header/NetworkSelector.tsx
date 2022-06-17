import { CHAIN_INFO } from '../../constants/chainInfo'
import { ChainId } from '@hybridx-exchange/hybridx-sdk'
import { useActiveWeb3ReactWithUnSupportChainId } from '../../hooks/index'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import usePrevious from '../../hooks/usePrevious'
import { ParsedQs } from 'qs'
import React, { useCallback, useEffect, useRef } from 'react'
import { ArrowDownCircle, ChevronDown } from 'react-feather'
import { useHistory } from 'react-router-dom'
import { useNetworkSelectorModalOpen, useNetworkSelectorModalToggle } from '../../state/application/hooks'
import { addPopup } from '../../state/application/actions'
import styled from 'styled-components/macro'
import { ExternalLink, MEDIA_WIDTHS, TYPE } from '../../theme'
import { replaceURLParam } from '../../utils/routes'

import { switchToNetwork } from '../../utils/switchToNetwork'
import { useDispatch } from 'react-redux'

const ActiveRowLinkList = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 8px;
  & > a {
    align-items: center;
    color: ${({ theme }) => theme.text2};
    display: flex;
    flex-direction: row;
    font-size: 14px;
    font-weight: 500;
    justify-content: space-between;
    padding: 8px 0 4px;
    text-decoration: none;
  }
  & > a:first-child {
    margin: 0;
    margin-top: 0px;
    padding-top: 10px;
  }
`
const ActiveRowWrapper = styled.div`
  background-color: ${({ theme }) => theme.bg1};
  border-radius: 8px;
  cursor: pointer;
  padding: 8px;
  width: 100%;
`
const FlyoutHeader = styled.div`
  color: ${({ theme }) => theme.text2};
  font-weight: 400;
`
const FlyoutMenu = styled.div`
  position: absolute;
  top: 54px;
  width: 272px;
  z-index: 99;
  padding-top: 10px;
  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    top: 40px;
  }
`
const FlyoutMenuContents = styled.div`
  align-items: flex-start;
  background-color: ${({ theme }) => theme.bg0};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  font-size: 16px;
  overflow: auto;
  padding: 16px;
  & > *:not(:last-child) {
    margin-bottom: 12px;
  }
`
const FlyoutRow = styled.div<{ active: boolean }>`
  align-items: center;
  background-color: ${({ active, theme }) => (active ? theme.bg1 : 'transparent')};
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  font-weight: 500;
  justify-content: space-between;
  padding: 6px 8px;
  text-align: left;
  width: 100%;
`
const FlyoutRowActiveIndicator = styled.div`
  background-color: ${({ theme }) => theme.green1};
  border-radius: 50%;
  height: 9px;
  width: 9px;
`

const CircleContainer = styled.div`
  width: 20px;
  display: flex;
  justify-content: center;
`

const LinkOutCircle = styled(ArrowDownCircle)`
  transform: rotate(230deg);
  width: 16px;
  height: 16px;
`
const Logo = styled.img`
  height: 20px;
  width: 20px;
  margin-right: 8px;
`
const NetworkLabel = styled.div`
  flex: 1 1 auto;
`
const SelectorLabel = styled(NetworkLabel)`
  display: none;
  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    display: block;
    margin-right: 8px;
  }
  white-space: nowrap;
`
const SelectorControls = styled.div<{ interactive: boolean }>`
  align-items: center;
  background-color: ${({ theme }) => theme.bg0};
  border: 2px solid ${({ theme }) => theme.bg0};
  border-radius: 16px;
  color: ${({ theme }) => theme.text1};
  cursor: ${({ interactive }) => (interactive ? 'pointer' : 'auto')};
  display: flex;
  font-weight: 500;
  justify-content: space-between;
  padding: 6px 8px;
`
const SelectorLogo = styled(Logo)<{ interactive?: boolean }>`
  margin-right: ${({ interactive }) => (interactive ? 8 : 0)}px;
  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    margin-right: 8px;
  }
`
const SelectorWrapper = styled.div`
  @media screen and (min-width: ${MEDIA_WIDTHS.upToSmall}px) {
    position: relative;
  }
`
const StyledChevronDown = styled(ChevronDown)`
  width: 16px;
`
const BridgeLabel = ({ chainId }: { chainId: ChainId }) => {
  switch (chainId) {
    case ChainId.MAINNET:
    case ChainId.TESTNET:
      return <TYPE.body>Emerald Bridge</TYPE.body>
    case ChainId.OPTIMISM_MAINNET:
    case ChainId.OPTIMISM_TESTNET:
      return <TYPE.body>Optimism Bridge</TYPE.body>
    default:
      return <TYPE.body>Bridge</TYPE.body>
  }
}
const ExplorerLabel = ({ chainId }: { chainId: ChainId }) => {
  switch (chainId) {
    case ChainId.MAINNET:
    case ChainId.TESTNET:
      return <TYPE.body>Emerald Explorer</TYPE.body>
    case ChainId.OPTIMISM_MAINNET:
    case ChainId.OPTIMISM_TESTNET:
      return <TYPE.body>Optimistic Etherscan</TYPE.body>
    default:
      return <TYPE.body>Etherscan</TYPE.body>
  }
}

function Row({ targetChain, onSelectChain }: { targetChain: ChainId; onSelectChain: (targetChain: number) => void }) {
  const { library, chainId } = useActiveWeb3ReactWithUnSupportChainId()
  const curChainId = chainId ?? library ? library?._network?.chainId : chainId
  if (!library || !curChainId) {
    return null
  }
  const active = curChainId === targetChain
  const { explorer, bridge, label, logoUrl } = CHAIN_INFO[targetChain]

  const rowContent = (
    <FlyoutRow onClick={() => onSelectChain(targetChain)} active={active}>
      <Logo src={logoUrl} />
      <NetworkLabel>{label}</NetworkLabel>
      {curChainId === targetChain && (
        <CircleContainer>
          <FlyoutRowActiveIndicator />
        </CircleContainer>
      )}
    </FlyoutRow>
  )

  if (active) {
    return (
      <ActiveRowWrapper>
        {rowContent}
        <ActiveRowLinkList>
          {bridge && (
            <ExternalLink href={bridge}>
              <BridgeLabel chainId={curChainId} />
              <CircleContainer>
                <LinkOutCircle />
              </CircleContainer>
            </ExternalLink>
          )}
          {explorer && (
            <ExternalLink href={explorer}>
              <ExplorerLabel chainId={curChainId} />
              <CircleContainer>
                <LinkOutCircle />
              </CircleContainer>
            </ExternalLink>
          )}
        </ActiveRowLinkList>
      </ActiveRowWrapper>
    )
  }
  return rowContent
}

const getChainIdFromName = (name: string) => {
  const entry = Object.entries(CHAIN_INFO).find(([_, n]) => n.name === name)
  const chainId = entry?.[0]
  return chainId ? parseInt(chainId) : undefined
}

const getChainNameFromId = (id: string | number) => {
  // casting here may not be right but fine to return undefined if it's not a supported chain ID
  return CHAIN_INFO[id as ChainId]?.name || ''
}

const getParsedChainId = (parsedQs?: ParsedQs) => {
  const chain = parsedQs?.chain
  if (!chain || typeof chain !== 'string') return { urlChain: undefined, urlChainId: undefined }

  return { urlChain: chain.toLowerCase(), urlChainId: getChainIdFromName(chain) }
}

export default function NetworkSelector() {
  const { chainId, library } = useActiveWeb3ReactWithUnSupportChainId()
  const parsedQs = useParsedQueryString()
  const { urlChain, urlChainId } = getParsedChainId(parsedQs)
  const prevChainId = usePrevious(chainId)
  const node = useRef<HTMLDivElement>()
  const open = useNetworkSelectorModalOpen()
  const toggle = useNetworkSelectorModalToggle()
  useOnClickOutside(node, open ? toggle : undefined)

  const history = useHistory()

  const curChainId = chainId ?? library ? library?._network?.chainId : chainId
  const info = curChainId && CHAIN_INFO[curChainId] ? CHAIN_INFO[curChainId] : CHAIN_INFO[ChainId.TESTNET]

  const dispatch = useDispatch()

  const handleChainSwitch = useCallback(
    (targetChain: number, skipToggle?: boolean) => {
      if (!library?.provider) return
      switchToNetwork({ provider: library.provider, chainId: targetChain })
        .then(() => {
          if (!skipToggle) {
            toggle()
          }
          history.replace({
            search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(targetChain))
          })
        })
        .catch(error => {
          console.error('Failed to switch networks', error)

          // we want app network <-> chainId param to be in sync, so if user changes the network by changing the URL
          // but the request fails, revert the URL back to current chainId
          if (curChainId) {
            history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(curChainId)) })
          }

          if (!skipToggle) {
            toggle()
          }

          dispatch(addPopup({ content: { failedSwitchNetwork: targetChain }, key: `failed-network-switch` }))
        })
    },
    [dispatch, library, toggle, history, curChainId]
  )

  useEffect(() => {
    if (!curChainId || !prevChainId) return

    // when network change originates from wallet or dropdown selector, just update URL
    if (curChainId !== prevChainId) {
      history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(curChainId)) })
      // otherwise assume network change originates from URL
    } else if (urlChainId && urlChainId !== curChainId) {
      handleChainSwitch(urlChainId, true)
    }
  }, [curChainId, urlChainId, prevChainId, handleChainSwitch, history])

  // set chain parameter on initial load if not there
  useEffect(() => {
    if (curChainId && !urlChainId) {
      history.replace({ search: replaceURLParam(history.location.search, 'chain', getChainNameFromId(curChainId)) })
    }
  }, [curChainId, history, urlChainId, urlChain])

  if (!curChainId || !info || !library) {
    return null
  }

  return (
    <SelectorWrapper ref={node as any} onMouseEnter={toggle} onMouseLeave={toggle}>
      <SelectorControls interactive>
        <SelectorLogo interactive src={info.logoUrl} />
        <SelectorLabel>{info.label}</SelectorLabel>
        <StyledChevronDown />
      </SelectorControls>
      {open && (
        <FlyoutMenu>
          <FlyoutMenuContents>
            <FlyoutHeader>
              <TYPE.body>Select a network</TYPE.body>
            </FlyoutHeader>
            <Row onSelectChain={handleChainSwitch} targetChain={ChainId.TESTNET} />
            <Row onSelectChain={handleChainSwitch} targetChain={ChainId.OPTIMISM_TESTNET} />
          </FlyoutMenuContents>
        </FlyoutMenu>
      )}
    </SelectorWrapper>
  )
}
