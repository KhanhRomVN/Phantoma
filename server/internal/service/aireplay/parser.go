package aireplay

import (
	"regexp"
	"strconv"
	"strings"
)

// ParseDeauthOutput parses aireplay-ng output to count sent packets.
func ParseDeauthOutput(output string) int {
	// Pattern: "Sending DeAuth to station" or "Sent 64 packets..."
	packetCount := 0

	// Try to match "Sent X packets"
	sentRegex := regexp.MustCompile(`Sent (\d+) packets`)
	matches := sentRegex.FindStringSubmatch(output)
	if len(matches) >= 2 {
		count, _ := strconv.Atoi(matches[1])
		packetCount += count
	}

	// Also count "Sending DeAuth" lines
	deauthLines := strings.Count(output, "Sending DeAuth")
	if deauthLines > 0 {
		packetCount += deauthLines
	}

	return packetCount
}

// ValidateBSSID checks if the BSSID format is valid.
func ValidateBSSID(bssid string) bool {
	// MAC address pattern: XX:XX:XX:XX:XX:XX
	macRegex := regexp.MustCompile(`^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$`)
	return macRegex.MatchString(bssid)
}

// ValidateInterface checks if the interface name is valid.
func ValidateInterface(iface string) bool {
	// Common wireless interface patterns: wlan0mon, wlan1mon, wlan0, etc.
	return strings.HasPrefix(iface, "wlan") || strings.HasPrefix(iface, "mon")
}