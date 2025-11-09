import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import os from 'os'

const PORT = 3000;
const server = createServer();
const wss = new WebSocketServer({
    server, verifyClient: ({ origin }, callback) => {
        callback(true); // Accept all connections
    }
});

function getCpuTimes() {
    const cpus = os.cpus();
    const cores = cpus.length;
    const model = cpus[0].model;
    let idle = 0, total = 0, speed = 0, averageSpeed = 0;
    cpus.forEach(cpu => {
        for (const type in cpu.times) {
            total += cpu.times[type];
        }
        idle += cpu.times.idle;
        speed += cpu.speed;
    });
    averageSpeed = speed / cores;
    return { idle, total, cores, model, averageSpeed };
}

function getCpuUsage() {
    return new Promise((resolve) => {
        const start = getCpuTimes();
        const cores = start.cores;
        const model = start.model
        setTimeout(() => {
            const end = getCpuTimes();
            const idleDiff = end.idle - start.idle;
            const totalDiff = end.total - start.total;
            const speed = (start.averageSpeed + end.averageSpeed) / 2;
            const usage = 1 - idleDiff / totalDiff;
            const cpuPercent = (usage * 100).toFixed(2);
            resolve({ cpuPercent, cores, model, speed });
        }, 1000);
    });
}

wss.on('connection', ws => {
    console.log('WebSocket client connected');
    const interval = setInterval(() => {
        getCpuUsage()
            .then(({ cpuPercent, cores, model, speed }) => {
                const cpuUsage = { cpuPercent, cores, model, speed };
                ws.send(JSON.stringify({ cpuUsage }));
            })
            .catch(err => {
                console.error('Error getting CPU usage:', err);
            });
    }, 1000);

    ws.on('close', () => {
        clearInterval(interval);
        console.log('WebSocket client disconnected');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
});