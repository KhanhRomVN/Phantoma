package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/database"
	"github.com/phantoma/server/internal/routes"
	"github.com/phantoma/server/internal/startup"
	"github.com/phantoma/server/pkg/logger"
)

func main() {
	// ── Load config ──────────────────────────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", logger.F("error", err))
		os.Exit(1)
	}

	// ── Log level ─────────────────────────────────────────────────────────────
	if cfg.IsDevelopment() {
		logger.SetLevel(logger.LevelDebug)
	} else {
		logger.SetLevel(logger.LevelInfo)
	}

	// ── Banner ────────────────────────────────────────────────────────────────
	logger.Info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	logger.Info("  Phantoma Server",
		logger.F("port", cfg.Port),
		logger.F("env", cfg.Env),
	)
	logger.Info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// ── Database: connect & migrate ──────────────────────────────────────────
	if err := database.Init(cfg.DBPath); err != nil {
		logger.Error("failed to initialize database", logger.F("error", err))
		os.Exit(1)
	}
	defer database.Close()
	logger.Info("database initialized and migrated successfully")

	// Kiểm tra connection thực tế
	if database.DB == nil {
		logger.Error("database connection is nil after Init")
		os.Exit(1)
	}
	if err := database.DB.Ping(); err != nil {
		logger.Error("database ping failed - connection is not alive", logger.F("error", err))
		os.Exit(1)
	}
	logger.Info("database ping successful")

	// ── Pre-flight: check Docker containers ──────────────────────────────────
	startup.CheckDependencies(cfg)

	// ── HTTP server ───────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      routes.NewRouter(cfg),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 10 * time.Minute,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("server listening", logger.F("addr", "http://localhost:"+cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server crashed", logger.F("error", err))
			os.Exit(1)
		}
	}()

	// ── Graceful shutdown ─────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("forced shutdown", logger.F("error", err))
	}
	logger.Info("server stopped")
}