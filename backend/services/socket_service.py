import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
)


@sio.event
async def connect(sid, environ):
    print(f"✅ SOCKET CONNECTED: {sid}")


# ----------------------------
# Developer joins own room
# ----------------------------
@sio.on("join_developer")
async def join_developer(sid, data):
    user_id = data.get("userId")

    if not user_id:
        return

    room = f"developer_{user_id}"
    await sio.enter_room(sid, room)

    print(f"👨‍💻 Developer joined room: {room}")


# ----------------------------
# Admin joins own room
# ----------------------------
@sio.on("join_admin")
async def join_admin(sid, data):
    admin_id = data.get("adminId")

    if not admin_id:
        return

    room = f"admin_{admin_id}"
    await sio.enter_room(sid, room)

    print(f"🛡️ Admin joined room: {room}")


# ----------------------------
# Emit helper for developers
# ----------------------------
async def emit_to_developer(user_id: int, event: str, data: dict):
    await sio.emit(
        event,
        data,
        room=f"developer_{user_id}",
    )


# ----------------------------
# Emit helper for admins
# ----------------------------
async def emit_to_admin(admin_id: int, event: str, data: dict):
    await sio.emit(
        event,
        data,
        room=f"admin_{admin_id}",
    )


@sio.event
async def disconnect(sid):
    print(f"❌ SOCKET DISCONNECTED: {sid}")