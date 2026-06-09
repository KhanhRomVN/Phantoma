// Package certsh implements certificate transparency log search using crt.sh
package certsh

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"encoding/xml"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
)

const (
	defaultTimeout = 30 * time.Second
	defaultMatch   = "LIKE"
)

// Service implements certificate search via crt.sh
type Service struct {
	client  *http.Client
	proxy   string
	match   string
	baseURL string
}

// NewService creates a new crt.sh service
func NewService() *Service {
	return &Service{
		client: &http.Client{
			Timeout: defaultTimeout,
		},
		match:   defaultMatch,
		baseURL: "https://crt.sh",
	}
}

// SetProxy configures HTTP proxy for the service
func (s *Service) SetProxy(proxyURL string) error {
	if proxyURL == "" {
		return nil
	}
	proxy, err := url.Parse(proxyURL)
	if err != nil {
		return fmt.Errorf("invalid proxy URL: %w", err)
	}
	s.proxy = proxyURL
	s.client.Transport = &http.Transport{
		Proxy: http.ProxyURL(proxy),
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	return nil
}

// SetMatch sets the match type for queries (LIKE, ILIKE, =, any, FTS)
func (s *Service) SetMatch(match string) {
	s.match = match
}

// Scan implements domain.Scanner.
// Searches for historical certificates associated with the target domain/organization.
// Target can be a domain (e.g., "deepseek.com") or organization name.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	feedURL := fmt.Sprintf("%s/json?q=%s&match=%s&exclude=expired&deduplicate=Y", s.baseURL, url.QueryEscape(req.Target), s.match)
	
	// Fetch JSON data from crt.sh
	var feed *AtomFeed
	var err error
	feed, err = s.fetchFeed(ctx, feedURL)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Error:   fmt.Sprintf("Failed to fetch certificate feed: %v", err),
		}, nil
	}

	certificates := s.processFeed(feed)
	
	output, _ := json.MarshalIndent(map[string]interface{}{
		"query":        req.Target,
		"match":        s.match,
		"total":        len(certificates),
		"certificates": certificates,
	}, "", "  ")

	return domain.ScanResult{
		Success: true,
		Output:  string(output),
	}, nil
}

// LiveCertificate retrieves the currently served certificate for a domain
func (s *Service) LiveCertificate(ctx context.Context, targetDomain string) (*Certificate, error) {
	if targetDomain == "" {
		return nil, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Create a custom dialer that respects context
	dialer := &tls.Dialer{
		Config: &tls.Config{
			ServerName:         targetDomain,
			InsecureSkipVerify: true,
		},
		NetDialer: &net.Dialer{Timeout: defaultTimeout},
	}

	conn, err := dialer.DialContext(ctx, "tcp", targetDomain+":443")
	if err != nil {
		return nil, fmt.Errorf("TLS connection failed: %w", err)
	}
	defer conn.Close()

	// Type assert to get TLS connection state
	tlsConn, ok := conn.(*tls.Conn)
	if !ok {
		return nil, fmt.Errorf("failed to get TLS connection")
	}

	state := tlsConn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return nil, fmt.Errorf("no certificate presented")
	}

	return parseCertificate(state.PeerCertificates[0]), nil
}

// fetchFeed retrieves the Atom feed from crt.sh
func (s *Service) fetchFeed(ctx context.Context, feedURL string) (*AtomFeed, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", feedURL, nil)
	if err != nil {
		return nil, err
	}
	
	// Add user-agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Phantoma/1.0)")
	
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("crt.sh returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var feed AtomFeed
	decoder := xml.NewDecoder(strings.NewReader(string(body)))
	decoder.Strict = false
	if err := decoder.Decode(&feed); err != nil {
		return nil, err
	}

	return &feed, nil
}

// processFeed extracts certificate information from Atom feed entries
func (s *Service) processFeed(feed *AtomFeed) []Certificate {
	var certs []Certificate
	for _, entry := range feed.Entries {
		certPem, err := extractCertFromSummary(entry.Summary)
		if err != nil {
			continue
		}
		cert, err := parseCertFromPEM(certPem, entry.ID)
		if err != nil {
			continue
		}
		certs = append(certs, *cert)
	}
	return certs
}

// extractCertFromSummary extracts PEM certificate from HTML summary
func extractCertFromSummary(summary string) (string, error) {
	re := regexp.MustCompile(`-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----`)
	matches := re.FindStringSubmatch(summary)
	if len(matches) > 0 {
		cert := strings.ReplaceAll(matches[0], "<br>", "\n")
		return cert, nil
	}
	return "", fmt.Errorf("no certificate found")
}

// parseCertFromPEM parses PEM certificate and returns Certificate struct
func parseCertFromPEM(certPem string, entryURL string) (*Certificate, error) {
	block, _ := pem.Decode([]byte(certPem))
	if block == nil || block.Type != "CERTIFICATE" {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, err
	}

	return parseCertificate(cert), nil
}

// parseCertificate converts x509.Certificate to our Certificate struct
func parseCertificate(cert *x509.Certificate) *Certificate {
	var keyUsage []string
	if cert.KeyUsage&x509.KeyUsageDigitalSignature != 0 {
		keyUsage = append(keyUsage, "Digital Signature")
	}
	if cert.KeyUsage&x509.KeyUsageKeyEncipherment != 0 {
		keyUsage = append(keyUsage, "Key Encipherment")
	}

	address := strings.Join(filterNonEmpty([]string{
		strings.Join(cert.Subject.PostalCode, " "),
		strings.Join(cert.Subject.StreetAddress, " "),
		strings.Join(cert.Subject.Province, " "),
		strings.Join(cert.Subject.Country, " "),
	}), " ")

	return &Certificate{
		URL:                cert.Subject.CommonName,
		Organization:       strings.Join(cert.Subject.Organization, ", "),
		CommonName:         cert.Subject.CommonName,
		SAN:                cert.DNSNames,
		Address:            address,
		Issuer:             cert.Issuer.CommonName,
		SerialNumber:       cert.SerialNumber.String(),
		NotBefore:          cert.NotBefore.Format(time.RFC3339),
		NotAfter:           cert.NotAfter.Format(time.RFC3339),
		KeyUsage:           keyUsage,
		SignatureAlgorithm: cert.SignatureAlgorithm.String(),
		Version:            cert.Version,
	}
}

func filterNonEmpty(parts []string) []string {
	var result []string
	for _, part := range parts {
		if strings.TrimSpace(part) != "" {
			result = append(result, part)
		}
	}
	return result
}

// AtomFeed represents the Atom feed structure
type AtomFeed struct {
	Entries []AtomEntry `xml:"entry"`
}

// AtomEntry represents a single entry in the Atom feed
type AtomEntry struct {
	ID      string `xml:"id"`
	Summary string `xml:"summary"`
	Title   string `xml:"title"`
}