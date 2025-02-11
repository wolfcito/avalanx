import { FormEvent, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { AVIT_CONTRACT, STAKING_ABI, STAKING_CONTRACT } from '@/src/contracts'
import { nanoid } from 'nanoid'
import dotenv from 'dotenv'
import ReactMarkdown from 'react-markdown'
import { CustomConnectButton } from '@/src/components'
import { ArrowUp } from 'lucide-react'

dotenv.config()

export default function Home() {
  const [history, setHistory] = useState<Message[]>([])
  const [amount, setAmount] = useState(0)
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const handleStake = async (customAmount?: number, userAddress?: string) => {
    const stakeAmount = customAmount ?? amount

    if (stakeAmount <= 0 || !userAddress) {
      console.log(
        'Debe ingresar un monto válido para stake y tener una dirección válida'
      )
      return
    }

    try {
      const dataApprove = {
        abi: erc20Abi,
        address: AVIT_CONTRACT as `0x${string}`,
        functionName: 'approve',
        args: [STAKING_CONTRACT, BigInt(stakeAmount)],
        from: userAddress,
      } as const
      await writeContractAsync(dataApprove)

      const dataStake = {
        abi: STAKING_ABI,
        address: STAKING_CONTRACT as `0x${string}`,
        functionName: 'stake',
        args: [BigInt(stakeAmount)],
        from: userAddress,
      }
      await writeContractAsync(dataStake)

      console.log(
        `Staking de ${stakeAmount} AIVT realizado con éxito desde ${userAddress}`
      )
    } catch (error) {
      console.error('Error en staking: ', error)
    }
  }

  const handleChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const messageInput = (event.target as HTMLFormElement)
        .elements[0] as HTMLInputElement
      const userMessage = messageInput.value

      const requestBody = {
        prompt: `${userMessage} on avalanche`,
        address: address ?? '',
        messages: history,
        chain: '43113',
        tokenContract: AVIT_CONTRACT,
      }

      const response = await fetch('https://api.brianknows.org/api/v0/agent', {
        method: 'POST',
        headers: {
          'X-Brian-Api-Key': process.env.NEXT_PUBLIC_BRIAN_API_KEY as string,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.log('data', { data })

      if (data.error?.includes('tokens in your request are not supported')) {
        console.warn(
          'Brian AI no reconoce el token, pero procederemos con el staking.'
        )

        setHistory([
          ...history,
          { content: userMessage, sender: 'user' },
          {
            content: `No se pudo validar AIVT en Brian AI, ejecutando staking en Avalanche Fuji (43113).`,
            sender: 'brian',
          },
        ])

        await handleStake(100, address)
        return
      }

      if (!data.result || data.result.length === 0) {
        console.error('Respuesta inesperada de Brian AI:', data)
        setHistory([
          ...history,
          { content: userMessage, sender: 'user' },
          { content: 'No se recibió una respuesta válida.', sender: 'brian' },
        ])
        return
      }

      const brianResponse = data.result[0]
      let action = brianResponse.action || ''
      const amountToStake = parseFloat(brianResponse.amount) || 0
      const chain = '43113' //

      if (action === 'deposit') {
        action = 'stake'
      }

      const answer =
        brianResponse.answer ||
        `Realizando staking de ${amountToStake} AIVT en Avalanche Fuji (43113).`
      setHistory([
        ...history,
        { content: userMessage, sender: 'user' },
        { content: answer, sender: 'brian' },
      ])

      if (action === 'stake' && amountToStake > 0 && address) {
        console.log(
          `Realizando staking de ${amountToStake} AIVT en la red ${chain} desde la dirección ${address}`
        )
        setAmount(amountToStake)
        await handleStake(amountToStake, address)
      }
    } catch (error) {
      console.error('Error en chat:', error)
      setHistory([
        ...history,
        { content: 'Error al obtener respuesta de Brian AI.', sender: 'brian' },
      ])
    }
  }

  return (
    <main className="flex justify-center items-center min-h-screen text-gray-800">
      <div className="py-8 w-full max-w-lg">
        <div className="flex justify-end pb-8">
          <CustomConnectButton />
        </div>

        <div className="h-64 overflow-y-auto rounded-sm">
          <div className="flex">
            <div className="w-full">
              <div className="font-bold pl-2">What can do this bot?</div>
              <div className="pl-2">
                Avalanx is a cyberpunk-inspired AI assistant designed to help
                users navigate the Avalanche ecosystem. It provides insights on
                staking, Subnets, HyperSDK, DeFi applications, and network
                performance. With real-time data and expert guidance, Avalanx
                simplifies Web3 engagement and blockchain development.
              </div>
            </div>
            <div className="w-80">
              <img
                src="https://res.cloudinary.com/guffenix/image/upload/f_auto,q_auto/v1/avalanx/avatar"
                alt="Avalanx"
                className="rounded-sm"
              />
            </div>
          </div>
          {history.map((el) => (
            <div
              key={nanoid()}
              className={
                el.sender === 'brian'
                  ? 'text-left bg-gray-100 p-2 rounded-sm'
                  : 'text-right p-2 rounded-sm'
              }
            >
              <ReactMarkdown>{el.content}</ReactMarkdown>
            </div>
          ))}
        </div>

        <form onSubmit={handleChat}>
          <div className="flex items-center mt-8 space-x-1">
            <input
              type="text"
              placeholder="Ask Avalanx"
              className="border border-gray-300 rounded-md p-2 w-full"
            />
            <button
              type="submit"
              className="text-white rounded-full cursor-pointer bg-red-500 hover:bg-red-700"
            >
              <ArrowUp color="white" size={32} />
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

interface Message {
  content: string
  sender: string
}
