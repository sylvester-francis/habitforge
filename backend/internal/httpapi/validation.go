package httpapi

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

const maxNameLen = 80

func validateName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if n := utf8.RuneCountInString(name); n < 1 || n > maxNameLen {
		return "", fmt.Errorf("name must be 1 to %d characters", maxNameLen)
	}
	return name, nil
}
