package order

import (
	"fmt"
	"github.com/Layr-Labs/incredible-squaring-avs/db"
	"github.com/stretchr/testify/require"
	"testing"
)

func SetUpTestDB(t *testing.T) {
	t.Cleanup(func() {
		// truncate tables
		db.Db().Exec("TRUNCATE TABLE maker_order")
		db.Db().Exec("TRUNCATE TABLE taker_order")
	})
	fmt.Println("connecting test db...")
	DB_DSN := "postgresql://luyi:password@127.0.0.1:5432/postgres"
	db.ConnectDB(DB_DSN, 10, 20)
}

func TestMakerOrder(t *testing.T) {
	SetUpTestDB(t)
	makerOrder := MakerOrder{
		CoboId:          "1",
		SourceChain:     "XTN",
		MakerSourceAddr: "1",
		TargetChain:     "1",
		MakerTargetAddr: "1",
		Token:           "XTN",
		Price:           1,
		MakerTxHash:     "1",
		Amount:          1,
		PendingFulfill:  0,
		Fulfilled:       0,
	}
	err := db.Db().Create(&makerOrder).Error
	if err != nil {
		fmt.Println(err)
	}
	require.Nil(t, err)

	takerOrder := TakerOrder{
		TakerTxId:       "1",
		CoboId:          "2",
		TakerSourceAddr: "1",
		TakerTargetAddr: "1",
		Token:           "ETH",
		Amount:          1,
	}
	err = db.Db().Create(&takerOrder).Error
	if err != nil {
		fmt.Println(err)
	}
	require.Nil(t, err)
}
