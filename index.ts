// import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx';

import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { toUtf8 } from "@cosmjs/encoding";
import { Decimal } from "@cosmjs/math";
import { Coin, coins, isDeliverTxFailure } from "@cosmjs/stargate";

require("dotenv").config();

const sendTransaction = async (
  client: SigningCosmWasmClient,
  txSigner: string,
  contractAddr: string,
  msg: Record<string, unknown>,
  funds?: Coin[]
) => {
  console.log({ msg });
  const simulate = await client.simulate(
    txSigner,
    [
      {
        typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
        value: MsgExecuteContract.fromPartial({
          sender: txSigner,
          contract: contractAddr,
          msg: toUtf8(JSON.stringify(msg)),
          funds: funds || [],
        }),
      },
    ],
    ""
  );
  console.log({ simulate });
  //   const fee = getExecuteFee();
  //   console.log({ fee });

  const signed = await client.sign(
    txSigner,
    [
      {
        typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
        value: MsgExecuteContract.fromPartial({
          sender: txSigner,
          contract: contractAddr,
          msg: toUtf8(JSON.stringify(msg)),
          funds: funds || [],
        }),
      },
    ],
    { amount: coins(simulate, "upryzm"), gas: "1000000" },
    ""
  );

  const result = await client.broadcastTx(TxRaw.encode(signed).finish());
  if (isDeliverTxFailure(result)) {
    throw new Error(
      [
        `Error when broadcasting tx ${result.transactionHash} at height ${result.height}.`,
        `Code: ${result.code}; Raw log: ${result.rawLog ?? ""}`,
      ].join(" ")
    );
  }
  console.log(result);
  return {
    signed,
    txHash: result.transactionHash,
  };
};
const buyToken = async () => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    process.env.MNEMONIC!,
    {
      prefix: "pryzm",
    }
  );
  const [account] = await wallet.getAccounts();

  const client = await SigningCosmWasmClient.connectWithSigner(
    "https://testnet-rpc.pryzm.zone",
    wallet,
    {
      gasPrice: {
        amount: Decimal.fromUserInput("0.025", 6),
        denom: "upryzm",
      },
    }
  );

  const marketplace =
    "pryzm1az885vpd2azjmepzhs3t9fftv4td44cyk526jykgpzseghtj44qqzhvlgd";
  const collection =
    "pryzm1qyl0j7a24amk8k8gcmvv07y2zjx7nkcwpk73js24euh64hkja6es9e62fp";
  const token_id = "1";

  const sellTokenMsg = {
    sell_token: {
      token_id,
      contract_address: collection,
      class_id: "pryzm",
      price: {
        native: [
          {
            amount: "10000000",
            denom: "upryzm",
          },
        ],
      },
    },
  };

  const sendTokenMsg = {
    send_nft: {
      contract: marketplace,
      token_id,
      msg: Buffer.from(JSON.stringify(sellTokenMsg)).toString("base64"),
    },
  };

// const sendTokenMsg = {
// 	cancel_sell: {
// 		contract_address: collection,
// 		token_id: "0",
// 		class_id: "pryzm"
// 	}
// }

  try {
	await sendTransaction(client, account.address, collection, sendTokenMsg);
	// await sendTransaction(client, account.address, marketplace, sendTokenMsg);
  } catch (e) {
	console.error(e);
  }
};

buyToken();
