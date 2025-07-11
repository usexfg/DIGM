const StellarSDK = require('@stellar/stellar-sdk');
import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import { isDev } from '../shared/utils';

export interface ParaBridgeConfig {
  horizonURL?: string;               // Horizon server URL (public or testnet)
  networkPassphrase?: string;        // Networks.PUBLIC or Networks.TESTNET
  assetCode?: string;                // PARA (default)
  assetIssuer?: string;              // Issuer account for PARA
  bridgeAccount?: string;            // Bridge account that holds PARA for transfers
}

export class ParaBridge extends EventEmitter {
  private server: any;
  private config: Required<ParaBridgeConfig> = {
    horizonURL: 'https://horizon-testnet.stellar.org',
    networkPassphrase: StellarSDK.Networks.TESTNET,
    assetCode: 'PARA',
    assetIssuer: '',
    bridgeAccount: '',
  } as Required<ParaBridgeConfig>;

  constructor(cfg: ParaBridgeConfig = {}) {
    super();
    this.config = { ...this.config, ...cfg } as Required<ParaBridgeConfig>;
    this.server = new StellarSDK.Server(this.config.horizonURL, { allowHttp: isDev() });
  }

  /**
   * Get PARA balance for a Stellar account. Returns balance in atto-PARA (1e-18).
   * Stellar only carries 7 decimal places, so we multiply by 1e11 to align with atto.
   */
  async getBalance(accountId: string): Promise<bigint> {
    try {
      const account = await this.server.accounts().accountId(accountId).call();
      const balEntry = account.balances.find((b: any) =>
        b.asset_code === this.config.assetCode && b.asset_issuer === this.config.assetIssuer,
      );
      if (!balEntry) return BigInt(0);
      // balEntry.balance is a string decimal with up to 7 dp.
      const [whole, fraction = ''] = balEntry.balance.split('.');
      const fractionPadded = fraction.padEnd(7, '0'); // ensure 7 digits
      const stellarAtomic = BigInt(whole) * BigInt(10) ** BigInt(7) + BigInt(fractionPadded);
      // Convert to atto: multiply by 1e11 (10^11)
      const atto = stellarAtomic * BigInt(10) ** BigInt(11);
      return atto;
    } catch (e) {
      return BigInt(0);
    }
  }

  /**
   * Bridge PARA from EVM side into Stellar by submitting a payment from the bridge account
   * to the destination Stellar address.
   */
  async bridgeToStellar(destAccount: string, amountAtto: bigint, bridgeKey: any): Promise<string> {
    // Convert atto (1e-18) to Stellar atomic (1e-7) => divide by 1e11
    const stellarAtomic = amountAtto / (BigInt(10) ** BigInt(11));
    const asset = new StellarSDK.Asset(this.config.assetCode, this.config.assetIssuer);

    const sourceAccount = await this.server.loadAccount(bridgeKey.publicKey());
    const fee = await this.server.fetchBaseFee();

    const tx = new StellarSDK.TransactionBuilder(sourceAccount, {
      fee: fee.toString() || StellarSDK.BASE_FEE.toString(),
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        StellarSDK.Operation.payment({ 
          destination: destAccount, 
          asset, 
          amount: (Number(stellarAtomic) / 10 ** 7).toFixed(7) 
        }),
      )
      .setTimeout(180)
      .build();

    tx.sign(bridgeKey);

    const res = await this.server.submitTransaction(tx);
    this.emit('bridged', res.hash);
    return res.hash;
  }

  /**
   * Create a claimable balance (voucher) for PARA redemption
   * This allows users to claim PARA without needing to sign a transaction immediately
   */
  async createClaimableBalance(
    destAccount: string, 
    amountAtto: bigint, 
    bridgeKey: any,
    claimPredicate?: any
  ): Promise<string> {
    const stellarAtomic = amountAtto / (BigInt(10) ** BigInt(11));
    const asset = new StellarSDK.Asset(this.config.assetCode, this.config.assetIssuer);

    const sourceAccount = await this.server.loadAccount(bridgeKey.publicKey());
    const fee = await this.server.fetchBaseFee();

    // Default predicate: claimable by destination account
    const predicate = claimPredicate || StellarSDK.xdr.ClaimPredicate.claimPredicateUnconditional();

    const tx = new StellarSDK.TransactionBuilder(sourceAccount, {
      fee: fee.toString() || StellarSDK.BASE_FEE.toString(),
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        StellarSDK.Operation.createClaimableBalance({
          claimants: [
            new StellarSDK.Claimant(destAccount, predicate)
          ],
          asset,
          amount: (Number(stellarAtomic) / 10 ** 7).toFixed(7)
        })
      )
      .setTimeout(180)
      .build();

    tx.sign(bridgeKey);

    const res = await this.server.submitTransaction(tx);
    this.emit('claimable_created', res.hash);
    return res.hash;
  }

  /**
   * Claim a claimable balance (voucher) by the authorized account
   */
  async claimBalance(claimableBalanceId: string, claimantKey: any): Promise<string> {
    const sourceAccount = await this.server.loadAccount(claimantKey.publicKey());
    const fee = await this.server.fetchBaseFee();

    const tx = new StellarSDK.TransactionBuilder(sourceAccount, {
      fee: fee.toString() || StellarSDK.BASE_FEE.toString(),
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        StellarSDK.Operation.claimClaimableBalance({
          balanceId: claimableBalanceId
        })
      )
      .setTimeout(180)
      .build();

    tx.sign(claimantKey);

    const res = await this.server.submitTransaction(tx);
    this.emit('balance_claimed', res.hash);
    return res.hash;
  }

  /**
   * Get all claimable balances for an account
   */
  async getClaimableBalances(accountId: string): Promise<any[]> {
    try {
      const response = await this.server
        .claimableBalances()
        .claimant(accountId)
        .call();
      return response.records || [];
    } catch (e) {
      return [];
    }
  }
}

export default new ParaBridge(); 