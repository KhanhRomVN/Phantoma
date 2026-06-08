package alienvault

import (
	"encoding/json"
	"strings"

	"github.com/phantoma/server/internal/domain"
)

// ParseOTXOutput converts OTX API JSON output into VulnEntry slice.
// The output should be a JSON string from the OTX indicator endpoint.
func ParseOTXOutput(output, target string) []domain.VulnEntry {
	entries := make([]domain.VulnEntry, 0)

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(output), &data); err != nil {
		return entries
	}

	// Parse general section (pulse count, etc.)
	general := getMap(data, "general")
	if pulseCount := getFloat(general, "pulse_info", "count"); pulseCount > 0 {
		entries = append(entries, domain.VulnEntry{
			ID:          "OTX-PULSE-COUNT",
			Name:        "OTX Pulse Count",
			Severity:    pulseCountSeverity(pulseCount),
			URL:         target,
			Description: "Indicator appears in " + formatFloat(pulseCount) + " OTX pulses",
			Tool:        "alienvault_otx",
		})
	}

	// Parse pulses
	pulseInfo := getMap(general, "pulse_info")
	pulses := getSlice(pulseInfo, "pulses")
	for _, pulse := range pulses {
		p, ok := pulse.(map[string]interface{})
		if !ok {
			continue
		}
		id := getString(p, "id")
		name := getString(p, "name")
		desc := getString(p, "description")
		tags := getStringSlice(p, "tags")

		severity := "info"
		// Determine severity from tags and content
		for _, tag := range tags {
			tagLower := strings.ToLower(tag)
			if strings.Contains(tagLower, "malware") || strings.Contains(tagLower, "apt") || strings.Contains(tagLower, "ransomware") {
				severity = "critical"
				break
			}
			if strings.Contains(tagLower, "phishing") || strings.Contains(tagLower, "exploit") || strings.Contains(tagLower, "c2") {
				severity = "high"
				break
			}
			if strings.Contains(tagLower, "suspicious") || strings.Contains(tagLower, "scanning") {
				severity = "medium"
				break
			}
		}

		entry := domain.VulnEntry{
			ID:          id,
			Name:        name,
			Severity:    severity,
			URL:         target,
			Description: desc,
			Tool:        "alienvault_otx",
		}
		entries = append(entries, entry)
	}

	// Parse reputation data
	reputation := getMap(data, "reputation")
	if repScore := getFloat(reputation, ""); true {
		_ = repScore
	}

	// Parse geo data (if IP)
	if geo, ok := data["geo"].(map[string]interface{}); ok {
		country := getString(geo, "country_name")
		city := getString(geo, "city")
		if country != "" {
			desc := "Location: " + city + ", " + country
			entries = append(entries, domain.VulnEntry{
				ID:          "OTX-GEO",
				Name:        "Geolocation Information",
				Severity:    "info",
				URL:         target,
				Description: desc,
				Tool:        "alienvault_otx",
			})
		}
	}

	// Parse malware samples
	if malware, ok := data["malware"].(map[string]interface{}); ok {
		samples := getSlice(malware, "data")
		for _, sample := range samples {
			s, ok := sample.(map[string]interface{})
			if !ok {
				continue
			}
			hash := getString(s, "hash")
			if hash != "" {
				entries = append(entries, domain.VulnEntry{
					ID:          "OTX-MALWARE-" + hash,
					Name:        "Malware Sample Detected",
					Severity:    "critical",
					URL:         target,
					Description: "Malware hash: " + hash,
					Tool:        "alienvault_otx",
				})
			}
		}
	}

	// Parse passive DNS
	if passiveDNS, ok := data["passive_dns"].(map[string]interface{}); ok {
		records := getSlice(passiveDNS, "passive_dns")
		count := len(records)
		if count > 0 {
			entries = append(entries, domain.VulnEntry{
				ID:          "OTX-PASSIVE-DNS",
				Name:        "Passive DNS Records",
				Severity:    "info",
				URL:         target,
				Description: formatInt(count) + " passive DNS records found",
				Tool:        "alienvault_otx",
			})
		}
	}

	// Parse URL list (associated URLs)
	if urlList, ok := data["url_list"].(map[string]interface{}); ok {
		urls := getSlice(urlList, "url_list")
		maliciousCount := 0
		for _, u := range urls {
			um, ok := u.(map[string]interface{})
			if !ok {
				continue
			}
			if result, _ := um["result"].(map[string]interface{}); result != nil {
				if urlWorker, _ := result["urlworker"].(map[string]interface{}); urlWorker != nil {
					if httpCode := getFloat(urlWorker, "http_code"); httpCode >= 200 && httpCode < 300 {
						continue
					}
				}
			}
			maliciousCount++
		}
		if maliciousCount > 0 {
			entries = append(entries, domain.VulnEntry{
				ID:          "OTX-URL-LIST",
				Name:        "Associated URLs Found",
				Severity:    urlListSeverity(maliciousCount),
				URL:         target,
				Description: formatInt(len(urls)) + " associated URLs (" + formatInt(maliciousCount) + " potentially malicious)",
				Tool:        "alienvault_otx",
			})
		}
	}

	return entries
}

// Helper functions for safe type assertions

func getMap(m map[string]interface{}, key string) map[string]interface{} {
	if m == nil {
		return nil
	}
	if v, ok := m[key].(map[string]interface{}); ok {
		return v
	}
	return nil
}

func getSlice(m map[string]interface{}, key string) []interface{} {
	if m == nil {
		return nil
	}
	if v, ok := m[key].([]interface{}); ok {
		return v
	}
	return nil
}

func getString(m map[string]interface{}, key string) string {
	if m == nil {
		return ""
	}
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getFloat(m map[string]interface{}, keys ...string) float64 {
	if m == nil {
		return 0
	}
	for i, key := range keys {
		if i == len(keys)-1 {
			if v, ok := m[key].(float64); ok {
				return v
			}
			return 0
		}
		m = getMap(m, key)
		if m == nil {
			return 0
		}
	}
	return 0
}

func getStringSlice(m map[string]interface{}, key string) []string {
	raw := getSlice(m, key)
	var result []string
	for _, item := range raw {
		if s, ok := item.(string); ok {
			result = append(result, s)
		}
	}
	return result
}

func formatFloat(f float64) string {
	if f == float64(int(f)) {
		return formatInt(int(f))
	}
	// Use json marshal for safe float formatting
	b, _ := json.Marshal(f)
	return string(b)
}

func formatInt(i int) string {
	b, _ := json.Marshal(i)
	return string(b)
}

// Severity helpers

func pulseCountSeverity(count float64) string {
	switch {
	case count >= 50:
		return "critical"
	case count >= 20:
		return "high"
	case count >= 5:
		return "medium"
	case count >= 1:
		return "low"
	default:
		return "info"
	}
}

func urlListSeverity(count int) string {
	switch {
	case count >= 10:
		return "critical"
	case count >= 5:
		return "high"
	case count >= 3:
		return "medium"
	case count >= 1:
		return "low"
	default:
		return "info"
	}
}