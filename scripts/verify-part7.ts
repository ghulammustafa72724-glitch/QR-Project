import { initDatabase, db } from '../server/db.ts';
import { hashPassword, generateToken } from '../server/auth.ts';
import http from 'http';
import express from 'express';
import { apiRouter } from '../server/api.ts';
import { initRealtimeServer } from '../server/realtime.ts';
import { WebSocket } from 'ws';

async function runPart7Verification() {
  console.log('--- Starting Part 7 Verification Suite ---');

  // 1. Initialize DB
  initDatabase();
  console.log('✓ Database initialized successfully with Part 7 tables');

  // 2. Setup test server
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  initRealtimeServer(server);

  await new Promise<void>((resolve) => {
    server.listen(4567, () => {
      resolve();
    });
  });
  console.log('✓ Test HTTP & WebSocket server listening on port 4567');

  const baseUrl = 'http://127.0.0.1:4567/api';

  try {
    // 3. Register Owner A
    const ownerAEmail = `owner_a_${Date.now()}@test.com`;
    const regResA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Owner Alice',
        email: ownerAEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        restaurantName: 'Alice Bistro',
      }),
    });
    const regDataA = await regResA.json();
    if (!regResA.ok) throw new Error(`Owner A registration failed: ${JSON.stringify(regDataA)}`);
    const tokenA = regDataA.token;
    const restIdA = regDataA.restaurant.id;
    console.log('✓ Registered Owner A & Restaurant A:', restIdA);

    // 4. Create Tables for Restaurant A
    const tableRes1 = await fetch(`${baseUrl}/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ table_number: '1', display_label: 'Table 1 Window', seating_capacity: 4 }),
    });
    const tableData1 = await tableRes1.json();
    const table1Id = tableData1.table.id;
    console.log('✓ Created Table 1 with operational_status:', tableData1.table.operational_status);
    if (tableData1.table.operational_status !== 'available') {
      throw new Error(`Expected operational_status available, got: ${tableData1.table.operational_status}`);
    }

    // 5. Create Staff Member (Waiter) by Owner A
    const waiterEmail = `waiter_bob_${Date.now()}@test.com`;
    const createStaffRes = await fetch(`${baseUrl}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        name: 'Bob Waiter',
        email: waiterEmail,
        password: 'WaiterSecret123!',
        role: 'waiter',
      }),
    });
    const createStaffData = await createStaffRes.json();
    if (!createStaffRes.ok) throw new Error(`Staff creation failed: ${JSON.stringify(createStaffData)}`);
    const waiterId = createStaffData.staff.id;
    console.log('✓ Created Waiter staff account:', waiterEmail, 'id:', waiterId);

    // 6. Test Waiter Login
    const waiterLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: waiterEmail,
        password: 'WaiterSecret123!',
      }),
    });
    const waiterLoginData = await waiterLoginRes.json();
    if (!waiterLoginRes.ok) throw new Error(`Waiter login failed: ${JSON.stringify(waiterLoginData)}`);
    const waiterToken = waiterLoginData.token;
    if (waiterLoginData.user.role !== 'waiter') {
      throw new Error(`Expected role waiter, got: ${waiterLoginData.user.role}`);
    }
    if (waiterLoginData.user.restaurant_id !== restIdA) {
      throw new Error(`Expected restaurant_id ${restIdA}, got: ${waiterLoginData.user.restaurant_id}`);
    }
    console.log('✓ Waiter login successful with correct role & restaurant isolation');

    // 7. Test RBAC: Waiter CANNOT access Staff Management
    const waiterStaffAccessRes = await fetch(`${baseUrl}/staff`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    if (waiterStaffAccessRes.status !== 403) {
      throw new Error(`Expected status 403 when waiter accesses /staff, got: ${waiterStaffAccessRes.status}`);
    }
    console.log('✓ RBAC Security: Waiter access to /staff properly rejected with 403 Forbidden');

    // 8. Test RBAC: Waiter CAN update Table Operational Status
    const updateTableStatusRes = await fetch(`${baseUrl}/tables/${table1Id}/operational-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiterToken}` },
      body: JSON.stringify({ operational_status: 'occupied' }),
    });
    const updateTableStatusData = await updateTableStatusRes.json();
    if (!updateTableStatusRes.ok) throw new Error(`Table status update failed: ${JSON.stringify(updateTableStatusData)}`);
    if (updateTableStatusData.table.operational_status !== 'occupied') {
      throw new Error(`Expected occupied, got: ${updateTableStatusData.table.operational_status}`);
    }
    console.log('✓ Waiter successfully updated Table 1 operational_status to occupied');

    // 9. Test Public Customer Service Request creation
    const serviceReqRes = await fetch(`${baseUrl}/public/r/${restIdA}/t/${table1Id}/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_type: 'water',
        customer_notes: 'Extra ice please',
      }),
    });
    const serviceReqData = await serviceReqRes.json();
    if (!serviceReqRes.ok) throw new Error(`Service request failed: ${JSON.stringify(serviceReqData)}`);
    const serviceReqId = serviceReqData.request.id;
    console.log('✓ Customer successfully submitted "water" assistance call, id:', serviceReqId);

    // 10. Waiter views active service requests
    const waiterGetRequestsRes = await fetch(`${baseUrl}/service-requests?status=active`, {
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    const waiterGetRequestsData = await waiterGetRequestsRes.json();
    if (!waiterGetRequestsRes.ok) throw new Error(`Waiter failed to get requests: ${JSON.stringify(waiterGetRequestsData)}`);
    const foundReq = waiterGetRequestsData.requests.find((r: any) => r.id === serviceReqId);
    if (!foundReq) throw new Error(`Service request ${serviceReqId} not found in waiter active requests list`);
    console.log('✓ Waiter successfully retrieved active table service requests');

    // 11. Waiter acknowledges service request
    const ackRes = await fetch(`${baseUrl}/service-requests/${serviceReqId}/acknowledge`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    const ackData = await ackRes.json();
    if (!ackRes.ok) throw new Error(`Acknowledge failed: ${JSON.stringify(ackData)}`);
    if (ackData.request.status !== 'acknowledged') {
      throw new Error(`Expected acknowledged, got: ${ackData.request.status}`);
    }
    console.log('✓ Waiter successfully acknowledged service request');

    // 12. Waiter resolves service request
    const resolveRes = await fetch(`${baseUrl}/service-requests/${serviceReqId}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${waiterToken}` },
    });
    const resolveData = await resolveRes.json();
    if (!resolveRes.ok) throw new Error(`Resolve failed: ${JSON.stringify(resolveData)}`);
    if (resolveData.request.status !== 'resolved') {
      throw new Error(`Expected resolved, got: ${resolveData.request.status}`);
    }
    console.log('✓ Waiter successfully resolved service request');

    // 13. Test Restaurant Isolation: Register Owner B & Waiter B
    const ownerBEmail = `owner_b_${Date.now()}@test.com`;
    const regResB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Owner Bob',
        email: ownerBEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        restaurantName: 'Bob Diner',
      }),
    });
    const regDataB = await regResB.json();
    const tokenB = regDataB.token;

    const waiterBEmail = `waiter_b_${Date.now()}@test.com`;
    const createStaffBRes = await fetch(`${baseUrl}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        name: 'Waiter B',
        email: waiterBEmail,
        password: 'WaiterSecret123!',
        role: 'waiter',
      }),
    });
    const createStaffBData = await createStaffBRes.json();

    const waiterBLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: waiterBEmail, password: 'WaiterSecret123!' }),
    });
    const waiterBLoginData = await waiterBLogin.json();
    const waiterBToken = waiterBLoginData.token;

    // Verify Waiter B CANNOT update Table 1 of Restaurant A
    const crossTableRes = await fetch(`${baseUrl}/tables/${table1Id}/operational-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waiterBToken}` },
      body: JSON.stringify({ operational_status: 'available' }),
    });
    if (crossTableRes.status !== 404) {
      throw new Error(`Expected 404 when Waiter B accesses Table A, got: ${crossTableRes.status}`);
    }
    console.log('✓ Multi-tenant isolation verified: Waiter B cannot see or modify Table from Restaurant A');

    // 14. Test Staff Deactivation
    const deactivateRes = await fetch(`${baseUrl}/staff/${waiterId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ status: 'inactive' }),
    });
    const deactivateData = await deactivateRes.json();
    if (!deactivateRes.ok) throw new Error(`Deactivate failed: ${JSON.stringify(deactivateData)}`);
    console.log('✓ Owner A deactivated Waiter Bob');

    // Attempt login with deactivated staff account
    const deactLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: waiterEmail, password: 'WaiterSecret123!' }),
    });
    if (deactLoginRes.status !== 403) {
      throw new Error(`Expected 403 for inactive staff login, got: ${deactLoginRes.status}`);
    }
    console.log('✓ Inactive staff login blocked with 403 status');

    // Reactivate and test password reset
    await fetch(`${baseUrl}/staff/${waiterId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ status: 'active' }),
    });

    const resetPassRes = await fetch(`${baseUrl}/staff/${waiterId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ new_password: 'NewWaiterPassword99!' }),
    });
    if (!resetPassRes.ok) throw new Error('Password reset failed');
    console.log('✓ Owner reset staff password');

    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: waiterEmail, password: 'NewWaiterPassword99!' }),
    });
    if (!newLoginRes.ok) throw new Error('Login with new password failed');
    console.log('✓ Staff logged in successfully with updated password');

    // 15. Test WebSocket Connection
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:4567/ws?token=${tokenA}`);
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('WebSocket connection timed out'));
      }, 5000);

      ws.on('open', () => {
        console.log('✓ Real-time WebSocket connection established');
      });

      ws.on('message', (msg) => {
        const payload = JSON.parse(msg.toString());
        if (payload.event === 'connection.established') {
          console.log('✓ WebSocket received server welcome handshake:', payload.data?.role);
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log('\n========================================');
    console.log('ALL PART 7 VERIFICATION TESTS PASSED!');
    console.log('========================================\n');
    process.exit(0);
  } finally {
    server.close();
  }
}

runPart7Verification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
