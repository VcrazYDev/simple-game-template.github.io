
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const resizeCanvas = () => {
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const createSendMoveMessage = keycode => {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);

    view.setUint8(0, 3);
    view.setUint8(1, keycode);

    return buffer;
}

const sendMove = keycode => ws.send(createSendMoveMessage(keycode));

const onKeyDown = e => {
    if (e.keyCode === 87) sendMove(87);
    if (e.keyCode === 83) sendMove(83);
    if (e.keyCode === 65) sendMove(65);
    if (e.keyCode === 68) sendMove(68);
};

document.addEventListener('keydown', onKeyDown);

let ws = null;
let myPlayer = { id: null, x: 0, y: 0 };
let players = new Map();

const packetHandlers = {
    0x0: 'initGame',
    0x1: 'newPlayer',
    0x2: 'playerData',
    0x3: 'sendMove'
};

const onMessage = msg => {
    const { data } = msg;
    const view = new DataView(data);

    const packet = {
        type: view.getUint8(0),
        data: data.slice(1)
    };

    const type = packetHandlers[packet.type];
    if (!type) return;

    switch (type) {
        case 'initGame': {
            const id = view.getUint8(1);
            console.log(`Got id: ${id}`);
            myPlayer.id = id;
            spawnGame();
            break;
        }
        case 'newPlayer': {
            const id = view.getUint8(1);
            const x = view.getUint8(2);
            const y = view.getUint8(3);

            players.set(id, { x, y });

            myPlayer.x = x;
            myPlayer.y = y;
            break;
        }
        case 'playerData': {
            let i = 1;
            while (i < data.byteLength) {
                const id = view.getUint16(i);
                i += 2;
                const x = view.getInt16(i);
                i += 2;
                const y = view.getInt16(i);
                i += 2;
                players.set(id, { x, y });
            }
            break;
        }
        default:
            console.log(view);
    }
};

const joinGame = () => {
    ws = new WebSocket('ws://localhost:3000/ws');
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
        console.log('Connected to server');
        requestGameJoin();

        setInterval(() => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);

            view.setUint8(0, 2);

            ws.send(buffer);
        }, 1 / 3);
    };

    ws.onmessage = onMessage;

    ws.onclose = () => {
        console.log('Disconnected from server');
    };
};

const requestGameJoin = () => {
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);
    view.setUint8(0, 1);

    ws.send(buffer);
};
