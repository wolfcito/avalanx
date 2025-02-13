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

const STAKING_FUNCTION_NAME = 'AddToken'

export default function Home() {
  const [history, setHistory] = useState<Message[]>([])
  const [amount, setAmount] = useState(0)
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  // Estado para manejar el loading del botón
  const [isLoading, setIsLoading] = useState(false)

  // Guardamos el hash de la transacción de approve y el monto pendiente de stake.
  const [txApproveHash, setTxApproveHash] = useState<`0x${string}` | null>(null)
  const [pendingStakeAmount, setPendingStakeAmount] = useState<number | null>(
    null
  )

  // Hook para esperar la confirmación de la transacción de approve
  const { data: receipt, isSuccess } = useWaitForTransactionReceipt({
    hash: txApproveHash ?? '0x',
    confirmations: 2,
  })

  // Efecto: Cuando la aprobación se confirme, se ejecuta el stake.
  useEffect(() => {
    let isMounted = true
  
    const executeStake = async () => {
      try {
        const txStake = await writeContractAsync({
          abi: STAKING_ABI,
          address: STAKING_CONTRACT as `0x${string}`,
          functionName: STAKING_FUNCTION_NAME,
          args: [BigInt(pendingStakeAmount!)],
        })
  
        if (isMounted) {
          console.log(
            `Successfully staked ${pendingStakeAmount} AIVT from address ${address}`
          )
          setHistory((prev) => [
            ...prev,
            {
              content: `Successfully staked ${pendingStakeAmount} AIVT from address ${address}`,
              sender: 'brian',
            },
          ])
          // Limpiar el monto pendiente después de stake y desactivar el loading
          setPendingStakeAmount(null)
          setIsLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error during staking (after approval): ', error)
          setIsLoading(false)
        }
      }
    }
  
    if (isSuccess && receipt && pendingStakeAmount && address) {
      executeStake()
    }
  
    return () => {
      isMounted = false
    }
  }, [isSuccess, receipt, pendingStakeAmount, address, writeContractAsync])
  
  

  const handleStake = async (customAmount?: number, userAddress?: string) => {
    const stakeAmount = customAmount ?? amount

    if (stakeAmount <= 0 || !userAddress) {
      console.log('Please enter a valid staking amount and a valid address')
      return
    }

    try {
      // Ejecutar aprobación y obtener el hash
      const txApprove = await writeContractAsync({
        abi: erc20Abi,
        address: AVIT_TOKEN_CONTRACT as `0x${string}`,
        functionName: 'approve',
        args: [STAKING_CONTRACT, BigInt(stakeAmount)],
      })
      // Guardar el hash de la transacción de approve y el monto a stakear
      setTxApproveHash(txApprove)
      setPendingStakeAmount(stakeAmount)

      console.log(
        `Successfully approved ${stakeAmount} AIVT to be staked from address ${userAddress}`
      )
      setHistory((prev) => [
        ...prev,
        {
          content: `Successfully approved ${stakeAmount} AIVT to be staked from address ${userAddress}`,
          sender: 'brian',
        },
      ])

      // La transacción de stake se ejecutará cuando useWaitForTransactionReceipt confirme el approve.
    } catch (error) {
      console.error('Error during staking: ', error)
    }
  }

  const handleChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    let stakeRequired = false
    let messageInput: HTMLInputElement | null = null
    // let amountToStakeLocal = 0
  
    try {
      messageInput = (event.target as HTMLFormElement)
        .elements[0] as HTMLInputElement
      const userMessage = messageInput.value
  
      const response = await fetch('https://api.brianknows.org/api/v0/agent', {
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
  
        setHistory((prev) => [
          { content: userMessage, sender: 'user' },
          ...data.conversationHistory,
        ])
  
        // En este caso se ejecuta el staking, por lo que se debe mantener el loading
        stakeRequired = true
        await handleStake(data.extractedParams[0].amount, address)
        return
      }
  
      if (!data.result || data.result.length === 0) {
        console.error('Unexpected response from Brian AI:', data)
        setHistory((prev) => [
          ...prev,
          { content: userMessage, sender: 'user' },
          { content: 'Did not receive a valid response.', sender: 'brian' },
        ])
        return
      }
  
      const brianResponse = data.result[0]
      console.log('brianResponse', brianResponse)
      let action = brianResponse.action || ''
      const amountToStake = parseFloat(brianResponse.amount) || 0
      const chain = '43113'
  
      if (action === 'deposit') {
        action = STAKING_FUNCTION_NAME
      }
  
      const answer =
        brianResponse.answer ||
        `Staking ${amountToStake} AIVT on Avalanche Fuji (43113).`
      setHistory((prev) => [
        ...prev,
        { content: userMessage, sender: 'user' },
        { content: answer, sender: 'brian' },
      ])
  
      if (action === STAKING_FUNCTION_NAME && amountToStake > 0 && address) {
        console.log(
          `Staking ${amountToStake} AIVT on network ${chain} from address ${address}`
        )
        stakeRequired = true
        setAmount(amountToStake)
        await handleStake(amountToStake, address)
        // No se desactiva isLoading aquí; se espera a que useEffect lo haga
        return
      }
    } catch (error) {
      console.error('Error in chat:', error)
      setHistory((prev) => [
        ...prev,
        { content: 'Error fetching response from Brian AI.', sender: 'brian' },
      ])
    } finally {
      if (messageInput) messageInput.value = ''
      // Solo se desactiva el loading aquí si no se requiere stake (es decir, la transacción ya terminó)
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
                        : 'bg-red-300 text-gray-900'
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
            {isLoading ? 'transacting...' : 'send'}
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
