import { Keypair, PublicKey, Transaction, VersionedTransaction, Connection } from "@solana/web3.js";
import nacl from 'tweetnacl';

export class KeypairWallet {
    public publicKey: PublicKey;
    private keypair: Keypair;
    public connected: boolean = true;
    public connection: Connection;

    constructor(keypair: Keypair, connection?: Connection) {
        this.publicKey = keypair.publicKey;
        this.keypair = keypair;
        this.connection = connection!;
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        if (transaction instanceof Transaction) {
            transaction.partialSign(this.keypair);
        } else {
            (transaction as any).sign([this.keypair]);
        }
        return transaction;
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        return Promise.all(transactions.map(tx => this.signTransaction(tx)));
    }

    async signAndSendTransaction(tx: Transaction | VersionedTransaction) {
        const signed = await this.signTransaction(tx);
        const raw = signed.serialize();
        const signature = await this.connection.sendRawTransaction(raw);
        return { signature };
    }

    async signMessage(message: Uint8Array) {
        return nacl.sign.detached(message, this.keypair.secretKey);
    }

    connect(): Promise<void> {
        return Promise.resolve();
    }

    disconnect(): Promise<void> {
        return Promise.resolve();
    }
} 