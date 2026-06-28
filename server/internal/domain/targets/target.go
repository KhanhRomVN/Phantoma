package targets

// Target đại diện cho một target trong hệ thống.
type Target struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	URL            *string `json:"url"`
	Icon           *string `json:"icon"`
	Platform       *string `json:"platform"`
	LastUsedAt     *int64  `json:"last_used_at"`
	ExecutablePath *string `json:"executable_path"`
	StartupArgs    *string `json:"startup_args"`
	Environment    *string `json:"environment"`
	CreatedAt      int64   `json:"created_at"`
	UpdatedAt      int64   `json:"updated_at"`
}

// CreateTargetInput là input để tạo target mới.
type CreateTargetInput struct {
	ID             *string `json:"id,omitempty"`
	Title          string  `json:"title"`
	URL            *string `json:"url,omitempty"`
	Icon           *string `json:"icon,omitempty"`
	Platform       *string `json:"platform,omitempty"`
	ExecutablePath *string `json:"executable_path,omitempty"`
	StartupArgs    *string `json:"startup_args,omitempty"`
	Environment    *string `json:"environment,omitempty"`
}

// UpdateTargetInput là input để cập nhật target.
type UpdateTargetInput struct {
	Title          *string `json:"title,omitempty"`
	URL            *string `json:"url,omitempty"`
	Icon           *string `json:"icon,omitempty"`
	Platform       *string `json:"platform,omitempty"`
	LastUsedAt     *int64  `json:"last_used_at,omitempty"`
	ExecutablePath *string `json:"executable_path,omitempty"`
	StartupArgs    *string `json:"startup_args,omitempty"`
	Environment    *string `json:"environment,omitempty"`
}