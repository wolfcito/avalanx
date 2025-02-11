import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FormEvent, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { erc20Abi } from "viem";
import { AVIT_CONTRACT, STAKING_ABI, STAKING_CONTRACT } from "@/src/contracts";
import { nanoid } from "nanoid";
import dotenv from 'dotenv';

dotenv.config();

export default function Home ()  {
  const [history, setHistory] = useState<Message[]>([]);
  const [amount, setAmount] = useState(0);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleStake = async (customAmount?: number, userAddress?: string) => {
    const stakeAmount = customAmount ?? amount;

    if (stakeAmount <= 0 || !userAddress) {
      console.log("Debe ingresar un monto válido para stake y tener una dirección válida");
      return;
    }

    try {
      // 1️⃣ Aprobar tokens antes de hacer stake
      const dataApprove = {
        abi: erc20Abi,
        address: AVIT_CONTRACT as `0x${string}`,
        functionName: "approve",
        args: [STAKING_CONTRACT, BigInt(stakeAmount)],
        from: userAddress, // ✅ Usamos la dirección del usuario
      } as const;
      await writeContractAsync(dataApprove);

      // 2️⃣ Ejecutar la función de staking
      const dataStake = {
        abi: STAKING_ABI,
        address: STAKING_CONTRACT as `0x${string}`,
        functionName: "stake",
        args: [BigInt(stakeAmount)],
        from: userAddress, // ✅ Usamos la dirección del usuario
      };
      await writeContractAsync(dataStake);

      console.log(`Staking de ${stakeAmount} AIVT realizado con éxito desde ${userAddress}`);
    } catch (error) {
      console.error("Error en staking: ", error);
    }
  };

  const handleChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const messageInput = (event.target as HTMLFormElement).elements[0] as HTMLInputElement;
      const userMessage = messageInput.value;

      // 🚀 Enviar siempre la red 43113 y el contrato de AIVT en la solicitud
      const requestBody = {
        prompt: `${userMessage} on avalanche`,
        address: address ?? "", // ✅ Usa la dirección del usuario si está disponible
        messages: history,
        chain: "43113", // ✅ Forzar explícitamente Avalanche Fuji
        tokenContract: AVIT_CONTRACT, // ✅ Agregar el contrato del token AIVT
      };

      const response = await fetch("https://api.brianknows.org/api/v0/agent", {
        method: "POST",
        headers: {
          "X-Brian-Api-Key": process.env.NEXT_PUBLIC_BRIAN_API_KEY as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
console.log("data", {data});
      // ✅ Si Brian AI devuelve un error por tokens no reconocidos, forzamos el staking
      if (data.error?.includes("tokens in your request are not supported")) {
        console.warn("Brian AI no reconoce el token, pero procederemos con el staking.");
        
        setHistory([
          ...history,
          { content: userMessage, sender: "user" },
          { content: `No se pudo validar AIVT en Brian AI, ejecutando staking en Avalanche Fuji (43113).`, sender: "brian" }
        ]);

        await handleStake(100, address);
        return;
      }

      // ✅ Validar que Brian AI devolvió una respuesta válida
      if (!data.result || data.result.length === 0) {
        console.error("Respuesta inesperada de Brian AI:", data);
        setHistory([
          ...history,
          { content: userMessage, sender: "user" },
          { content: "No se recibió una respuesta válida.", sender: "brian" }
        ]);
        return;
      }

      const brianResponse = data.result[0];
      let action = brianResponse.action || "";
      const amountToStake = parseFloat(brianResponse.amount) || 0;
      const chain = "43113"; // 🚀 Siempre forzamos la red 43113

      // 📌 Asegurar que la acción detectada es "stake"
      if (action === "deposit") {
        action = "stake"; // Convertimos "deposit" en "stake" automáticamente
      }

      const answer = brianResponse.answer || `Realizando staking de ${amountToStake} AIVT en Avalanche Fuji (43113).`;
      setHistory([...history, { content: userMessage, sender: "user" }, { content: answer, sender: "brian" }]);

      // ✅ Ejecutar staking si la acción es "stake" y el monto es válido
      if (action === "stake" && amountToStake > 0 && address) {
        console.log(`Realizando staking de ${amountToStake} AIVT en la red ${chain} desde la dirección ${address}`);
        setAmount(amountToStake);
        await handleStake(amountToStake, address);
      }
    } catch (error) {
      console.error("Error en chat:", error);
      setHistory([...history, { content: "Error al obtener respuesta de Brian AI.", sender: "brian" }]);
    }
  };

  return (
    <div className=" flex justify-center items-center min-h-screen">
      <main className="p-8 w-full max-w-lg">
        <div className="flex justify-end pb-8">
        <ConnectButton />
        </div>
        <h1 className="text-xl font-bold mt-4 text-gray-800 mb-3">Hi there!</h1>

        <div>
          {history.map((el) => (
            <p key={nanoid()} className={el.sender === "brian" ? 'text-left bg-gray-100 p-2' : 'text-right p-2'}>
              {el.content}
            </p>
          ))}
          <form onSubmit={handleChat}>
            <input type="text" placeholder="Ask Avalanx" className="border border-gray-300 rounded-md p-2 w-full mt-8 mb-2" />
            <button type="submit" className="bg-red-500 hover:bg-red-700 text-white   py-1 px-4 rounded-sm w-full">Send</button>
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
