package tools

// GAURequest represents a request to fetch URLs using gau.
type GAURequest struct {
	Domain      string   `json:"domain"`                 // Target domain (required)
	Providers   []string `json:"providers,omitempty"`    // Specific providers: wayback, otx, commoncrawl, urlscan
	Subs        bool     `json:"subs,omitempty"`         // Include subdomains
	Verbose     bool     `json:"verbose,omitempty"`      // Verbose output
	Province    bool     `json:"province,omitempty"`     // Province mode (only first 100 results)
	JSON        bool     `json:"json,omitempty"`         // JSON output format
	Blacklist   string   `json:"blacklist,omitempty"`    // Blacklist regex pattern
	Whitelist   string   `json:"whitelist,omitempty"`    // Whitelist regex pattern
	MatchFilter string   `json:"match_filter,omitempty"` // Match filter regex
	Filter      string   `json:"filter,omitempty"`       // Filter regex
	ProvidersURL string  `json:"providers_url,omitempty"` // Custom providers URL
}

// GAUResponse represents the result of a gau scan.
type GAUResponse struct {
	Domain  string   `json:"domain"`
	URLs    []string `json:"urls"`
	Total   int      `json:"total"`
	RawOutput string `json:"raw_output,omitempty"`
}