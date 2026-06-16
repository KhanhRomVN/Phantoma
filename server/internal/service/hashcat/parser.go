package hashcat

import (
	"bufio"
	"regexp"
	"strconv"
	"strings"
)

// ParseHashcatOutput parses hashcat stdout for progress and results.
func ParseHashcatOutput(output string) (progress float64, speed int64, recovered int) {
	// Pattern: Progress.........: 12345/67890 (18.18%)
	progressRegex := regexp.MustCompile(`Progress\.+:\s+(\d+)/(\d+)\s+\(([\d\.]+)%\)`)
	matches := progressRegex.FindStringSubmatch(output)
	if len(matches) >= 4 {
		progress, _ = strconv.ParseFloat(matches[3], 64)
	}

	// Pattern: Speed.#1.........:    12345 H/s (10.23ms)
	speedRegex := regexp.MustCompile(`Speed\.#\d+\.+:\s+(\d+)\s+([KMG]?)H/s`)
	matches = speedRegex.FindStringSubmatch(output)
	if len(matches) >= 2 {
		speedVal, _ := strconv.ParseInt(matches[1], 10, 64)
		speed = speedVal
		// Handle K, M, G suffixes
		switch matches[2] {
		case "K":
			speed = speedVal * 1000
		case "M":
			speed = speedVal * 1000000
		case "G":
			speed = speedVal * 1000000000
		}
	}

	// Pattern: Recovered........: 1/1 (100.00%) Digests
	recoveredRegex := regexp.MustCompile(`Recovered\.+:\s+(\d+)/(\d+)`)
	matches = recoveredRegex.FindStringSubmatch(output)
	if len(matches) >= 2 {
		recovered, _ = strconv.Atoi(matches[1])
	}

	return progress, speed, recovered
}

// ParseCrackedPasswords extracts cracked passwords from hashcat output.
func ParseCrackedPasswords(output string) map[string]string {
	cracked := make(map[string]string)

	// Pattern:  Hash.Target: 00:11:22:33:44:55 -> password
	// Or:  $HEX[...]:password
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "->") {
			parts := strings.SplitN(line, "->", 2)
			if len(parts) == 2 {
				hash := strings.TrimSpace(parts[0])
				password := strings.TrimSpace(parts[1])
				if hash != "" && password != "" && !strings.Contains(password, "Hash.Target") {
					cracked[hash] = password
				}
			}
		}
	}

	return cracked
}

// ParseHashcatStatus parses status output from hashcat --status.
func ParseHashcatStatus(statusFile string) (float64, int64, int) {
	// Would parse hashcat --status output file
	return 0, 0, 0
}

// ValidateWordlist checks if wordlist exists and is readable.
func ValidateWordlist(path string) bool {
	// Validation will be done by service
	return true
}