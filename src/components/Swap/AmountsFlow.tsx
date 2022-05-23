import { Swap, TokenAmount } from '@hybridx-exchange/hybridx-sdk'
import React, { Fragment, memo, useContext } from 'react'
import { Flex } from 'rebass'
import { ThemeContext } from 'styled-components'
import { TYPE } from '../../theme'

export default memo(function SwapRoute({ swap }: { swap: Swap }) {
  const theme = useContext(ThemeContext)
  return (
    <Flex
      px="1rem"
      py="0.5rem"
      my="0.5rem"
      style={{ border: `1px solid ${theme.bg3}`, borderRadius: '1rem' }}
      flexWrap="wrap"
      width="100%"
      justifyContent="space-evenly"
      alignItems="center"
    >
      {swap.route.path.map((token, i, path) => {
        const extra = swap.route.extra
        console.log(extra)
        if (i % 2 === 0) {
          return (
            extra && (
              <Fragment key={'flow' + i}>
                <Flex my="0.5rem" alignItems="center" style={{ flexShrink: 0 }}>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {new TokenAmount(token, extra[6 * i + 2]).toSignificant()}
                  </TYPE.black>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {token.symbol}
                  </TYPE.black>
                </Flex>
                <Flex my="0.5rem" alignItems="center" style={{ flexShrink: 0 }}>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {new TokenAmount(token, extra[6 * i + 4]).toSignificant()}
                  </TYPE.black>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {token.symbol}
                  </TYPE.black>
                </Flex>
              </Fragment>
            )
          )
        } else {
          return (
            extra && (
              <Fragment key={'flow' + i}>
                <Flex my="0.5rem" alignItems="center" style={{ flexShrink: 0 }}>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {new TokenAmount(token, extra[6 * (i - 1) + 3]).toSignificant()}
                  </TYPE.black>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {token.symbol}
                  </TYPE.black>
                </Flex>
                <Flex my="0.5rem" alignItems="center" style={{ flexShrink: 0 }}>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {new TokenAmount(token, extra[6 * (i - 1) + 5]).toSignificant()}
                  </TYPE.black>
                  <TYPE.black fontSize={14} color={theme.text1} ml="0.5rem">
                    {token.symbol}
                  </TYPE.black>
                </Flex>
              </Fragment>
            )
          )
        }
      })}
    </Flex>
  )
})
