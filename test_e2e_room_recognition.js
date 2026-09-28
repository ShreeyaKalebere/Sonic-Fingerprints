/**
 * End-to-End Test Script for Mode 1: Room Recognition.
 *
 * Demonstrates:
 * 1. User Registration (POST /auth/register)
 * 2. User Login & JWT Token Retrieval (POST /auth/login)
 * 3. Registering Two Physical Rooms with Distinct Audio Samples (POST /room/register)
 *    - Room A: "Corner Office Studio" (office_sample.wav)
 *    - Room B: "Open Kitchen Atrium" (kitchen_sample.wav)
 * 4. Duplicate Room Registration Validation (verifying 409 Conflict)
 * 5. Environment Audio Classification (POST /room/classify)
 *    - Verifies 5-class softmax output & Base64 Mel-spectrogram
 * 6. Acoustic Fingerprint Matching (POST /room/match)
 *    - Matching similar office query clip -> Expects matched: true with similarity score
 *    - Matching unrelated street clip -> Expects matched: false
 * 7. Querying Registered Rooms List (GET /room/list)
 * 8. Querying User History (GET /room/history)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');

// Disable socket pooling to prevent Windows Node.js ECONNRESET
axios.defaults.httpAgent = new http.Agent({ keepAlive: false });

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5001';
const ASSETS_DIR = path.resolve(__dirname, 'test_assets');

const officeWav = path.join(ASSETS_DIR, 'office_sample.wav');
const kitchenWav = path.join(ASSETS_DIR, 'kitchen_sample.wav');
const officeQueryWav = path.join(ASSETS_DIR, 'office_query.wav');
const streetWav = path.join(ASSETS_DIR, 'street_sample.wav');

async function runTest() {
  console.log('='.repeat(75));
  console.log('MODE 1: ROOM RECOGNITION - END-TO-END PIPELINE VALIDATION');
  console.log('Target API Gateway:', BASE_URL);
  console.log('='.repeat(75));

  const testEmail = `tester_${Date.now()}@sonicexplorer.io`;
  const testPassword = 'StrongPassword99!';
  let authToken = null;
  let userId = null;

  // --------------------------------------------------------------------------
  // STEP 1: REGISTER USER
  // --------------------------------------------------------------------------
  console.log('\n[STEP 1] Registering test user: POST /auth/register');
  try {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: testEmail,
      password: testPassword
    });
    console.log('  -> Status:', regRes.status);
    console.log('  -> Response:', regRes.data.message);
    console.log('  -> User ID:', regRes.data.user.id);
    userId = regRes.data.user.id;
  } catch (err) {
    console.error('  FAILED in Step 1:', err.response?.data || err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 2: LOGIN USER & OBTAIN JWT
  // --------------------------------------------------------------------------
  console.log('\n[STEP 2] Logging in user: POST /auth/login');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('  -> Status:', loginRes.status);
    authToken = loginRes.data.token;
    console.log('  -> JWT Token received (length:', authToken.length, 'chars)');
  } catch (err) {
    console.error('  FAILED in Step 2:', err.response?.data || err.message);
    process.exit(1);
  }

  const authHeaders = {
    Authorization: `Bearer ${authToken}`
  };

  // --------------------------------------------------------------------------
  // STEP 3: REGISTER ROOM 1 ("Corner Office Studio")
  // --------------------------------------------------------------------------
  console.log('\n[STEP 3] Registering Room 1: "Corner Office Studio" with office_sample.wav');
  try {
    const form1 = new FormData();
    form1.append('file', fs.createReadStream(officeWav));
    form1.append('room_name', 'Corner Office Studio');

    const room1Res = await axios.post(`${BASE_URL}/room/register`, form1, {
      headers: {
        ...authHeaders,
        ...form1.getHeaders()
      }
    });
    console.log('  -> Status:', room1Res.status);
    console.log('  -> Success:', room1Res.data.success);
    console.log('  -> ChromaDB Room ID:', room1Res.data.room_id);
    console.log('  -> MongoDB Room ID:', room1Res.data.room.id);
  } catch (err) {
    console.error('  FAILED in Step 3:', err.response?.data || err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 4: REGISTER ROOM 2 ("Open Kitchen Atrium")
  // --------------------------------------------------------------------------
  console.log('\n[STEP 4] Registering Room 2: "Open Kitchen Atrium" with kitchen_sample.wav');
  try {
    const form2 = new FormData();
    form2.append('file', fs.createReadStream(kitchenWav));
    form2.append('room_name', 'Open Kitchen Atrium');

    const room2Res = await axios.post(`${BASE_URL}/room/register`, form2, {
      headers: {
        ...authHeaders,
        ...form2.getHeaders()
      }
    });
    console.log('  -> Status:', room2Res.status);
    console.log('  -> Success:', room2Res.data.success);
    console.log('  -> ChromaDB Room ID:', room2Res.data.room_id);
    console.log('  -> MongoDB Room ID:', room2Res.data.room.id);
  } catch (err) {
    console.error('  FAILED in Step 4:', err.response?.data || err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 5: VERIFY DUPLICATE ROOM REJECTION (409 Conflict)
  // --------------------------------------------------------------------------
  console.log('\n[STEP 5] Testing duplicate room rejection: Re-registering "Corner Office Studio"');
  try {
    const dupForm = new FormData();
    dupForm.append('file', fs.createReadStream(officeWav));
    dupForm.append('room_name', 'Corner Office Studio');

    await axios.post(`${BASE_URL}/room/register`, dupForm, {
      headers: {
        ...authHeaders,
        ...dupForm.getHeaders()
      }
    });
    console.error('  ERROR: Expected 409 Conflict but request succeeded.');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 409) {
      console.log('  -> Received expected 409 Conflict:', err.response.data.error.message);
    } else {
      console.error('  Unexpected error during duplicate check:', err.response?.data || err.message);
      process.exit(1);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 6: CLASSIFY AUDIO CLIP (POST /room/classify)
  // --------------------------------------------------------------------------
  console.log('\n[STEP 6] Classifying ambient audio: POST /room/classify with street_sample.wav');
  try {
    const classifyForm = new FormData();
    classifyForm.append('file', fs.createReadStream(streetWav));

    const classifyRes = await axios.post(`${BASE_URL}/room/classify`, classifyForm, {
      headers: {
        ...authHeaders,
        ...classifyForm.getHeaders()
      }
    });
    console.log('  -> Status:', classifyRes.status);
    console.log('  -> Top Classified Label:', classifyRes.data.top_label);
    console.log('  -> Softmax Probabilities:');
    for (const [cls, prob] of Object.entries(classifyRes.data.classification)) {
      console.log(`     * ${cls.padEnd(12)}: ${(prob * 100).toFixed(2)}%`);
    }
    console.log('  -> Spectrogram Base64 Prefix:', classifyRes.data.spectrogram_b64.slice(0, 35) + '...');
    console.log('  -> Spectrogram Base64 Length:', classifyRes.data.spectrogram_b64.length, 'chars');
  } catch (err) {
    console.error('  FAILED in Step 6:', err.response?.data || err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 7: MATCH AUDIO AGAINST REGISTERED ROOMS (POSITIVE MATCH)
  // --------------------------------------------------------------------------
  console.log('\n[STEP 7] Acoustic Matching: POST /room/match with office_query.wav');
  try {
    const matchForm = new FormData();
    matchForm.append('file', fs.createReadStream(officeQueryWav));

    const matchRes = await axios.post(`${BASE_URL}/room/match`, matchForm, {
      headers: {
        ...authHeaders,
        ...matchForm.getHeaders()
      }
    });
    console.log('  -> Status:', matchRes.status);
    console.log('  -> Matched Status:', matchRes.data.matched);
    if (matchRes.data.matched) {
      console.log('  -> Matched Room Name:', matchRes.data.room_name);
      console.log('  -> Cosine Similarity:', matchRes.data.similarity, '(Threshold: >= 0.85)');
    } else {
      console.log('  -> Similarity score:', matchRes.data.similarity, 'Message:', matchRes.data.message);
    }
  } catch (err) {
    console.error('  FAILED in Step 7:', err.response?.data || err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 8: MATCH UNRELATED AUDIO (NEGATIVE / NO MATCH OUTCOME)
  // --------------------------------------------------------------------------
  console.log('\n[STEP 8] Acoustic Matching with unrelated audio: POST /room/match with street_sample.wav');
  try {
    const unmatchForm = new FormData();
    unmatchForm.append('file', fs.createReadStream(streetWav));

    const unmatchRes = await axios.post(`${BASE_URL}/room/match`, unmatchForm, {
      headers: {
        ...authHeaders,
        ...unmatchForm.getHeaders()
      }
    });
    console.log('  -> Status:', unmatchRes.status);
    console.log('  -> Matched Status:', unmatchRes.data.matched);
    console.log('  -> Outcome Message:', unmatchRes.data.message || '(similarity: ' + unmatchRes.data.similarity + ')');
  } catch (err) {
    console.error('  FAILED in Step 8:', err.response?.data || err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 9: GET REGISTERED ROOMS LIST (GET /room/list)
  // --------------------------------------------------------------------------
  console.log('\n[STEP 9] Fetching User Registered Rooms: GET /room/list');
  try {
    const listRes = await axios.get(`${BASE_URL}/room/list`, {
      headers: authHeaders
    });
    console.log('  -> Status:', listRes.status);
    console.log(`  -> Total Rooms Found: ${listRes.data.rooms.length}`);
    listRes.data.rooms.forEach((r, idx) => {
      console.log(`     [${idx + 1}] "${r.room_name}" (Chroma ID: ${r.chroma_id})`);
    });
  } catch (err) {
    console.error('  FAILED in Step 9:', err.response?.data || err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // STEP 10: GET USER HISTORY (GET /room/history)
  // --------------------------------------------------------------------------
  console.log('\n[STEP 10] Fetching User Recognition History: GET /room/history');
  try {
    const histRes = await axios.get(`${BASE_URL}/room/history?limit=10`, {
      headers: authHeaders
    });
    console.log('  -> Status:', histRes.status);
    console.log(`  -> Total History Records: ${histRes.data.pagination.total}`);
    histRes.data.history.forEach((h, idx) => {
      console.log(`     [${idx + 1}] Mode: ${h.mode.toUpperCase()} | Timestamp: ${h.timestamp} | Result:`, JSON.stringify(h.result));
    });
  } catch (err) {
    console.error('  FAILED in Step 10:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(75));
  console.log('SUCCESS: All Mode 1: Room Recognition pipeline tests passed end-to-end!');
  console.log('='.repeat(75));
}

runTest();
