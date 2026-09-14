# Observability, Structured Logging & Monitoring Guide

**Document Version:** 1.0.0  
**Log Schema:** Standard Machine-Parseable JSON  
**Distributed Tracing:** `X-Request-ID` Correlation  

---

## 1. Structured JSON Logging Architecture

In production (`DJANGO_LOG_FORMAT=json`), all application log lines are emitted as single-line JSON objects parseable by log aggregators (Datadog, Grafana Loki, AWS CloudWatch, Elasticsearch/Logstash):

```json
{
  "timestamp": "2026-09-14T19:37:55.449Z",
  "level": "INFO",
  "logger": "core",
  "message": "AUDIT LOG [TRANSFER] Student#1 by 01788880002 [Admin / Nazim] | Req: 013c3e22-df41-42ae-b1d3-bd674fc1e6b8",
  "request_id": "013c3e22-df41-42ae-b1d3-bd674fc1e6b8",
  "tenant_id": "1",
  "user_id": "2",
  "endpoint": "/api/v1/students/1/transfer/",
  "method": "POST",
  "ip_address": "127.0.0.1",
  "environment": "production"
}
```

---

## 2. Distributed Tracing & Incident Triaging

When an unhandled exception or 500 server error occurs:
1. The client receives a clean masked response containing only the unique correlation identifier:
   `{"detail": "An internal server error occurred...", "request_id": "013c3e22-df41-42ae-b1d3-bd674fc1e6b8"}`
2. Support engineers query the log aggregator for `request_id: "013c3e22-df41-42ae-b1d3-bd674fc1e6b8"` to immediately locate the full stack trace, user identity, tenant ID, and endpoint metadata.
