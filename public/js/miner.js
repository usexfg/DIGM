// XFG Browser Miner - Main Script
// Adapted from js-miner for Fuego (XFG) cryptocurrency mining

var miningPool = 'wss://pool.usexfg.org:8080'; // XFG mining pool
var miningWallet = ''; // Will be set dynamically based on user status
var miningPassword = 'x'; // Pool password
var poolSelected = 'pool.usexfg.org:3333'; // Stratum pool for fallback

var job = null;      // Remember last job we got from the server
var workers = [];    // Keep track of our workers
var ws;              // The websocket we use
var workerScript = '/js/worker.js'; // Path to worker script

/* State variables */
var receiveStack = [];  // Everything we get from the server
var sendStack = [];     // Everything we send to the server
var totalHashes = 0;    // Number of hashes calculated
var connected = 0;      // 0->disconnected, 1->connected, 2->disconnected (error), 3->disconnect (on purpose)
var reconnector = 0;    // Regular check if the WebSocket is still connected
var timerId = 0;

var throttleMiner = 20;  // Percentage of miner throttling (default 20%)

if (!Date.seconds) {
    Date.seconds = function() { return parseInt((new Date()).getTime() / 1000); }
}

var workersNonces = [];

// Add workers for mining
function addWorkers(numThreads) {
    var logicalProcessors = numThreads;

    if (numThreads == -1) {
        // Auto-detect CPU cores
        try {
            logicalProcessors = window.navigator.hardwareConcurrency || 4;
        } catch (err) {
            logicalProcessors = 4;
        }

        if (!((logicalProcessors > 0) && (logicalProcessors < 40))) {
            logicalProcessors = 4;
        }
    }

    var interval = parseInt(0xFFFFFFFF / logicalProcessors);
    workersNonces = [];

    for (var i = 0; i < logicalProcessors; i++) {
        if (i == 0) {
            workersNonces.push({
                start: 0,
                stop: interval
            });
        } else if (i == logicalProcessors - 1) {
            workersNonces.push({
                start: workersNonces[i - 1].stop + 1,
                stop: 0xFFFFFFFF
            });
        } else {
            workersNonces.push({
                start: workersNonces[i - 1].stop + 1,
                stop: workersNonces[i - 1].stop + interval
            });
        }
    }

    while (logicalProcessors-- > 0) {
        addWorker();
    }
}

// Open WebSocket connection to mining pool
var openWebSocket = function () {
    if (ws != null) {
        ws.close();
    }

    ws = new WebSocket(miningPool);
    ws.onmessage = _onMessage;
    ws.onerror = _onError;
    ws.onclose = _onClose;
    ws.onopen = _onOpen;
};

// Handle incoming messages from pool
function _onMessage(ev) {
    var msg = JSON.parse(ev.data);

    if (msg.type === "job") {
        receiveStack.push({
            type: msg.type,
            job_id: msg.params.job_id
        });
        job = msg.params;
    } else if (msg.type === "hash_accepted") {
        receiveStack.push({
            type: msg.type,
            hashes: msg.params.hashes
        });

        // Notify parent about accepted hash
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: 'miner_update',
                data: {
                    accepted: true,
                    hash: msg.params.hashes
                }
            }, '*');
        }
    } else if (msg.type === "hash_rejected") {
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({
                type: 'miner_update',
                data: {
                    rejected: true
                }
            }, '*');
        }
    }
}

function _onError(ev) {
    console.error('WebSocket error:', ev);
    _onClose(ev);
}

function _onClose(ev) {
    console.log('WebSocket closed:', ev);
    if (connected < 2) connected = 2;
    job = null;

    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
            type: 'miner_update',
            data: {
                connected: false
            }
        }, '*');
    }
}

function _onOpen(ev) {
    var params = {
        site_key: 'DIGM-Platform',
        type: "login",
        login: miningWallet,
        pass: miningPassword,
        agent: "digm-browser-miner/1.0"
    };

    socketSend("login", params);
    connected = 1;

    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
            type: 'miner_update',
            data: {
                connected: true
            }
        }, '*');
    }
}

function socketSend(type, params) {
    var msg = {
        type: type,
        params: params
    };
    ws.send(JSON.stringify(msg));
}

