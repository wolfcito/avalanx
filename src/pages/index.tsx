import { FormEvent, useState, useEffect } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { erc20Abi } from 'viem'
import {
  AVIT_TOKEN_CONTRACT,
  STAKING_ABI,
  STAKING_CONTRACT,
} from '@/src/contracts'
import { nanoid } from 'nanoid'
import dotenv from 'dotenv'
import ReactMarkdown from 'react-markdown'
import { CustomConnectButton } from '@/src/components'
import clsx from 'clsx'

dotenv.config()

const AI_AGENT_API = process.env.NEXT_PUBLIC_AI_AGENT_API as string
const STAKING_AVAX_FUNCTION_NAME = 'AddAvax'
const STAKING_AIVT_FUNCTION_NAME = 'AddToken'
const WITHDRAW_FUNCTION_NAME = 'Retiro'
const CLAIM_FUNCTION_NAME = 'CobroT'
const TOKEN_DECIMALS = 18

export default function Home() {
  const [history, setHistory] = useState<Message[]>([])
  const [amount, setAmount] = useState(0)
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [isLoading, setIsLoading] = useState(false)
  const [txApproveHash, setTxApproveHash] = useState<`0x${string}` | null>(null)
  const [pendingStakeAmountDisplay, setPendingStakeAmountDisplay] = useState<
    number | null
  >(null)
  const [pendingStakeAmountUnits, setPendingStakeAmountUnits] = useState<
    bigint | null
  >(null)

  const { data: receipt, isSuccess } = useWaitForTransactionReceipt({
    hash: txApproveHash ?? '0x',
    confirmations: 2,
  })

  useEffect(() => {
    let isMounted = true

    const executeStake = async () => {
      try {
        const txStake = await writeContractAsync({
          abi: STAKING_ABI,
          address: STAKING_CONTRACT as `0x${string}`,
          functionName: STAKING_AIVT_FUNCTION_NAME,
          args: [pendingStakeAmountUnits!],
        })

        if (isMounted) {
          console.log(
            `Successfully staked ${pendingStakeAmountDisplay} AIVT from address ${address}`
          )
          setHistory((prev) => [
            ...prev,
            {
              content: `Successfully staked ${pendingStakeAmountDisplay} AIVT from address ${address} hash: ${txStake}`,
              sender: 'brian',
            },
          ])
          setPendingStakeAmountDisplay(null)
          setPendingStakeAmountUnits(null)
          setIsLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          const errorMsg = `Error during staking (after approval): ${error}`
          console.error(errorMsg)
          setHistory((prev) => [
            ...prev,
            { content: errorMsg, sender: 'brian' },
          ])
          setIsLoading(false)
        }
      }
    }

    if (isSuccess && receipt && pendingStakeAmountUnits && address) {
      executeStake()
    }

    return () => {
      isMounted = false
    }
  }, [isSuccess, receipt, pendingStakeAmountUnits, address, writeContractAsync])

  const convertToUnits = (
    amount: number,
    decimals: number = TOKEN_DECIMALS
  ): bigint => {
    return BigInt(Math.floor(amount * Math.pow(10, decimals)))
  }

  const handleStake = async (customAmount?: number, userAddress?: string) => {
    const stakeAmount = Number(customAmount ?? amount)

    if (isNaN(stakeAmount) || stakeAmount <= 0 || !userAddress) {
      const errorMsg =
        'Ingrese un monto de staking válido y una dirección válida'
      console.error(errorMsg)
      setHistory((prev) => [...prev, { content: errorMsg, sender: 'brian' }])
      return
    }

    const stakeAmountInUnits = convertToUnits(stakeAmount)
    if (stakeAmountInUnits === BigInt(0)) {
      const errorMsg = `El monto ingresado es muy bajo.`
      console.error(errorMsg)
      setHistory((prev) => [...prev, { content: errorMsg, sender: 'brian' }])
      return
    }

    try {
      const txApprove = await writeContractAsync({
        abi: erc20Abi,
        address: AVIT_TOKEN_CONTRACT as `0x${string}`,
        functionName: 'approve',
        args: [STAKING_CONTRACT, stakeAmountInUnits],
      })
      setTxApproveHash(txApprove)
      setPendingStakeAmountDisplay(stakeAmount)
      setPendingStakeAmountUnits(stakeAmountInUnits)

      const successMsg = `Successfully approved ${stakeAmount} AIVT to be staked from address ${userAddress}`
      console.log(successMsg)
      setHistory((prev) => [...prev, { content: successMsg, sender: 'brian' }])
    } catch (error) {
      const errorMsg = `Error during staking: ${error}`
      console.error(errorMsg)
      setHistory((prev) => [...prev, { content: errorMsg, sender: 'brian' }])
    }
  }

  const handleRetiro = async () => {
    setIsLoading(true)
    try {
      const txRetiro = await writeContractAsync({
        abi: STAKING_ABI,
        address: STAKING_CONTRACT as `0x${string}`,
        functionName: WITHDRAW_FUNCTION_NAME,
        args: [],
      })
      console.log(`Retiro exitoso, tx: ${txRetiro}`)
      setHistory((prev) => [
        ...prev,
        { content: `Retiro exitoso, tx hash: ${txRetiro}`, sender: 'brian' },
      ])
    } catch (error) {
      const errorMsg = `Error during Retiro: ${error}`
      console.error(errorMsg)
      setHistory((prev) => [...prev, { content: errorMsg, sender: 'brian' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCobroT = async () => {
    setIsLoading(true)
    try {
      const txCobroT = await writeContractAsync({
        abi: STAKING_ABI,
        address: STAKING_CONTRACT as `0x${string}`,
        functionName: CLAIM_FUNCTION_NAME,
        args: [],
      })
      console.log(`CobroT exitoso, tx: ${txCobroT}`)
      setHistory((prev) => [
        ...prev,
        { content: `CobroT exitoso, tx: ${txCobroT}`, sender: 'brian' },
      ])
    } catch (error) {
      const errorMsg = `Error during CobroT: ${error}`
      console.error(errorMsg)
      setHistory((prev) => [...prev, { content: errorMsg, sender: 'brian' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    let stakeRequired = false
    let messageInput: HTMLInputElement | null = null

    try {
      messageInput = (event.target as HTMLFormElement)
        .elements[0] as HTMLInputElement
      const userMessage = messageInput.value

      const response = await fetch(AI_AGENT_API, {
        method: 'POST',
        headers: {
          'X-Brian-Api-Key': process.env.NEXT_PUBLIC_BRIAN_API_KEY as string,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${userMessage} on Avalanche C-Chain`,
          address: address,
          messages: history,
        }),
      })

      const data = await response.json()
      console.log('data', { data })

      if (data.error) {
        if (
          String(data.error).includes(
            'tokens in your request are not supported'
          )
        ) {
          console.warn(
            'Avalanx does not recognize the token, but we will proceed with staking.'
          )

          const brianResponse = data.extractedParams[0]
          console.log('brianResponse', brianResponse)
          let action = brianResponse.action || ''
          const amountToStake = parseFloat(brianResponse.amount) || 0

          if (
            action === 'deposit' &&
            brianResponse.token1.toUpperCase() === 'AIVT'
          ) {
            action = STAKING_AIVT_FUNCTION_NAME
          }

          if (action === STAKING_AIVT_FUNCTION_NAME) {
            const answer =
              brianResponse.answer ||
              `Staking ${amountToStake} ${brianResponse.token1} on ${brianResponse.chain}.`
            setHistory((prev) => [
              ...prev,
              { content: userMessage, sender: 'user' },
              { content: answer, sender: 'brian' },
            ])
          }

          if (
            action === STAKING_AIVT_FUNCTION_NAME &&
            amountToStake > 0 &&
            address
          ) {
            console.log(
              `Staking ${amountToStake} AIVT on network ${brianResponse.chain} from address ${address}`
            )
            stakeRequired = true
            setAmount(amountToStake)
            await handleStake(amountToStake, address)
            return
          }
        }
        if (String(data.error).includes('withdraw')) {
          console.warn(
            'Avalanx does not recognize the token, but we will proceed with staking.'
          )

          const brianResponse = data.extractedParams[0]
          console.log('brianResponse', brianResponse)
          let action = brianResponse.action || ''

          if (action === 'withdraw') {
            action = WITHDRAW_FUNCTION_NAME
          }

          if (action === WITHDRAW_FUNCTION_NAME) {
            setHistory((prev) => [
              ...prev,
              { content: userMessage, sender: 'user' },
            ])
            await handleRetiro()
            return
          }
        }
        if (String(data.error).includes('claim')) {
          console.warn(
            'Avalanx does not recognize the token, but we will proceed with staking.'
          )

          const brianResponse = data.extractedParams[0]
          console.log('brianResponse', brianResponse)
          let action = brianResponse.action || ''

          if (action === 'claim') {
            action = CLAIM_FUNCTION_NAME
          }

          if (action === CLAIM_FUNCTION_NAME) {
            setHistory((prev) => [
              ...prev,
              { content: userMessage, sender: 'user' },
            ])
            await handleCobroT()
            return
          }
        }
        setHistory((prev) => [
          ...prev,
          { content: userMessage, sender: 'user' },
          { content: data.error, sender: 'brian' },
        ])
        return
      }

      if (data.result[0].answer) {
        setHistory((prev) => [
          ...prev,
          { content: userMessage, sender: 'user' },
          { content: data.result[0].answer, sender: 'brian' },
        ])
      }

      const brianResponse = data.result[0].extractedParams
      let action = data.result[0].action || ''
      const amountToStake = parseFloat(brianResponse.amount) || 0

      if (
        action === 'deposit' &&
        brianResponse.token1.toLowerCase() === 'avax'
      ) {
        action = STAKING_AVAX_FUNCTION_NAME
      }

      if (
        action === STAKING_AVAX_FUNCTION_NAME &&
        amountToStake > 0 &&
        address
      ) {
        const answer =
          brianResponse.answer ||
          `Staking ${amountToStake} AVAX on ${brianResponse.chain}.`
        setHistory((prev) => [
          ...prev,
          { content: `${userMessage}`, sender: 'user' },
          { content: answer, sender: 'brian' },
        ])

        const stakeAmountInUnits = convertToUnits(amountToStake)
        try {
          const txStakeAvax = await writeContractAsync({
            abi: STAKING_ABI,
            address: STAKING_CONTRACT as `0x${string}`,
            functionName: STAKING_AVAX_FUNCTION_NAME,
            value: stakeAmountInUnits,
          })
          console.log(
            `Successfully staked ${amountToStake} AVAX on network ${brianResponse.chain} from address ${address}, tx: ${txStakeAvax}`
          )
          setHistory((prev) => [
            ...prev,
            {
              content: `Successfully staked ${amountToStake} AVAX from address ${address} tx: ${txStakeAvax}`,
              sender: 'brian',
            },
          ])
          setIsLoading(false)
          stakeRequired = true
          return
        } catch (error) {
          const errorMsg = `Error during AVAX staking: ${error}`
          console.error(errorMsg)
          setHistory((prev) => [
            ...prev,
            { content: errorMsg, sender: 'brian' },
          ])
          setIsLoading(false)
          return
        }
      }
    } catch (error) {
      console.error('Error in chat:', error)
      setHistory((prev) => [
        ...prev,
        { content: 'Your request could not be processed', sender: 'brian' },
      ])
    } finally {
      if (messageInput) messageInput.value = ''
      if (!stakeRequired) {
        setIsLoading(false)
      }
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 text-sm">
      <div className="bg-white shadow-md rounded-md w-full max-w-xl h-screen p-4 flex flex-col">
        <div className="flex justify-end pb-8 bg-white/30 backdrop-blur-md w-full pt-4">
          <div>What's Avalanx</div>
          <CustomConnectButton />
        </div>

        <div className="overflow-y-auto rounded-sm h-full mt-8">
          <div className="flex flex-col space-y-4 p-4 overflow-y-auto h-full">
            {history.map((el) => {
              const isBot = el.sender === 'brian'
              return (
                <div
                  key={nanoid()}
                  className={`flex items-start ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {isBot && (
                    <img
                      src="https://res.cloudinary.com/guffenix/image/upload/f_auto,q_auto/v1/avalanx/avatar001"
                      alt="Bot Avatar"
                      className="w-8 h-8 mr-2 rounded-full"
                    />
                  )}
                  <div
                    className={`rounded-lg p-3 max-w-xs break-words ${
                      isBot
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-red-200 text-gray-900'
                    }`}
                  >
                    <ReactMarkdown>{el.content}</ReactMarkdown>
                  </div>
                  {!isBot && (
                    <img
                      src="https://res.cloudinary.com/guffenix/image/upload/f_auto,q_auto/v1/avalanx/avatar002"
                      alt="User Avatar"
                      className="w-8 h-8 ml-2 rounded-full"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sección para botones de Retiro y CobroT */}
        {/* <div className="flex space-x-2 mt-4">
          <button
            onClick={handleRetiro}
            disabled={isLoading}
            className={clsx(
              'bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-md',
              { 'cursor-not-allowed bg-gray-500': isLoading }
            )}
          >
            Retiro
          </button>
          <button
            onClick={handleCobroT}
            disabled={isLoading}
            className={clsx(
              'bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded-md',
              { 'cursor-not-allowed bg-gray-500': isLoading }
            )}
          >
            CobroT
          </button>
        </div> */}

        <form
          onSubmit={handleChat}
          className="w-full flex items-center space-x-2 p-2 bg-white mt-4"
        >
          <input
            type="text"
            placeholder="Ask Avalanx"
            className="flex-1 border border-gray-300 rounded-md p-2"
          />
          <button
            type="submit"
            disabled={isLoading}
            className={clsx('text-white px-4 py-2 rounded-md', {
              'cursor-not-allowed bg-gray-500': isLoading,
              'bg-red-500 hover:bg-red-700': !isLoading,
            })}
          >
            {isLoading ? 'working...' : 'send'}
          </button>
        </form>
      </div>
    </main>
  )
}

interface Message {
  content: string
  sender: string
}
