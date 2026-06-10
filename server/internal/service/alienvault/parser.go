package alienvault

import (
	"encoding/json"
	"fmt"
)

// ParseIndicatorResponse parses raw JSON response from OTX API.
func ParseIndicatorResponse(jsonData []byte) (*IndicatorResponse, error) {
	var rawResp map[string]interface{}
	if err := json.Unmarshal(jsonData, &rawResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Extract basic fields
	indicatorType, _ := rawResp["indicator_type"].(string)
	if indicatorType == "" {
		indicatorType, _ = rawResp["type"].(string)
	}
	value, _ := rawResp["indicator"].(string)
	if value == "" {
		value, _ = rawResp["value"].(string)
	}

	// Extract reputation
	reputation := "unknown"
	if rep, ok := rawResp["reputation"].(string); ok {
		reputation = rep
	}

	// Extract pulses
	pulses := []PulseInfo{}
	if pulseInfo, ok := rawResp["pulse_info"].(map[string]interface{}); ok {
		if pulsesRaw, ok := pulseInfo["pulses"].([]interface{}); ok {
			for _, p := range pulsesRaw {
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

	// Calculate activity count
	activityCount := len(pulses)
	if related, ok := rawResp["related_indicators"].(map[string]interface{}); ok {
		if relatedList, ok := related["related"].([]interface{}); ok {
			activityCount += len(relatedList)
		}
	}

	return &IndicatorResponse{
		Type:              indicatorType,
		Value:             value,
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
	}, nil
}