#!/bin/bash

echo "🔧 Building TechTemp Server with Real-time Monitoring..."
cd /Users/user/Documents/informatique/techTemp/server

# Nettoyer et compiler
make clean
make

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful!"
    echo ""
    echo "🚀 Starting TechTemp Server..."
    echo "   - MQTT: 192.168.0.42:1883"
    echo "   - HTTP API: http://192.168.0.42:8080"
    echo "   - Health Check: http://192.168.0.42:8080/api/system/health"
    echo ""
    echo "💡 Tip: Test the API with:"
    echo "   curl http://192.168.0.42:8080/api/system/health | jq ."
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "================================================"
    
    ./techtemp
else
    echo "❌ Compilation failed!"
    exit 1
fi
