export default function TestPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Test Page - No React Hooks</h1>
      <p>If you see this message, the page loaded successfully without loops.</p>
      <form action="/" method="GET">
        <button type="submit">Go Home</button>
      </form>
    </div>
  );
}
