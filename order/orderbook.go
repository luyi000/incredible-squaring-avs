package order

import (
	"github.com/Layr-Labs/incredible-squaring-avs/db"
	"time"
)

type MakerOrder struct {
	OrderId         string    `json:"order_id" gorm:"type:varchar(100);not null"`
	CoboId          string    `json:"cobo_id,omitempty"` // unique coboId
	SourceChain     string    `json:"source_chain" gorm:"type:varchar(100);not null"`
	MakerSourceAddr string    `json:"maker_source_addr" gorm:"type:varchar(100);not null"`
	TargetChain     string    `json:"target_chain" gorm:"type:varchar(100);not null"`
	MakerTargetAddr string    `json:"maker_target_addr" gorm:"type:varchar(100);not null"`
	Token           string    `gorm:"type:varchar(100);not null"`
	Price           float64   `gorm:"type:decimal(20,8);not null"`
	MakerTxHash     string    `json:"maker_tx_hash" gorm:"type:varchar(100);not null"`
	Amount          float64   `gorm:"type:decimal(20,8);not null"`
	PendingFulfill  float64   `gorm:"type:decimal(20,8);not null"`
	Fulfilled       float64   `gorm:"type:decimal(20,8);not null"`
	ExpiredAt       time.Time `json:"expired_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (MakerOrder) TableName() string {
	return db.MakerOrderTable
}

type TakerOrder struct {
	OrderId         string    `json:"order_id" gorm:"type:varchar(100);not null"`
	TakerTxId       string    `json:"taker_tx_id" gorm:"type:varchar(100);not null"`
	CoboId          string    `json:"cobo_id,omitempty"` // unique coboId
	TakerSourceAddr string    `json:"taker_source_addr" gorm:"type:varchar(100);not null"`
	TakerTargetAddr string    `json:"taker_target_addr" gorm:"type:varchar(100);not null"`
	Token           string    `gorm:"type:varchar(100);not null"`
	TakerTxHash     string    `json:"taker_tx_hash" gorm:"type:varchar(100);not null"`
	Amount          float64   `gorm:"type:decimal(20,8);not null"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Status          string    // PENDING, FULFILLED
}

func (TakerOrder) TableName() string {
	return db.TakerOrderTable
}
