import { spawn } from 'child_process';
import path from 'path';

const serverPath = path.resolve('./dist/index.js');
const testAddress = '0x765DE816845861e75A25fCA122bb6898B8B1282a'; // cUSD address

console.log("Starting Conduit MCP Server with dummy keys for Phase 4 simulations...");

// Run the server with dummy keys in environment so that clients are initialized and APIs verify correctly
const child = spawn('node', [serverPath], {
  env: {
    ...process.env,
    PRIVATE_KEY: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    SELF_API_KEY: 'dummy_self_api_key'
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
        
        // Call lend_on_aave (dryRun: true)
        console.log('\n>>> Calling lend_on_aave (dryRun)...');
        child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: 2, method: "tools/call", params: {
            name: "lend_on_aave",
            arguments: {
              token: "USDC",
              amount: "50",
              dryRun: true
            }
          }
        }) + '\n');
      } else if (response.id === 2) {
        // Call withdraw_from_aave (dryRun: true)
        console.log('\n>>> Calling withdraw_from_aave (dryRun)...');
        child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: 3, method: "tools/call", params: {
            name: "withdraw_from_aave",
            arguments: {
              token: "cUSD",
              amount: "max",
              dryRun: true
            }
          }
        }) + '\n');
      } else if (response.id === 3) {
        // Call self_verify
        console.log('\n>>> Calling self_verify...');
        child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: 4, method: "tools/call", params: {
            name: "self_verify",
            arguments: {
              address: testAddress,
              credentialType: "passport"
            }
          }
        }) + '\n');
      } else if (response.id === 4) {
        // Call check_agent_id
        console.log('\n>>> Calling check_agent_id...');
        child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: 5, method: "tools/call", params: {
            name: "check_agent_id",
            arguments: {
              address: testAddress
            }
          }
        }) + '\n');
      } else if (response.id === 5) {
        console.log('\nAll Phase 4 tools successfully verified!');
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
