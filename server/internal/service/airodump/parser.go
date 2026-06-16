package airodump

import (
	"encoding/csv"
	"io"
	"strconv"
	"strings"
	"time"
)

// ParseCSVOutput parses airodump-ng CSV output (--output-format csv).
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

		// Detect header
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
			// Handle hidden SSID
			if net.SSID == "" || net.SSID == " " {
				net.Hidden = true
			}
			// Determine band from channel
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

// ParseHandshakeFile checks for handshake capture in .cap file.
func ParseHandshakeFile(capFile string) (bool, error) {
	// Simplified check - real implementation would use pyrit or aircrack-ng
	// to verify handshake
	return false, nil
}

// ParsePMKIDFile checks for PMKID capture.
func ParsePMKIDFile(pmkidFile string) (bool, error) {
	// Check if .hc22000 file contains valid PMKID entries
	return false, nil
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
	// Simple OUI lookup - can be extended
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

// Helper functions
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

// SignalBar returns color and label based on signal strength.
func SignalBar(signal int) (color string, label string) {
	if signal >= -55 {
		return "#10b981", "Excellent"
	} else if signal >= -72 {
		return "#f59e0b", "Good"
	}
	return "#ef4444", "Weak"
}

// ReassociateClients associates clients with networks (based on probe requests).
func ReassociateClients(networks []Network, clients []Client) []Network {
	// Build client map by BSSID probes
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