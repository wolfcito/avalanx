import { ConnectButton } from "@rainbow-me/rainbowkit";

import Head from "next/head";
import { FormEvent, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { erc20Abi } from "viem";
import { AVIT_CONTRACT, STAKING_ABI, STAKING_CONTRACT } from "@/contracts";
import { nanoid } from "nanoid";
import dotenv from 'dotenv';

dotenv.config();

export default function Home ()  {

  const [history, setHistory] = useState<Message[]>([]);
  const [amount, setAmount] = useState(0);
  const { address } = useAccount();
  const {  writeContractAsync } = useWriteContract();

  const handleStake = async () => {
    if (amount <= 0) {
      console.log("Debe ingresar un monto válido para stake");
      return;
    }
    try {
      const dataApprove = {
        abi: erc20Abi,
        address: AVIT_CONTRACT as `0x${string}`,
        functionName: "approve",
        args: [STAKING_CONTRACT, BigInt(amount)],
      } as const;
      await writeContractAsync(dataApprove);

      const dataStake = {
        abi: STAKING_ABI,
        address: STAKING_CONTRACT as `0x${string}`,
        functionName: "stake",
        args: [amount],
      };
      await writeContractAsync(dataStake);
      console.log("Staking realizado con éxito");
    } catch (error) {
      console.error("Error en staking: ", error);
    }
  };

  const handleWithdraw = async () => {
    try {
      const dataWithdraw = {
        abi: STAKING_ABI,
        address: STAKING_CONTRACT as `0x${string}`,
        functionName: "withdraw",
        args: [],
      };
      await writeContractAsync(dataWithdraw);
      console.log("Retiro exitoso");
    } catch (error) {
      console.error("Error en retiro: ", error);
    }
  };

  const handleChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const messageInput = (event.target as HTMLFormElement).elements[0] as HTMLInputElement;
      const userMessage = messageInput.value;
  
      const response = await fetch("https://api.brianknows.org/api/v0/agent", {
        method: "POST",
        headers: {
          "X-Brian-Api-Key": process.env.NEXT_PUBLIC_BRIAN_API_KEY as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userMessage, address, messages: history }),
      });
  
      const data = await response.json();
  
      if (!data.result || data.result.length === 0) {
        console.error("Respuesta inesperada de Brian API:", data);
        setHistory([...history, { content: "No se recibió una respuesta válida.", sender: "brian" }]);
        return;
      }
  
      // Extraer la respuesta y el historial de conversación
      const brianResponse = data.result[0];
      const answer = brianResponse.answer || "No se encontró una respuesta.";
      const updatedHistory = [...history, { content: userMessage, sender: "user" }, { content: answer, sender: "brian" }];
  
      setHistory(updatedHistory);
    } catch (error) {
      console.error("Error en chat:", error);
      setHistory([...history, { content: "Error al obtener respuesta de Brian AI.", sender: "brian" }]);
    }
  };
  

  return (
    <div >
      <Head>
        <title>Staking & AI Chat</title>
      </Head>
      <main >
        <ConnectButton />
        <h1>Interactúa con AIVT Staking</h1>

        <div>
          <h2>Staking</h2>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Cantidad de tokens"
          />
          <button onClick={handleStake}>Stake</button>
          <button onClick={handleWithdraw}>Retirar</button>
        </div>

        <div>
          <h2>Chat con Brian AI</h2>
          {history.map((el) => (
            <div key={nanoid()} className={el.sender === "brian" ? 'text-left' : 'text-right'}>
              {el.content}
            </div>
          ))}
          <form onSubmit={handleChat}>
            <input type="text" placeholder="Escribe un mensaje" />
            <button type="submit">Enviar</button>
          </form>
        </div>
      </main>
    </div>
  );
};



interface Message {
  content: string;
  sender: string;
}
