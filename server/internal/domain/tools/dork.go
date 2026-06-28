package tools

// SearchEngine represents supported search engines for dorking.
type SearchEngine string

const (
	EngineGoogle SearchEngine = "google"
	EngineShodan SearchEngine = "shodan"
	EngineBing   SearchEngine = "bing"
	EngineDuck   SearchEngine = "duck"
	EngineYahoo  SearchEngine = "yahoo"
	EngineAsk    SearchEngine = "ask"
)

// DorkQuery represents a dork search request.
type DorkQuery struct {
	Query   string       `json:"query"`             // Dork query string
	Engine  SearchEngine `json:"engine,omitempty"`  // Search engine (default: google)
	Pages   int          `json:"pages,omitempty"`   // Number of pages to scrape (default: 1)
	Proxy   string       `json:"proxy,omitempty"`   // Proxy URL
	Headers []string     `json:"headers,omitempty"` // Custom headers (format: "Key: Value")
}

// DorkResult represents a single search result from dorking.
type DorkResult struct {
	URL     string `json:"url"`
	Title   string `json:"title,omitempty"`
	Content string `json:"content,omitempty"`
}

// DorkResponse is the API response for dork search.
type DorkResponse struct {
	Query     string       `json:"query"`
	Engine    SearchEngine `json:"engine"`
	Pages     int          `json:"pages"`
	Results   []DorkResult `json:"results"`
	Total     int          `json:"total"`
	RawOutput string       `json:"raw_output,omitempty"`
}