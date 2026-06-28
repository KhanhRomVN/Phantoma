package tools

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// Network represents a WiFi network detected by airodump-ng.
type Network struct {
	BSSID             string    `json:"bssid"`
	SSID              string    `json:"ssid"`
	Channel           int       `json:"channel"`
	Band              string    `json:"band"`
	Signal            int       `json:"signal"`
	Noise             int       `json:"noise"`
	Beacons           int       `json:"beacons"`
	Data              int       `json:"data"`
	Encryption        string    `json:"encryption"`
	Cipher            string    `json:"cipher"`
	Authentication    string    `json:"authentication"`
	HandshakeCaptured bool      `json:"handshake_captured"`
	HandshakeFile     string    `json:"handshake_file,omitempty"`
	PMKIDCaptured     bool      `json:"pmkid_captured"`
	PMKIDFile         string    `json:"pmkid_file,omitempty"`
	WPS               bool      `json:"wps"`
	WPSLocked         bool      `json:"wps_locked"`
	WPSVulnerable     bool      `json:"wps_vulnerable"`
	MFPEnabled        bool      `json:"mfp_enabled"`
	TransitionMode    bool      `json:"transition_mode"`
	FirstSeen         time.Time `json:"first_seen"`
	LastSeen          time.Time `json:"last_seen"`
	Clients           []Client  `json:"clients"`
	CrackProbability  int       `json:"crack_probability"`
	CrackedPassword   string    `json:"cracked_password,omitempty"`
	Vendor            string    `json:"vendor"`
	Hidden            bool      `json:"hidden"`
}

// Client represents a station/client connected to a network.
type Client struct {
	MAC       string    `json:"mac"`
	Vendor    string    `json:"vendor"`
	Signal    int       `json:"signal"`
	Packets   int       `json:"packets"`
	Probes    []string  `json:"probes,omitempty"`
	FirstSeen time.Time `json:"first_seen"`
	LastSeen  time.Time `json:"last_seen"`
}

