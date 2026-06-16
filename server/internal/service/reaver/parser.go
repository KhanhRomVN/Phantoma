package reaver

import (
	"regexp"
	"strconv"
	"strings"
)

// ParseReaverOutput parses reaver stdout for progress and results.
func ParseReaverOutput(output string) (pinAttempts int, progress float64, pinFound, wpaKey string) {
	// Pattern: "[+] Trying pin 12345670"
	pinRegex := regexp.MustCompile(`Trying pin (\d+)`)
	matches := pinRegex.FindAllStringSubmatch(output, -1)
	pinAttempts = len(matches)

	// Pattern: "[+] 99.99% complete @ 2026-01-01 00:00:00"
	progressRegex := regexp.MustCompile(`(\d+\.?\d*)% complete`)
	if match := progressRegex.FindStringSubmatch(output); len(match) >= 2 {
		progress, _ = strconv.ParseFloat(match[1], 64)
	}

	// Pattern: "[+] PIN found: 12345670"
	pinFoundRegex := regexp.MustCompile(`PIN found: (\d+)`)
	if match := pinFoundRegex.FindStringSubmatch(output); len(match) >= 2 {
		pinFound = match[1]
	}

	// Pattern: "[+] WPA PSK: mypassword"
	wpaRegex := regexp.MustCompile(`WPA PSK: (.+)`)
	if match := wpaRegex.FindStringSubmatch(output); len(match) >= 2 {
		wpaKey = strings.TrimSpace(match[1])
	}

	return pinAttempts, progress, pinFound, wpaKey
}

// ParseBullyOutput parses bully stdout (alternative to reaver).
func ParseBullyOutput(output string) (pinAttempts int, pinFound, wpaKey string) {
	// Pattern: "[+] PIN: 12345670"
	pinRegex := regexp.MustCompile(`PIN: (\d+)`)
	if match := pinRegex.FindStringSubmatch(output); len(match) >= 2 {
		pinFound = match[1]
		pinAttempts = 1
	}

	// Pattern: "[+] WPA PSK: mypassword"
	wpaRegex := regexp.MustCompile(`WPA PSK: (.+)`)
	if match := wpaRegex.FindStringSubmatch(output); len(match) >= 2 {
		wpaKey = strings.TrimSpace(match[1])
	}

	return pinAttempts, pinFound, wpaKey
}

// ValidateBSSID checks BSSID format.
func ValidateBSSID(bssid string) bool {
	macRegex := regexp.MustCompile(`^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$`)
	return macRegex.MatchString(bssid)
}

// ValidatePIN checks if PIN is valid (8 digits).
func ValidatePIN(pin string) bool {
	if len(pin) != 8 {
		return false
	}
	for _, c := range pin {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}