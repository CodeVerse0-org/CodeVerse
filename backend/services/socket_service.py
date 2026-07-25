import socketio
from typing import Dict, Set

# ==========================================================
# Socket.IO Server
# ==========================================================

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
)

# Tracks active connections per user
connected_developers: Dict[int, Set[str]] = {}
connected_admins: Dict[int, Set[str]] = {}


@sio.event
async def connect(sid, environ):
    print(f"\n✅ SOCKET CONNECTED: SID = {sid}")


@sio.on("join_developer")
async def join_developer(sid, data):
    try:
        user_id = int(data.get("userId"))
        room = f"developer_{user_id}"

        await sio.enter_room(sid, room)

        if user_id not in connected_developers:
            connected_developers[user_id] = set()

        connected_developers[user_id].add(sid)

        print(f"\n========== DEVELOPER JOINED ==========")
        print(f"SID: {sid} | User ID: {user_id} | Room: {room}")
        print("======================================")

        await sio.emit("joined_room", {"success": True, "room": room}, room=sid)

    except Exception as e:
        print(f"❌ join_developer error: {e}")


@sio.on("join_admin")
async def join_admin(sid, data):
    try:
        admin_id = int(data.get("adminId"))
        room = f"admin_{admin_id}"

        await sio.enter_room(sid, room)

        if admin_id not in connected_admins:
            connected_admins[admin_id] = set()

        connected_admins[admin_id].add(sid)

        print(f"\n========== ADMIN JOINED ==========")
        print(f"Admin ID: {admin_id} | Room: {room}")
        print("==================================")

        await sio.emit("joined_room", {"success": True, "room": room}, room=sid)

    except Exception as e:
        print(f"❌ join_admin error: {e}")


async def emit_to_developer(user_id: int, event: str, data: dict):
    room = f"developer_{user_id}"
    print(f"\n📡 [SOCKET EMIT] Sending '{event}' to room: {room}")
    print(f"Payload: {data}")

    await sio.emit(event, data, room=room)
    print("✅ Emitted successfully to developer room")


async def emit_to_admin(admin_id: int, event: str, data: dict):
    room = f"admin_{admin_id}"
    print(f"\n📡 [SOCKET EMIT] Sending '{event}' to admin room: {room}")
    await sio.emit(event, data, room=room)


async def broadcast(event: str, data: dict):
    await sio.emit(event, data)


@sio.event
async def disconnect(sid):
    print(f"\n❌ SOCKET DISCONNECTED: SID = {sid}")

    for user_id in list(connected_developers.keys()):
        if sid in connected_developers[user_id]:
            connected_developers[user_id].remove(sid)
            if not connected_developers[user_id]:
                del connected_developers[user_id]
            break

    for admin_id in list(connected_admins.keys()):
        if sid in connected_admins[admin_id]:
            connected_admins[admin_id].remove(sid)
            if not connected_admins[admin_id]:
                del connected_admins[admin_id]
            break