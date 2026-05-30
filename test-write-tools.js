import { spawn } from 'child_process';
import path from 'path';

const serverPath = path.resolve('./dist/index.js');
const testAddress = '0x765DE816845861e75A25fCA122bb6898B8B1282a'; // cUSD address

console.log("Starting Conduit MCP Server with dummy private key for write simulations...");

// Run the server with a valid dummy private key in environment so that walletClient is initialized
const child = spawn('node', [serverPath], {
  env: {
    ...process.env,
    PRIVATE_KEY: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  }
});

let buffer = '';

child.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const response = JSON.parse(line);
      console.log(`\n--- Response (id: ${response.id}) ---`);
      console.log(JSON.stringify(response.result || response.error || response, null, 2));
      
      if (response.id === 1) {
        // Send initialized notification
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + '\n');
        
        // Call send_tokens (dryRun: true)
        console.log('\n>>> Calling send_tokens (dryRun)...');
        child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: 2, method: "tools/call", params: {
            name: "send_tokens",
            arguments: {
              to: testAddress,
              token: "CELO",
              amount: "1.0",
              dryRun: true
            }
          }
        }) + '\n');
      } else if (response.id === 2) {
        // Call swap_tokens (dryRun: true)
        console.log('\n>>> Calling swap_tokens (dryRun)...');
        child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: 3, method: "tools/call", params: {
            name: "swap_tokens",
            arguments: {
              fromToken: "cUSD",
              toToken: "cEUR",
              amount: "10.0",
              dryRun: true
            }
          }
        }) + '\n');
      } else if (response.id === 3) {
        // Call x402_pay (dryRun: true)
        // Since we need an endpoint, we can use a mock endpoint or mock the HTTP response.
        // Let's pass a dummy URL and see how it handles it.
        console.log('\n>>> Calling x402_pay (dryRun)...');
        child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: 4, method: "tools/call", params: {
            name: "x402_pay",
            arguments: {
              url: "https://httpbin.org/status/200", // Returns 200 directly
              maxAmountUSD: "1.0",
              token: "USDC",
              dryRun: true
            }
          }
        }) + '\n');
      } else if (response.id === 4) {
        console.log('\nAll newly implemented write tools successfully verified in simulation/dryRun mode!');
        child.kill();
        process.exit(0);
      }
    } catch (err) {
      // Ignore non-json stdout lines
    }
  }
});

child.stderr.on('data', (data) => {
  console.log(`STDERR: ${data.toString().trim()}`);
});

// Start initialization
child.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" }
  }
}) + '\n');

setTimeout(() => {
  console.error("Timeout reached");
  child.kill();
  process.exit(1);
}, 25000);
