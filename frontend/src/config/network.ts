export const RPC_URL = 'https://rpc-testnet.onelabs.cc:443'
export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID as string
export const EXPLORER_URL = 'https://onescan.cc/testnet'
export const packageUrl = (id: string) => `${EXPLORER_URL}/packageDetail?packageId=${id}`
export const txUrl = (digest: string) => `${EXPLORER_URL}/transactionBlocksDetail?digest=${digest}`
