import React from 'react'
import { Redirect, RouteComponentProps } from 'react-router-dom'
import CreateOrderBook from './index'

const OLD_PATH_STRUCTURE = /^(0x[a-fA-F0-9]{40})-(0x[a-fA-F0-9]{40})$/
export function RedirectOldCreateOrderBookPathStructure(props: RouteComponentProps<{ currencyIdBase: string }>) {
  const {
    match: {
      params: { currencyIdBase }
    }
  } = props
  const match = currencyIdBase.match(OLD_PATH_STRUCTURE)
  if (match?.length) {
    return <Redirect to={`/orderbook/${match[1]}/${match[2]}`} />
  }

  return <CreateOrderBook {...props} />
}

export function RedirectDuplicateTokenIdsForCreateOrderBook(
  props: RouteComponentProps<{ currencyIdBase: string; currencyIdQuote: string }>
) {
  const {
    match: {
      params: { currencyIdBase, currencyIdQuote }
    }
  } = props
  if (currencyIdBase.toLowerCase() === currencyIdQuote.toLowerCase()) {
    return <Redirect to={`/orderbook/${currencyIdBase}`} />
  }
  return <CreateOrderBook {...props} />
}
