// Package alienvault implements threat intelligence lookup using AlienVault OTX API.
package alienvault

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
)

const (
	otxAPIBase   = "https://otx.alienvault.com/api/v1"
	defaultTimeout = 30 * time.Second
)

// Service handles AlienVault OTX API calls.
type Service struct {
	httpClient *http.Client
}

func NewService() *Service {
	return &Service{
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

// ScanRequest represents an incoming lookup request.
type ScanRequest struct {
	Indicator     string `json:"indicator"`
	IndicatorType string `json:"indicatorType"`
	APIKey        string `json:"apiKey"`
}

// IndicatorResponse is the parsed response from OTX API.
type IndicatorResponse struct {
	Type              string      `json:"type"`
	Value             string      `json:"value"`
	Reputation        string      `json:"reputation"`
	ActivityCount     int         `json:"activity_count"`
	RelatedIndicators int         `json:"related_indicators"`
	GeoData           *GeoData    `json:"geo_data,omitempty"`
	MalwareFamilies   []string    `json:"malware_families"`
	Industries        []string    `json:"industries"`
	TargetCountries   []string    `json:"target_countries"`
	FirstSeen         string      `json:"first_seen"`
	LastSeen          string      `json:"last_seen"`
	Pulses            []PulseInfo `json:"pulses"`
	Whois             string      `json:"whois,omitempty"`
	DNSRecords        []DNSRecord `json:"dns_records,omitempty"`
}

type GeoData struct {
	Country     string  `json:"country"`
	CountryCode string  `json:"country_code"`
	City        string  `json:"city"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

type PulseInfo struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Created     string   `json:"created"`
	Modified    string   `json:"modified"`
	Adversary   string   `json:"adversary"`
	TLP         string   `json:"tlp"`
	Tags        []string `json:"tags"`
}

type DNSRecord struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// Lookup performs an indicator lookup against AlienVault OTX.
func (s *Service) Lookup(ctx context.Context, req ScanRequest) (*IndicatorResponse, error) {
	if req.Indicator == "" {
		return nil, domain.ErrInvalidTarget
	}
	if req.APIKey == "" {
		return nil, fmt.Errorf("API key is required")
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Map indicator type to OTX endpoint
	var endpoint string
	switch req.IndicatorType {
	case "ip":
		endpoint = fmt.Sprintf("%s/indicators/IPv4/%s/general", otxAPIBase, req.Indicator)
	case "domain":
		endpoint = fmt.Sprintf("%s/indicators/domain/%s/general", otxAPIBase, req.Indicator)
	case "hash":
		endpoint = fmt.Sprintf("%s/indicators/file/%s/general", otxAPIBase, req.Indicator)
	case "url":
		endpoint = fmt.Sprintf("%s/indicators/url/%s/general", otxAPIBase, req.Indicator)
	default:
		return nil, fmt.Errorf("unsupported indicator type: %s", req.IndicatorType)
	}

	// Create request
	httpReq, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("X-OTX-API-KEY", req.APIKey)
	httpReq.Header.Set("Accept", "application/json")

	// Execute request
	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("OTX API request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Handle error status codes
	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusUnauthorized {
			return nil, fmt.Errorf("invalid API key (status %d)", resp.StatusCode)
		}
		if resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("indicator not found in OTX database")
		}
		return nil, fmt.Errorf("OTX API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse JSON response
	var rawResp map[string]interface{}
	if err := json.Unmarshal(body, &rawResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract reputation
	reputation := "unknown"
	if rep, ok := rawResp["reputation"].(string); ok {
		reputation = rep
	}

	// Extract pulse info
	pulses := []PulseInfo{}
	if pulsesRaw, ok := rawResp["pulse_info"].(map[string]interface{}); ok {
		if pulsesList, ok := pulsesRaw["pulses"].([]interface{}); ok {
			for _, p := range pulsesList {
				if pulseMap, ok := p.(map[string]interface{}); ok {
					pulse := PulseInfo{}
					if id, ok := pulseMap["id"].(string); ok {
						pulse.ID = id
					}
					if name, ok := pulseMap["name"].(string); ok {
						pulse.Name = name
					}
					if desc, ok := pulseMap["description"].(string); ok {
						pulse.Description = desc
					}
					if created, ok := pulseMap["created"].(string); ok {
						pulse.Created = created
					}
					if modified, ok := pulseMap["modified"].(string); ok {
						pulse.Modified = modified
					}
					if adv, ok := pulseMap["adversary"].(string); ok {
						pulse.Adversary = adv
					}
					if tlp, ok := pulseMap["tlp"].(string); ok {
						pulse.TLP = tlp
					}
					if tagsRaw, ok := pulseMap["tags"].([]interface{}); ok {
						for _, tag := range tagsRaw {
							if tagStr, ok := tag.(string); ok {
								pulse.Tags = append(pulse.Tags, tagStr)
							}
						}
					}
					pulses = append(pulses, pulse)
				}
			}
		}
	}

	// Extract malware families
	malwareFamilies := []string{}
	if families, ok := rawResp["malware_families"].([]interface{}); ok {
		for _, f := range families {
			if fStr, ok := f.(string); ok {
				malwareFamilies = append(malwareFamilies, fStr)
			}
		}
	}

	// Extract industries
	industries := []string{}
	if indus, ok := rawResp["industries"].([]interface{}); ok {
		for _, i := range indus {
			if iStr, ok := i.(string); ok {
				industries = append(industries, iStr)
			}
		}
	}

	// Extract target countries
	targetCountries := []string{}
	if countries, ok := rawResp["targeted_countries"].([]interface{}); ok {
		for _, c := range countries {
			if cStr, ok := c.(string); ok {
				targetCountries = append(targetCountries, cStr)
			}
		}
	}

	// Extract geo data
	var geoData *GeoData
	if geo, ok := rawResp["geo"].(map[string]interface{}); ok {
		geoData = &GeoData{}
		if country, ok := geo["country"].(string); ok {
			geoData.Country = country
		}
		if code, ok := geo["country_code"].(string); ok {
			geoData.CountryCode = code
		}
		if city, ok := geo["city"].(string); ok {
			geoData.City = city
		}
		if lat, ok := geo["latitude"].(float64); ok {
			geoData.Latitude = lat
		}
		if lng, ok := geo["longitude"].(float64); ok {
			geoData.Longitude = lng
		}
	}

	// Get first/last seen
	firstSeen := ""
	if fs, ok := rawResp["first_seen"].(string); ok {
		firstSeen = fs
	}
	lastSeen := ""
	if ls, ok := rawResp["last_seen"].(string); ok {
		lastSeen = ls
	}

	// Calculate activity count (number of pulses + related indicators)
	activityCount := len(pulses)
	if related, ok := rawResp["related_indicators"].(map[string]interface{}); ok {
		if relatedList, ok := related["related"].([]interface{}); ok {
			activityCount += len(relatedList)
		}
	}

	result := &IndicatorResponse{
		Type:              req.IndicatorType,
		Value:             req.Indicator,
		Reputation:        reputation,
		ActivityCount:     activityCount,
		RelatedIndicators: 0,
		GeoData:           geoData,
		MalwareFamilies:   malwareFamilies,
		Industries:        industries,
		TargetCountries:   targetCountries,
		FirstSeen:         firstSeen,
		LastSeen:          lastSeen,
		Pulses:            pulses,
	}

	return result, nil
}

// FormatRawOutput formats the lookup result as readable text.
func FormatRawOutput(result *IndicatorResponse, err error) string {
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}
	if result == nil {
		return "No data found"
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("=== AlienVault OTX Indicator Report ===\n"))
	sb.WriteString(fmt.Sprintf("Type: %s\n", strings.ToUpper(result.Type)))
	sb.WriteString(fmt.Sprintf("Indicator: %s\n", result.Value))
	sb.WriteString(fmt.Sprintf("Reputation: %s\n", result.Reputation))
	sb.WriteString(fmt.Sprintf("Activity Count: %d\n", result.ActivityCount))
	sb.WriteString(fmt.Sprintf("First Seen: %s\n", result.FirstSeen))
	sb.WriteString(fmt.Sprintf("Last Seen: %s\n", result.LastSeen))

	if result.GeoData != nil {
		sb.WriteString(fmt.Sprintf("\n=== Geo Location ===\n"))
		sb.WriteString(fmt.Sprintf("Country: %s (%s)\n", result.GeoData.Country, result.GeoData.CountryCode))
		if result.GeoData.City != "" {
			sb.WriteString(fmt.Sprintf("City: %s\n", result.GeoData.City))
		}
	}

	if len(result.MalwareFamilies) > 0 {
		sb.WriteString(fmt.Sprintf("\n=== Malware Families ===\n"))
		for _, f := range result.MalwareFamilies {
			sb.WriteString(fmt.Sprintf("- %s\n", f))
		}
	}

	if len(result.Pulses) > 0 {
		sb.WriteString(fmt.Sprintf("\n=== Related Pulses (%d) ===\n", len(result.Pulses)))
		for _, p := range result.Pulses {
			sb.WriteString(fmt.Sprintf("[%s] %s\n", p.ID, p.Name))
			if p.Description != "" {
				sb.WriteString(fmt.Sprintf("  %s\n", p.Description))
			}
		}
	}

	return sb.String()
}