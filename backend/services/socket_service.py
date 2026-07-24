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

# ==========================================================
# Connected Clients
# ==========================================================

connected_developers: Dict[int, Set[str]] = {}
connected_admins: Dict[int, Set[str]] = {}

# ==========================================================
# Connection
# ==========================================================

@sio.event
async def connect(sid, environ):
    print("\n================================")
    print("✅ SOCKET CONNECTED")
    print("SID:", sid)
    print("================================")


# ==========================================================
# Developer joins room
# ==========================================================

@sio.on("join_developer")
async def join_developer(sid, data):

    try:

        user_id = int(data.get("userId"))

        room = f"developer_{user_id}"

        await sio.enter_room(sid, room)

        if user_id not in connected_developers:
            connected_developers[user_id] = set()

        connected_developers[user_id].add(sid)

        print("\n========== DEVELOPER JOINED ==========")
        print("SID:", sid)
        print("User ID:", user_id)
        print("Room:", room)
        print("======================================")

        await sio.emit(
            "joined_room",
            {
                "success": True,
                "room": room
            },
            room=sid
        )

    except Exception as e:
        print("join_developer error:", e)


# ==========================================================
# Admin joins room
# ==========================================================

@sio.on("join_admin")
async def join_admin(sid, data):

    try:

        admin_id = int(data.get("adminId"))

        room = f"admin_{admin_id}"

        await sio.enter_room(sid, room)

        if admin_id not in connected_admins:
            connected_admins[admin_id] = set()

        connected_admins[admin_id].add(sid)

        print("\n========== ADMIN JOINED ==========")
        print("SID:", sid)
        print("Admin ID:", admin_id)
        print("Room:", room)
        print("==================================")

        await sio.emit(
            "joined_room",
            {
                "success": True,
                "room": room
            },
            room=sid
        )

    except Exception as e:
        print("join_admin error:", e)


# ==========================================================
# Emit Notification To Developer
# ==========================================================

async def emit_to_developer(
    user_id: int,
    event: str,
    data: dict,
):

    room = f"developer_{user_id}"

    print("\n========== EMIT TO DEVELOPER ==========")
    print("User:", user_id)
    print("Room:", room)
    print("Event:", event)
    print("Payload:", data)

    await sio.emit(
        event,
        data,
        room=room,
    )

    print("✅ Sent to developer")


# ==========================================================
# Emit Notification To Admin
# ==========================================================

async def emit_to_admin(
    admin_id: int,
    event: str,
    data: dict,
):

    room = f"admin_{admin_id}"

    print("\n========== EMIT TO ADMIN ==========")
    print("Admin:", admin_id)
    print("Room:", room)
    print("Event:", event)
    print("Payload:", data)

    await sio.emit(
        event,
        data,
        room=room,
    )

    print("✅ Sent to admin")


# ==========================================================
# Broadcast
# ==========================================================

async def broadcast(event: str, data: dict):

    print("\n========== BROADCAST ==========")
    print(event)

    await sio.emit(event, data)


# ==========================================================
# Disconnect
# ==========================================================

@sio.event
async def disconnect(sid):

    print("\n================================")
    print("❌ SOCKET DISCONNECTED")
    print("SID:", sid)

    for user_id in list(connected_developers.keys()):

        if sid in connected_developers[user_id]:

            connected_developers[user_id].remove(sid)

            if len(connected_developers[user_id]) == 0:
                del connected_developers[user_id]

            break

    for admin_id in list(connected_admins.keys()):

        if sid in connected_admins[admin_id]:

            connected_admins[admin_id].remove(sid)

            if len(connected_admins[admin_id]) == 0:
                del connected_admins[admin_id]

            break

    print("Connected Developers:", connected_developers)
    print("Connected Admins:", connected_admins)
    print("================================")