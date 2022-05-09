import React from 'react'
import { Redirect, RouteComponentProps } from 'react-router-dom'
import DoTrade from './index'

const OLD_PATH_STRUCTURE = /^(0x[a-fA-F0-9]{40})-(0x[a-fA-F0-9]{40})$/
export function RedirectOldTradePathStructure(props: RouteComponentProps<{ currencyIdA: string }>) {
  const {
    match: {
      params: { currencyIdA }
    }
  } = props
  const match = currencyIdA.match(OLD_PATH_STRUCTURE)
  if (match?.length) {
    return <Redirect to={`/trade/${match[1]}/${match[2]}`} />
  }

  return <DoTrade {...props} />
}

export function RedirectDuplicateTokenIdsForTrade(
  props: RouteComponentProps<{ currencyIdA: string; currencyIdB: string; inputPrice: string }>
) {
  const {
    match: {
      params: { currencyIdA, currencyIdB, inputPrice }
    }
  } = props
  if (currencyIdA.toLowerCase() === currencyIdB.toLowerCase()) {
    return <Redirect to={`/trade/ROSE/${currencyIdA}/${inputPrice}`} />
  }
  return <DoTrade {...props} />
}
