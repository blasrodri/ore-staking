import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  clusterApiUrl,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

// Replace these with your actual addresses
const PROGRAM_ID = new PublicKey('oreV2ZymfyeXgNgBdqMkumTqqAprVqgBWQfoYkrtKWQ'); // Example program ID
const POOL_ADDRESS = new PublicKey('9kQxYE42uPunfSQE4925mNZ7nV1REXtCPg944UfVcRLZ'); // Example pool address
const TOKEN_MINT = new PublicKey('9kQxYE42uPunfSQE4925mNZ7nV1REXtCPg944UfVcRLZ'); // Example token mint address

const WalletContent: FC = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  // Add state for input values
  const [tokenMintInput, setTokenMintInput] = React.useState(TOKEN_MINT.toString());
  const [poolAddressInput, setPoolAddressInput] = React.useState(POOL_ADDRESS.toString());
  const [amountInput, setAmountInput] = React.useState('1');

  const getMemberPDA = (signer: PublicKey, pool: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("member"), signer.toBuffer(), pool.toBuffer()],
      PROGRAM_ID
    );
  };

  const getSharePDA = (signer: PublicKey, pool: PublicKey, mint: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("share"), signer.toBuffer(), pool.toBuffer(), mint.toBuffer()],
      PROGRAM_ID
    );
  };

  // Add validation function
  const handleStakeClick = () => {
    try {
      const amount = parseFloat(amountInput) * 1000000; // Convert to lamports/smallest unit
      const validTokenMint = new PublicKey(tokenMintInput);
      const validPoolAddress = new PublicKey(poolAddressInput);
      handleStake(amount, validTokenMint, validPoolAddress);
    } catch (error) {
      console.error('Invalid input:', error);
      alert('Please check your input values');
    }
  };

  // Update handleStake to accept parameters
  const handleStake = async (amount: number, tokenMint: PublicKey, poolAddress: PublicKey) => {
    if (!publicKey) return;

    try {
      // Get PDAs and associated token accounts
      const [memberPDA] = getMemberPDA(publicKey, poolAddress);
      const [sharePDA] = getSharePDA(publicKey, poolAddress, tokenMint);
      const poolTokens = await getAssociatedTokenAddress(tokenMint, poolAddress);
      const senderTokens = await getAssociatedTokenAddress(tokenMint, publicKey);

      // Create instruction data
      const amountBuffer = Buffer.alloc(8);
      amountBuffer.writeBigUInt64LE(BigInt(amount));

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: tokenMint, isSigner: false, isWritable: false },
          { pubkey: memberPDA, isSigner: false, isWritable: false },
          { pubkey: poolAddress, isSigner: false, isWritable: false },
          { pubkey: poolTokens, isSigner: false, isWritable: true },
          { pubkey: senderTokens, isSigner: false, isWritable: true },
          { pubkey: sharePDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([Buffer.from([0]), amountBuffer]) // 0 represents the "stake" instruction
      });

      const transaction = new Transaction().add(instruction);

      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Transaction successful:', signature);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <WalletMultiButton />
        {publicKey && (
          <div>
            <p>Connected!</p>
            <p>Your wallet address: {publicKey.toString()}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px' }}>
              <label>
                Token Mint Address:
                <input
                  type="text"
                  placeholder="Token Mint Address"
                  value={tokenMintInput}
                  onChange={(e) => setTokenMintInput(e.target.value)}
                />
              </label>
              <label>
                Pool Address:
                <input
                  type="text"
                  placeholder="Pool Address"
                  value={poolAddressInput}
                  onChange={(e) => setPoolAddressInput(e.target.value)}
                />
              </label>
              <label>
                Amount to Stake:
                <input
                  type="number"
                  placeholder="Amount"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </label>
              <button onClick={handleStakeClick}>
                Stake Tokens
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

function App() {
  // You can choose different networks (mainnet-beta, testnet, devnet)
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
