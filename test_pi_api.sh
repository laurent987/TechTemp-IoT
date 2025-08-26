#!/bin/bash

echo "🔍 Testing TechTemp Raspberry Pi Monitoring API"
echo "=============================================="
echo "Pi Server: 192.168.0.42:8080"
echo ""

# Test de connectivité de base
echo "1️⃣ Testing basic connectivity..."
if ping -c 1 192.168.0.42 >/dev/null 2>&1; then
    echo "✅ Pi is reachable"
else
    echo "❌ Pi is not reachable. Check network connection."
    exit 1
fi

echo ""
echo "2️⃣ Testing HTTP server..."
if curl -s --connect-timeout 5 http://192.168.0.42:8080/ >/dev/null; then
    echo "✅ HTTP server is running"
else
    echo "❌ HTTP server is not responding. Is the TechTemp server running?"
    echo "💡 On the Pi, run: ./start_monitoring_server.sh"
    exit 1
fi

echo ""
echo "3️⃣ Testing system health API..."
echo "📊 System Health Status:"
curl -s http://192.168.0.42:8080/api/system/health | jq . || {
    echo "❌ Health API failed or jq not installed"
    echo "Raw response:"
    curl -s http://192.168.0.42:8080/api/system/health
}

echo ""
echo "4️⃣ Testing simple status API..."
echo "📈 Simple Status:"
curl -s http://192.168.0.42:8080/api/system/status | jq . || {
    echo "❌ Status API failed"
    echo "Raw response:"
    curl -s http://192.168.0.42:8080/api/system/status
}

echo ""
echo "✅ Testing complete!"
echo ""
echo "🌐 You can now use the React dashboard with 'Temps Réel' mode"
echo "🔗 Direct API access: http://192.168.0.42:8080/api/system/health"
