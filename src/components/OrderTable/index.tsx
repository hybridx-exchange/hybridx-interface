import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.div`
  position: relative;
  background-color: #ffffff;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  box-shadow: 10px 10px 1px rgba(0, 0, 0, 0.2), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 30px;
  padding: 1rem;
`

const Title = styled.div`
  display: flex;
  font-size: 14px;
  font-weight: 600;
  justify-content: space-between;
`

const Left = styled.div`
  width: 50%;
  color: #2ab66a;
  border-bottom: 4px solid #2ab66a;
`

const Right = styled.div`
  width: 50%;
  color: #ed5577;
  text-align: right;
  border-bottom: 4px solid #ed5577;
`

const Table = styled.table`
  font-size: 12px;
  width: 100%;
`

const Tr = styled.tr`
  display: flex;
`

const Th = styled.th`
  flex: 1;
  font-weight: normal;
  padding: 16px 0;
`

const Td = styled.td`
  flex: 1;
  text-align: center;
  padding: 5px 0;
`

interface OrderTableProps {
  thData: any[]
  tdData: any[]
}

export default function OrderTable({ thData, tdData }: OrderTableProps) {
  return (
    <Wrapper>
      <Title>
        <Left>buy</Left>
        <Right>sell</Right>
      </Title>
      <Table>
        <Tr>
          {thData.map((v, i) => {
            return <Th key={i}>{v}</Th>
          })}
        </Tr>
        {tdData.map((v, i) => {
          return (
            <Tr key={i}>
              {v.map((y: React.ReactNode, j: string | number | undefined) => {
                return <Td key={j}>{y}</Td>
              })}
            </Tr>
          )
        })}
      </Table>
    </Wrapper>
  )
}
