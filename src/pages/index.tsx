import { FormEvent, useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi } from 'viem'
import { AVIT_TOKEN_CONTRACT, STAKING_ABI, STAKING_CONTRACT } from '@/src/contracts'
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
  
  // Guardamos el hash de la transacción de approve y el monto pendiente de stake.
  const [txApproveHash, setTxApproveHash] = useState<`0x${string}` | null>(null)
  const [pendingStakeAmount, setPendingStakeAmount] = useState<number | null>(null)

  // Hook para esperar la confirmación de la transacción de approve
  const { data: receipt, isSuccess } = useWaitForTransactionReceipt({
    hash: txApproveHash ?? '0x',
    confirmations: 2,
  })

  // Efecto: Cuando la aprobación se confirme, se ejecuta el stake.
  useEffect(() => {
    if (isSuccess && receipt && pendingStakeAmount && address) {
      (async () => {
         try {
            const txStake = await writeContractAsync({
              abi: STAKING_ABI,
              address: STAKING_CONTRACT as `0x${string}`,
              functionName: 'stake',
              args: [BigInt(pendingStakeAmount)],
            })
            console.log(`Successfully staked ${pendingStakeAmount} AIVT from address ${address}`)
            setHistory(prev => [
              ...prev,
              { content: `Successfully staked ${pendingStakeAmount} AIVT from address ${address}`, sender: 'brian' }
            ])
            // Limpiar el monto pendiente después de stake
            setPendingStakeAmount(null)
         } catch (error) {
            console.error('Error during staking (after approval): ', error)
         }
      })()
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
      
      console.log(`Successfully approved ${stakeAmount} AIVT to be staked from address ${userAddress}`)
      setHistory(prev => [
        ...prev,
        { content: `Successfully approved ${stakeAmount} AIVT to be staked from address ${userAddress}`, sender: 'brian' }
      ])
      
      // La transacción de stake se ejecutará cuando useWaitForTransactionReceipt confirme el approve.
      
    } catch (error) {
      console.error('Error during staking: ', error)
    }
  }

  const handleChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    let messageInput: HTMLInputElement | null = null
    try {
      messageInput = (event.target as HTMLFormElement).elements[0] as HTMLInputElement
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
        console.warn('Brian AI does not recognize the token, but we will proceed with staking.')

        setHistory(prev => [
          { content: userMessage, sender: 'user' },
          ...data.conversationHistory,
        ])

        await handleStake(data.extractedParams[0].amount, address)
        return
      }

      if (!data.result || data.result.length === 0) {
        console.error('Unexpected response from Brian AI:', data)
        setHistory(prev => [
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
        action = 'stake'
      }

      const answer =
        brianResponse.answer ||
        `Staking ${amountToStake} AIVT on Avalanche Fuji (43113).`
      setHistory(prev => [
        ...prev,
        { content: userMessage, sender: 'user' },
        { content: answer, sender: 'brian' },
      ])

      if (action === 'stake' && amountToStake > 0 && address) {
        console.log(`Staking ${amountToStake} AIVT on network ${chain} from address ${address}`)
        setAmount(amountToStake)
        await handleStake(amountToStake, address)
      }
    } catch (error) {
      console.error('Error in chat:', error)
      setHistory(prev => [
        ...prev,
        { content: 'Error fetching response from Brian AI.', sender: 'brian' },
      ])
    } finally {
      if (messageInput) messageInput.value = ''
    }
  }

  return (
    <main className="flex justify-center items-center min-h-screen text-gray-800">
      <div className="py-8 w-full max-w-lg min-h-screen">
        <div className="flex justify-end pb-8 bg-white/30 backdrop-blur-md fixed top-0 w-full max-w-lg pt-4">
          <CustomConnectButton />
        </div>

        <div className="overflow-y-auto rounded-sm h-full mt-8">
          <div className="flex mt-8">
            <div className="w-full">
              <div className="font-bold pl-2">What can this bot do?</div>
              <div className="pl-2 text-sm">
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
                  ? 'text-left bg-gray-100 p-2 rounded-sm mb-20'
                  : 'text-right p-2 rounded-sm'
              }
            >
              <ReactMarkdown>{el.content}</ReactMarkdown>
            </div>
          ))}
        </div>

        <form onSubmit={handleChat} className="relative max-w-lg">
          <div className="flex items-center mt-8 space-x-1 fixed bottom-0 w-full max-w-lg bg-white/30 backdrop-blur-md py-8">
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
