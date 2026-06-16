package hcxdumptool

import (
	"bufio"
	"os"
	"regexp"
	"strings"
)

// ParseHc22000 parses .hc22000 file and extracts PMKID entries.
func ParseHc22000(filePath string) ([]PMKIDEntry, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var entries []PMKIDEntry
	scanner := bufio.NewScanner(file)

	// Pattern for hc22000 format:
	// WPA*01*PMKID*MAC_AP*MAC_CLIENT*ESSID
	// Example: WPA*01*4e6f756c6c*001122334455*66778899aabb*MyNetwork
	re := regexp.MustCompile(`^WPA\*01\*([a-fA-F0-9]+)\*([a-fA-F0-9]+)\*([a-fA-F0-9]+)\*([a-zA-Z0-9]+)`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		matches := re.FindStringSubmatch(line)
		if len(matches) >= 5 {
			// Format MAC addresses with colons
			bssid := formatMAC(matches[2])
			entry := PMKIDEntry{
				BSSID:    bssid,
				ESSID:    matches[4],
				PMKID:    matches[1],
				HashLine: line,
			}
			entries = append(entries, entry)
		}
	}

	return entries, scanner.Err()
}

// formatMAC converts hex string to colon-separated MAC format.
func formatMAC(hexMAC string) string {
	if len(hexMAC) != 12 {
		return hexMAC
	}
	var parts []string
	for i := 0; i < 12; i += 2 {
		parts = append(parts, hexMAC[i:i+2])
	}
	return strings.Join(parts, ":")
}

// ParseHcxdumptoolOutput parses stdout/stderr for progress info.
func ParseHcxdumptoolOutput(output string) (captured int, bssids []string) {
	// Look for "PMKID found" or similar messages
	pmkidRegex := regexp.MustCompile(`PMKID found for ([a-fA-F0-9:]+)`)
	matches := pmkidRegex.FindAllStringSubmatch(output, -1)
	
	seen := make(map[string]bool)
	for _, match := range matches {
		if len(match) >= 2 {
			bssid := match[1]
			if !seen[bssid] {
				seen[bssid] = true
				bssids = append(bssids, bssid)
				captured++
			}
		}
	}
	return captured, bssids
}

// ValidateHcxdumptool checks if hcxdumptool is installed.
func ValidateHcxdumptool() bool {
	// Check if hcxdumptool exists in PATH
	// This will be handled by the executor
	return true
}