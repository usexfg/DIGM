#!/bin/bash

echo "🌊 Updating DIGM Platform to Deep, Intense Blue Color Scheme"
echo "============================================================="

# Navigate to frontend directory
cd frontend

# Update all color references to use deeper blues
echo "🔄 Updating to deep blue color palette..."

# Update digm-blue-400 to digm-deep-400 (deeper blue)
find src -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/digm-blue-400/digm-deep-400/g'

# Update digm-blue-300 to digm-deep-300
find src -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/digm-blue-300/digm-deep-300/g'

# Update digm-blue-500 to digm-deep-500
find src -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/digm-blue-500/digm-deep-500/g'

# Update digm-blue-600 to digm-deep-600
find src -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/digm-blue-600/digm-deep-600/g'

# Update digm-blue-700 to digm-deep-700
find src -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/digm-blue-700/digm-deep-700/g'

# Update digm-blue-900 to digm-deep-900
find src -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/digm-blue-900/digm-deep-900/g'

# Update digm-royal-900 to digm-midnight-900 for even deeper gradients
find src -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs sed -i '' 's/digm-royal-900/digm-midnight-900/g'

echo "✅ Deep blue color scheme updated successfully!"
echo "🎯 New deep color palette:"
echo "   - digm-black: #000000"
echo "   - digm-deep: #0056e6 (primary deep blue)"
echo "   - digm-blue: #0073e6 (secondary deep blue)"
echo "   - digm-midnight: #000e1a (deepest blue)"

echo ""
echo "🚀 Run 'npm run build' to verify the changes compile correctly."