// Reconnect function
reconnector = function () {
    if (ws != null && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({type: "keepalive"}));
    }
    if (connected !== 3 && (ws == null || (ws.readyState !== WebSocket.CONNECTING && ws.readyState !== WebSocket.OPEN))) {
        console.log('Attempting to reconnect to mining pool...');
        openWebSocket();
    }
};

// Start mining
function startMining(wallet, pool = null, password = "x", numThreads = -1) {
    if (!wallet) {
        console.error('No wallet address provided for mining');
        return false;
    }

    stopMining();
    connected = 0;
    miningWallet = wallet;

    if (pool) {
        miningPool = pool;
    }
    if (password) {
        miningPassword = password;
    }

    addWorkers(numThreads);
    reconnector();
    timerId = setInterval(reconnector, 10000);

    console.log(`Started mining with wallet: ${wallet}, threads: ${numThreads}`);
    return true;
}

// Stop mining
function stopMining() {
    connected = 3;

    if (timerId != 0) {
        clearInterval(timerId);
        timerId = 0;
    }

    if (ws != null) {
        ws.close();
    }
    deleteAllWorkers();
    job = null;

    console.log('Mining stopped');
}

// Add one worker
function addWorker() {
    var newWorker = new Worker(workerScript + '?_=' + Math.random().toString());
    newWorker.w_start = workersNonces[workers.length].start;
    newWorker.w_stop = workersNonces[workers.length].stop;
    workers.push(newWorker);

    newWorker.onmessage = on_workermsg_proxy;

    setTimeout(function () {
        informWorker(newWorker);
    }, 2000);
}

// Remove one worker
function removeWorker() {
    if (workers.length < 1) return;
    var wrk = workers.shift();
    wrk.terminate();
}

// Clean up all workers
function deleteAllWorkers() {
    for (var i = 0; i < workers.length; i++) {
        workers[i].terminate();
    }
    workers = [];
}

function informWorker(wrk) {
    var evt = {
        data: "wakeup",
        target: wrk
    };
    on_workermsg(evt);
}

function on_workermsg_proxy(e) {
    if (e.data != 'nothing') {
        //console.log('Worker message:', e.data);
    }
    on_workermsg(e);
}

function on_workermsg(e) {
    var wrk = e.target;

    if (e.data == "kill") return;

    if (connected != 1) {
        setTimeout(function () {
            informWorker(wrk);
        }, 2000);
        return;
    }

    if ((e.data) != "nothing" && (e.data) != "wakeup") {
        // We solved a hash. Forward it to the server.
        var obj = JSON.parse(e.data);
        ws.send(e.data);
        sendStack.push({
            type: "submit",
            job_id: obj.params.job_id
        });

        // Update hash count
        totalHashes++;
    }

    if (job === null) {
        setTimeout(function () {
            informWorker(wrk);
        }, 2000);
        return;
    }

    var jobData = {
        job: job,
        throttle: Math.max(0, Math.min(throttleMiner, 100)),
        w_start: wrk.w_start,
        w_stop: wrk.w_stop
    };

    wrk.postMessage(jobData);

    if ((e.data) != "wakeup") {
        totalHashes++;
    }
}

// Set throttle level
function setThrottle(throttle) {
    throttleMiner = Math.max(0, Math.min(throttle, 100));

    // Update all workers
    workers.forEach(function(wrk) {
        wrk.postMessage({
            throttle: throttleMiner
        });
    });
}

// Get mining stats
function getStats() {
    return {
        connected: connected === 1,
        hashes: totalHashes,
        accepted: receiveStack.filter(function(item) { return item.type === 'hash_accepted'; }).length,
        rejected: receiveStack.filter(function(item) { return item.type === 'hash_rejected'; }).length,
        workers: workers.length
    };
}

// Export functions for global use
window.XFGMiner = {
    startMining: startMining,
    stopMining: stopMining,
    setThrottle: setThrottle,
    getStats: getStats,
    setWallet: function(wallet) { miningWallet = wallet; },
    setPool: function(pool) { miningPool = pool; },
    isConnected: function() { return connected === 1; },
    getHashrate: function() { return totalHashes / Math.max(1, (Date.now() / 1000) - (timerId ? 0 : 1)); }
};
```

Now let me create the CryptoNight WebAssembly module:

<tool_call>
<function=terminal>
<parameter=command>
mkdir -p /Users/aejt/digm-platform/public/js
</parameter>
<parameter=cd>
/Users/aejt/digm-platform
</parameter>
</function>
</tool_call>
