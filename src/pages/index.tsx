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

dotenv.config()

const AI_AGENT_API = process.env.NEXT_PUBLIC_AI_AGENT_API as string
const STAKING_FUNCTION_NAME = 'AddToken'
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
          functionName: STAKING_FUNCTION_NAME,
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
          prompt: `${userMessage} on avalanche`,
          address: address,
          messages: history,
        }),
      })

      const data = await response.json()
      console.log('data', { data })

      if (data.error?.includes('tokens in your request are not supported')) {
        console.warn(
          'Brian AI does not recognize the token, but we will proceed with staking.'
        )

        const brianResponse = data.extractedParams[0]

        console.log('brianResponse', brianResponse)
        let action = brianResponse.action || ''
        const amountToStake = parseFloat(brianResponse.amount) || 0

        if (
          action === 'deposit' &&
          brianResponse.token1.toUpperCase() === 'AIVT'
        ) {
          action = STAKING_FUNCTION_NAME
        }

        if (action === STAKING_FUNCTION_NAME) {
          const answer =
            brianResponse.answer ||
            `Staking ${amountToStake} ${brianResponse.token1} on ${brianResponse.chain}.`
          setHistory((prev) => [
            ...prev,
            { content: userMessage, sender: 'user' },
            { content: answer, sender: 'brian' },
          ])
        }

        if (action === STAKING_FUNCTION_NAME && amountToStake > 0 && address) {
          console.log(
            `Staking ${amountToStake} AIVT on network ${brianResponse.chain} from address ${address}`
          )
          stakeRequired = true
          setAmount(amountToStake)
          await handleStake(amountToStake, address)
          // No desactivamos el loading acá; se hará en el useEffect tras el stake
          return
        }

        // stakeRequired = true
        // await handleStake(data.extractedParams[0].amount, address)
        // return
      }

      setHistory(data.result[0].conversationHistory)
      
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
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800">
      <div className="bg-white shadow-md rounded-md w-full max-w-md h-screen p-4 flex flex-col">
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
                        : 'bg-red-500 text-white'
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

        <form
          onSubmit={handleChat}
          className="w-full flex items-center space-x-2 p-2 bg-white"
        >
          <input
            type="text"
            placeholder="Ask Avalanx"
            className="flex-1 border border-gray-300 rounded-md p-2"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-md"
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
