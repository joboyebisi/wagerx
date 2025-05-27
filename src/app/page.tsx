export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Welcome to WagerX</h1>
        <p className="text-xl mb-4">
          The decentralized platform for friendly wagers powered by Solana blockchain
        </p>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">How it works:</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Join our Telegram bot</li>
            <li>Create or join wagers in your group chat</li>
            <li>Let our AI handle the rest!</li>
          </ol>
        </div>
      </div>
    </main>
  )
} 