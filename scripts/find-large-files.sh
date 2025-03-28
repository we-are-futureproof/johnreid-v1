#!/bin/bash

#############################################################
# find-large-files.sh
# 
# Purpose: Find code files with more than a specified number of lines
# in typical JavaScript/TypeScript/React projects.
#
# Usage: ./find-large-files.sh [min_lines]
#   - min_lines: Optional parameter to set minimum line count
#                (defaults to 200 if not specified)
#############################################################

# Set minimum lines threshold - use first argument if provided, otherwise default to 200
MIN_LINES=${1:-200}

echo "Finding code files with more than $MIN_LINES lines..."
echo

# Use inclusion patterns for common code files in modern JS/TS/React projects including scripts
find . \
  -type f \( \
    -name "*.js" -o \
    -name "*.jsx" -o \
    -name "*.ts" -o \
    -name "*.tsx" -o \
    -name "*.vue" -o \
    -name "*.svelte" -o \
    -name "*.astro" -o \
    -name "*.css" -o \
    -name "*.scss" -o \
    -name "*.html" -o \
    -name "*.md" -o \
    -name "*.json" -o \
    -name "*.yml" -o \
    -name "*.yaml" -o \
    -name "*.toml" -o \
    -name "*.sql" -o \
    -name "*.sh" -o \
    -name "*.bash" -o \
    -name "*.py" -o \
    -name "*.rb" \
  \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/.cache/*" \
  -not -name "*.min.*" \
  -not -name "*.lock" \
  -not -name "*lock.json" \
  -not -name "*lock.yaml" \
  -print0 | \
  while IFS= read -r -d '' file; do
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    if [ "$lines" -gt "$MIN_LINES" ]; then
      printf "%-6s | %s\n" "$lines" "$file"
    fi
  done | sort -rn

echo "Done!"




# TODO: Add more file types to the list of inclusion patterns











































# TODO: Add more file types to the list of inclusion patterns























# TODO: Add more file types to the list of inclusion patterns















































# TODO: Add more file types to the list of inclusion patterns






















# TODO: Add more file types to the list of inclusion patterns