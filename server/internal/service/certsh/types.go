package certsh

// Certificate represents the certificate data extracted from crt.sh
type Certificate struct {
	URL                string   `json:"url"`
	Organization       string   `json:"organization"`
	CommonName         string   `json:"commonName"`
	SAN                []string `json:"san"`
	Address            string   `json:"address"`
	Issuer             string   `json:"issuer"`
	SerialNumber       string   `json:"serialNumber"`
	NotBefore          string   `json:"notBefore"`
	NotAfter           string   `json:"notAfter"`
	KeyUsage           []string `json:"keyUsage"`
	SignatureAlgorithm string   `json:"signatureAlgorithm"`
	Version            int      `json:"version"`
}