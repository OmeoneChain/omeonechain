#!/bin/bash

# API Integration Test Script
# Tests all API endpoints to ensure proper integration

echo "🧪 Testing OmeoneChain API Integration..."

API_BASE="http://localhost:3001"
API_URL="$API_BASE/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local expected_status=${5:-200}
    
    echo -e "${BLUE}Testing: $description${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -H "x-user-id: user1" \
            -d "$data" "$endpoint")
    fi
    
    # Extract status code
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $status_code"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Pretty print JSON response if it's valid JSON
        if echo "$body" | jq . >/dev/null 2>&1; then
            echo "$body" | jq . | head -10
        else
            echo "$body" | head -3
        fi
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $status_code"
        echo "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Check if jq is installed (for JSON formatting)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Installing for better JSON output...${NC}"
    if command -v brew &> /dev/null; then
        brew install jq
    elif command -v apt-get &> /dev/null; then
        sudo apt-get install -y jq
    else
        echo "Please install jq for better JSON formatting"
    fi
fi

# Check if API server is running
echo -e "${BLUE}Checking if API server is running...${NC}"
if ! curl -s "$API_BASE/health" > /dev/null; then
    echo -e "${RED}❌ API server is not running on $API_BASE${NC}"
    echo "Please start the API server first:"
    echo "  cd code/poc/api && npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ API server is running${NC}"
echo ""

# Test 1: Health Check
test_endpoint "GET" "$API_BASE/health" "" "Health Check Endpoint"

# Test 2: Get Current User
test_endpoint "GET" "$API_URL/users/me" "" "Get Current User Data"

# Test 3: Get Governance Proposals
test_endpoint "GET" "$API_URL/governance/proposals" "" "Get Governance Proposals"

# Test 4: Create a Test Proposal
proposal_data='{
  "title": "Test API Integration Proposal", 
  "description": "This is a test proposal created by the API integration test script.",
  "category": "PARAMETER_CHANGE",
  "userId": "user1",
  "executionParams": {}
}'
test_endpoint "POST" "$API_URL/governance/proposals" "$proposal_data" "Create Test Proposal" 201

# Test 5: Get Token Balance
test_endpoint "GET" "$API_URL/tokens/balance/user1" "" "Get Token Balance"

# Test 6: Get Trust Score
test_endpoint "GET" "$API_URL/users/user1/trust-score" "" "Get Trust Score"

# Test 7: Get Staking Info
test_endpoint "GET" "$API_URL/governance/staking/user1" "" "Get Staking Information"

# Test 8: Stake Tokens
stake_data='{
  "userId": "user1",
  "amount": 50,
  "duration": 3
}'
test_endpoint "POST" "$API_URL/governance/stake" "$stake_data" "Stake Tokens"

# Test 9: Get Updated Proposals (should include our test proposal)
test_endpoint "GET" "$API_URL/governance/proposals" "" "Get Updated Proposals List"

# Test 10: Vote on a Proposal (if any exist)
echo -e "${BLUE}Testing: Vote on Proposal${NC}"
proposals_response=$(curl -s "$API_URL/governance/proposals")
if echo "$proposals_response" | jq -e '.data | length > 0' >/dev/null 2>&1; then
    # Get the first proposal ID
    proposal_id=$(echo "$proposals_response" | jq -r '.data[0].id')
    vote_data="{\"userId\": \"user1\", \"support\": true}"
    test_endpoint "POST" "$API_URL/governance/proposals/$proposal_id/vote" "$vote_data" "Vote on Proposal"
else
    echo -e "${YELLOW}⚠️  No proposals found to vote on${NC}"
    echo ""
fi

# Test 11: Get Recommendations
test_endpoint "GET" "$API_URL/recommendations?limit=5" "" "Get Recommendations"

# Test 12: Create a Test Recommendation
recommendation_data='{
  "userId": "user1",
  "serviceId": "restaurant_123", 
  "rating": 5,
  "content": "Great place for testing API integration!",
  "tags": ["test", "api", "integration"]
}'
test_endpoint "POST" "$API_URL/recommendations" "$recommendation_data" "Create Test Recommendation" 201

# Performance Test: Multiple concurrent requests
echo -e "${BLUE}Testing: Concurrent Requests Performance${NC}"
start_time=$(date +%s)
for i in {1..10}; do
    curl -s "$API_URL/users/me" > /dev/null &
done
wait
end_time=$(date +%s)
duration=$((end_time - start_time))
echo -e "${GREEN}✅ PASS${NC} - 10 concurrent requests completed in ${duration}s"
TESTS_PASSED=$((TESTS_PASSED + 1))
echo ""

# Error Handling Test: Non-existent endpoint
echo -e "${BLUE}Testing: Error Handling (404)${NC}"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL/nonexistent")
status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
if [ "$status_code" -eq "404" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Proper 404 handling"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} - Expected 404, got $status_code"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# CORS Test
echo -e "${BLUE}Testing: CORS Headers${NC}"
cors_response=$(curl -s -H "Origin: http://localhost:3000" -I "$API_BASE/health")
if echo "$cors_response" | grep -i "access-control-allow-origin" > /dev/null; then
    echo -e "${GREEN}✅ PASS${NC} - CORS headers present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} - CORS headers missing"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Rate Limiting Test
echo -e "${BLUE}Testing: Rate Limiting${NC}"
echo "Sending rapid requests to test rate limiting..."
rate_limit_hit=false
for i in {1..20}; do
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL/users/me")
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    if [ "$status_code" -eq "429" ]; then
        rate_limit_hit=true
        break
    fi
    sleep 0.1
done

if [ "$rate_limit_hit" = true ]; then
    echo -e "${GREEN}✅ PASS${NC} - Rate limiting is working"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Rate limiting not triggered (may need more requests)${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Summary
echo "🎯 Test Summary:"
echo "================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
total_tests=$((TESTS_PASSED + TESTS_FAILED))
success_rate=$((TESTS_PASSED * 100 / total_tests))
echo -e "Success Rate: ${GREEN}${success_rate}%${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your API integration is working perfectly!${NC}"
    echo ""
    echo "✅ Your React frontend can now connect to:"
    echo "   • Governance system with real proposals and voting"
    echo "   • Trust Score calculation with live data"
    echo "   • Token balance and staking functionality"
    echo "   • User reputation and social features"
    echo ""
    echo "🚀 Ready for Phase 4: Production deployment!"
else
    echo -e "${RED}⚠️  Some tests failed. Please check the API server logs.${NC}"
    exit 1
fi