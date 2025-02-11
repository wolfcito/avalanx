import { ConnectButton } from '@rainbow-me/rainbowkit'

export function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openConnectModal,
        openChainModal,
        mounted,
      }) => {
        const isReady = mounted
        const isConnected = isReady && account && chain

        // Mientras el componente se carga, se muestra un estado "loading"
        if (!isReady) {
          return (
            <div
              className="rounded-md transition cursor-pointer"
              aria-hidden="true"
            >
              Loading...
            </div>
          )
        }

        // Si no está conectado, se muestra el botón de conexión
        if (!isConnected) {
          return (
            <button
              onClick={openConnectModal}
              className="bg-red-500 hover:bg-red-700 text-white py-1 px-4 rounded-sm w-full cursor-pointer"
            >
              Connect Wallet
            </button>
          )
        }

        // Si la red es incorrecta, se muestra el aviso correspondiente
        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              className="bg-red-500 hover:bg-red-700 text-white py-1 px-4 rounded-sm w-full cursor-pointer"
            >
              Wrong Network
            </button>
          )
        }

        // Si está conectado y la red es la correcta, se muestran las opciones de la cuenta
        return (
          <div className="flex items-center space-x-3">
            <button
              onClick={openChainModal}
              className="flex items-center justify-center p-1 rounded-full cursor-pointer"
              aria-label="Select Network"
            >
              {chain.iconUrl ? (
                <img src={chain.iconUrl} alt={chain.name} className="w-6 h-6" />
              ) : (
                <span>{chain.name}</span>
              )}
            </button>
            <button
              onClick={openAccountModal}
              className="bg-gray-100 text-gray-800 px-3 py-1 rounded cursor-pointer"
              aria-label="Account details"
            >
              {account.displayName}
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
