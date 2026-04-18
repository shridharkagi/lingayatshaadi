"use client";

import React, { useState, useEffect, useRef } from "react";

export default function DiagnosticPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [mode, setMode] = useState<"email" | "otp">("email");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev]);
    console.log('DIAGNOSTIC:', message);
  };

  useEffect(() => {
    addLog('✅ Component mounted with React ' + (React as any).version);
    
    if (buttonRef.current) {
      const btn = buttonRef.current;
      
      // Native event listeners
      btn.addEventListener('mouseenter', () => addLog('🖱️ Mouse ENTER'));
      btn.addEventListener('mouseleave', () => addLog('🖱️ Mouse LEAVE'));
      btn.addEventListener('mousedown', () => addLog('🖱️ Mouse DOWN'));
      btn.addEventListener('mouseup', () => addLog('🖱️ Mouse UP'));
      btn.addEventListener('click', () => addLog('🖱️ Native CLICK event'));
      
      // Check styles
      const styles = window.getComputedStyle(btn);
      addLog(`📊 pointer-events: ${styles.pointerEvents}`);
      addLog(`📊 cursor: ${styles.cursor}`);
      addLog(`📊 display: ${styles.display}`);
      addLog(`📊 z-index: ${styles.zIndex}`);
      
      // Check position
      const rect = btn.getBoundingClientRect();
      addLog(`📏 Button position: ${Math.round(rect.left)}, ${Math.round(rect.top)}`);
      
      // Check if something is on top
      const center = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      addLog(`🎯 Element at center: ${center?.tagName} ${center?.id || ''}`);
    }
  }, []);

  const handleClick = () => {
    addLog('✅ React onClick handler fired!');
    setMode("otp");
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '12px' }}>
        <h1 style={{ marginBottom: '20px' }}>🔍 Advanced Click Diagnostic</h1>
        
        <div style={{ marginBottom: '30px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
          <h3>Current Mode: <span style={{ color: '#1976d2' }}>{mode}</span></h3>
          <p style={{ margin: '10px 0', fontSize: '14px', color: '#666' }}>
            React Version: {(React as any).version || 'Unknown'}
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <button
            ref={buttonRef}
            id="diagnostic-otp-button"
            type="button"
            onClick={handleClick}
            onMouseDown={() => addLog('⚛️ React onMouseDown')}
            onMouseUp={() => addLog('⚛️ React onMouseUp')}
            onMouseEnter={() => addLog('⚛️ React onMouseEnter')}
            onMouseLeave={() => addLog('⚛️ React onMouseLeave')}
            style={{
              padding: '20px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: mode === 'otp' ? '#4caf50' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 100,
            }}
          >
            {mode === 'otp' ? '✅ Clicked!' : '👆 Click Me to Switch to OTP'}
          </button>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
          <strong>📋 Instructions:</strong>
          <ol style={{ marginLeft: '20px', marginTop: '10px', fontSize: '14px' }}>
            <li>Hover over the button - you should see mouse enter/leave logs</li>
            <li>Click the button - you should see multiple event logs</li>
            <li>Check the console (F12) for additional logs</li>
            <li>If NO logs appear when hovering/clicking, it's a browser/system issue</li>
          </ol>
        </div>

        <div style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '8px', 
          maxHeight: '400px', 
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '13px'
        }}>
          <strong style={{ display: 'block', marginBottom: '10px' }}>📜 Event Log:</strong>
          {logs.length === 0 ? (
            <div style={{ color: '#999', fontStyle: 'italic' }}>Waiting for events...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ 
                padding: '4px', 
                borderBottom: '1px solid #ddd',
                color: log.includes('✅') ? 'green' : log.includes('🖱️') ? 'blue' : '#333'
              }}>
                {log}
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: '#ffebee', borderRadius: '8px' }}>
          <strong>🚨 If nothing happens when you click:</strong>
          <ul style={{ marginLeft: '20px', marginTop: '10px', fontSize: '14px' }}>
            <li>Try a different browser (Safari, Firefox, Chrome)</li>
            <li>Try Incognito/Private mode</li>
            <li>Disable ALL browser extensions</li>
            <li>Check macOS Accessibility settings (VoiceOver, etc.)</li>
            <li>Try on a different computer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
