import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class AttendanceLiveConsumer(AsyncWebsocketConsumer):
    """
    Real-Time WebSocket Consumer for Live Multi-User Attendance Synchronization.
    Allows teachers, wardens, and administrators to view live updates simultaneously
    without requiring manual page polling or refreshes.
    """

    async def connect(self):
        self.tenant_id = self.scope['url_route']['kwargs'].get('tenant_id', 'global')
        self.room_group_name = f"tenant_{self.tenant_id}_attendance"

        # Join the tenant's real-time attendance group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"[WebSocket] Connected client to room: {self.room_group_name}")

    async def disconnect(self, close_code):
        # Leave the group on disconnect
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"[WebSocket] Disconnected client from room: {self.room_group_name}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages from frontend client."""
        try:
            data = json.loads(text_data)
            action = data.get('action')

            # Broadcast ping-pong heartbeat
            if action == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
                return

            # Broadcast attendance update event to all peers in the room
            if action == 'attendance_updated':
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'attendance_broadcast',
                        'payload': data.get('payload', {})
                    }
                )
        except Exception as err:
            logger.error(f"[WebSocket] Error receiving message: {err}")

    async def attendance_broadcast(self, event):
        """Handler for 'attendance_broadcast' sent by group_send."""
        await self.send(text_data=json.dumps({
            'type': 'attendance_updated',
            'payload': event.get('payload', {})
        }))


class SystemNotificationConsumer(AsyncWebsocketConsumer):
    """
    Real-Time WebSocket Consumer for Instant User & Tenant Notifications.
    """

    async def connect(self):
        self.tenant_id = self.scope['url_route']['kwargs'].get('tenant_id', 'global')
        self.room_group_name = f"tenant_{self.tenant_id}_notifications"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def notification_broadcast(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'payload': event.get('payload', {})
        }))
