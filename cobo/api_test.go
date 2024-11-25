package cobo

import (
	"fmt"
	coboWaas2 "github.com/CoboGlobal/cobo-waas2-go-sdk/cobo_waas2"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestCoboApi(t *testing.T) {
	privateKey := "17ba398bf66983e664fd15aeacaddb312d2bfdb904256417a8d4f9548e10035f"
	client := NewCobo(
		privateKey,
		coboWaas2.DevEnv)
	defaultWallet := "aa2c6260-d12d-4783-a689-051680db6dc7"
	assetWallet1 := "1ca73052-3133-42bd-99b9-90744b85d07f"
	t.Run("ListSupportedChains", func(t *testing.T) {
		chains, _ := client.ListSupportedChains()
		fmt.Println(chains)
		assert.NotEmptyf(t, chains, "ListSupportedChains should return a non-empty response")
	})
	t.Run("ListAllTransactions", func(t *testing.T) {
		transactions, _ := client.ListAllTransactions()
		fmt.Println(transactions)
		assert.NotEmptyf(t, transactions, "ListAllTransactions should return a non-empty response")
	})
	t.Run("FindTransaction", func(t *testing.T) {
		hash := "490a7ab79498db3b9c7f580b57c144335ea282f3ba5f7963856ace6112cbdc84"
		chainId := "XTN"
		transaction, _ := client.FindTransaction(hash, chainId)
		fmt.Println(transaction)
		assert.NotEmptyf(t, transaction, "FindTransaction should return a non-empty response")
	})
	t.Run("FindTransaction with invalid chainId", func(t *testing.T) {
		hash := "490a7ab79498db3b9c7f580b57c144335ea282f3ba5f7963856ace6112cbdc84"
		chainId := "INVALID"
		transaction, _ := client.FindTransaction(hash, chainId)
		fmt.Println(transaction)
		assert.Equal(t, len(transaction.Data), 0, "FindTransaction should return an empty response")
	})
	t.Run("Transfer XTN out", func(t *testing.T) {
		tokenId := "XTN"
		toAddr := "tb1ptv20dlft894l08d749lyyq8wsh8vykdxqj9eqgu98vptrj46julqy77clx"
		description := "Transfer XTN from Custodial Out to External"
		amount := "0.01"
		resp, err := client.TransferOutFromCustodial(assetWallet1, tokenId, amount, toAddr, description)
		fmt.Println(resp)
		assert.NoError(t, err)
	})
	t.Run("Transfer SETH out", func(t *testing.T) {
		tokenId := "SETH"
		toAddr := "0xb4fc7496883cee8d9c785d06953b4873d58066f2"
		description := "Transfer SETH from Custodial Out to External"
		amount := "0.00001"
		resp, err := client.TransferOutFromCustodial(assetWallet1, tokenId, amount, toAddr, description)
		fmt.Println(resp)
		assert.NoError(t, err)
	})
	t.Run("List Token balances", func(t *testing.T) {
		resp, err := client.ListTokenBalances(assetWallet1)
		for _, r := range resp.Data {
			fmt.Println(r.TokenId, r.Balance.Total, *r.Balance.Pending)
		}
		assert.NoError(t, err)
	})
	t.Run("List addresses", func(t *testing.T) {
		resp, err := client.ListWalletAddrs(assetWallet1)
		fmt.Println("Asset Wallet 1 Addresses")
		for _, r := range resp.Data {
			fmt.Println(r.Address, r.ChainId)
		}
		fmt.Println("========================================")
		resp2, err := client.ListWalletAddrs(defaultWallet)
		fmt.Println("Asset Wallet Default Addresses")
		for _, r := range resp2.Data {
			fmt.Println(r.Address, r.ChainId)
		}
		assert.NoError(t, err)
	})
	t.Run("Create ETH address", func(t *testing.T) {
		resp, err := client.CreateWalletAddr(assetWallet1, "ETH")
		fmt.Println(resp)
		assert.NoError(t, err)
	})
	t.Run("Get max transferable SETH", func(t *testing.T) {
		fromAddr := "0xb533b831882f449fa0065087042e433ac1254b95"
		toAddr := "0xb533b831882f449fa0065087042e433ac1254b95"
		resp, err := client.GetMaxTransferableValue(assetWallet1, "SETH", "100", fromAddr, toAddr)
		fmt.Println(resp.GetTokenId())
		fmt.Println(resp.GetMaxTransferableValue())
		assert.NoError(t, err)
	})
	t.Run("Get max transferable XTN", func(t *testing.T) {
		fromAddr := "tb1pz8xzt2l5jpsttempp5yzrkxlkm2deshcfjp27x2xk8z9kfkt27dsca2k0v"
		toAddr := "tb1parg0pkcnv5d6ha0kqk4ljct2jrhjzmxrq6gcsnsdjpfymj4lcf6sjk37mf"
		resp, err := client.GetMaxTransferableValue(assetWallet1, "XTN", "0", fromAddr, toAddr)
		fmt.Println(resp.GetTokenId())
		fmt.Println(resp.GetMaxTransferableValue())
		assert.NoError(t, err)
	})
}
