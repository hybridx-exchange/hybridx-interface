import React from 'react'
import styled from 'styled-components'
import { darken } from 'polished'
import { useTranslation } from 'react-i18next'
import { Link as HistoryLink, NavLink } from 'react-router-dom'

import { ArrowLeft } from 'react-feather'
import { RowBetween } from '../Row'
import QuestionHelper from '../QuestionHelper'

const Tabs = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  border-radius: 3rem;
  justify-content: space-between;
  padding: 0 38px;
`

const SubTabs = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  border-radius: 3rem;
  justify-content: center;
  width: 50%;
`

const activeClassName = 'ACTIVE'

const StyledNavLink = styled(NavLink).attrs({
  activeClassName
})`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  justify-content: center;
  height: 3rem;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.text3};
  font-size: 20px;

  &.${activeClassName} {
    border-radius: 12px;
    font-weight: 500;
    color: ${({ theme }) => theme.text1};
  }

  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text1)};
  }
`

const ActiveText = styled.div`
  font-weight: 500;
  font-size: 20px;
`

const StyledArrowLeft = styled(ArrowLeft)`
  color: ${({ theme }) => theme.text1};
`

export function SwapPoolTabs({ active }: { active: 'swap' | 'trade' | 'pool' | 'order' }) {
  const { t } = useTranslation()
  return (
    <Tabs style={{ marginBottom: '20px' }}>
      <SubTabs style={{ marginBottom: '20px' }}>
        <StyledNavLink id={`swap-nav-link`} to={'/swap'} isActive={() => active === 'swap'}>
          {t('swap')}
        </StyledNavLink>
        <StyledNavLink
          style={{ marginLeft: '10px' }}
          id={`trade-nav-link`}
          to={'/trade'}
          isActive={() => active === 'trade'}
        >
          {t('trade')}
        </StyledNavLink>
      </SubTabs>
      <SubTabs style={{ marginBottom: '20px', width: '50%' }}>
        <StyledNavLink id={`pool-nav-link`} to={'/pool'} isActive={() => active === 'pool'}>
          {t('pool')}
        </StyledNavLink>
        <StyledNavLink
          style={{ marginLeft: '10px' }}
          id={`order-nav-link`}
          to={'/order'}
          isActive={() => active === 'order'}
        >
          {t('order')}
        </StyledNavLink>
      </SubTabs>
    </Tabs>
  )
}

export function FindPoolTabs() {
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/pool">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>Import Pool</ActiveText>
        <QuestionHelper text={"Use this tool to find pairs that don't automatically appear in the interface."} />
      </RowBetween>
    </Tabs>
  )
}

export function AddRemoveTabs({ adding }: { adding: boolean }) {
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/pool">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>{adding ? 'Add' : 'Remove'} Liquidity</ActiveText>
        <QuestionHelper
          text={
            adding
              ? 'When you add liquidity, you are given pool tokens representing your position. These tokens automatically earn fees proportional to your share of the pool, and can be redeemed at any time.'
              : 'Removing pool tokens converts your position back into underlying tokens at the current rate, proportional to your share of the pool. Accrued fees are included in the amounts you receive.'
          }
        />
      </RowBetween>
    </Tabs>
  )
}

export function RemoveOrderTabs() {
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/order">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>Remove Order</ActiveText>
        <QuestionHelper
          text={
            'Removing the order, the tokens that are not filled in the order will be returned to the destination account.'
          }
        />
      </RowBetween>
    </Tabs>
  )
}

export function CreateEditTabs({ creating }: { creating: boolean }) {
  return (
    <Tabs>
      <RowBetween style={{ padding: '1rem' }}>
        <HistoryLink to="/trade">
          <StyledArrowLeft />
        </HistoryLink>
        <ActiveText>{creating ? 'Create' : 'Edit'} OrderBook</ActiveText>
        <QuestionHelper
          text={
            creating
              ? 'When a token pair exists, you can create an order book for that token pair to support limit orders.'
              : 'Order book parameters can only be modified if there is no order in the current order book.'
          }
        />
      </RowBetween>
    </Tabs>
  )
}
