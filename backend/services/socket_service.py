import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)


@sio.event
async def connect(sid, environ):
    print(f"✅ SOCKET CONNECTED: {sid}")


@sio.on("join")
async def join(sid, data):
    user_id = data.get("userId")

    if user_id:
        room = f"user_{user_id}"
        await sio.enter_room(sid, room)
        print(f"👤 JOINED ROOM: {room}")


@sio.on("join_repos")
async def join_repos(sid, data):
    repo_ids = data.get("repoIds", [])

    for r_id in repo_ids:
        room = f"repo_{r_id}"
        await sio.enter_room(sid, room)
        print(f"📦 joined repo room: {room}")


@sio.event
async def disconnect(sid):
    print(f"❌ DISCONNECTED: {sid}")