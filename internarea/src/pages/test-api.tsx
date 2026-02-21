import { useState } from 'react';
import axios from 'axios';
import { getApiEndpoint } from '@/utils/api';

export default function TestAPI() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testEndpoints = async () => {
    setLoading(true);
    const testResults: any = {};

    // Test 1: Root endpoint
    try {
      const response = await axios.get('http://localhost:5001/');
      testResults.root = { success: true, data: response.data };
    } catch (error: any) {
      testResults.root = { success: false, error: error.message };
    }

    // Test 2: Sync user endpoint
    try {
      const response = await axios.post(getApiEndpoint('/auth/sync-user'), {
        uid: 'test123',
        email: 'test@example.com',
        name: 'Test User'
      });
      testResults.syncUser = { success: true, data: response.data };
    } catch (error: any) {
      testResults.syncUser = { success: false, error: error.message, response: error.response?.data };
    }

    // Test 3: Check posting limit
    try {
      const response = await axios.post(getApiEndpoint('/posts/check-limit'), {
        userId: 'test123'
      });
      testResults.checkLimit = { success: true, data: response.data };
    } catch (error: any) {
      testResults.checkLimit = { success: false, error: error.message, response: error.response?.data };
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div style={{ padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>API Test Page</h1>
      <p>This page tests connectivity to the backend API.</p>
      
      <button 
        onClick={testEndpoints}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Test API Endpoints'}
      </button>

      {Object.keys(results).length > 0 && (
        <div>
          <h2>Results:</h2>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
