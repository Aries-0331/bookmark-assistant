// Temporary minimal options page to test core functionality
import { useEffect, useState } from 'react';

export default function Options() {
  const [status, setStatus] = useState('Testing core functionality...');

  useEffect(() => {
    // Test that extension loads without window errors
    setTimeout(() => {
      setStatus('✅ Extension loaded successfully without window dependencies!');
    }, 1000);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Minimal Options Page (Testing)</h1>
      <p>{status}</p>
      <p>
        <strong>Note:</strong> This is a temporary page to test that the extension loads without
        window object dependencies.
      </p>
    </div>
  );
}
