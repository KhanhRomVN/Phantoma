package airodump

import "time"

// Network represents a WiFi network detected by airodump-ng.
type Network struct {
	BSSID              string    `json:"bssid"`
	SSID               string    `json:"ssid"`
	Channel            int       `json:"channel"`
	Band               string    `json:"band"` // 2.4, 5, 6
	Signal             int       `json:"signal"` // dBm
	Noise              int       `json:"noise"`
	Beacons            int       `json:"beacons"`
	Data               int       `json:"data"`
	Encryption         string    `json:"encryption"` // WPA2, WPA3, WEP, OPEN
	Cipher             string    `json:"cipher"`
	Authentication     string    `json:"authentication"`
	HandshakeCaptured  bool      `json:"handshake_captured"`
	HandshakeFile      string    `json:"handshake_file,omitempty"`
	PMKIDCaptured      bool      `json:"pmkid_captured"`
	PMKIDFile          string    `json:"pmkid_file,omitempty"`
	WPS                bool      `json:"wps"`
	WPSLocked          bool      `json:"wps_locked"`
	WPSVulnerable      bool      `json:"wps_vulnerable"`
	MFPEnabled         bool      `json:"mfp_enabled"`
	TransitionMode     bool      `json:"transition_mode"` // WPA2/WPA3 mixed
	FirstSeen          time.Time `json:"first_seen"`
	LastSeen           time.Time `json:"last_seen"`
	Clients            []Client  `json:"clients"`
	CrackProbability   int       `json:"crack_probability"` // 0-100
	CrackedPassword    string    `json:"cracked_password,omitempty"`
	Vendor             string    `json:"vendor"`
	Hidden             bool      `json:"hidden"`
}

// Client represents a station/client connected to a network.
type Client struct {
	MAC       string    `json:"mac"`
	Vendor    string    `json:"vendor"`
	Signal    int       `json:"signal"`
	Packets   int       `json:"packets"`
	Probes    []string  `json:"probes,omitempty"`
	FirstSeen time.Time `json:"first_seen"`
	LastSeen  time.Time `json:"last_seen"`
}

// ScanResult holds the complete scan output.
type ScanResult struct {
	Networks  []Network  `json:"networks"`
	Clients   []Client   `json:"clients"`
	StartTime time.Time  `json:"start_time"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	Error     string     `json:"error,omitempty"`
}