// ScanResult holds the complete scan output.
type ScanResult struct {
	Networks  []Network  `json:"networks"`
	Clients   []Client   `json:"clients"`
	StartTime time.Time  `json:"start_time"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	Error     string     `json:"error,omitempty"`
}

// AirodumpService manages airodump-ng scanning operations.
type AirodumpService struct {
	executor    *wireless.CommandExecutor
	currentScan *activeScan
	mu          sync.RWMutex
}

type activeScan struct {
	ID         string
	Interface  string
	Channel    int
	Band       string
	StartTime  time.Time
	Process    *exec.Cmd
	CancelFunc context.CancelFunc
	OutputFile string
	CSVFile    string
	Networks   []Network
	Clients    []Client
	Done       chan bool
}

// NewAirodumpService creates a new airodump service.
func NewAirodumpService() *AirodumpService {
	return &AirodumpService{
		executor: wireless.NewCommandExecutor(true, 0),
	}
}

// StartScan begins airodump-ng on the specified interface and channel.
func (s *AirodumpService) StartScan(iface string, channel int, band string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.currentScan != nil {
		return "", fmt.Errorf("scan already in progress")
	}

	scanID := fmt.Sprintf("scan_%d", time.Now().UnixNano())
	tempDir := fmt.Sprintf("/tmp/airodump_%s", scanID)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	outputFile := fmt.Sprintf("%s/capture", tempDir)
	csvFile := fmt.Sprintf("%s/capture.csv", tempDir)

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx,
		"sudo", "airodump-ng",
		"--band", band,
		"-c", fmt.Sprintf("%d", channel),
		"-w", outputFile,
		"--output-format", "csv",
		iface,
	)

	if err := cmd.Start(); err != nil {
		cancel()
		return "", fmt.Errorf("failed to start airodump-ng: %w", err)
	}

	s.currentScan = &activeScan{
		ID:         scanID,
		Interface:  iface,
		Channel:    channel,
		Band:       band,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		OutputFile: outputFile,
		CSVFile:    csvFile,
		Done:       make(chan bool),
	}

	go s.parseLoop(s.currentScan)

	return scanID, nil
}

// StopScan terminates the active scan.
func (s *AirodumpService) StopScan() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.currentScan == nil {
		return fmt.Errorf("no active scan")
	}

	s.currentScan.CancelFunc()
	<-s.currentScan.Done

	s.currentScan = nil
	return nil
}

// GetResults returns the current scan results.
func (s *AirodumpService) GetResults() (*ScanResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.currentScan == nil {
		return nil, fmt.Errorf("no active scan")
	}

	return &ScanResult{
		Networks:  s.currentScan.Networks,
		Clients:   s.currentScan.Clients,
		StartTime: s.currentScan.StartTime,
	}, nil
}

// IsScanning returns whether a scan is active.
func (s *AirodumpService) IsScanning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentScan != nil
}

// parseLoop continuously reads and parses airodump-ng CSV output.
func (s *AirodumpService) parseLoop(scan *activeScan) {
	defer close(scan.Done)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	done := make(chan error)
	go func() {
		done <- scan.Process.Wait()
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			s.parseCSV(scan)
		}
	}
}

// parseCSV reads the CSV file and updates networks and clients.
func (s *AirodumpService) parseCSV(scan *activeScan) {
	data, err := os.ReadFile(scan.CSVFile)
	if err != nil {
		return
	}

	networks, err := ParseCSVOutput(string(data))
	if err != nil {
		return
	}

	clients, err := ParseStationCSV(string(data))
	if err != nil {
		return
	}

	for i := range networks {
		networks[i].Vendor = VendorLookup(networks[i].BSSID)
		networks[i].CrackProbability = CalculateCrackProbability(networks[i])
	}
	for i := range clients {
		clients[i].Vendor = VendorLookup(clients[i].MAC)
	}

	networks = ReassociateClients(networks, clients)

	scan.Networks = networks
	scan.Clients = clients
}

// ParseCSVOutput parses airodump-ng CSV output.
func ParseCSVOutput(csvData string) ([]Network, error) {
	reader := csv.NewReader(strings.NewReader(csvData))
	reader.Comma = ','
	reader.FieldsPerRecord = -1

	var networks []Network
	readingNetworks := false

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		if len(record) == 0 {
			continue
		}

		if len(record) > 0 && record[0] == "BSSID" {
			readingNetworks = true
			continue
		}

		if readingNetworks && len(record) >= 15 && strings.Contains(record[0], ":") {
			net := Network{
				BSSID:      record[0],
				FirstSeen:  parseTime(record[1]),
				LastSeen:   parseTime(record[2]),
				Channel:    parseInt(record[3]),
				Signal:     parseInt(record[8]),
				Beacons:    parseInt(record[5]),
				Data:       parseInt(record[6]),
				Encryption: record[11],
				Cipher:     record[12],
				SSID:       record[13],
			}
			if net.SSID == "" || net.SSID == " " {
				net.Hidden = true
			}
			if net.Channel <= 14 {
				net.Band = "2.4"
			} else {
				net.Band = "5"
			}
			networks = append(networks, net)
		}
	}
	return networks, nil
}

// ParseStationCSV parses station/clients from airodump-ng CSV.
func ParseStationCSV(csvData string) ([]Client, error) {
	reader := csv.NewReader(strings.NewReader(csvData))
	var clients []Client
	readingStations := false

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		if len(record) == 0 {
			continue
		}
		if len(record) > 0 && record[0] == "Station MAC" {
			readingStations = true
			continue
		}
		if readingStations && len(record) >= 7 && strings.Contains(record[0], ":") {
			client := Client{
				MAC:       record[0],
				FirstSeen: parseTime(record[1]),
				LastSeen:  parseTime(record[2]),
				Signal:    parseInt(record[3]),
				Packets:   parseInt(record[4]),
				Probes:    parseProbes(record[5]),
			}
			clients = append(clients, client)
		}
	}
	return clients, nil
}

// CalculateCrackProbability estimates crackability based on encryption and signal.
func CalculateCrackProbability(net Network) int {
	switch {
	case net.Encryption == "WEP":
		return 95
	case net.Encryption == "WPA" && net.HandshakeCaptured:
		return 70
	case net.Encryption == "WPA2" && net.HandshakeCaptured:
		return 60
	case net.Encryption == "WPA3":
		return 20
	case net.WPSVulnerable:
		return 85
	default:
		return 0
	}
}

// VendorLookup returns manufacturer from MAC OUI.
func VendorLookup(mac string) string {
	oui := strings.ToUpper(mac[:8])
	ouiMap := map[string]string{
		"00:11:22": "Cisco",
		"00:14:BF": "Intel",
		"00:1A:6B": "Apple",
		"00:1F:F3": "TP-Link",
		"00:25:9C": "Aruba",
		"00:26:86": "Netgear",
		"00:50:F2": "Microsoft",
		"04:F0:21": "Dell",
		"08:00:27": "Oracle",
		"0C:DD:24": "Samsung",
	}
	if vendor, ok := ouiMap[oui]; ok {
		return vendor
	}
	return "Unknown"
}

// SignalBar returns color and label based on signal strength.
func SignalBar(signal int) (color string, label string) {
	if signal >= -55 {
		return "#10b981", "Excellent"
	} else if signal >= -72 {
		return "#f59e0b", "Good"
	}
	return "#ef4444", "Weak"
}

// ReassociateClients associates clients with networks.
func ReassociateClients(networks []Network, clients []Client) []Network {
	for i, net := range networks {
		for _, client := range clients {
			for _, probe := range client.Probes {
				if probe == net.SSID {
					networks[i].Clients = append(networks[i].Clients, client)
					break
				}
			}
		}
	}
	return networks
}

func parseTime(s string) time.Time {
	t, _ := time.Parse("2006-01-02 15:04:05", s)
	return t
}

func parseInt(s string) int {
	s = strings.TrimSpace(s)
	i, _ := strconv.Atoi(s)
	return i
}

func parseProbes(s string) []string {
	if s == "" {
		return nil
	}
	probes := strings.Split(s, ", ")
	for i, p := range probes {
		probes[i] = strings.Trim(p, " ")
	}
	return probes
}