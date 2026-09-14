# Realtime Attendance & Sync Engine Architecture

**Document Version:** 1.0.0  
**Subsystems:** Biometric Push Gateway, Real-Time Polling & WebSocket Radar, Local Cache Hydration  

---

## 1. Biometric Push Gateway Ingestion

TaleemOS supports direct, real-time punch ingestion from physical biometric terminals (ZKTeco, Hikvision, RFID readers):

```mermaid
sequenceDiagram
    participant Device as Biometric Terminal
    participant Gateway as /api/v1/attendance/biometric/push/
    participant DeviceRegistry as Device Authenticator
    participant AttEngine as Attendance Processing Service
    participant DB as PostgreSQL Database

    Device->>Gateway: POST { device_sn, punches: [{ pin, time, type }] }
    Gateway->>DeviceRegistry: Verify active serial number & tenant binding
    alt Unregistered Device
        DeviceRegistry-->>Gateway: 403 Forbidden
        Gateway-->>Device: Reject Payload
    else Valid Device
        DeviceRegistry-->>Gateway: Device Verified (Tenant ID: X)
        Gateway->>AttEngine: Process Punch Records Atomically
        AttEngine->>DB: Match Student/Staff & Save Attendance / Raw Logs
        DB-->>AttEngine: Saved
        AttEngine-->>Gateway: Ingestion Summary { processed: N }
        Gateway-->>Device: 200 OK
    end
```

---

## 2. Frontend Real-Time Attendance Radar

The frontend dashboard and classroom views maintain live synchronization via `useRealtimeAttendance`:
- Subscribes to custom browser events (`spr_attendance_updated`).
- Employs exponential backoff polling during active class session intervals.
- Optimistically updates attendance indicators (Present, Absent, Late, Leave) with zero UI lag.
