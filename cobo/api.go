package cobo

import (
	"context"
	coboWaas2 "github.com/CoboGlobal/cobo-waas2-go-sdk/cobo_waas2"
	"github.com/CoboGlobal/cobo-waas2-go-sdk/cobo_waas2/crypto"
	sdklogging "github.com/Layr-Labs/eigensdk-go/logging"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Cobo struct {
	privateKey    string
	env           int
	configuration *coboWaas2.Configuration
	apiClient     *coboWaas2.APIClient
	logger        sdklogging.Logger
}

func NewCobo(privateKey string, env int) *Cobo {
	configuration := coboWaas2.NewConfiguration()
	apiClient := coboWaas2.NewAPIClient(configuration)
	logger, _ := sdklogging.NewZapLogger(sdklogging.Development)
	return &Cobo{
		privateKey:    privateKey,
		env:           env,
		configuration: configuration,
		apiClient:     apiClient,
		logger:        logger,
	}
}

func (c Cobo) initContext() context.Context {
	ctx := context.Background()
	ctx = context.WithValue(ctx, coboWaas2.ContextEnv, c.env)
	ctx = context.WithValue(ctx, coboWaas2.ContextPortalSigner, crypto.Ed25519Signer{
		Secret: c.privateKey,
	})
	return ctx
}

func (c Cobo) ListSupportedChains() (*coboWaas2.ListSupportedChains200Response, error) {
	// Specify the wallet type as Custodial Wallet.
	walletType := coboWaas2.WalletType("Custodial")

	// Specify the wallet sub-type as Asset Wallet.
	walletSubtype := coboWaas2.WalletSubtype("Asset")

	// Use pagination parameters if needed
	limit := int32(10)
	before := ""
	after := ""

	ctx := c.initContext()
	// Call the List supported chains operation.
	req := c.apiClient.WalletsAPI.ListSupportedChains(ctx).WalletType(walletType).WalletSubtype(walletSubtype)
	if limit > 0 {
		req = req.Limit(limit)
	}
	if before != "" {
		req = req.Before(before)
	}
	if after != "" {
		req = req.After(after)
	}
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `WalletsAPI.ListSupportedChains`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (c Cobo) ListAllTransactions() (*coboWaas2.ListTransactions200Response, error) {
	ctx := c.initContext()
	req := c.apiClient.TransactionsAPI.ListTransactions(ctx)
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `TransactionsAPI.ListTransactions`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (c Cobo) FindTransaction(hash string, chainId string) (*coboWaas2.ListTransactions200Response, error) {
	ctx := c.initContext()
	req := c.apiClient.TransactionsAPI.ListTransactions(ctx).TransactionHashes(hash).ChainIds(chainId)
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `TransactionsAPI.ListTransactions`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (c Cobo) TransferOutFromCustodial(walletId string, tokenId string, amount string, toAddr string, description string) (*coboWaas2.CreateTransferTransaction201Response, error) {
	ctx := c.initContext()
	req := c.apiClient.TransactionsAPI.CreateTransferTransaction(ctx).TransferParams(coboWaas2.TransferParams{
		RequestId: uuid.New().String(),
		Source: coboWaas2.TransferSource{
			CustodialTransferSource: &coboWaas2.CustodialTransferSource{
				SourceType: coboWaas2.WALLETSUBTYPE_ASSET,
				WalletId:   walletId,
			},
		},
		TokenId: tokenId,
		Destination: coboWaas2.TransferDestination{
			AddressTransferDestination: &coboWaas2.AddressTransferDestination{
				DestinationType: coboWaas2.TRANSFERDESTINATIONTYPE_ADDRESS,
				AccountOutput: &coboWaas2.AddressTransferDestinationAccountOutput{
					Amount:  amount,
					Address: toAddr,
				},
			},
		},
		Description: &description,
	})
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `TransactionsAPI.CreateTransferTransaction`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (c Cobo) ListTokenBalances(walletId string) (*coboWaas2.ListTokenBalancesForAddress200Response, error) {
	ctx := c.initContext()
	req := c.apiClient.WalletsAPI.ListTokenBalancesForWallet(ctx, walletId)
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `WalletsAPI.ListTokenBalancesForWallet`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (c Cobo) ListWalletAddrs(walletId string) (*coboWaas2.ListAddresses200Response, error) {
	ctx := c.initContext()
	req := c.apiClient.WalletsAPI.ListAddresses(ctx, walletId)
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `WalletsAPI.ListAddresses`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (c Cobo) CreateWalletAddr(walletId string, chainId string) ([]coboWaas2.AddressInfo, error) {
	ctx := c.initContext()
	req := c.apiClient.WalletsAPI.CreateAddress(ctx, walletId).CreateAddressRequest(coboWaas2.CreateAddressRequest{
		ChainId: chainId,
		Count:   1,
	})
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `WalletsAPI.CreateAddress`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (c Cobo) GetMaxTransferableValue(walletId string, tokenId string, feeRate string, fromAddr string, toAddr string) (*coboWaas2.MaxTransferableValue, error) {
	ctx := c.initContext()
	req := c.apiClient.WalletsAPI.GetMaxTransferableValue(ctx, walletId).TokenId(tokenId).FeeRate(feeRate).FromAddress(fromAddr).ToAddress(toAddr)
	resp, _, err := req.Execute()
	if err != nil {
		c.logger.Error("Error when calling `WalletsAPI.GetMaxTransferableValue`", zap.Error(err))
		return nil, err
	}
	return resp, nil
}
