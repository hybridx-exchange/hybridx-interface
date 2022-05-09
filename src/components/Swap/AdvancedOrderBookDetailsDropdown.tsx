import React from 'react'
import styled from 'styled-components'
import { AdvancedOrderBookDetailsProps } from './AdvancedOrderBookDetails'
import { AdvancedOrderBookDetails } from './AdvancedOrderBookDetails'

const AdvancedDetailsFooter = styled.div<{ show: boolean }>`
  padding-top: calc(16px + 2rem);
  padding-bottom: 20px;
  margin-top: -2rem;
  width: 100%;
  max-width: 400px;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  color: ${({ theme }) => theme.text2};
  background-color: ${({ theme }) => theme.advancedBG};
  z-index: -1;

  transform: ${({ show }) => (show ? 'translateY(0%)' : 'translateY(-100%)')};
  transition: transform 300ms ease-in-out;
`

export default function AdvancedOrderBookDetailsDropdown({ trade, ...rest }: AdvancedOrderBookDetailsProps) {
  return (
    <AdvancedDetailsFooter show={Boolean(trade?.tradeRet)}>
      <AdvancedOrderBookDetails {...rest} trade={trade} />
    </AdvancedDetailsFooter>
  )
}
