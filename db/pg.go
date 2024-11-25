package db

import (
	sdklogging "github.com/Layr-Labs/eigensdk-go/logging"
	"sync"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	gormlogger "gorm.io/gorm/logger"
)

var dbProvider DbProvider

type DbProvider interface {
	Db() *gorm.DB
}

// SetDbProvider sets the provider to get a gorm db connection.
func SetDbProvider(provider DbProvider) {
	dbProvider = provider
}

// Db returns a database connection.
func Db() *gorm.DB {
	return dbProvider.Db()
}

type Gorm struct {
	Driver string
	Dsn    string

	once   sync.Once
	db     *gorm.DB
	logger sdklogging.Logger
}

func ConnectDB(dsn string, idleConns int, conns int) {
	logger, _ := sdklogging.NewZapLogger(sdklogging.Development)
	g := &Gorm{
		Driver: "postgres",
		Dsn:    dsn,
		logger: logger,
	}
	g.once.Do(func() {
		g.Connect(idleConns, conns)
		SetDbProvider(g)
	})
}

// Db returns the gorm db connection.
func (g *Gorm) Db() *gorm.DB {
	if g.db == nil {
	}
	return g.db
}

// Connect creates a new gorm db connection.
func (g *Gorm) Connect(idleConns int, conns int) {
	var loggerLevel gormlogger.LogLevel
	g.logger.Info("dev mode, db logger is ON")
	loggerLevel = gormlogger.Info
	db, _ := gorm.Open(postgres.Open(g.Dsn), &gorm.Config{Logger: gormlogger.Default.LogMode(loggerLevel)})
	sqlDB, err := db.DB()
	if err != nil {
		g.logger.Errorf("postgres connection failed", zap.String("Dsn", g.Dsn), zap.Error(err))
		panic("postgres connection failed")
	}

	sqlDB.SetMaxIdleConns(idleConns)
	sqlDB.SetMaxOpenConns(conns)
	// should be less than pg_pool clientIdleLimit
	sqlDB.SetConnMaxLifetime(250 * time.Second)

	g.db = db
}

// schemas
const (
	Public = "public"
)

// tables
const (
	TakerOrderTable = Public + ".taker_order"
	MakerOrderTable = Public + ".maker_order"
)
